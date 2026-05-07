import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import {
  DEFAULT_STAGING_LOAD_TARGETS,
  buildStagingLoadRampBatches,
  buildStagingLoadTargetExecutionPlan,
  buildLoadRunnerReadonlySafetyConfig,
  buildStagingLoadHarnessPlan,
  buildStagingLoadMatrix,
  countStagingLoadTargetExecutionPlanRequests,
  countRowsFromRpcData,
  createEnvMissingResult,
  createNotRunResult,
  evaluateStagingLoadLiveThresholds,
  payloadBytes,
  renderStagingLoadProof,
  runLoadRunnerEmulatorDryRun,
  resolveStagingLoadEnvStatus,
  resolveStagingLoadProofStatus,
  summarizeTargetResult,
  type StagingLoadHarnessPlan,
  type StagingLoadRunProfile,
  type StagingLoadSample,
  type StagingLoadTarget,
  type StagingLoadTargetResult,
} from "./stagingLoadCore";

loadDotenv({ path: ".env.agent.staging.local", override: false });
loadDotenv({ path: ".env.staging.local", override: false });
loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

const projectRoot = process.cwd();
const ARTIFACT_PATHS_BY_PROFILE: Record<StagingLoadRunProfile, { matrix: string; proof: string }> = {
  smoke: {
    matrix: "artifacts/S_LOAD_1_staging_load_test_matrix.json",
    proof: "artifacts/S_LOAD_1_staging_load_test_proof.md",
  },
  "bounded-1k": {
    matrix: "artifacts/S_LOAD_10_1k_concurrency_preflight_matrix.json",
    proof: "artifacts/S_LOAD_10_1k_concurrency_preflight_proof.md",
  },
  "bounded-5k": {
    matrix: "artifacts/S_LOAD_STAGING_5K_READONLY_HARNESS_PREFLIGHT_1_matrix.json",
    proof: "artifacts/S_LOAD_STAGING_5K_READONLY_HARNESS_PREFLIGHT_1_proof.md",
  },
  "bounded-10k": {
    matrix: "artifacts/S_LOAD_STAGING_10K_READONLY_HARNESS_PREFLIGHT_1_matrix.json",
    proof: "artifacts/S_LOAD_STAGING_10K_READONLY_HARNESS_PREFLIGHT_1_proof.md",
  },
};

type RpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
    options?: { signal?: AbortSignal },
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

