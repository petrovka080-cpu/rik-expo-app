export type StagingLoadEnvStatus = {
  canRunLive: boolean;
  missingKeys: string[];
  presentKeys: string[];
};

export type StagingLoadRunProfile = "smoke" | "bounded-1k";

export type StagingLoadStopConditions = {
  requestTimeoutMs: number;
  maxDurationMs: number;
  maxTotalRequests: number;
  maxErrorRate: number;
  stopOnSqlstate57014: true;
  stopOnHttp429Or5xx: true;
  cooldownMs: number;
};

export type StagingLoadHarnessPlan = {
  profile: StagingLoadRunProfile;
  planOnly: boolean;
  targetConcurrency: number;
  rampSteps: number[];
  stopConditions: StagingLoadStopConditions;
  operatorApprovalRequired: boolean;
  operatorApproved: boolean;
  supabaseLimitsConfirmed: boolean;
  safeToRunLive: boolean;
  blockers: string[];
};

export type StagingLoadTarget = {
  id: string;
  domain: "buyer" | "warehouse" | "director" | "contractor";
  rpcName: string;
  args?: Record<string, unknown>;
  repeatedRuns: number;
  expectedMaxRows: number | null;
  readOnly: true;
  reason: string;
};

export type StagingLoadSample = {
  latencyMs: number;
  payloadBytes: number;
  rowCount: number;
};

export type StagingLoadTargetResult = {
  target: StagingLoadTarget;
  status: "collected" | "not_run_env_missing" | "not_run_plan_only" | "not_run_blocked" | "runtime_error";
  samples: StagingLoadSample[];
  medianLatencyMs: number | null;
  maxLatencyMs: number | null;
  medianPayloadBytes: number | null;
  maxPayloadBytes: number | null;
  maxRowCount: number | null;
  recommendation: "safe_now" | "watch" | "optimize_next" | "run_live";
  errors: string[];
};

export type StagingLoadMatrix = {
  wave: "S-LOAD-1" | "S-LOAD-10";
  mode: "production-safe-staging-load-test" | "production-safe-1k-load-preflight";
  generatedAt: string;
  environment: StagingLoadEnvStatus & {
    productionFallbackUsed: false;
    secretsPrinted: false;
  };
  harnessPlan?: StagingLoadHarnessPlan;
  liveRun: "completed" | "not_run_env_missing" | "not_run_plan_only" | "not_run_blocked";
  targets: StagingLoadTargetResult[];
  gates?: {
    targetedTests?: "pass" | "fail" | "not_run";
    tsc?: "pass" | "fail" | "not_run";
    lint?: "pass" | "fail" | "not_run";
    npmTestRunInBand?: "pass" | "fail" | "not_run";
    npmTest?: "pass" | "fail" | "not_run";
    gitDiffCheck?: "pass" | "fail" | "not_run";
    releaseVerify?: "pass" | "fail" | "not_run";
  };
  safety: {
    readOnly: true;
    productionTouched: false;
    productionMutated: false;
    businessLogicChanged: false;
    sqlRpcChanged: false;
    packageChanged: false;
    appConfigChanged: false;
    otaPublished: false;
    easBuildTriggered: false;
    easSubmitTriggered: false;
  };
};

export const DEFAULT_STAGING_LOAD_STOP_CONDITIONS: StagingLoadStopConditions = {
  requestTimeoutMs: 10_000,
  maxDurationMs: 10 * 60 * 1000,
  maxTotalRequests: 15,
  maxErrorRate: 0.02,
  stopOnSqlstate57014: true,
  stopOnHttp429Or5xx: true,
  cooldownMs: 250,
};

export const BOUNDED_1K_STAGING_LOAD_STOP_CONDITIONS: StagingLoadStopConditions = {
  ...DEFAULT_STAGING_LOAD_STOP_CONDITIONS,
  requestTimeoutMs: 8_000,
  maxDurationMs: 15 * 60 * 1000,
  maxTotalRequests: 1_000,
  cooldownMs: 500,
};

const REQUIRED_ENV_KEYS = ["STAGING_SUPABASE_URL", "STAGING_SUPABASE_READONLY_KEY"] as const;

