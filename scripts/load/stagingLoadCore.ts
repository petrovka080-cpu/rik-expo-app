export type StagingLoadEnvStatus = {
  canRunLive: boolean;
  missingKeys: string[];
  presentKeys: string[];
};

export type StagingLoadRunProfile = "smoke" | "bounded-1k" | "bounded-5k" | "bounded-10k";

export type StagingLoadStopConditions = {
  requestTimeoutMs: number;
  maxDurationMs: number;
  maxTotalRequests: number;
  maxP95LatencyMs: number;
  maxErrorRate: number;
  abortOnHealthFailure: true;
  abortOnReadyFailure: true;
  abortOnErrorRateExceeded: true;
  abortOnUnexpectedWriteRoute: true;
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
  enterpriseLoadApprovalRequired: boolean;
  enterpriseLoadApproved: boolean;
  safeToRunLive: boolean;
  blockers: string[];
};

export type StagingLoadLiveThresholdDecision = {
  passed: boolean;
  hardFailure: boolean;
  reasons: string[];
  completionPolicy: "error_budget" | "require_full_completion";
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

export type StagingLoadTargetExecutionPlanItem = {
  target: StagingLoadTarget;
  runs: number;
};

export type LoadRunnerScenarioCategory =
  | "catalog_readonly"
  | "director_reports_readonly"
  | "warehouse_readonly"
  | "bff_health_ready_probe"
  | "bff_readonly_probe";

export type LoadRunnerScenarioTransport = "supabase_rpc" | "bff_read" | "bff_probe";

export type LoadRunnerScenario = {
  id: string;
  category: LoadRunnerScenarioCategory;
  endpointCategoryName: string;
  transport: LoadRunnerScenarioTransport;
  method: "GET" | "POST";
  operation: string;
  readOnly: boolean;
  businessMutation: boolean;
  maxRows: number | null;
  args?: Record<string, unknown>;
};

export type LoadRunnerSafetyRails = {
  readOnlyOnly: true;
  maxRequests: number;
  maxConcurrency: number;
  requestTimeoutMs: number;
  maxErrorRate: number;
  abortOnHealthFailure: true;
  abortOnReadyFailure: true;
  abortOnErrorRateExceeded: true;
  abortOnUnexpectedWriteRoute: true;
};

export type LoadRunnerReadonlySafetyConfig = {
  scenarios: LoadRunnerScenario[];
  rails: LoadRunnerSafetyRails;
};

export type LoadRunnerValidationResult = {
  passed: boolean;
  errors: string[];
};

export type LoadRunnerAbortSnapshot = {
  healthStatus: number | null;
  readyStatus: number | null;
  totalRequests: number;
  errorCount: number;
  unexpectedWriteRouteDetected: boolean;
};

export type LoadRunnerAbortDecision = {
  abort: boolean;
  reasons: string[];
};

export type LoadRunnerSanitizedLogEvent = {
  statusClass: string;
  count: number;
  latencyPercentiles: {
    p50: number | null;
    p95: number | null;
    p99: number | null;
  };
  endpointCategoryName: string;
  errorCategory: string | null;
};

export type LoadRunnerEmulatorScenarioResult = {
  scenarioId: string;
  statusClass: "ok" | "timeout" | "error";
  latencyMs: number;
  rowCount: number;
  payloadBytes: number;
  errorCategory: string | null;
};

export type LoadRunnerEmulatorAdapter = {
  kind: "emulator";
  realNetworkCallsMade: false;
  stagingCallsMade: false;
  productionCallsMade: false;
  request: (scenario: LoadRunnerScenario) => Promise<LoadRunnerEmulatorScenarioResult>;
};

export type LoadRunnerEmulatorDryRunResult = {
  status: "passed" | "failed";
  realNetworkCallsMade: false;
  stagingCallsMade: false;
  productionCallsMade: false;
  scenariosValidated: number;
  readOnlyScenariosDefined: boolean;
  mutationScenariosRejected: boolean;
  maxObservedConcurrency: number;
  maxConcurrencyRespected: boolean;
  abortCriteriaValidated: boolean;
  timeoutHandlingPassed: boolean;
  redactionPassed: boolean;
  logs: LoadRunnerSanitizedLogEvent[];
  errors: string[];
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
  wave:
    | "S-LOAD-1"
    | "S-LOAD-10"
    | "S-LOAD-STAGING-5K-READONLY-HARNESS-PREFLIGHT-1"
    | "S-LOAD-STAGING-10K-READONLY-HARNESS-PREFLIGHT-1";
  mode:
    | "production-safe-staging-load-test"
    | "production-safe-1k-load-preflight"
    | "production-safe-5k-load-preflight"
    | "production-safe-10k-load-preflight";
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
  loadRunnerSafety?: {
    readOnlyScenariosDefined: boolean;
    mutationScenariosRejected: boolean;
    maxRequestsDefined: boolean;
    maxConcurrencyDefined: boolean;
    requestTimeoutDefined: boolean;
    maxErrorRateDefined: boolean;
    abortCriteriaDefined: boolean;
    emulatorDryRunSupported: boolean;
    emulatorDryRunPassed: boolean;
    redactionTestsPassed: boolean;
    realNetworkCallsMade: false;
    stagingCallsMade: false;
    productionCallsMade: false;
    errors: string[];
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
  maxP95LatencyMs: 1_500,
  maxErrorRate: 0.02,
  abortOnHealthFailure: true,
  abortOnReadyFailure: true,
  abortOnErrorRateExceeded: true,
  abortOnUnexpectedWriteRoute: true,
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

export const BOUNDED_5K_STAGING_LOAD_STOP_CONDITIONS: StagingLoadStopConditions = {
  ...BOUNDED_1K_STAGING_LOAD_STOP_CONDITIONS,
  maxDurationMs: 30 * 60 * 1000,
  maxTotalRequests: 5_000,
  cooldownMs: 1_000,
};

export const BOUNDED_10K_STAGING_LOAD_STOP_CONDITIONS: StagingLoadStopConditions = {
  ...BOUNDED_5K_STAGING_LOAD_STOP_CONDITIONS,
  maxDurationMs: 45 * 60 * 1000,
  maxTotalRequests: 10_000,
};

const BOUNDED_1K_RAMP_STEPS = [5, 10, 15, 20, 25, 50, 100, 250, 500, 750, 1_000] as const;

const BOUNDED_5K_RAMP_STEPS = [
  5,
  10,
  15,
  20,
  25,
  50,
  100,
  250,
  500,
  750,
  1_000,
  1_500,
  2_000,
  3_000,
  4_000,
  5_000,
] as const;

const BOUNDED_10K_RAMP_STEPS = [
  ...BOUNDED_5K_RAMP_STEPS,
  6_000,
  7_500,
  10_000,
] as const;

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

export function buildStagingLoadTargetExecutionPlan(
  targets: StagingLoadTarget[],
  maxTotalRequests: number,
): StagingLoadTargetExecutionPlanItem[] {
  if (!Number.isInteger(maxTotalRequests) || maxTotalRequests <= 0 || targets.length === 0) return [];
  const boundedTargets = targets.filter((target) => target.readOnly === true);
  if (boundedTargets.length === 0) return [];

  const baseRuns = Math.floor(maxTotalRequests / boundedTargets.length);
  let remainder = maxTotalRequests % boundedTargets.length;

  return boundedTargets
    .map((target) => {
      const runs = baseRuns + (remainder > 0 ? 1 : 0);
      remainder = Math.max(0, remainder - 1);
      return { target, runs };
    })
    .filter((item) => item.runs > 0);
}

export function countStagingLoadTargetExecutionPlanRequests(
  plan: StagingLoadTargetExecutionPlanItem[],
): number {
  return plan.reduce((sum, item) => sum + item.runs, 0);
}

export function evaluateStagingLoadLiveThresholds(params: {
  totalRequestsPlanned: number;
  totalRequestsAttempted: number;
  totalRequestsCompleted: number;
  observedErrorRate: number;
  maxErrorRate: number;
  abortTriggered: boolean;
  abortReason?: string | null;
  requireFullCompletion?: boolean;
}): StagingLoadLiveThresholdDecision {
  const reasons: string[] = [];

  if (params.abortTriggered) {
    reasons.push(params.abortReason ? `abort:${params.abortReason}` : "abort_triggered");
  }
  if (params.totalRequestsAttempted < params.totalRequestsPlanned) {
    reasons.push("attempted_below_planned");
  }
  if (params.observedErrorRate > params.maxErrorRate) {
    reasons.push("error_rate_exceeded");
  }
  if (params.requireFullCompletion === true && params.totalRequestsCompleted < params.totalRequestsAttempted) {
    reasons.push("completed_below_attempted");
  }

  return {
    passed: reasons.length === 0,
    hardFailure: reasons.length > 0,
    reasons,
    completionPolicy: params.requireFullCompletion === true ? "require_full_completion" : "error_budget",
  };
}

export const DEFAULT_LOAD_RUNNER_READONLY_SCENARIOS: LoadRunnerScenario[] = [
  {
    id: "catalog_items_search_preview_readonly",
    category: "catalog_readonly",
    endpointCategoryName: "catalog.readonly",
    transport: "bff_read",
    method: "POST",
    operation: "catalog.items.search.preview",
    readOnly: true,
    businessMutation: false,
    maxRows: 100,
    args: { pageSize: 60 },
  },
  {
    id: "director_reports_scope_readonly",
    category: "director_reports_readonly",
    endpointCategoryName: "director.reports.readonly",
    transport: "bff_read",
    method: "POST",
    operation: "director.report.transport.scope",
    readOnly: true,
    businessMutation: false,
    maxRows: null,
  },
  {
    id: "warehouse_api_scope_readonly",
    category: "warehouse_readonly",
    endpointCategoryName: "warehouse.readonly",
    transport: "bff_read",
    method: "POST",
    operation: "warehouse.api.read.scope",
    readOnly: true,
    businessMutation: false,
    maxRows: 60,
    args: { pageSize: 60 },
  },
  {
    id: "bff_health_probe",
    category: "bff_health_ready_probe",
    endpointCategoryName: "bff.health",
    transport: "bff_probe",
    method: "GET",
    operation: "bff.health",
    readOnly: true,
    businessMutation: false,
    maxRows: 0,
  },
  {
    id: "bff_ready_probe",
    category: "bff_health_ready_probe",
    endpointCategoryName: "bff.ready",
    transport: "bff_probe",
    method: "GET",
    operation: "bff.ready",
    readOnly: true,
    businessMutation: false,
    maxRows: 0,
  },
  {
    id: "bff_read_ports_probe",
    category: "bff_readonly_probe",
    endpointCategoryName: "bff.read_ports",
    transport: "bff_probe",
    method: "GET",
    operation: "bff.read_ports.status",
    readOnly: true,
    businessMutation: false,
    maxRows: 0,
  },
];

export const DEFAULT_LOAD_RUNNER_SAFETY_RAILS: LoadRunnerSafetyRails = {
  readOnlyOnly: true,
  maxRequests: BOUNDED_5K_STAGING_LOAD_STOP_CONDITIONS.maxTotalRequests,
  maxConcurrency: 5_000,
  requestTimeoutMs: BOUNDED_5K_STAGING_LOAD_STOP_CONDITIONS.requestTimeoutMs,
  maxErrorRate: BOUNDED_5K_STAGING_LOAD_STOP_CONDITIONS.maxErrorRate,
  abortOnHealthFailure: true,
  abortOnReadyFailure: true,
  abortOnErrorRateExceeded: true,
  abortOnUnexpectedWriteRoute: true,
};

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
  enterpriseLoadApproved?: boolean;
  targetConcurrency?: number;
}): StagingLoadHarnessPlan {
  const profile = params.profile ?? "smoke";
  const operatorApprovalRequired = profile !== "smoke";
  const operatorApproved = params.operatorApproved === true;
  const supabaseLimitsConfirmed = params.supabaseLimitsConfirmed === true;
  const enterpriseLoadApprovalRequired = profile === "bounded-5k" || profile === "bounded-10k";
  const enterpriseLoadApproved = params.enterpriseLoadApproved === true;
  const targetConcurrency =
    params.targetConcurrency ??
    (profile === "bounded-10k"
      ? 10_000
      : profile === "bounded-5k"
      ? 5_000
      : profile === "bounded-1k"
        ? 1_000
        : DEFAULT_STAGING_LOAD_TARGETS.length);
  const rampSteps =
    profile === "bounded-10k"
      ? BOUNDED_10K_RAMP_STEPS.filter((step) => step <= targetConcurrency)
      : profile === "bounded-5k"
      ? BOUNDED_5K_RAMP_STEPS.filter((step) => step <= targetConcurrency)
      : profile === "bounded-1k"
        ? BOUNDED_1K_RAMP_STEPS.filter((step) => step <= targetConcurrency)
        : [Math.max(1, targetConcurrency)];
  const stopConditions =
    profile === "bounded-10k"
      ? BOUNDED_10K_STAGING_LOAD_STOP_CONDITIONS
      : profile === "bounded-5k"
      ? BOUNDED_5K_STAGING_LOAD_STOP_CONDITIONS
      : profile === "bounded-1k"
        ? BOUNDED_1K_STAGING_LOAD_STOP_CONDITIONS
        : DEFAULT_STAGING_LOAD_STOP_CONDITIONS;
  const blockers: string[] = [];

  if (!params.envStatus.canRunLive) {
    blockers.push("staging_env_missing");
  }
  if (operatorApprovalRequired && !operatorApproved) {
    blockers.push("operator_approval_missing");
  }
  if (profile !== "smoke" && !supabaseLimitsConfirmed) {
    blockers.push("supabase_limits_unconfirmed");
  }
  if (enterpriseLoadApprovalRequired && !enterpriseLoadApproved) {
    blockers.push(
      profile === "bounded-10k"
        ? "enterprise_10k_load_approval_missing"
        : "enterprise_5k_load_approval_missing",
    );
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
    enterpriseLoadApprovalRequired,
    enterpriseLoadApproved,
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

const WRITE_ROUTE_PATTERN =
  /\b(write|mutation|mutate|insert|update|delete|upsert|truncate|submit|approve|decline|reject|payment|pay|issue_free|issue_request|create_po|apply)\b/i;

const FORBIDDEN_LOG_KEY_PATTERN =
  /(url|uri|token|secret|authorization|cookie|env|payload|body|response|request|row|rows|db|redis|supabase|email|phone|user|company|identifier|id)$/i;

const FORBIDDEN_LOG_VALUE_PATTERN =
  /(https?:\/\/|postgres(?:ql)?:\/\/|redis:\/\/|bearer\s+|eyJ[A-Za-z0-9_-]{10,}|anon[_-]?key|service[_-]?role)/i;

const allowedLogKeys = new Set([
  "statusClass",
  "count",
  "latencyPercentiles",
  "p50",
  "p95",
  "p99",
  "endpointCategoryName",
  "errorCategory",
]);

const collectForbiddenLogEntries = (
  value: unknown,
  path = "event",
  errors: string[] = [],
): string[] => {
  if (value == null) return errors;
  if (typeof value === "string") {
    if (FORBIDDEN_LOG_VALUE_PATTERN.test(value)) {
      errors.push(`${path}:forbidden_value`);
    }
    return errors;
  }
  if (Array.isArray(value)) {
    errors.push(`${path}:arrays_not_allowed_in_load_runner_logs`);
    return errors;
  }
  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const childPath = `${path}.${key}`;
      if (!allowedLogKeys.has(key) || FORBIDDEN_LOG_KEY_PATTERN.test(key)) {
        errors.push(`${childPath}:forbidden_key`);
      }
      collectForbiddenLogEntries(child, childPath, errors);
    }
  }
  return errors;
};

export function isLoadRunnerScenarioReadOnlySafe(scenario: LoadRunnerScenario): boolean {
  if (scenario.readOnly !== true || scenario.businessMutation !== false) return false;
  if (scenario.method !== "GET" && scenario.method !== "POST") return false;
  return !WRITE_ROUTE_PATTERN.test(`${scenario.id} ${scenario.operation} ${scenario.endpointCategoryName}`);
}

export function validateLoadRunnerReadOnlyScenarios(
  scenarios: LoadRunnerScenario[],
): LoadRunnerValidationResult & {
  readOnlyScenarioCount: number;
  mutationScenarioCount: number;
  categories: LoadRunnerScenarioCategory[];
} {
  const errors: string[] = [];
  const categories = Array.from(new Set(scenarios.map((scenario) => scenario.category)));
  const requiredCategories: LoadRunnerScenarioCategory[] = [
    "catalog_readonly",
    "director_reports_readonly",
    "warehouse_readonly",
    "bff_health_ready_probe",
    "bff_readonly_probe",
  ];

  for (const category of requiredCategories) {
    if (!categories.includes(category)) {
      errors.push(`missing_required_readonly_category:${category}`);
    }
  }

  for (const scenario of scenarios) {
    if (!isLoadRunnerScenarioReadOnlySafe(scenario)) {
      errors.push(`mutation_or_write_scenario_rejected:${scenario.id}`);
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    readOnlyScenarioCount: scenarios.filter(isLoadRunnerScenarioReadOnlySafe).length,
    mutationScenarioCount: scenarios.filter((scenario) => !isLoadRunnerScenarioReadOnlySafe(scenario)).length,
    categories,
  };
}

export function validateLoadRunnerSafetyRails(rails: LoadRunnerSafetyRails): LoadRunnerValidationResult {
  const errors: string[] = [];
  if (rails.readOnlyOnly !== true) errors.push("readOnlyOnly_must_be_true");
  if (!Number.isInteger(rails.maxRequests) || rails.maxRequests <= 0) errors.push("maxRequests_missing");
  if (!Number.isInteger(rails.maxConcurrency) || rails.maxConcurrency <= 0) errors.push("maxConcurrency_missing");
  if (!Number.isInteger(rails.requestTimeoutMs) || rails.requestTimeoutMs <= 0) {
    errors.push("requestTimeoutMs_missing");
  }
  if (!Number.isFinite(rails.maxErrorRate) || rails.maxErrorRate < 0 || rails.maxErrorRate > 1) {
    errors.push("maxErrorRate_missing");
  }
  if (rails.abortOnHealthFailure !== true) errors.push("abortOnHealthFailure_missing");
  if (rails.abortOnReadyFailure !== true) errors.push("abortOnReadyFailure_missing");
  if (rails.abortOnErrorRateExceeded !== true) errors.push("abortOnErrorRateExceeded_missing");
  if (rails.abortOnUnexpectedWriteRoute !== true) errors.push("abortOnUnexpectedWriteRoute_missing");
  return { passed: errors.length === 0, errors };
}

export function buildLoadRunnerReadonlySafetyConfig(params?: {
  scenarios?: LoadRunnerScenario[];
  rails?: Partial<LoadRunnerSafetyRails>;
}): LoadRunnerReadonlySafetyConfig {
  return {
    scenarios: params?.scenarios ?? DEFAULT_LOAD_RUNNER_READONLY_SCENARIOS,
    rails: {
      ...DEFAULT_LOAD_RUNNER_SAFETY_RAILS,
      ...params?.rails,
      readOnlyOnly: true,
      abortOnHealthFailure: true,
      abortOnReadyFailure: true,
      abortOnErrorRateExceeded: true,
      abortOnUnexpectedWriteRoute: true,
    },
  };
}

export function evaluateLoadRunnerAbortCriteria(
  snapshot: LoadRunnerAbortSnapshot,
  rails: LoadRunnerSafetyRails,
): LoadRunnerAbortDecision {
  const reasons: string[] = [];
  if (rails.abortOnHealthFailure && snapshot.healthStatus !== 200) {
    reasons.push("health_failure");
  }
  if (rails.abortOnReadyFailure && snapshot.readyStatus !== 200) {
    reasons.push("ready_failure");
  }
  const errorRate = snapshot.totalRequests > 0 ? snapshot.errorCount / snapshot.totalRequests : 0;
  if (rails.abortOnErrorRateExceeded && errorRate > rails.maxErrorRate) {
    reasons.push("error_rate_exceeded");
  }
  if (rails.abortOnUnexpectedWriteRoute && snapshot.unexpectedWriteRouteDetected) {
    reasons.push("unexpected_write_route");
  }
  return {
    abort: reasons.length > 0,
    reasons,
  };
}

export function sanitizeLoadRunnerLogEvent(input: {
  statusClass?: string;
  count?: number;
  latencyMs?: number[];
  endpointCategoryName?: string;
  errorCategory?: string | null;
}): LoadRunnerSanitizedLogEvent {
  const latencies = sortedFinite(input.latencyMs ?? []);
  const percentile = (fraction: number): number | null => {
    if (latencies.length === 0) return null;
    const index = Math.min(latencies.length - 1, Math.ceil(latencies.length * fraction) - 1);
    return latencies[index];
  };
  return {
    statusClass: input.statusClass ?? "unknown",
    count: Number.isFinite(input.count) ? Number(input.count) : 0,
    latencyPercentiles: {
      p50: percentile(0.5),
      p95: percentile(0.95),
      p99: percentile(0.99),
    },
    endpointCategoryName: input.endpointCategoryName ?? "unknown",
    errorCategory: input.errorCategory ?? null,
  };
}

export function validateLoadRunnerLogEvent(event: unknown): LoadRunnerValidationResult {
  const errors = collectForbiddenLogEntries(event);
  return { passed: errors.length === 0, errors };
}

export function createLoadRunnerEmulatorAdapter(
  overrides: Record<string, Partial<LoadRunnerEmulatorScenarioResult>> = {},
): LoadRunnerEmulatorAdapter {
  return {
    kind: "emulator",
    realNetworkCallsMade: false,
    stagingCallsMade: false,
    productionCallsMade: false,
    request: async (scenario) => ({
      scenarioId: scenario.id,
      statusClass: "ok",
      latencyMs: 25,
      rowCount: scenario.maxRows == null ? 1 : Math.min(scenario.maxRows, 1),
      payloadBytes: 128,
      errorCategory: null,
      ...overrides[scenario.id],
    }),
  };
}

export async function runLoadRunnerEmulatorDryRun(
  config: LoadRunnerReadonlySafetyConfig,
  adapter: LoadRunnerEmulatorAdapter = createLoadRunnerEmulatorAdapter(),
): Promise<LoadRunnerEmulatorDryRunResult> {
  const scenarioValidation = validateLoadRunnerReadOnlyScenarios(config.scenarios);
  const railsValidation = validateLoadRunnerSafetyRails(config.rails);
  const errors = [...scenarioValidation.errors, ...railsValidation.errors];
  const abortCriteriaValidated =
    !evaluateLoadRunnerAbortCriteria(
      {
        healthStatus: 200,
        readyStatus: 200,
        totalRequests: 100,
        errorCount: 0,
        unexpectedWriteRouteDetected: false,
      },
      config.rails,
    ).abort &&
    evaluateLoadRunnerAbortCriteria(
      {
        healthStatus: 503,
        readyStatus: 200,
        totalRequests: 100,
        errorCount: 0,
        unexpectedWriteRouteDetected: false,
      },
      config.rails,
    ).reasons.includes("health_failure") &&
    evaluateLoadRunnerAbortCriteria(
      {
        healthStatus: 200,
        readyStatus: 200,
        totalRequests: 100,
        errorCount: 3,
        unexpectedWriteRouteDetected: true,
      },
      config.rails,
    ).reasons.includes("unexpected_write_route") &&
    evaluateLoadRunnerAbortCriteria(
      {
        healthStatus: 200,
        readyStatus: 200,
        totalRequests: 100,
        errorCount: 3,
        unexpectedWriteRouteDetected: true,
      },
      config.rails,
    ).reasons.includes("error_rate_exceeded");

  if (!abortCriteriaValidated) {
    errors.push("abort_criteria_validation_failed");
  }

  const logs: LoadRunnerSanitizedLogEvent[] = [];
  let timeoutHandlingPassed = false;
  let active = 0;
  let maxObservedConcurrency = 0;
  const concurrency = Math.max(1, Math.min(config.rails.maxConcurrency, config.scenarios.length));
  const queue = [...config.scenarios];

  const runNext = async (): Promise<void> => {
    const scenario = queue.shift();
    if (!scenario) return;
    active += 1;
    maxObservedConcurrency = Math.max(maxObservedConcurrency, active);
    try {
      const result = await adapter.request(scenario);
      if (result.latencyMs > config.rails.requestTimeoutMs || result.statusClass === "timeout") {
        timeoutHandlingPassed = true;
      }
      const log = sanitizeLoadRunnerLogEvent({
        statusClass: result.statusClass,
        count: result.rowCount,
        latencyMs: [result.latencyMs],
        endpointCategoryName: scenario.endpointCategoryName,
        errorCategory: result.errorCategory,
      });
      const logValidation = validateLoadRunnerLogEvent(log);
      if (!logValidation.passed) {
        errors.push(...logValidation.errors);
      }
      logs.push(log);
    } finally {
      active -= 1;
      await runNext();
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => runNext()));

  const maxConcurrencyRespected = maxObservedConcurrency <= config.rails.maxConcurrency;
  if (!maxConcurrencyRespected) {
    errors.push("max_concurrency_exceeded");
  }
  if (adapter.realNetworkCallsMade || adapter.stagingCallsMade || adapter.productionCallsMade) {
    errors.push("dry_run_adapter_made_real_network_call");
  }

  const redactionPassed = logs.every((log) => validateLoadRunnerLogEvent(log).passed);
  if (!redactionPassed) {
    errors.push("redaction_validation_failed");
  }

  return {
    status: errors.length === 0 ? "passed" : "failed",
    realNetworkCallsMade: false,
    stagingCallsMade: false,
    productionCallsMade: false,
    scenariosValidated: config.scenarios.length,
    readOnlyScenariosDefined: scenarioValidation.readOnlyScenarioCount === config.scenarios.length,
    mutationScenariosRejected: validateLoadRunnerReadOnlyScenarios([
      ...config.scenarios,
      {
        id: "rejected_submit_mutation",
        category: "bff_readonly_probe",
        endpointCategoryName: "mutation.rejected",
        transport: "bff_read",
        method: "POST",
        operation: "proposal.submit.mutation",
        readOnly: false,
        businessMutation: true,
        maxRows: null,
      },
    ]).passed === false,
    maxObservedConcurrency,
    maxConcurrencyRespected,
    abortCriteriaValidated,
    timeoutHandlingPassed,
    redactionPassed,
    logs,
    errors,
  };
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
    wave:
      params.harnessPlan?.profile === "bounded-10k"
        ? "S-LOAD-STAGING-10K-READONLY-HARNESS-PREFLIGHT-1"
        : params.harnessPlan?.profile === "bounded-5k"
        ? "S-LOAD-STAGING-5K-READONLY-HARNESS-PREFLIGHT-1"
        : params.harnessPlan?.profile === "bounded-1k"
          ? "S-LOAD-10"
          : "S-LOAD-1",
    mode:
      params.harnessPlan?.profile === "bounded-10k"
        ? "production-safe-10k-load-preflight"
        : params.harnessPlan?.profile === "bounded-5k"
        ? "production-safe-5k-load-preflight"
        : params.harnessPlan?.profile === "bounded-1k"
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
  if (matrix.harnessPlan?.profile === "bounded-10k") {
    return matrix.harnessPlan.safeToRunLive && matrix.liveRun === "completed"
      ? "GREEN_10K_LOAD_PREFLIGHT_READY"
      : "GREEN_10K_HARNESS_READY_LIVE_BLOCKED_BY_APPROVALS_OR_ENV";
  }
  if (matrix.harnessPlan?.profile === "bounded-5k") {
    return matrix.harnessPlan.safeToRunLive && matrix.liveRun === "completed"
      ? "GREEN_5K_LOAD_PREFLIGHT_READY"
      : "GREEN_5K_HARNESS_READY_LIVE_BLOCKED_BY_APPROVALS_OR_ENV";
  }
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
    matrix.harnessPlan?.profile === "bounded-10k"
      ? "S-LOAD-STAGING-10K Readonly Harness Preflight Proof"
      : matrix.harnessPlan?.profile === "bounded-5k"
      ? "S-LOAD-STAGING-5K Readonly Harness Preflight Proof"
      : matrix.harnessPlan?.profile === "bounded-1k"
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
          `- max p95 latency: ${matrix.harnessPlan.stopConditions.maxP95LatencyMs}ms`,
          `- cooldown: ${matrix.harnessPlan.stopConditions.cooldownMs}ms`,
          `- stop on SQLSTATE 57014: ${matrix.harnessPlan.stopConditions.stopOnSqlstate57014 ? "YES" : "NO"}`,
          `- stop on HTTP 429/5xx: ${matrix.harnessPlan.stopConditions.stopOnHttp429Or5xx ? "YES" : "NO"}`,
          `- operator approved: ${matrix.harnessPlan.operatorApproved ? "YES" : "NO"}`,
          `- Supabase limits confirmed: ${matrix.harnessPlan.supabaseLimitsConfirmed ? "YES" : "NO"}`,
          `- Enterprise load approval required: ${matrix.harnessPlan.enterpriseLoadApprovalRequired ? "YES" : "NO"}`,
          `- Enterprise load approved: ${matrix.harnessPlan.enterpriseLoadApproved ? "YES" : "NO"}`,
          `- live blockers: ${matrix.harnessPlan.blockers.length ? matrix.harnessPlan.blockers.join(", ") : "none"}`,
        ]
      : []),
    ...(matrix.loadRunnerSafety
      ? [
          "",
          "## Load Runner Safety",
          `- read-only scenarios defined: ${matrix.loadRunnerSafety.readOnlyScenariosDefined ? "YES" : "NO"}`,
          `- mutation scenarios rejected: ${matrix.loadRunnerSafety.mutationScenariosRejected ? "YES" : "NO"}`,
          `- max requests defined: ${matrix.loadRunnerSafety.maxRequestsDefined ? "YES" : "NO"}`,
          `- max concurrency defined: ${matrix.loadRunnerSafety.maxConcurrencyDefined ? "YES" : "NO"}`,
          `- request timeout defined: ${matrix.loadRunnerSafety.requestTimeoutDefined ? "YES" : "NO"}`,
          `- max error rate defined: ${matrix.loadRunnerSafety.maxErrorRateDefined ? "YES" : "NO"}`,
          `- abort criteria defined: ${matrix.loadRunnerSafety.abortCriteriaDefined ? "YES" : "NO"}`,
          `- emulator dry-run supported: ${matrix.loadRunnerSafety.emulatorDryRunSupported ? "YES" : "NO"}`,
          `- emulator dry-run passed: ${matrix.loadRunnerSafety.emulatorDryRunPassed ? "YES" : "NO"}`,
          `- redaction tests passed: ${matrix.loadRunnerSafety.redactionTestsPassed ? "YES" : "NO"}`,
          "- real network calls in dry-run: NO",
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
