import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import {
  DEFAULT_STAGING_LOAD_TARGETS,
  buildLoadRunnerReadonlySafetyConfig,
  buildStagingLoadRampBatches,
  buildStagingLoadTargetExecutionPlan,
  countRowsFromRpcData,
  countStagingLoadTargetExecutionPlanRequests,
  evaluateStagingLoadLiveThresholds,
  payloadBytes,
  runLoadRunnerEmulatorDryRun,
  resolveStagingLoadEnvStatus,
  summarizeTargetResult,
  validateLoadRunnerReadOnlyScenarios,
  validateLoadRunnerSafetyRails,
  type LoadRunnerEmulatorDryRunResult,
  type LoadRunnerValidationResult,
  type StagingLoadEnvStatus,
  type StagingLoadHarnessPlan,
  type StagingLoadLiveThresholdDecision,
  type StagingLoadSample,
  type StagingLoadTarget,
} from "./stagingLoadCore";
import {
  S_LOAD_01_ARTIFACT_PATHS,
  S_LOAD_01_PHASE_A_REQUEST_COUNTS,
  S_LOAD_01_WAVE,
  buildSLoad01StepPlan,
  resolveSLoad01FinalStatus,
  type SLoad01FinalStatus,
  type SLoad01Phase,
  type SLoad01RequestCount,
  type SLoad01StepPlan,
} from "./sLoad01Plan";

loadDotenv({ path: ".env.agent.staging.local", override: false });
loadDotenv({ path: ".env.staging.local", override: false });
loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

type RpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
    options?: { signal?: AbortSignal },
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

type ApprovalSnapshot = {
  commonPresent: boolean;
  phaseBPresent: boolean;
  commonKeys: Array<{ key: string; present: boolean }>;
  phaseBKeys: Array<{ key: string; present: boolean }>;
};

type StagingBffProbeStatus = {
  statusCode: number | null;
  ok: boolean;
  errorCategory: string | null;
  readPortsConfigured?: boolean | null;
  mutationRoutesEnabled?: boolean | null;
};

type StagingBffProbeSummary = {
  stagingBffBaseUrlPresent: boolean;
  productionTargetUsed: boolean;
  health: StagingBffProbeStatus;
  ready: StagingBffProbeStatus;
};

type SLoad01StepStatus = "green" | "aborted" | "not_run" | "health_failed";

type SLoad01TargetSummary = {
  targetId: string;
  domain: StagingLoadTarget["domain"];
  rpcName: string;
  readOnly: true;
  sampleCount: number;
  medianLatencyMs: number | null;
  maxLatencyMs: number | null;
  medianPayloadBytes: number | null;
  maxPayloadBytes: number | null;
  maxRowCount: number | null;
  recommendation: "safe_now" | "watch" | "optimize_next" | "run_live";
  errorCategories: string[];
};

type SLoad01StepMetrics = {
  targetCount: number;
  totalRequestsPlanned: number;
  totalRequestsAttempted: number;
  totalRequestsCompleted: number;
  totalRequestsAborted: number;
  errorCount: number;
  observedErrorRate: number;
  latencyP50: number | null;
  latencyP95: number | null;
  latencyP99: number | null;
  timeoutCount: number;
  maxConcurrencyConfigured: number;
  maxConcurrencyObserved: number;
  statusClassCounts: Record<string, number>;
  errorCategoryCounts: Record<string, number>;
  healthReadyDuring: Array<{ health: number | null; ready: number | null }>;
};

type SLoad01StepResult = {
  id: string;
  phase: SLoad01Phase;
  requestCount: SLoad01RequestCount;
  status: SLoad01StepStatus;
  skipReason: string | null;
  failureReasons: string[];
  durationMs: number;
  concurrency: {
    configured: number;
    maxObserved: number;
  };
  rampConfig: {
    steps: number[];
    batchCount: number;
    maxBatchConcurrency: number;
    cooldownMs: number;
    requestTimeoutMs: number;
    maxP95LatencyMs: number;
    maxErrorRate: number;
  };
  abortStatus: {
    triggered: boolean;
    reason: string | null;
  };
  healthBefore: StagingBffProbeSummary | null;
  healthAfter: StagingBffProbeSummary | null;
  metrics: SLoad01StepMetrics;
  targetSummaries: SLoad01TargetSummary[];
  thresholdDecision: StagingLoadLiveThresholdDecision | null;
};