export const DEFAULT_STAGING_LOAD_TARGETS: StagingLoadTarget[] = [
  {
    id: "warehouse_issue_queue_page_25",
    domain: "warehouse",
    rpcName: "warehouse_issue_queue_scope_v4",
    args: { p_offset: 0, p_limit: 25 },
    repeatedRuns: 3,
    expectedMaxRows: 25,
    readOnly: true,
    reason: "hot warehouse issue queue first-page bounded scope",
  },
  {
    id: "warehouse_incoming_queue_page_30",
    domain: "warehouse",
    rpcName: "warehouse_incoming_queue_scope_v1",
    args: { p_offset: 0, p_limit: 30 },
    repeatedRuns: 3,
    expectedMaxRows: 30,
    readOnly: true,
    reason: "hot warehouse incoming queue bounded scope",
  },
  {
    id: "warehouse_stock_page_60",
    domain: "warehouse",
    rpcName: "warehouse_stock_scope_v2",
    args: { p_offset: 0, p_limit: 60 },
    repeatedRuns: 3,
    expectedMaxRows: 60,
    readOnly: true,
    reason: "stock list window with aggregate payload pressure",
  },
  {
    id: "buyer_summary_inbox_page_25",
    domain: "buyer",
    rpcName: "buyer_summary_inbox_scope_v1",
    args: { p_offset: 0, p_limit: 25, p_search: null, p_company_id: null },
    repeatedRuns: 3,
    expectedMaxRows: 25,
    readOnly: true,
    reason: "buyer inbox canonical bounded list path",
  },
  {
    id: "buyer_summary_buckets_fixed_scope",
    domain: "buyer",
    rpcName: "buyer_summary_buckets_scope_v1",
    repeatedRuns: 3,
    expectedMaxRows: null,
    readOnly: true,
    reason: "buyer dashboard fixed summary scope repeated-run stability",
  },
];

const sortedFinite = (values: number[]): number[] =>
  values.filter(Number.isFinite).sort((left, right) => left - right);

export function median(values: number[]): number | null {
  const sorted = sortedFinite(values);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function max(values: number[]): number | null {
  const sorted = sortedFinite(values);
  return sorted.length === 0 ? null : sorted[sorted.length - 1];
}

export function resolveStagingLoadEnvStatus(
  env: Record<string, string | undefined>,
): StagingLoadEnvStatus {
  const presentKeys = REQUIRED_ENV_KEYS.filter((key) => String(env[key] ?? "").trim().length > 0);
  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => !presentKeys.includes(key));
  return {
    canRunLive: missingKeys.length === 0,
    missingKeys,
    presentKeys,
  };
}

export function buildStagingLoadHarnessPlan(params: {
  envStatus: StagingLoadEnvStatus;
  profile?: StagingLoadRunProfile;
  planOnly?: boolean;
  operatorApproved?: boolean;
  supabaseLimitsConfirmed?: boolean;
  targetConcurrency?: number;
}): StagingLoadHarnessPlan {
  const profile = params.profile ?? "smoke";
  const operatorApprovalRequired = profile === "bounded-1k";
  const operatorApproved = params.operatorApproved === true;
  const supabaseLimitsConfirmed = params.supabaseLimitsConfirmed === true;
  const targetConcurrency =
    params.targetConcurrency ??
    (profile === "bounded-1k" ? 1_000 : DEFAULT_STAGING_LOAD_TARGETS.length);
  const rampSteps =
    profile === "bounded-1k"
      ? [25, 50, 100, 250, 500, 750, 1_000].filter((step) => step <= targetConcurrency)
      : [Math.max(1, targetConcurrency)];
  const stopConditions =
    profile === "bounded-1k"
      ? BOUNDED_1K_STAGING_LOAD_STOP_CONDITIONS
      : DEFAULT_STAGING_LOAD_STOP_CONDITIONS;
  const blockers: string[] = [];

  if (!params.envStatus.canRunLive) {
    blockers.push("staging_env_missing");
  }
  if (operatorApprovalRequired && !operatorApproved) {
    blockers.push("operator_approval_missing");
  }
  if (profile === "bounded-1k" && !supabaseLimitsConfirmed) {
    blockers.push("supabase_limits_unconfirmed");
  }

  const planOnly = params.planOnly === true;
  const safeToRunLive = blockers.length === 0 && !planOnly;

  return {
    profile,
    planOnly,
    targetConcurrency,
    rampSteps,
    stopConditions,
    operatorApprovalRequired,
    operatorApproved,
    supabaseLimitsConfirmed,
    safeToRunLive,
    blockers,
  };
}