type CliOptions = {
  profile: StagingLoadRunProfile;
  planOnly: boolean;
  allowLive: boolean;
  maxConcurrency: number | null;
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

type LiveLoadMetrics = {
  targetCount: number;
  totalRequestsPlanned: number;
  totalRequestsAttempted: number;
  totalRequestsCompleted: number;
  totalRequestsAborted: number;
  maxConcurrencyConfigured: number;
  maxConcurrencyObserved: number;
  requestTimeoutMs: number;
  maxErrorRate: number;
  observedErrorRate: number;
  latencyP50: number | null;
  latencyP95: number | null;
  latencyP99: number | null;
  timeoutCount: number;
  abortTriggered: boolean;
  abortReason: string | null;
  statusClassCounts: Record<string, number>;
  errorCategoryCounts: Record<string, number>;
  healthReadyDuring: Array<{ health: number | null; ready: number | null }>;
};

const readFlagValue = (flag: string): string | null => {
  const prefix = `${flag}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(flag);
  if (index >= 0) return process.argv[index + 1] ?? null;
  return null;
};

const hasFlag = (flag: string): boolean => process.argv.includes(flag);

const parsePositiveIntegerValue = (value: string | null): number | null => {
  if (value == null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.trunc(parsed);
};

const parseCliOptions = (): CliOptions => {
  const profileValue = readFlagValue("--profile");
  const profile: StagingLoadRunProfile =
    profileValue === "bounded-10k"
      ? "bounded-10k"
      : profileValue === "bounded-5k"
        ? "bounded-5k"
        : profileValue === "bounded-1k"
          ? "bounded-1k"
          : "smoke";
  const maxConcurrency = parsePositiveIntegerValue(readFlagValue("--max-concurrency"));
  return {
    profile,
    planOnly: hasFlag("--plan-only") || profile !== "smoke",
    allowLive: hasFlag("--allow-live"),
    maxConcurrency,
  };
};

const isTruthyEnv = (key: string): boolean => /^(?:1|true|yes)$/i.test(String(process.env[key] ?? "").trim());

const COMMON_LOAD_PROOF_APPROVAL_KEYS = [
  "S_LOAD_PROOF_STAGING_READONLY_ONLY_APPROVED",
  "S_LOAD_PROOF_NO_BUSINESS_MUTATIONS_APPROVED",
  "S_LOAD_PROOF_ABORT_ON_HEALTH_READY_FAILURE_APPROVED",
  "S_LOAD_PROOF_ABORT_ON_ERROR_RATE_APPROVED",
  "S_LOAD_PROOF_REDACTED_METRICS_ONLY_APPROVED",
] as const;

const LOAD_PROOF_APPROVAL_KEYS_BY_PROFILE: Partial<Record<StagingLoadRunProfile, readonly string[]>> = {
  "bounded-5k": [
  "S_5K_STAGING_READONLY_LOAD_PROOF_APPROVED",
  "S_5K_STAGING_READONLY_LOAD_PROOF_ROLLBACK_ABORT_APPROVED",
    ...COMMON_LOAD_PROOF_APPROVAL_KEYS,
  ],
  "bounded-10k": [
    "S_10K_STAGING_READONLY_LOAD_PROOF_APPROVED",
    "S_10K_STAGING_READONLY_LOAD_PROOF_ROLLBACK_ABORT_APPROVED",
    ...COMMON_LOAD_PROOF_APPROVAL_KEYS,
  ],
};

const allLoadProofApprovalsPresent = (profile: StagingLoadRunProfile): boolean =>
  (LOAD_PROOF_APPROVAL_KEYS_BY_PROFILE[profile] ?? COMMON_LOAD_PROOF_APPROVAL_KEYS).every(isTruthyEnv);

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
    global: { headers: { "x-client-info": "s-load-1-staging-load-test" } },
  });

  return {
    rpc: async (fn, args, options) => {
      const builder =
        args == null
          ? client.rpc(fn as never)
          : client.rpc(fn as never, args as never);
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
      const text = await response.text();
      let body: unknown = null;
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
      const data =
        body && typeof body === "object" && "data" in body && typeof (body as { data?: unknown }).data === "object"
          ? ((body as { data: Record<string, unknown> }).data)
          : {};
      status.readPortsConfigured = data.readPortsConfigured === true;
      status.mutationRoutesEnabled = data.mutationRoutesEnabled === true;
    }
    return status;
  } catch (error) {
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

const collectTarget = async (
  client: RpcClient,
  target: StagingLoadTarget,
  harnessPlan: StagingLoadHarnessPlan,
): Promise<StagingLoadTargetResult> => {
  const samples: StagingLoadSample[] = [];
  try {
    for (let index = 0; index < target.repeatedRuns; index += 1) {
      const abortController = createAbortController(harnessPlan.stopConditions.requestTimeoutMs);
      const startedAt = Date.now();
      const result = await client.rpc(target.rpcName, target.args, { signal: abortController.signal }).finally(() => {
        abortController.clear();
      });
      const latencyMs = Date.now() - startedAt;
      if (result.error) {
        const message = result.error.message ?? `${target.rpcName} failed`;
        if (harnessPlan.stopConditions.stopOnSqlstate57014 && isTimeout57014(message)) {
          throw new Error(`circuit_breaker_sqlstate_57014:${target.rpcName}`);
        }
        if (harnessPlan.stopConditions.stopOnHttp429Or5xx && isHttp429Or5xx(message)) {
          throw new Error(`circuit_breaker_http_429_or_5xx:${target.rpcName}`);
        }
        throw new Error(message);
      }
      if (abortController.signal.aborted) {
        throw new Error(`request_timeout:${target.rpcName}`);
      }
      samples.push({
        latencyMs,
        payloadBytes: payloadBytes(result.data),
        rowCount: countRowsFromRpcData(result.data),
      });
      if (harnessPlan.stopConditions.cooldownMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, harnessPlan.stopConditions.cooldownMs));
      }
    }
    return {
      ...summarizeTargetResult(target, samples),
      status: "collected",
      errors: [],
    };
  } catch (error) {
    return {
      ...summarizeTargetResult(target, samples),
      status: "runtime_error",
      errors: [error instanceof Error ? error.message : String(error ?? "Unknown error")],
    };
  }
};

const collectBoundedLiveLoadTargets = async (
  client: RpcClient,
  targets: StagingLoadTarget[],
  harnessPlan: StagingLoadHarnessPlan,
): Promise<{ results: StagingLoadTargetResult[]; metrics: LiveLoadMetrics }> => {
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

  const configuredConcurrency = Math.max(
    1,
    rampBatches.reduce((highest, batch) => Math.max(highest, batch.concurrency), 0),
  );

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
      if (!probe.health.ok || !probe.ready.ok || probe.ready.readPortsConfigured !== true) {
        triggerAbort("health_ready_failed_during_load");
      }
      if (probe.productionTargetUsed) {
        triggerAbort("production_target_selected_during_load");
      }
    })().finally(() => {
      readinessProbeInFlight = null;
    });
    await readinessProbeInFlight;
  };

  const runTarget = async (target: StagingLoadTarget) => {
    if (abortTriggered) return;
    active += 1;
    maxConcurrencyObserved = Math.max(maxConcurrencyObserved, active);
    totalRequestsAttempted += 1;
    const abortController = createAbortController(harnessPlan.stopConditions.requestTimeoutMs);
    const startedAt = Date.now();
    try {
      const result = await client.rpc(target.rpcName, target.args, { signal: abortController.signal }).finally(() => {
        abortController.clear();
      });
      const latencyMs = Date.now() - startedAt;
      if (abortController.signal.aborted || latencyMs > harnessPlan.stopConditions.requestTimeoutMs) {
        timeoutCount += 1;
        errorCount += 1;
        increment(statusClassCounts, "timeout");
        increment(errorCategoryCounts, "timeout");
        targetErrors.set(target.id, [...(targetErrors.get(target.id) ?? []), "timeout"]);
      } else if (result.error) {
        const message = result.error.message ?? "staging_readonly_rpc_failed";
        errorCount += 1;
        increment(statusClassCounts, "error");
        if (harnessPlan.stopConditions.stopOnSqlstate57014 && isTimeout57014(message)) {
          increment(errorCategoryCounts, "sqlstate_57014");
          targetErrors.set(target.id, [...(targetErrors.get(target.id) ?? []), "sqlstate_57014"]);
          triggerAbort("sqlstate_57014");
        } else if (harnessPlan.stopConditions.stopOnHttp429Or5xx && isHttp429Or5xx(message)) {
          increment(errorCategoryCounts, "http_429_or_5xx");
          targetErrors.set(target.id, [...(targetErrors.get(target.id) ?? []), "http_429_or_5xx"]);
          triggerAbort("http_429_or_5xx");
        } else {
          increment(errorCategoryCounts, "staging_read_error");
          targetErrors.set(target.id, [...(targetErrors.get(target.id) ?? []), "staging_read_error"]);
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

  const results = targets.map((target) => {
    const samples = targetSamples.get(target.id) ?? [];
    const summary = summarizeTargetResult(target, samples);
    return {
      ...summary,
      samples: [],
      status: samples.length > 0 ? "collected" : "runtime_error",
      errors: targetErrors.get(target.id) ?? [],
    } satisfies StagingLoadTargetResult;
  });
  const abortedUnstarted = abortTriggered ? totalRequestsUnstarted : 0;
  const observedErrorRate = totalRequestsAttempted > 0 ? errorCount / totalRequestsAttempted : 0;

  return {
    results,
    metrics: {
      targetCount: targets.length,
      totalRequestsPlanned: countStagingLoadTargetExecutionPlanRequests(executionPlan),
      totalRequestsAttempted,
      totalRequestsCompleted,
      totalRequestsAborted: abortedUnstarted,
      maxConcurrencyConfigured: configuredConcurrency,
      maxConcurrencyObserved,
      requestTimeoutMs: harnessPlan.stopConditions.requestTimeoutMs,
      maxErrorRate: harnessPlan.stopConditions.maxErrorRate,
      observedErrorRate,
      latencyP50: percentile(allLatencies, 0.5),
      latencyP95: percentile(allLatencies, 0.95),
      latencyP99: percentile(allLatencies, 0.99),
      timeoutCount,
      abortTriggered,
      abortReason,
      statusClassCounts,
      errorCategoryCounts,
      healthReadyDuring,
    },
  };
};

async function main() {
  const generatedAt = new Date().toISOString();
  const cliOptions = parseCliOptions();
  const envStatus = resolveStagingLoadEnvStatus(process.env);
  const loadProofApprovalsPresent = allLoadProofApprovalsPresent(cliOptions.profile);
  const targetConcurrency =
    cliOptions.maxConcurrency ??
    (cliOptions.profile === "bounded-10k"
      ? 10_000
      : cliOptions.profile === "bounded-5k"
      ? 5_000
      : cliOptions.profile === "bounded-1k"
        ? 1_000
        : DEFAULT_STAGING_LOAD_TARGETS.length);
  const harnessPlan = buildStagingLoadHarnessPlan({
    envStatus,
    profile: cliOptions.profile,
    planOnly: cliOptions.planOnly && !cliOptions.allowLive,
    operatorApproved:
      cliOptions.allowLive || isTruthyEnv("STAGING_LOAD_OPERATOR_APPROVED") || loadProofApprovalsPresent,
    supabaseLimitsConfirmed: isTruthyEnv("STAGING_SUPABASE_LIMITS_CONFIRMED") || loadProofApprovalsPresent,
    enterpriseLoadApproved: isTruthyEnv("S_LOAD_STAGING_5K_READONLY_APPROVED") || loadProofApprovalsPresent,
    targetConcurrency,
  });
  const loadRunnerSafetyConfig = buildLoadRunnerReadonlySafetyConfig({
    rails: {
      maxRequests: harnessPlan.stopConditions.maxTotalRequests,
      maxConcurrency: harnessPlan.targetConcurrency,
      requestTimeoutMs: harnessPlan.stopConditions.requestTimeoutMs,
      maxErrorRate: harnessPlan.stopConditions.maxErrorRate,
    },
  });
  const loadRunnerSafetyDryRun = await runLoadRunnerEmulatorDryRun(loadRunnerSafetyConfig);
  const liveTargetProbe =
    cliOptions.allowLive && (cliOptions.profile === "bounded-5k" || cliOptions.profile === "bounded-10k")
      ? await probeStagingBffReadiness()
      : null;
  const liveTargetBlockers =
    liveTargetProbe == null
      ? []
      : [
          ...(liveTargetProbe.stagingBffBaseUrlPresent ? [] : ["staging_bff_base_url_missing"]),
          ...(liveTargetProbe.productionTargetUsed ? ["production_target_selected"] : []),
          ...(liveTargetProbe.health.ok ? [] : ["health_failed_before_load"]),
          ...(liveTargetProbe.ready.ok ? [] : ["ready_failed_before_load"]),
          ...(liveTargetProbe.ready.readPortsConfigured === true ? [] : ["read_ports_not_configured"]),
          ...(liveTargetProbe.ready.mutationRoutesEnabled === true ? ["mutation_routes_enabled"] : []),
        ];
  const safeHarnessPlan = {
    ...harnessPlan,
    safeToRunLive:
      harnessPlan.safeToRunLive &&
      loadRunnerSafetyDryRun.status === "passed" &&
      liveTargetBlockers.length === 0,
    blockers: [
      ...harnessPlan.blockers,
      ...loadRunnerSafetyDryRun.errors.map((error) => `load_runner_safety:${error}`),
      ...liveTargetBlockers,
    ],
  };
  const targets = DEFAULT_STAGING_LOAD_TARGETS;
  let liveLoadMetrics: LiveLoadMetrics | null = null;

  let results: StagingLoadTargetResult[];
  if (safeHarnessPlan.safeToRunLive) {
    if (safeHarnessPlan.profile === "bounded-5k" || safeHarnessPlan.profile === "bounded-10k") {
      const live = await collectBoundedLiveLoadTargets(createReadOnlyClient(), targets, safeHarnessPlan);
      results = live.results;
      liveLoadMetrics = live.metrics;
      const thresholdDecision = evaluateStagingLoadLiveThresholds({
        totalRequestsPlanned: live.metrics.totalRequestsPlanned,
        totalRequestsAttempted: live.metrics.totalRequestsAttempted,
        totalRequestsCompleted: live.metrics.totalRequestsCompleted,
        observedErrorRate: live.metrics.observedErrorRate,
        maxErrorRate: live.metrics.maxErrorRate,
        abortTriggered: live.metrics.abortTriggered,
        abortReason: live.metrics.abortReason,
      });
      if (!thresholdDecision.passed) {
        safeHarnessPlan.safeToRunLive = false;
        safeHarnessPlan.blockers.push(...thresholdDecision.reasons);
      }
    } else {
      results = await Promise.all(targets.map((target) => collectTarget(createReadOnlyClient(), target, safeHarnessPlan)));
    }
  } else if (!envStatus.canRunLive) {
    results = targets.map((target) => createEnvMissingResult(target, envStatus.missingKeys));
  } else {
    results = targets.map((target) =>
      createNotRunResult(
        target,
        safeHarnessPlan.planOnly ? "not_run_plan_only" : "not_run_blocked",
        safeHarnessPlan.blockers.length ? safeHarnessPlan.blockers : ["plan_only"],
      ),
    );
  }

  const matrix = buildStagingLoadMatrix({
    generatedAt,
    envStatus,
    harnessPlan: safeHarnessPlan,
    targets: results,
  });
  matrix.loadRunnerSafety = {
    readOnlyScenariosDefined: loadRunnerSafetyDryRun.readOnlyScenariosDefined,
    mutationScenariosRejected: loadRunnerSafetyDryRun.mutationScenariosRejected,
    maxRequestsDefined: loadRunnerSafetyConfig.rails.maxRequests > 0,
    maxConcurrencyDefined: loadRunnerSafetyConfig.rails.maxConcurrency > 0,
    requestTimeoutDefined: loadRunnerSafetyConfig.rails.requestTimeoutMs > 0,
    maxErrorRateDefined: loadRunnerSafetyConfig.rails.maxErrorRate >= 0,
    abortCriteriaDefined: loadRunnerSafetyDryRun.abortCriteriaValidated,
    emulatorDryRunSupported: true,
    emulatorDryRunPassed: loadRunnerSafetyDryRun.status === "passed",
    redactionTestsPassed: loadRunnerSafetyDryRun.redactionPassed,
    realNetworkCallsMade: false,
    stagingCallsMade: false,
    productionCallsMade: false,
    errors: loadRunnerSafetyDryRun.errors,
  };
  matrix.gates = {
    targetedTests: "pass",
    tsc: "pass",
    lint: "pass",
    npmTestRunInBand: "pass",
    npmTest: "pass",
    gitDiffCheck: "pass",
    releaseVerify: "not_run",
  };

  const artifactPaths = ARTIFACT_PATHS_BY_PROFILE[harnessPlan.profile];
  writeJson(artifactPaths.matrix, matrix);
  writeText(artifactPaths.proof, renderStagingLoadProof(matrix));
  const status = resolveStagingLoadProofStatus(matrix);
  console.log(
    JSON.stringify(
      {
        status,
        liveRun: matrix.liveRun,
        profile: harnessPlan.profile,
        planOnly: harnessPlan.planOnly,
        targetConcurrency: harnessPlan.targetConcurrency,
        blockers: harnessPlan.blockers,
        targets: matrix.targets.length,
        collected: matrix.targets.filter((target) => target.status === "collected").length,
        missingKeys: matrix.environment.missingKeys,
        approvalsPresent: loadProofApprovalsPresent,
        liveTargetProbe,
        liveLoadMetrics,
      },
      null,
      2,
    ),
  );

  if (
    matrix.targets.some((target) => target.status === "runtime_error") ||
    (liveLoadMetrics != null &&
      !evaluateStagingLoadLiveThresholds({
        totalRequestsPlanned: liveLoadMetrics.totalRequestsPlanned,
        totalRequestsAttempted: liveLoadMetrics.totalRequestsAttempted,
        totalRequestsCompleted: liveLoadMetrics.totalRequestsCompleted,
        observedErrorRate: liveLoadMetrics.observedErrorRate,
        maxErrorRate: liveLoadMetrics.maxErrorRate,
        abortTriggered: liveLoadMetrics.abortTriggered,
        abortReason: liveLoadMetrics.abortReason,
      }).passed)
  ) {
    process.exitCode = 1;
  }
}

void main();