type SLoad01ArtifactPayload = {
  wave: typeof S_LOAD_01_WAVE;
  final_status: SLoad01FinalStatus;
  generatedAt: string;
  mode: "staging-readonly-ramped-load-proof";
  allowLive: boolean;
  environment: StagingLoadEnvStatus & {
    stagingBffBaseUrlPresent: boolean;
    productionFallbackUsed: false;
    secretsPrinted: false;
  };
  approvals: ApprovalSnapshot;
  safety: {
    stagingOnly: true;
    readonlySyntheticOnly: true;
    productionTouched: false;
    productionMutated: false;
    dbWritesInitiated: false;
    migrationsRun: false;
    supabaseProjectChanged: false;
    spendCapChanged: false;
    realtimeLoadRun: false;
    otaPublished: false;
    easBuildTriggered: false;
    cacheConfigChanged: false;
    rateLimitChanged: false;
    routeScopeChanged: false;
    redactedMetricsOnly: true;
    loadRunnerSafetyDryRun: LoadRunnerEmulatorDryRunResult;
    scenarioValidation: LoadRunnerValidationResult;
    railsValidation: LoadRunnerValidationResult;
  };
  routeScope: {
    routeCount: number;
    readonlyRpcTargets: Array<{ id: string; rpcName: string; readOnly: true }>;
    noRouteExpansion: true;
  };
  blockers: string[];
  steps: SLoad01StepResult[];
  gates: {
    focusedTests: "not_run";
    tsc: "not_run";
    lint: "not_run";
    npmTestRunInBand: "not_run";
    architectureScanner: "not_run";
    gitDiffCheck: "not_run";
    releaseVerifyPostPush: "not_run";
    artifactJsonParse: "not_run";
  };
};

const projectRoot = process.cwd();

const COMMON_LOAD_PROOF_APPROVAL_KEYS = [
  "S_LOAD_PROOF_STAGING_READONLY_ONLY_APPROVED",
  "S_LOAD_PROOF_NO_BUSINESS_MUTATIONS_APPROVED",
  "S_LOAD_PROOF_ABORT_ON_HEALTH_READY_FAILURE_APPROVED",
  "S_LOAD_PROOF_ABORT_ON_ERROR_RATE_APPROVED",
  "S_LOAD_PROOF_REDACTED_METRICS_ONLY_APPROVED",
] as const;

const PHASE_B_LOAD_PROOF_APPROVAL_KEYS = [
  "S_5K_STAGING_READONLY_LOAD_PROOF_APPROVED",
  "S_5K_STAGING_READONLY_LOAD_PROOF_ROLLBACK_ABORT_APPROVED",
] as const;

const isTruthyEnv = (key: string): boolean => /^(?:1|true|yes)$/i.test(String(process.env[key] ?? "").trim());

const hasFlag = (flag: string): boolean => process.argv.includes(flag);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const resolveApprovals = (): ApprovalSnapshot => {
  const commonKeys = COMMON_LOAD_PROOF_APPROVAL_KEYS.map((key) => ({ key, present: isTruthyEnv(key) }));
  const phaseBKeys = PHASE_B_LOAD_PROOF_APPROVAL_KEYS.map((key) => ({ key, present: isTruthyEnv(key) }));
  return {
    commonPresent: commonKeys.every((entry) => entry.present),
    phaseBPresent: phaseBKeys.every((entry) => entry.present),
    commonKeys,
    phaseBKeys,
  };
};

const writeText = (relativePath: string, content: string) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
};

const writeJson = (relativePath: string, payload: unknown) => {
  writeText(relativePath, `${JSON.stringify(payload, null, 2)}\n`);
};

const createReadOnlyClient = (): RpcClient => {
  const url = String(process.env.STAGING_SUPABASE_URL ?? "").trim();
  const key = String(process.env.STAGING_SUPABASE_READONLY_KEY ?? "").trim();
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-client-info": "s-load-01-staging-readonly-ladder" } },
  });

  return {
    rpc: async (fn, args, options) => {
      const builder = args == null ? client.rpc(fn as never) : client.rpc(fn as never, args as never);
      const abortable = builder as unknown as {
        abortSignal?: (signal: AbortSignal) => Promise<{ data: unknown; error: { message: string } | null }>;
      };
      const result =
        options?.signal && typeof abortable.abortSignal === "function"
          ? await abortable.abortSignal(options.signal)
          : await builder;
      return {
        data: result.data,
        error: result.error ? { message: result.error.message } : null,
      };
    },
  };
};

const isTimeout57014 = (message: string): boolean => /\b57014\b|statement timeout/i.test(message);

const isHttp429Or5xx = (message: string): boolean =>
  /\b429\b|too many requests|rate limit|\b5\d\d\b|server error|bad gateway|service unavailable|gateway timeout/i.test(
    message,
  );

const createAbortController = (timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
};

const percentile = (values: number[], fraction: number): number | null => {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index] ?? null;
};