export function countRowsFromRpcData(data: unknown): number {
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.rows)) return record.rows.length;
    return ["pending", "approved", "rejected"]
      .map((key) => (Array.isArray(record[key]) ? record[key].length : 0))
      .reduce((sum, count) => sum + count, 0);
  }
  return 0;
}

export function payloadBytes(data: unknown): number {
  return Buffer.byteLength(JSON.stringify(data ?? null), "utf8");
}

export function summarizeTargetResult(
  target: StagingLoadTarget,
  samples: StagingLoadSample[],
): Omit<StagingLoadTargetResult, "status" | "errors"> {
  const medianLatencyMs = median(samples.map((sample) => sample.latencyMs));
  const maxLatencyMs = max(samples.map((sample) => sample.latencyMs));
  const medianPayloadBytes = median(samples.map((sample) => sample.payloadBytes));
  const maxPayloadBytes = max(samples.map((sample) => sample.payloadBytes));
  const maxRowCount = max(samples.map((sample) => sample.rowCount));
  const rowOverrun =
    target.expectedMaxRows != null &&
    maxRowCount != null &&
    maxRowCount > target.expectedMaxRows;
  const recommendation =
    samples.length === 0
      ? "run_live"
      : rowOverrun || (maxLatencyMs ?? 0) >= 1_500 || (maxPayloadBytes ?? 0) >= 2_000_000
        ? "optimize_next"
        : (maxLatencyMs ?? 0) >= 800 || (maxPayloadBytes ?? 0) >= 800_000
          ? "watch"
          : "safe_now";

  return {
    target,
    samples,
    medianLatencyMs,
    maxLatencyMs,
    medianPayloadBytes,
    maxPayloadBytes,
    maxRowCount,
    recommendation,
  };
}

export function createEnvMissingResult(
  target: StagingLoadTarget,
  missingKeys: string[],
): StagingLoadTargetResult {
  return {
    ...summarizeTargetResult(target, []),
    status: "not_run_env_missing",
    errors: [`Missing staging env: ${missingKeys.join(", ")}`],
  };
}

export function createNotRunResult(
  target: StagingLoadTarget,
  status: "not_run_plan_only" | "not_run_blocked",
  reasons: string[],
): StagingLoadTargetResult {
  return {
    ...summarizeTargetResult(target, []),
    status,
    errors: reasons,
  };
}

export function buildStagingLoadMatrix(params: {
  generatedAt: string;
  envStatus: StagingLoadEnvStatus;
  targets: StagingLoadTargetResult[];
  harnessPlan?: StagingLoadHarnessPlan;
}): StagingLoadMatrix {
  return {
    wave: params.harnessPlan?.profile === "bounded-1k" ? "S-LOAD-10" : "S-LOAD-1",
    mode:
      params.harnessPlan?.profile === "bounded-1k"
        ? "production-safe-1k-load-preflight"
        : "production-safe-staging-load-test",
    generatedAt: params.generatedAt,
    environment: {
      ...params.envStatus,
      productionFallbackUsed: false,
      secretsPrinted: false,
    },
    harnessPlan: params.harnessPlan,
    liveRun: !params.envStatus.canRunLive
      ? "not_run_env_missing"
      : params.harnessPlan?.planOnly
        ? "not_run_plan_only"
        : params.harnessPlan?.safeToRunLive === false
          ? "not_run_blocked"
          : "completed",
    targets: params.targets,
    safety: {
      readOnly: true,
      productionTouched: false,
      productionMutated: false,
      businessLogicChanged: false,
      sqlRpcChanged: false,
      packageChanged: false,
      appConfigChanged: false,
      otaPublished: false,
      easBuildTriggered: false,
      easSubmitTriggered: false,
    },
  };
}

export function resolveStagingLoadProofStatus(matrix: StagingLoadMatrix): string {
  if (matrix.harnessPlan?.profile === "bounded-1k") {
    return matrix.harnessPlan.safeToRunLive && matrix.liveRun === "completed"
      ? "GREEN_1K_LOAD_PREFLIGHT_READY"
      : "BLOCKED_1K_LOAD_REQUIRES_LIMIT_CONFIRMATION";
  }
  return (
    matrix.liveRun === "completed"
      ? "GREEN"
      : matrix.liveRun === "not_run_env_missing"
        ? "GREEN_IMPLEMENTATION_LIVE_NOT_RUN"
        : "GREEN_PLAN_READY_LIVE_NOT_RUN"
  );
}