const increment = (record: Record<string, number>, key: string) => {
  record[key] = (record[key] ?? 0) + 1;
};

const parseReadyBody = (text: string): Pick<StagingBffProbeStatus, "readPortsConfigured" | "mutationRoutesEnabled"> => {
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch (_error: unknown) {
    body = null;
  }
  const data = isRecord(body) && isRecord(body.data) ? body.data : {};
  return {
    readPortsConfigured: data.readPortsConfigured === true,
    mutationRoutesEnabled: data.mutationRoutesEnabled === true,
  };
};

const probeStagingBff = async (pathName: "/health" | "/ready"): Promise<StagingBffProbeStatus> => {
  const baseUrl = String(process.env.STAGING_BFF_BASE_URL ?? "").trim();
  if (!baseUrl) {
    return { statusCode: null, ok: false, errorCategory: "missing_staging_bff_base_url" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(new URL(pathName, baseUrl).toString(), {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    const status: StagingBffProbeStatus = {
      statusCode: response.status,
      ok: response.status === 200,
      errorCategory: null,
    };
    if (pathName === "/ready") {
      return {
        ...status,
        ...(await response.text().then(parseReadyBody)),
      };
    }
    return status;
  } catch (error: unknown) {
    return {
      statusCode: null,
      ok: false,
      errorCategory: error instanceof Error && error.name === "AbortError" ? "timeout" : "request_failed",
    };
  } finally {
    clearTimeout(timer);
  }
};

const probeStagingBffReadiness = async (): Promise<StagingBffProbeSummary> => {
  const stagingBffBaseUrl = String(process.env.STAGING_BFF_BASE_URL ?? "").trim();
  const productionTargets = [
    "PRODUCTION_BFF_BASE_URL",
    "PROD_BFF_BASE_URL",
    "PRODUCTION_API_BASE_URL",
    "PROD_API_BASE_URL",
    "BFF_PRODUCTION_BASE_URL",
  ]
    .map((key) => String(process.env[key] ?? "").trim())
    .filter(Boolean);
  const [health, ready] = await Promise.all([probeStagingBff("/health"), probeStagingBff("/ready")]);
  return {
    stagingBffBaseUrlPresent: stagingBffBaseUrl.length > 0,
    productionTargetUsed: stagingBffBaseUrl.length > 0 && productionTargets.includes(stagingBffBaseUrl),
    health,
    ready,
  };
};

const isReadinessProbeGreen = (probe: StagingBffProbeSummary): boolean =>
  probe.stagingBffBaseUrlPresent &&
  !probe.productionTargetUsed &&
  probe.health.ok &&
  probe.ready.ok &&
  probe.ready.readPortsConfigured === true &&
  probe.ready.mutationRoutesEnabled !== true;

const buildHarnessPlan = (step: SLoad01StepPlan): StagingLoadHarnessPlan => ({
  profile: step.profile,
  planOnly: false,
  targetConcurrency: step.maxConcurrency,
  rampSteps: step.rampSteps,
  stopConditions: step.stopConditions,
  operatorApprovalRequired: true,
  operatorApproved: true,
  supabaseLimitsConfirmed: true,
  enterpriseLoadApprovalRequired: step.phaseBApprovalRequired,
  enterpriseLoadApproved: true,
  safeToRunLive: true,
  blockers: [],
});

const emptyStepMetrics = (step: SLoad01StepPlan): SLoad01StepMetrics => ({
  targetCount: DEFAULT_STAGING_LOAD_TARGETS.length,
  totalRequestsPlanned: step.stopConditions.maxTotalRequests,
  totalRequestsAttempted: 0,
  totalRequestsCompleted: 0,
  totalRequestsAborted: 0,
  errorCount: 0,
  observedErrorRate: 0,
  latencyP50: null,
  latencyP95: null,
  latencyP99: null,
  timeoutCount: 0,
  maxConcurrencyConfigured: step.maxConcurrency,
  maxConcurrencyObserved: 0,
  statusClassCounts: {},
  errorCategoryCounts: {},
  healthReadyDuring: [],
});

const buildSkippedStepResult = (
  step: SLoad01StepPlan,
  skipReason: string,
  status: Extract<SLoad01StepStatus, "not_run" | "health_failed"> = "not_run",
  healthBefore: StagingBffProbeSummary | null = null,
): SLoad01StepResult => ({
  id: step.id,
  phase: step.phase,
  requestCount: step.requestCount,
  status,
  skipReason,
  failureReasons: [skipReason],
  durationMs: 0,
  concurrency: {
    configured: step.maxConcurrency,
    maxObserved: 0,
  },
  rampConfig: {
    steps: step.rampSteps,
    batchCount: 0,
    maxBatchConcurrency: 0,
    cooldownMs: step.stopConditions.cooldownMs,
    requestTimeoutMs: step.stopConditions.requestTimeoutMs,
    maxP95LatencyMs: step.stopConditions.maxP95LatencyMs,
    maxErrorRate: step.stopConditions.maxErrorRate,
  },
  abortStatus: {
    triggered: status === "health_failed",
    reason: skipReason,
  },
  healthBefore,
  healthAfter: null,
  metrics: emptyStepMetrics(step),
  targetSummaries: [],
  thresholdDecision: null,
});

const summarizeTargets = (
  targets: StagingLoadTarget[],
  targetSamples: Map<string, StagingLoadSample[]>,
  targetErrors: Map<string, string[]>,
): SLoad01TargetSummary[] =>
  targets.map((target) => {
    const samples = targetSamples.get(target.id) ?? [];
    const summary = summarizeTargetResult(target, samples);
    return {
      targetId: target.id,
      domain: target.domain,
      rpcName: target.rpcName,
      readOnly: true,
      sampleCount: samples.length,
      medianLatencyMs: summary.medianLatencyMs,
      maxLatencyMs: summary.maxLatencyMs,
      medianPayloadBytes: summary.medianPayloadBytes,
      maxPayloadBytes: summary.maxPayloadBytes,
      maxRowCount: summary.maxRowCount,
      recommendation: summary.recommendation,
      errorCategories: Array.from(new Set(targetErrors.get(target.id) ?? [])).sort(),
    };
  });

const runSLoad01Step = async (
  client: RpcClient,
  step: SLoad01StepPlan,
  targets: StagingLoadTarget[],
): Promise<SLoad01StepResult> => {
  const harnessPlan = buildHarnessPlan(step);
  const startedAt = Date.now();
  const healthBefore = await probeStagingBffReadiness();
  if (!isReadinessProbeGreen(healthBefore)) {
    return buildSkippedStepResult(step, "health_ready_failed_before_load", "health_failed", healthBefore);
  }

  const executionPlan = buildStagingLoadTargetExecutionPlan(targets, harnessPlan.stopConditions.maxTotalRequests);
  const executionQueue = executionPlan.flatMap((item) => Array.from({ length: item.runs }, () => item.target));
  const rampBatches = buildStagingLoadRampBatches(
    executionQueue,
    harnessPlan.rampSteps,
    harnessPlan.targetConcurrency,
  );
  const targetSamples = new Map<string, StagingLoadSample[]>();
  const targetErrors = new Map<string, string[]>();
  const allLatencies: number[] = [];
  const statusClassCounts: Record<string, number> = {};
  const errorCategoryCounts: Record<string, number> = {};
  const healthReadyDuring: Array<{ health: number | null; ready: number | null }> = [];

  let active = 0;
  let maxConcurrencyObserved = 0;
  let totalRequestsAttempted = 0;
  let totalRequestsCompleted = 0;
  let errorCount = 0;
  let timeoutCount = 0;
  let abortTriggered = false;
  let abortReason: string | null = null;
  let totalRequestsUnstarted = executionQueue.length;
  let nextReadinessProbeAt = 250;
  let readinessProbeInFlight: Promise<void> | null = null;

  const triggerAbort = (reason: string) => {
    if (!abortTriggered) {
      abortTriggered = true;
      abortReason = reason;
    }
  };

  const maybeProbeReadiness = async () => {
    if (totalRequestsAttempted < nextReadinessProbeAt || readinessProbeInFlight) return;
    nextReadinessProbeAt += 250;
    readinessProbeInFlight = (async () => {
      const probe = await probeStagingBffReadiness();
      healthReadyDuring.push({
        health: probe.health.statusCode,
        ready: probe.ready.statusCode,
      });
      if (!isReadinessProbeGreen(probe)) {
        triggerAbort("health_ready_failed_during_load");
      }
    })().finally(() => {
      readinessProbeInFlight = null;
    });
    await readinessProbeInFlight;
  };

  const appendTargetError = (target: StagingLoadTarget, category: string) => {
    targetErrors.set(target.id, [...(targetErrors.get(target.id) ?? []), category]);
  };

  const runTarget = async (target: StagingLoadTarget) => {
    if (abortTriggered) return;
    active += 1;
    maxConcurrencyObserved = Math.max(maxConcurrencyObserved, active);
    totalRequestsAttempted += 1;
    const abortController = createAbortController(harnessPlan.stopConditions.requestTimeoutMs);
    const requestStartedAt = Date.now();
    try {
      const result = await client.rpc(target.rpcName, target.args, { signal: abortController.signal }).finally(() => {
        abortController.clear();
      });
      const latencyMs = Date.now() - requestStartedAt;
      if (abortController.signal.aborted || latencyMs > harnessPlan.stopConditions.requestTimeoutMs) {
        timeoutCount += 1;
        errorCount += 1;
        increment(statusClassCounts, "timeout");
        increment(errorCategoryCounts, "timeout");
        appendTargetError(target, "timeout");
      } else if (result.error) {
        const message = result.error.message ?? "staging_readonly_rpc_failed";
        errorCount += 1;
        increment(statusClassCounts, "error");
        if (harnessPlan.stopConditions.stopOnSqlstate57014 && isTimeout57014(message)) {
          increment(errorCategoryCounts, "sqlstate_57014");
          appendTargetError(target, "sqlstate_57014");
          triggerAbort("sqlstate_57014");
        } else if (harnessPlan.stopConditions.stopOnHttp429Or5xx && isHttp429Or5xx(message)) {
          increment(errorCategoryCounts, "http_429_or_5xx");
          appendTargetError(target, "http_429_or_5xx");
          triggerAbort("http_429_or_5xx");
        } else {
          increment(errorCategoryCounts, "staging_read_error");
          appendTargetError(target, "staging_read_error");
        }
      } else {
        totalRequestsCompleted += 1;
        increment(statusClassCounts, "ok");
        allLatencies.push(latencyMs);
        const samples = targetSamples.get(target.id) ?? [];
        samples.push({
          latencyMs,
          payloadBytes: payloadBytes(result.data),
          rowCount: countRowsFromRpcData(result.data),
        });
        targetSamples.set(target.id, samples);
      }

      const observedErrorRate = totalRequestsAttempted > 0 ? errorCount / totalRequestsAttempted : 0;
      if (observedErrorRate > harnessPlan.stopConditions.maxErrorRate) {
        triggerAbort("error_rate_exceeded");
      }
      await maybeProbeReadiness();
    } finally {
      active -= 1;
    }
  };

  const runRampBatch = async (batch: { concurrency: number; items: StagingLoadTarget[] }) => {
    const batchQueue = [...batch.items];
    const batchConcurrency = Math.max(1, Math.min(batch.concurrency, batchQueue.length || 1));
    const worker = async () => {
      while (batchQueue.length > 0 && !abortTriggered) {
        const target = batchQueue.shift();
        if (target) {
          totalRequestsUnstarted = Math.max(0, totalRequestsUnstarted - 1);
          await runTarget(target);
        }
      }
    };

    await Promise.all(Array.from({ length: batchConcurrency }, () => worker()));
  };

  for (const batch of rampBatches) {
    if (abortTriggered) break;
    await runRampBatch(batch);
    if (readinessProbeInFlight) {
      await readinessProbeInFlight;
    }
  }
  if (readinessProbeInFlight) await readinessProbeInFlight;

  const observedErrorRate = totalRequestsAttempted > 0 ? errorCount / totalRequestsAttempted : 0;
  const latencyP95 = percentile(allLatencies, 0.95);
  const thresholdDecision = evaluateStagingLoadLiveThresholds({
    totalRequestsPlanned: countStagingLoadTargetExecutionPlanRequests(executionPlan),
    totalRequestsAttempted,
    totalRequestsCompleted,
    observedErrorRate,
    maxErrorRate: harnessPlan.stopConditions.maxErrorRate,
    abortTriggered,
    abortReason,
  });
  const healthAfter = await probeStagingBffReadiness();
  const latencyExceeded = latencyP95 != null && latencyP95 > harnessPlan.stopConditions.maxP95LatencyMs;
  const failureReasons = [
    ...thresholdDecision.reasons,
    ...(latencyExceeded ? ["p95_latency_exceeded"] : []),
    ...(isReadinessProbeGreen(healthAfter) ? [] : ["health_ready_failed_after_load"]),
  ];
  const status: SLoad01StepStatus = !isReadinessProbeGreen(healthAfter)
    ? "health_failed"
    : failureReasons.length === 0
      ? "green"
      : "aborted";
  const maxBatchConcurrency = rampBatches.reduce((highest, batch) => Math.max(highest, batch.concurrency), 0);

  return {
    id: step.id,
    phase: step.phase,
    requestCount: step.requestCount,
    status,
    skipReason: null,
    failureReasons,
    durationMs: Date.now() - startedAt,
    concurrency: {
      configured: harnessPlan.targetConcurrency,
      maxObserved: maxConcurrencyObserved,
    },
    rampConfig: {
      steps: harnessPlan.rampSteps,
      batchCount: rampBatches.length,
      maxBatchConcurrency,
      cooldownMs: harnessPlan.stopConditions.cooldownMs,
      requestTimeoutMs: harnessPlan.stopConditions.requestTimeoutMs,
      maxP95LatencyMs: harnessPlan.stopConditions.maxP95LatencyMs,
      maxErrorRate: harnessPlan.stopConditions.maxErrorRate,
    },
    abortStatus: {
      triggered: abortTriggered || status !== "green",
      reason: abortReason ?? (failureReasons[0] ?? null),
    },
    healthBefore,
    healthAfter,
    metrics: {
      targetCount: targets.length,
      totalRequestsPlanned: countStagingLoadTargetExecutionPlanRequests(executionPlan),
      totalRequestsAttempted,
      totalRequestsCompleted,
      totalRequestsAborted: abortTriggered ? totalRequestsUnstarted : 0,
      errorCount,
      observedErrorRate,
      latencyP50: percentile(allLatencies, 0.5),
      latencyP95,
      latencyP99: percentile(allLatencies, 0.99),
      timeoutCount,
      maxConcurrencyConfigured: harnessPlan.targetConcurrency,
      maxConcurrencyObserved,
      statusClassCounts,
      errorCategoryCounts,
      healthReadyDuring,
    },
    targetSummaries: summarizeTargets(targets, targetSamples, targetErrors),
    thresholdDecision,
  };
};

const buildBaseBlockers = (params: {
  allowLive: boolean;
  envStatus: StagingLoadEnvStatus;
  approvals: ApprovalSnapshot;
  safetyDryRun: LoadRunnerEmulatorDryRunResult;
  scenarioValidation: LoadRunnerValidationResult;
  railsValidation: LoadRunnerValidationResult;
}): string[] => [
  ...(params.allowLive ? [] : ["allow_live_flag_missing"]),
  ...(params.envStatus.canRunLive ? [] : params.envStatus.missingKeys.map((key) => `missing_env:${key}`)),
  ...(params.approvals.commonPresent ? [] : ["common_load_approvals_missing"]),
  ...(params.safetyDryRun.status === "passed" ? [] : ["load_runner_safety_dry_run_failed"]),
  ...(params.scenarioValidation.passed ? [] : params.scenarioValidation.errors.map((error) => `scenario:${error}`)),
  ...(params.railsValidation.passed ? [] : params.railsValidation.errors.map((error) => `rails:${error}`)),
];

const runSLoad01Wave = async (): Promise<SLoad01ArtifactPayload> => {
  const generatedAt = new Date().toISOString();
  const allowLive = hasFlag("--allow-live");
  const envStatus = resolveStagingLoadEnvStatus(process.env);
  const approvals = resolveApprovals();
  const stepPlan = buildSLoad01StepPlan();
  const safetyConfig = buildLoadRunnerReadonlySafetyConfig({
    rails: {
      maxRequests: 5_000,
      maxConcurrency: 5_000,
      requestTimeoutMs: stepPlan[stepPlan.length - 1]?.stopConditions.requestTimeoutMs ?? 8_000,
      maxErrorRate: stepPlan[stepPlan.length - 1]?.stopConditions.maxErrorRate ?? 0.02,
    },
  });
  const scenarioValidation = validateLoadRunnerReadOnlyScenarios(safetyConfig.scenarios);
  const railsValidation = validateLoadRunnerSafetyRails(safetyConfig.rails);
  const safetyDryRun = await runLoadRunnerEmulatorDryRun(safetyConfig);
  const baseBlockers = buildBaseBlockers({
    allowLive,
    envStatus,
    approvals,
    safetyDryRun,
    scenarioValidation,
    railsValidation,
  });
  const targets = DEFAULT_STAGING_LOAD_TARGETS;
  const steps: SLoad01StepResult[] = [];

  if (baseBlockers.length > 0) {
    steps.push(...stepPlan.map((step) => buildSkippedStepResult(step, baseBlockers[0] ?? "blocked_before_load")));
  } else {
    const client = createReadOnlyClient();
    for (const step of stepPlan) {
      const phaseAGreen = S_LOAD_01_PHASE_A_REQUEST_COUNTS.every((requestCount) =>
        steps.some((result) => result.requestCount === requestCount && result.status === "green"),
      );
      const previousFailure = steps.find((result) => result.status !== "green" && result.status !== "not_run");
      if (previousFailure) {
        steps.push(buildSkippedStepResult(step, `prior_step_not_green:${previousFailure.requestCount}`));
        continue;
      }
      if (step.phaseBApprovalRequired && !phaseAGreen) {
        steps.push(buildSkippedStepResult(step, "phase_b_requires_1k_green"));
        continue;
      }
      if (step.phaseBApprovalRequired && !approvals.phaseBPresent) {
        steps.push(buildSkippedStepResult(step, "phase_b_approvals_missing"));
        continue;
      }

      steps.push(await runSLoad01Step(client, step, targets));
    }
  }

  const phaseAGreen = S_LOAD_01_PHASE_A_REQUEST_COUNTS.every((requestCount) =>
    steps.some((step) => step.requestCount === requestCount && step.status === "green"),
  );
  const phaseBStarted = steps.some((step) => step.phase === "phase_b_5k" && step.status !== "not_run");
  const allStepsGreen = stepPlan.every((plannedStep) =>
    steps.some((step) => step.requestCount === plannedStep.requestCount && step.status === "green"),
  );
  const finalStatus = resolveSLoad01FinalStatus({
    phaseAGreen,
    phaseBStarted,
    allStepsGreen,
    healthFailed: steps.some((step) => step.status === "health_failed"),
    blockedBeforeLoad: baseBlockers.length > 0,
    loadAborted: steps.some((step) => step.status === "aborted"),
  });

  return {
    wave: S_LOAD_01_WAVE,
    final_status: finalStatus,
    generatedAt,
    mode: "staging-readonly-ramped-load-proof",
    allowLive,
    environment: {
      ...envStatus,
      stagingBffBaseUrlPresent: String(process.env.STAGING_BFF_BASE_URL ?? "").trim().length > 0,
      productionFallbackUsed: false,
      secretsPrinted: false,
    },
    approvals,
    safety: {
      stagingOnly: true,
      readonlySyntheticOnly: true,
      productionTouched: false,
      productionMutated: false,
      dbWritesInitiated: false,
      migrationsRun: false,
      supabaseProjectChanged: false,
      spendCapChanged: false,
      realtimeLoadRun: false,
      otaPublished: false,
      easBuildTriggered: false,
      cacheConfigChanged: false,
      rateLimitChanged: false,
      routeScopeChanged: false,
      redactedMetricsOnly: true,
      loadRunnerSafetyDryRun: safetyDryRun,
      scenarioValidation,
      railsValidation,
    },
    routeScope: {
      routeCount: targets.length,
      readonlyRpcTargets: targets.map((target) => ({
        id: target.id,
        rpcName: target.rpcName,
        readOnly: true,
      })),
      noRouteExpansion: true,
    },
    blockers: baseBlockers,
    steps,
    gates: {
      focusedTests: "not_run",
      tsc: "not_run",
      lint: "not_run",
      npmTestRunInBand: "not_run",
      architectureScanner: "not_run",
      gitDiffCheck: "not_run",
      releaseVerifyPostPush: "not_run",
      artifactJsonParse: "not_run",
    },
  };
};

const buildMatrixPayload = (payload: SLoad01ArtifactPayload) => ({
  wave: payload.wave,
  final_status: payload.final_status,
  generatedAt: payload.generatedAt,
  environment: payload.environment,
  approvals: {
    commonPresent: payload.approvals.commonPresent,
    phaseBPresent: payload.approvals.phaseBPresent,
  },
  routeScope: payload.routeScope,
  steps: payload.steps.map((step) => ({
    requestCount: step.requestCount,
    phase: step.phase,
    status: step.status,
    durationMs: step.durationMs,
    concurrency: step.concurrency,
    rampConfig: step.rampConfig,
    success: step.metrics.totalRequestsCompleted,
    error: step.metrics.errorCount,
    errorRate: step.metrics.observedErrorRate,
    p50: step.metrics.latencyP50,
    p95: step.metrics.latencyP95,
    p99: step.metrics.latencyP99,
    abortStatus: step.abortStatus,
    healthBefore: step.healthBefore,
    healthAfter: step.healthAfter,
  })),
  gates: payload.gates,
  safety: {
    stagingOnly: payload.safety.stagingOnly,
    readonlySyntheticOnly: payload.safety.readonlySyntheticOnly,
    productionTouched: payload.safety.productionTouched,
    productionMutated: payload.safety.productionMutated,
    dbWritesInitiated: payload.safety.dbWritesInitiated,
    migrationsRun: payload.safety.migrationsRun,
    supabaseProjectChanged: payload.safety.supabaseProjectChanged,
    spendCapChanged: payload.safety.spendCapChanged,
    realtimeLoadRun: payload.safety.realtimeLoadRun,
    redactedMetricsOnly: payload.safety.redactedMetricsOnly,
    loadRunnerSafetyDryRunStatus: payload.safety.loadRunnerSafetyDryRun.status,
  },
});

const displayNumber = (value: number | null): string => (value == null ? "n/a" : String(value));

const displayRate = (value: number): string => `${(value * 100).toFixed(4)}%`;

const renderProof = (payload: SLoad01ArtifactPayload): string => {
  const lines: string[] = [
    `# ${payload.wave}`,
    "",
    `final_status: ${payload.final_status}`,
    `generated_at: ${payload.generatedAt}`,
    "",
    "## Scope",
    "",
    `- staging only: ${payload.safety.stagingOnly ? "YES" : "NO"}`,
    `- readonly/synthetic only: ${payload.safety.readonlySyntheticOnly ? "YES" : "NO"}`,
    `- route expansion: ${payload.routeScope.noRouteExpansion ? "NO" : "YES"}`,
    `- production touched: ${payload.safety.productionTouched ? "YES" : "NO"}`,
    `- DB writes initiated: ${payload.safety.dbWritesInitiated ? "YES" : "NO"}`,
    `- metrics redacted: ${payload.safety.redactedMetricsOnly ? "YES" : "NO"}`,
    "",
    "## Approvals And Environment",
    "",
    `- common load approvals present: ${payload.approvals.commonPresent ? "YES" : "NO"}`,
    `- phase B 5K approvals present: ${payload.approvals.phaseBPresent ? "YES" : "NO"}`,
    `- staging Supabase env present: ${payload.environment.canRunLive ? "YES" : "NO"}`,
    `- staging BFF base URL present: ${payload.environment.stagingBffBaseUrlPresent ? "YES" : "NO"}`,
    `- production fallback used: ${payload.environment.productionFallbackUsed ? "YES" : "NO"}`,
    `- secrets printed: ${payload.environment.secretsPrinted ? "YES" : "NO"}`,
    "",
    "## Ladder Results",
    "",
    "| requests | phase | status | attempted | success | errors | error_rate | p50 | p95 | p99 | abort | health_before | ready_before | health_after | ready_after |",
    "| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: |",
    ...payload.steps.map((step) =>
      [
        `| ${step.requestCount}`,
        step.phase,
        step.status,
        String(step.metrics.totalRequestsAttempted),
        String(step.metrics.totalRequestsCompleted),
        String(step.metrics.errorCount),
        displayRate(step.metrics.observedErrorRate),
        displayNumber(step.metrics.latencyP50),
        displayNumber(step.metrics.latencyP95),
        displayNumber(step.metrics.latencyP99),
        step.abortStatus.triggered ? step.abortStatus.reason ?? "triggered" : "NO",
        displayNumber(step.healthBefore?.health.statusCode ?? null),
        displayNumber(step.healthBefore?.ready.statusCode ?? null),
        displayNumber(step.healthAfter?.health.statusCode ?? null),
        `${displayNumber(step.healthAfter?.ready.statusCode ?? null)} |`,
      ].join(" | "),
    ),
    "",
    "## Negative Confirmations",
    "",
    `- no production load: ${payload.safety.productionTouched ? "NO" : "YES"}`,
    `- no Realtime 50K/60K load: ${payload.safety.realtimeLoadRun ? "NO" : "YES"}`,
    `- no migrations: ${payload.safety.migrationsRun ? "NO" : "YES"}`,
    `- no Supabase project changes: ${payload.safety.supabaseProjectChanged ? "NO" : "YES"}`,
    `- no spend cap changes: ${payload.safety.spendCapChanged ? "NO" : "YES"}`,
    `- no cache config changes: ${payload.safety.cacheConfigChanged ? "NO" : "YES"}`,
    `- no rate-limit changes: ${payload.safety.rateLimitChanged ? "NO" : "YES"}`,
  ];
  return `${lines.join("\n")}\n`;
};

async function main() {
  const payload = await runSLoad01Wave();
  writeJson(S_LOAD_01_ARTIFACT_PATHS.results, payload);
  writeJson(S_LOAD_01_ARTIFACT_PATHS.matrix, buildMatrixPayload(payload));
  writeText(S_LOAD_01_ARTIFACT_PATHS.proof, renderProof(payload));
  console.log(
    JSON.stringify(
      {
        final_status: payload.final_status,
        artifacts: S_LOAD_01_ARTIFACT_PATHS,
        steps: payload.steps.map((step) => ({
          requestCount: step.requestCount,
          status: step.status,
          attempted: step.metrics.totalRequestsAttempted,
          completed: step.metrics.totalRequestsCompleted,
          errorRate: step.metrics.observedErrorRate,
        })),
      },
      null,
      2,
    ),
  );
  if (!payload.final_status.startsWith("GREEN_")) {
    process.exitCode = 1;
  }
}

void main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      final_status: "BLOCKED_STAGING_LOAD_ABORTED_SAFELY",
      errorCategory: error instanceof Error ? error.name : "unknown_error",
    }),
  );
  process.exitCode = 1;
});