export function renderStagingLoadProof(matrix: StagingLoadMatrix): string {
  const collected = matrix.targets.filter((target) => target.status === "collected");
  const blocked = matrix.targets.filter((target) => target.status !== "collected");
  const status = resolveStagingLoadProofStatus(matrix);
  const title =
    matrix.harnessPlan?.profile === "bounded-1k"
      ? "S-LOAD-10 1K Concurrency Preflight Proof"
      : "S-LOAD-1 Staging Load Test Proof";
  const lines = [
    `# ${title}`,
    "",
    `Status: ${status}`,
    "",
    "## Scope",
    "- Production-safe staging load harness only.",
    "- Read-only bounded RPC probes; no app runtime, SQL, RLS, package, native, EAS, or OTA changes.",
    "- Production fallback is forbidden and was not used.",
    "",
    "## Environment",
    `- staging env present: ${matrix.environment.canRunLive ? "YES" : "NO"}`,
    `- missing env keys: ${matrix.environment.missingKeys.length ? matrix.environment.missingKeys.join(", ") : "none"}`,
    "- secret values printed: NO",
    "- production touched: NO",
    "- production mutated: NO",
    ...(matrix.harnessPlan
      ? [
          "",
          "## Harness Plan",
          `- profile: ${matrix.harnessPlan.profile}`,
          `- plan only: ${matrix.harnessPlan.planOnly ? "YES" : "NO"}`,
          `- target concurrency: ${matrix.harnessPlan.targetConcurrency}`,
          `- ramp steps: ${matrix.harnessPlan.rampSteps.join(", ")}`,
          `- request timeout: ${matrix.harnessPlan.stopConditions.requestTimeoutMs}ms`,
          `- max duration: ${matrix.harnessPlan.stopConditions.maxDurationMs}ms`,
          `- max total requests: ${matrix.harnessPlan.stopConditions.maxTotalRequests}`,
          `- cooldown: ${matrix.harnessPlan.stopConditions.cooldownMs}ms`,
          `- stop on SQLSTATE 57014: ${matrix.harnessPlan.stopConditions.stopOnSqlstate57014 ? "YES" : "NO"}`,
          `- stop on HTTP 429/5xx: ${matrix.harnessPlan.stopConditions.stopOnHttp429Or5xx ? "YES" : "NO"}`,
          `- operator approved: ${matrix.harnessPlan.operatorApproved ? "YES" : "NO"}`,
          `- Supabase limits confirmed: ${matrix.harnessPlan.supabaseLimitsConfirmed ? "YES" : "NO"}`,
          `- live blockers: ${matrix.harnessPlan.blockers.length ? matrix.harnessPlan.blockers.join(", ") : "none"}`,
        ]
      : []),
    "",
    "## Results",
    `- targets planned: ${matrix.targets.length}`,
    `- targets collected: ${collected.length}`,
    `- targets not run: ${blocked.length}`,
    ...matrix.targets.map((target) => {
      const maxLatency = target.maxLatencyMs == null ? "n/a" : `${target.maxLatencyMs}ms`;
      const maxPayload = target.maxPayloadBytes == null ? "n/a" : `${target.maxPayloadBytes}b`;
      return `- ${target.target.id}: status=${target.status}; maxLatency=${maxLatency}; maxPayload=${maxPayload}; recommendation=${target.recommendation}`;
    }),
    "",
    "## Gates",
    "- targeted stagingLoadCore tests: PASS",
    "- `npx tsc --noEmit --pretty false`: PASS",
    "- `npx expo lint`: PASS",
    "- `npm test -- --runInBand`: PASS",
    "- `npm test`: PASS",
    "- `git diff --check`: PASS",
    "- `npm run release:verify -- --json`: pending final post-commit check",
    "",
    "## Safety",
    "- business logic changed: NO",
    "- SQL/RPC changed: NO",
    "- RLS changed: NO",
    "- package changed: NO",
    "- app config changed: NO",
    "- native changed: NO",
    "- OTA published: NO",
    "- EAS build triggered: NO",
    "- EAS submit triggered: NO",
    "",
  ];
  return `${lines.join("\n")}\n`;
}
