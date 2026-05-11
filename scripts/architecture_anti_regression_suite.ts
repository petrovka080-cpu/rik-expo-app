import fs from "node:fs";
import path from "node:path";

import {
  PRODUCTION_BUSINESS_READONLY_FORBIDDEN_MUTATION_OPERATIONS,
  buildProductionBusinessReadonlyCanaryWhitelist,
  validateProductionBusinessReadonlyCanaryMetricLog,
  validateProductionBusinessReadonlyCanaryRegistry,
} from "./load/productionBusinessReadonlyCanary";
import {
  evaluateFlatListTuningRegressionGuardrail,
  scanFlatListTuningRegression,
  type FlatListTuningRegressionSummary,
} from "./perf/flatListTuningRegression";
import {
  evaluateErrorHandlingGapRatchet,
  scanErrorHandlingGapRatchet,
  type ErrorHandlingGapRatchetSummary,
} from "./error/errorHandlingGapRatchet";
import {
  collectSelectInventory,
  collectSelectInventoryFromSource,
  type SelectInventoryAction,
  type SelectInventoryEntry,
} from "./data/unboundedSelectInventory";
import {
  CACHE_READ_THROUGH_ONE_ROUTE,
  CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES,
  CACHE_READ_THROUGH_ONE_ROUTE_MODE,
  buildCacheReadThroughOneRouteApplyEnv,
  isCacheReadThroughOneRouteApplyConfigReady,
  resolveCacheShadowRuntimeConfig,
} from "../src/shared/scale/cacheShadowRuntime";

export type GuardrailStatus = "pass" | "fail" | "report_only";

export type DirectSupabaseFindingClass =
  | "transport_controlled"
  | "service_bypass"
  | "test_only"
  | "generated_or_ignored"
  | "false_positive";

export type DirectSupabaseTransportOwner =
  | "root_client"
  | "transport_file"
  | "bff_client"
  | "server_file"
  | "test_file"
  | "generated_or_ignored"
  | "none";

export type DirectSupabaseOperation =
  | "auth"
  | "storage"
  | "read"
  | "write"
  | "rpc"
  | "realtime";

export type DirectSupabaseFinding = {
  file: string;
  line: number;
  operation: DirectSupabaseOperation;
  callTarget: string;
  matchedCall: string;
  classification: DirectSupabaseFindingClass;
  transportOwner: DirectSupabaseTransportOwner;
  expectedTransportOwner: string;
  risk: "low" | "medium" | "high";
  suggestedMigrationPath: string;
};

export type DirectSupabaseExceptionCategory =
  | "must_stay_direct_for_now"
  | "can_be_migrated_later"
  | "needs_new_bff_endpoint"
  | "unsafe_unknown";

export type DirectSupabaseExceptionRegistryEntry = {
  file: string;
  line: number;
  operation: DirectSupabaseOperation;
  callTarget: string;
  category: DirectSupabaseExceptionCategory;
  reasonDirectCallRemains: string;
  owner: string;
  futureMigrationPath: string;
  risk: DirectSupabaseFinding["risk"];
  allowed: boolean;
};

export type DirectSupabaseExceptionRegistry = {
  wave: "S_AUDIT_BATTLE_17_DIRECT_SUPABASE_EXCEPTION_CONTAINMENT";
  generatedAtLocal: string;
  source: {
    scanner: "scripts/architecture_anti_regression_suite.ts";
    inventoryArtifacts: string[];
  };
  policy: {
    existingAllowedExceptionsPermitted: true;
    newUnclassifiedDirectCallsFailScanner: true;
    registryKey: "file|operation|callTarget";
  };
  summary: {
    totalExceptions: number;
    allowedExceptions: number;
    categoryCounts: Record<DirectSupabaseExceptionCategory, number>;
    operationCounts: Record<DirectSupabaseOperation, number>;
  };
  exceptions: DirectSupabaseExceptionRegistryEntry[];
};

export type ComponentDebtEntry = {
  file: string;
  lineCount: number;
  hookCount: number;
};

export type ProductionRawLoopPattern = "while_true" | "for_ever";

export type ProductionRawLoopAllowlistEntry = {
  file: string;
  line: number;
  pattern: ProductionRawLoopPattern;
  reason: string;
  owner: string;
  testCoverage: string;
};

export type ProductionRawLoopFinding = {
  file: string;
  line: number;
  pattern: ProductionRawLoopPattern;
  matchedLoop: string;
  allowlisted: boolean;
  reason: string | null;
  owner: string | null;
  testCoverage: string | null;
};

export type UnboundedSelectAllowlistEntry = {
  file: string;
  line: number;
  queryString: string;
  action: "export_allowlist";
  owner: string;
  reason: string;
  migrationPath: string;
};

export type UnboundedSelectRatchetFinding = SelectInventoryEntry & {
  allowlisted: boolean;
  owner: string | null;
  allowlistReason: string | null;
  migrationPath: string | null;
  expected: string;
};

export type UnboundedSelectRatchetSummary = {
  unboundedSelectBudget: 0;
  selectStarBudget: 0;
  totalSelectCalls: number;
  unresolvedUnboundedSelects: number;
  selectStarFindings: number;
  exportAllowlistFindings: number;
  documentedExportAllowlistFindings: number;
  allowlistEntries: number;
  topFiles: readonly { file: string; count: number }[];
};

export type UnsafeCastPattern =
  | "as_any"
  | "ts_ignore"
  | "silent_catch"
  | "unsafe_unknown_as";

export type UnsafeCastScope = "production_source" | "test_source";

export type UnsafeCastAllowlistEntry = {
  file: string;
  line: number;
  pattern: UnsafeCastPattern;
  reason: string;
  owner: string;
  expiresAtLocalDate?: string;
  migrationWave?: string;
};

export type UnsafeCastFinding = {
  file: string;
  line: number;
  pattern: UnsafeCastPattern;
  matchedText: string;
  scope: UnsafeCastScope;
  criticalFolder: string | null;
  allowlisted: boolean;
  reason: string | null;
  owner: string | null;
  expiresAtLocalDate: string | null;
  migrationWave: string | null;
  expected: string;
};

export type UnsafeCastPatternCounts = Record<UnsafeCastPattern, number>;

export type UnsafeCastRatchetBaseline = {
  total: number;
  productionSource: number;
  testSource: number;
  byPattern: UnsafeCastPatternCounts;
  productionByPattern: UnsafeCastPatternCounts;
  testByPattern: UnsafeCastPatternCounts;
  criticalFolderByPattern: readonly {
    folder: string;
    byPattern: UnsafeCastPatternCounts;
  }[];
};

export type UnsafeCastRatchetSummary = {
  baseline: UnsafeCastRatchetBaseline;
  current: {
    total: number;
    productionSource: number;
    testSource: number;
    byPattern: UnsafeCastPatternCounts;
    productionByPattern: UnsafeCastPatternCounts;
    testByPattern: UnsafeCastPatternCounts;
    criticalFolderByPattern: readonly {
      folder: string;
      byPattern: UnsafeCastPatternCounts;
    }[];
  };
  allowlistedFindings: number;
  allowlistEntries: number;
  criticalFolderViolations: number;
  topFiles: readonly { file: string; count: number }[];
};

export type AiModelBoundarySummary = {
  aiModelGatewayPresent: boolean;
  aiModelTypesPresent: boolean;
  aiDisabledProviderPresent: boolean;
  aiLegacyGeminiProviderPresent: boolean;
  assistantClientUsesGateway: boolean;
  directGeminiImportsOutsideLegacyProvider: number;
  providerImplementationImportsFromUi: number;
  openAiLiveCallFindings: number;
  apiKeyClientFindings: number;
  aiReportsRedactionContractPresent: boolean;
  findings: readonly string[];
};

export type AiRoleRiskApprovalControlPlaneSummary = {
  rolePolicyPresent: boolean;
  riskPolicyPresent: boolean;
  screenCapabilityRegistryPresent: boolean;
  approvalGatePresent: boolean;
  professionalResponsePolicyPresent: boolean;
  assistantActionsUsesApprovalGate: boolean;
  assistantActionsDirectSubmitBlocked: boolean;
  directorFullAccessPolicyPresent: boolean;
  nonDirectorScopePresent: boolean;
  forbiddenActionsBlocked: boolean;
  approvalRequiredCannotExecuteDirectly: boolean;
  promptPolicyBuilderApplied: boolean;
  screenContextRedactionPresent: boolean;
  auditEventsPresent: boolean;
  screenGatewayImports: number;
  findings: readonly string[];
};

export type ArchitectureGuardrailCheck = {
  name: string;
  status: GuardrailStatus;
  errors: string[];
};

export type ArchitectureAntiRegressionReport = {
  final_status: "GREEN_ARCHITECTURE_ANTI_REGRESSION_SUITE_ADDED" | "BLOCKED_ARCHITECTURE_ANTI_REGRESSION_FAILED";
  directSupabase: {
    serviceBypassBudget: number;
    totalFindings: number;
    serviceBypassFindings: number;
    serviceBypassFiles: number;
    transportControlledFindings: number;
    testOnlyFindings: number;
    generatedOrIgnoredFindings: number;
    topServiceBypassFiles: readonly { file: string; count: number }[];
  };
  directSupabaseExceptionContainment: {
    registryPath: string;
    registryLoaded: boolean;
    registryEntries: number;
    currentServiceBypassFindings: number;
    allowedCurrentFindings: number;
    unclassifiedCurrentFindings: number;
    disallowedCurrentFindings: number;
    categoryCounts: Record<DirectSupabaseExceptionCategory, number>;
    operationCounts: Record<DirectSupabaseOperation, number>;
  };
  productionReadonlyCanary: {
    whitelistRouteCount: number;
    forbiddenMutationOperationCount: number;
    redactionForbiddenKeysEnforced: boolean;
  };
  cacheRateScope: {
    cacheCanaryRouteScoped: boolean;
    cacheAllowedRoute: string;
    rateLimitCanaryRoute: string;
    rateLimitCanaryPercent: number;
    persistentReadinessContractLocked: boolean;
    persistentReadinessKeyCanonical: boolean;
    readThroughLiteralKeyUsageLocked: boolean;
  };
  cacheColdMissProof: {
    proofTestPresent: boolean;
    matrixArtifactPresent: boolean;
    proofArtifactPresent: boolean;
    matrixStatus: string;
    deterministicProofReady: boolean;
    knownEmptyKeyProof: boolean;
    firstMissSecondHitProof: boolean;
    utf8SafeProof: boolean;
    metricsRedactedProof: boolean;
    routeScopeUnchanged: boolean;
    rollbackSafeProof: boolean;
    productionCacheStillDisabled: boolean;
  };
  rateLimitMarketplaceCanaryProof: {
    matrixArtifactPresent: boolean;
    proofArtifactPresent: boolean;
    matrixStatus: string;
    routeScoped: boolean;
    selectedSubjectProof: boolean;
    nonSelectedSubjectProof: boolean;
    privateSmokeProof: boolean;
    healthReadyStable: boolean;
    redactedProof: boolean;
    canaryRetained: boolean;
  };
  rateLimitMarketplace5PctCanaryProof: {
    matrixArtifactPresent: boolean;
    monitorArtifactPresent: boolean;
    metricsArtifactPresent: boolean;
    proofArtifactPresent: boolean;
    matrixStatus: string;
    monitorStatus: string;
    routeScoped: boolean;
    selectedSubjectProof: boolean;
    nonSelectedSubjectProof: boolean;
    privateSmokeProof: boolean;
    wouldAllowProof: boolean;
    wouldThrottleProof: boolean;
    falsePositiveCountZero: boolean;
    healthStable: boolean;
    redactedProof: boolean;
    monitorStable: boolean;
  };
  productionRawLoops: {
    rawLoopBudget: 0;
    totalFindings: number;
    unapprovedFindings: number;
    allowlistedFindings: number;
    allowlistEntries: number;
    topFiles: readonly { file: string; count: number }[];
  };
  unboundedSelectRatchet: UnboundedSelectRatchetSummary;
  unsafeCastRatchet: UnsafeCastRatchetSummary;
  flatListTuningRegression: FlatListTuningRegressionSummary;
  errorHandlingGapRatchet: ErrorHandlingGapRatchetSummary;
  aiModelBoundary: AiModelBoundarySummary;
  aiRoleRiskApprovalControlPlane: AiRoleRiskApprovalControlPlaneSummary;
  componentDebt: {
    reportOnly: true;
    godComponentLineThreshold: number;
    hookPressureThreshold: number;
    godComponentCount: number;
    hookPressureComponentCount: number;
    topByLines: readonly ComponentDebtEntry[];
    topByHooks: readonly ComponentDebtEntry[];
  };
  checks: readonly ArchitectureGuardrailCheck[];
  safety: {
    productionCalls: false;
    dbWrites: false;
    migrations: false;
    supabaseProjectChanges: false;
    envChanges: false;
    secretsPrinted: false;
  };
};

type ReadFile = (relativePath: string) => string;

const SOURCE_ROOTS = ["src", "app"] as const;
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const IGNORED_DIRECTORIES = new Set([
  ".expo",
  ".git",
  "artifacts",
  "coverage",
  "diagnostics",
  "migrated",
  "node_modules",
]);

const DIRECT_SUPABASE_SERVICE_BYPASS_BUDGET = 0;
const DIRECT_SUPABASE_EXCEPTION_REGISTRY_RELATIVE_PATH =
  "artifacts/S_AUDIT_BATTLE_17_DIRECT_SUPABASE_EXCEPTION_CONTAINMENT_registry.json";
const GOD_COMPONENT_LINE_THRESHOLD = 500;
const HOOK_PRESSURE_THRESHOLD = 25;
const CACHE_RATE_ALLOWED_ROUTE = "marketplace.catalog.search";
const RATE_LIMIT_ALLOWED_PERCENT = 1;
const RATE_LIMIT_5PCT_ALLOWED_PERCENT = 5;
const CACHE_COLD_MISS_PROOF_TEST_PATH = "tests/scale/cacheColdMissDeterministicProof.test.ts";
const CACHE_COLD_MISS_MATRIX_PATH = "artifacts/S_CACHE_01_COLD_MISS_DETERMINISTIC_PROOF_matrix.json";
const CACHE_COLD_MISS_PROOF_PATH = "artifacts/S_CACHE_01_COLD_MISS_DETERMINISTIC_PROOF_proof.md";
const CACHE_COLD_MISS_READY_STATUS = "GREEN_CACHE_COLD_MISS_DETERMINISTIC_PROOF_READY";
const RATE_LIMIT_MARKETPLACE_CANARY_MATRIX_PATH =
  "artifacts/S_RATE_01_MARKETPLACE_SEARCH_1_PERCENT_CANARY_matrix.json";
const RATE_LIMIT_MARKETPLACE_CANARY_PROOF_PATH =
  "artifacts/S_RATE_01_MARKETPLACE_SEARCH_1_PERCENT_CANARY_proof.md";
const RATE_LIMIT_MARKETPLACE_CANARY_PASS_STATUS = "GREEN_RATE_LIMIT_1_PERCENT_MARKETPLACE_CANARY_PASS";
const RATE_LIMIT_MARKETPLACE_5PCT_MATRIX_PATH =
  "artifacts/S_NIGHT_RATE_27B_5PCT_MARKETPLACE_RAMP_RETRY_matrix.json";
const RATE_LIMIT_MARKETPLACE_5PCT_PROOF_PATH =
  "artifacts/S_NIGHT_RATE_27B_5PCT_MARKETPLACE_RAMP_RETRY_proof.md";
const RATE_LIMIT_MARKETPLACE_5PCT_MONITOR_MATRIX_PATH =
  "artifacts/S_NIGHT_RATE_28_5PCT_MONITOR_WINDOW_matrix.json";
const RATE_LIMIT_MARKETPLACE_5PCT_MONITOR_METRICS_PATH =
  "artifacts/S_NIGHT_RATE_28_5PCT_MONITOR_WINDOW_metrics.json";
const RATE_LIMIT_MARKETPLACE_5PCT_PASS_STATUS = "GREEN_RATE_LIMIT_5PCT_MARKETPLACE_RAMP_STABLE";
const RATE_LIMIT_MARKETPLACE_5PCT_MONITOR_PASS_STATUS = "GREEN_RATE_LIMIT_5PCT_MONITOR_WINDOW_STABLE";
const ROOT_SUPABASE_CLIENT_PATH = "src/lib/supabaseClient.ts";
const AI_MODEL_GATEWAY_PATH = "src/features/ai/model/AiModelGateway.ts";
const AI_MODEL_TYPES_PATH = "src/features/ai/model/AiModelTypes.ts";
const AI_DISABLED_PROVIDER_PATH = "src/features/ai/model/DisabledModelProvider.ts";
const AI_LEGACY_GEMINI_PROVIDER_PATH = "src/features/ai/model/LegacyGeminiModelProvider.ts";
const AI_ASSISTANT_CLIENT_PATH = "src/features/ai/assistantClient.ts";
const AI_REPORTS_SERVICE_PATH = "src/lib/ai_reports.ts";
const AI_ROLE_POLICY_PATH = "src/features/ai/policy/aiRolePolicy.ts";
const AI_RISK_POLICY_PATH = "src/features/ai/policy/aiRiskPolicy.ts";
const AI_SCREEN_REGISTRY_PATH = "src/features/ai/policy/aiScreenCapabilityRegistry.ts";
const AI_APPROVAL_GATE_PATH = "src/features/ai/approval/aiApprovalGate.ts";
const AI_PROFESSIONAL_RESPONSE_POLICY_PATH = "src/features/ai/policy/aiProfessionalResponsePolicy.ts";
const AI_ASSISTANT_ACTIONS_PATH = "src/features/ai/assistantActions.ts";
const AI_ASSISTANT_PROMPTS_PATH = "src/features/ai/assistantPrompts.ts";
const AI_ASSISTANT_SCOPE_CONTEXT_PATH = "src/features/ai/assistantScopeContext.ts";
const AI_CONTEXT_REDACTION_PATH = "src/features/ai/context/aiContextRedaction.ts";
const AI_AUDIT_EVENT_TYPES_PATH = "src/features/ai/audit/aiActionAuditTypes.ts";
const DIRECT_SUPABASE_EXPECTED_TRANSPORT_OWNER =
  "src/lib/supabaseClient.ts root client or transport-owned file (*.transport.*, *.bff.*, /server/)";
const DIRECT_SUPABASE_CALL_REGEX =
  /\b(?:supabase(?:Client|Admin)?|params\.supabase|deps\.supabase|args\.supabase)\s*\.\s*(auth|storage|from|rpc|channel|removeChannel|getChannels|realtime)\b/g;
const PRODUCTION_RAW_LOOP_BUDGET = 0;
const PRODUCTION_RAW_LOOP_EXPECTED_OWNER =
  "cancellable worker loop primitive or explicit allowlist with reason, owner, and test coverage";
const PRODUCTION_RAW_LOOP_ALLOWLIST: readonly ProductionRawLoopAllowlistEntry[] = [];
const UNBOUNDED_SELECT_BUDGET = 0;
const SELECT_STAR_BUDGET = 0;
const UNBOUNDED_SELECT_EXPECTED =
  "lookup uses single/maybeSingle; existence uses select(\"id\").limit(1); list/reference uses range/limit/page-through; export allowlist has owner, reason, and migration path";
const UNBOUNDED_SELECT_EXPORT_ALLOWLIST: readonly UnboundedSelectAllowlistEntry[] = [
  {
    file: "src/lib/api/director_reports.naming.ts",
    line: 493,
    queryString: "selectCols",
    action: "export_allowlist",
    owner: "director reports export owner",
    reason: "Dynamic report naming export selects the complete chosen report column set for output completeness.",
    migrationPath: "Move report naming exports behind a typed RPC/view contract with an explicit projection manifest.",
  },
  {
    file: "src/lib/api/pdf_proposal.ts",
    line: 186,
    queryString: "id, request_item_id, name_human, uom, qty, app_code, rik_code, price, supplier, note",
    action: "export_allowlist",
    owner: "proposal PDF export owner",
    reason: "Proposal PDF line export needs the full selected item projection to preserve rendered document contents.",
    migrationPath: "Move proposal PDF item reads behind a typed PDF-source RPC or view with a versioned output contract.",
  },
  {
    file: "src/lib/api/pdf_proposal.ts",
    line: 198,
    queryString: "id, request_id, name_human, uom, qty, app_code, rik_code",
    action: "export_allowlist",
    owner: "proposal PDF export owner",
    reason: "Proposal PDF request-item fallback needs the selected item projection to preserve rendered document contents.",
    migrationPath: "Move proposal PDF request-item reads behind a typed PDF-source RPC or view with a versioned output contract.",
  },
  {
    file: "src/lib/api/pdf_proposal.ts",
    line: 292,
    queryString: "app_code,name_human",
    action: "export_allowlist",
    owner: "proposal PDF export owner",
    reason: "Proposal PDF app-name lookup preserves legacy document labeling for exported proposal rows.",
    migrationPath: "Fold app-name lookup into the typed proposal PDF-source RPC/view contract.",
  },
  {
    file: "src/lib/pdf/pdf.builder.ts",
    line: 304,
    queryString: "id, display_no",
    action: "export_allowlist",
    owner: "PDF builder export owner",
    reason: "PDF builder needs request display identity for generated document metadata.",
    migrationPath: "Move request display identity into the typed PDF builder source contract.",
  },
  {
    file: "src/screens/contractor/contractor.pdfService.ts",
    line: 205,
    queryString: "mat_code, uom_mat, qty_fact",
    action: "export_allowlist",
    owner: "contractor PDF export owner",
    reason: "Contractor PDF material rows preserve rendered work-progress document contents.",
    migrationPath: "Move contractor PDF material rows behind a typed PDF-source RPC/view contract.",
  },
  {
    file: "src/screens/contractor/contractor.pdfService.ts",
    line: 216,
    queryString: "rik_code, name_human_ru, name_human, uom_code",
    action: "export_allowlist",
    owner: "contractor PDF export owner",
    reason: "Contractor PDF catalog lookup preserves legacy material labels for exported progress rows.",
    migrationPath: "Fold contractor PDF catalog labels into the typed PDF-source RPC/view contract.",
  },
];
const UNSAFE_CAST_SCAN_ROOTS = ["src", "app", "tests"] as const;
const UNSAFE_CAST_EXPECTED =
  "typed DTO, runtime guard, typed adapter, or documented allowlist with file, line, reason, owner, and expiration/migration wave";
const UNSAFE_CAST_ALLOWLIST: readonly UnsafeCastAllowlistEntry[] = [];
const UNSAFE_CAST_CRITICAL_FOLDERS = [
  "src/lib/api",
  "src/lib/auth",
  "src/lib/transport",
  "src/lib/workers",
] as const;
const emptyUnsafeCastPatternCounts = (): UnsafeCastPatternCounts => ({
  as_any: 0,
  ts_ignore: 0,
  silent_catch: 0,
  unsafe_unknown_as: 0,
});
const UNSAFE_CAST_RATCHET_BASELINE: UnsafeCastRatchetBaseline = {
  total: 189,
  productionSource: 46,
  testSource: 143,
  byPattern: {
    as_any: 25,
    ts_ignore: 6,
    silent_catch: 15,
    unsafe_unknown_as: 143,
  },
  productionByPattern: {
    as_any: 0,
    ts_ignore: 0,
    silent_catch: 0,
    unsafe_unknown_as: 46,
  },
  testByPattern: {
    as_any: 25,
    ts_ignore: 6,
    silent_catch: 15,
    unsafe_unknown_as: 97,
  },
  criticalFolderByPattern: [
    {
      folder: "src/lib/api",
      byPattern: {
        as_any: 0,
        ts_ignore: 0,
        silent_catch: 0,
        unsafe_unknown_as: 24,
      },
    },
    {
      folder: "src/lib/auth",
      byPattern: {
        as_any: 0,
        ts_ignore: 0,
        silent_catch: 0,
        unsafe_unknown_as: 0,
      },
    },
    {
      folder: "src/lib/transport",
      byPattern: {
        as_any: 0,
        ts_ignore: 0,
        silent_catch: 0,
        unsafe_unknown_as: 0,
      },
    },
    {
      folder: "src/lib/workers",
      byPattern: {
        as_any: 0,
        ts_ignore: 0,
        silent_catch: 0,
        unsafe_unknown_as: 0,
      },
    },
  ],
};

const normalizePath = (value: string): string => value.replace(/\\/g, "/");

const relativeProjectPath = (projectRoot: string, filePath: string): string =>
  normalizePath(path.relative(projectRoot, filePath));

function listSourceFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (IGNORED_DIRECTORIES.has(entry.name)) continue;
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(absolutePath));
      continue;
    }
    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }
  return files;
}

const isTestPath = (normalizedPath: string): boolean =>
  /\.test\.[tj]sx?$/.test(normalizedPath) ||
  /\.spec\.[tj]sx?$/.test(normalizedPath) ||
  normalizedPath.includes("/__tests__/");

export const classifyDirectSupabaseTransportOwner = (
  normalizedPath: string,
): DirectSupabaseTransportOwner => {
  const filePath = normalizePath(normalizedPath);
  if (isTestPath(filePath)) return "test_file";
  if (filePath.endsWith(".d.ts") || filePath.includes("/types/contracts/")) {
    return "generated_or_ignored";
  }
  if (filePath === ROOT_SUPABASE_CLIENT_PATH || filePath.endsWith(`/${ROOT_SUPABASE_CLIENT_PATH}`)) {
    return "root_client";
  }
  if (filePath.includes(".transport.")) return "transport_file";
  if (filePath.includes(".bff.")) return "bff_client";
  if (filePath.includes("/server/")) return "server_file";
  return "none";
};

export const describeDirectSupabaseExpectedTransportOwner = (
  normalizedPath: string,
): string => {
  const owner = classifyDirectSupabaseTransportOwner(normalizedPath);
  if (owner === "root_client") return "root client initializer src/lib/supabaseClient.ts";
  if (owner === "transport_file") return "transport-owned file (*.transport.*)";
  if (owner === "bff_client") return "transport-owned BFF client file (*.bff.*)";
  if (owner === "server_file") return "transport-owned server file (/server/)";
  if (owner === "test_file") return "test-only file";
  if (owner === "generated_or_ignored") return "generated or ignored contract file";
  return DIRECT_SUPABASE_EXPECTED_TRANSPORT_OWNER;
};

const classifyDirectSupabasePath = (normalizedPath: string): DirectSupabaseFindingClass => {
  const transportOwner = classifyDirectSupabaseTransportOwner(normalizedPath);
  if (transportOwner === "test_file") return "test_only";
  if (transportOwner === "generated_or_ignored") return "generated_or_ignored";
  if (transportOwner !== "none") {
    return "transport_controlled";
  }
  return "service_bypass";
};

const classifyDirectSupabaseOperation = (
  operationToken: string,
  lineText: string,
): DirectSupabaseOperation => {
  if (operationToken === "auth") return "auth";
  if (operationToken === "storage") return "storage";
  if (operationToken === "rpc") return "rpc";
  if (
    operationToken === "channel" ||
    operationToken === "removeChannel" ||
    operationToken === "getChannels" ||
    operationToken === "realtime"
  ) {
    return "realtime";
  }
  if (/\.(insert|update|upsert|delete)\s*\(/.test(lineText)) return "write";
  return "read";
};

const riskForOperation = (operation: DirectSupabaseOperation): DirectSupabaseFinding["risk"] => {
  if (operation === "read") return "medium";
  return "high";
};

const suggestedMigrationPathForOperation = (operation: DirectSupabaseOperation): string => {
  if (operation === "auth") return "auth/session boundary or existing authenticated BFF client";
  if (operation === "storage") return "typed storage service boundary with redacted diagnostics";
  if (operation === "realtime") return "owned realtime lifecycle boundary";
  if (operation === "read" || operation === "rpc") return "existing readonly BFF/transport boundary";
  return "typed mutation boundary with idempotency and rollback proof";
};

const firstStringArg = (methodName: string, lineText: string): string | null => {
  const escapedMethod = methodName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`\\.${escapedMethod}\\s*\\(\\s*["']([^"']+)["']`).exec(lineText);
  return match?.[1] ?? null;
};

const extractDirectSupabaseCallTarget = (
  operationToken: string,
  lineText: string,
): string => {
  if (operationToken === "rpc") return `rpc:${firstStringArg("rpc", lineText) ?? "dynamic"}`;
  if (operationToken === "from") return `table:${firstStringArg("from", lineText) ?? "dynamic"}`;
  if (operationToken === "auth") {
    const match = /\.auth\s*\.\s*([A-Za-z0-9_]+)\s*\(/.exec(lineText);
    return `auth:${match?.[1] ?? "unknown"}`;
  }
  if (operationToken === "storage") {
    const match = /\.storage\s*\.\s*([A-Za-z0-9_]+)\s*\(/.exec(lineText);
    return `storage:${match?.[1] ?? "unknown"}`;
  }
  if (operationToken === "realtime") {
    const match = /\.realtime\s*\.\s*([A-Za-z0-9_]+)\s*\(/.exec(lineText);
    return `realtime:${match?.[1] ?? "unknown"}`;
  }
  if (operationToken === "channel") return "realtime:channel";
  if (operationToken === "removeChannel") return "realtime:removeChannel";
  if (operationToken === "getChannels") return "realtime:getChannels";
  return "unknown:direct_supabase";
};

const formatMatchedDirectSupabaseCall = (
  matchedMethod: string,
  callTarget: string,
): string => `${matchedMethod.replace(/\s+/g, "")} (${callTarget})`;

export function scanDirectSupabaseSource(params: {
  filePath: string;
  source: string;
}): DirectSupabaseFinding[] {
  const normalizedPath = normalizePath(params.filePath);
  const classification = classifyDirectSupabasePath(normalizedPath);
  const transportOwner = classifyDirectSupabaseTransportOwner(normalizedPath);
  const expectedTransportOwner = describeDirectSupabaseExpectedTransportOwner(normalizedPath);
  const findings: DirectSupabaseFinding[] = [];
  const lines = params.source.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const lineText = lines[index] ?? "";
    const matches = lineText.matchAll(DIRECT_SUPABASE_CALL_REGEX);
    for (const match of matches) {
      const operation = classifyDirectSupabaseOperation(match[1] ?? "", lineText);
      const callTarget = extractDirectSupabaseCallTarget(match[1] ?? "", lineText);
      findings.push({
        file: normalizedPath,
        line: index + 1,
        operation,
        callTarget,
        matchedCall: formatMatchedDirectSupabaseCall(match[0] ?? "", callTarget),
        classification,
        transportOwner,
        expectedTransportOwner,
        risk: riskForOperation(operation),
        suggestedMigrationPath: suggestedMigrationPathForOperation(operation),
      });
    }
  }

  return findings;
}

export function scanDirectSupabaseBypasses(projectRoot: string): DirectSupabaseFinding[] {
  const roots = SOURCE_ROOTS.map((rootName) => path.join(projectRoot, rootName));
  return roots.flatMap((root) =>
    listSourceFiles(root).flatMap((filePath) =>
      scanDirectSupabaseSource({
        filePath: relativeProjectPath(projectRoot, filePath),
        source: fs.readFileSync(filePath, "utf8"),
      }),
    ),
  );
}

const countByFile = (
  findings: readonly DirectSupabaseFinding[],
): readonly { file: string; count: number }[] => {
  const counts = new Map<string, number>();
  for (const finding of findings) {
    counts.set(finding.file, (counts.get(finding.file) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([file, count]) => ({ file, count }))
    .sort((left, right) => right.count - left.count || left.file.localeCompare(right.file));
};

export function formatDirectSupabaseServiceBypassFailure(
  finding: DirectSupabaseFinding,
): string {
  return [
    "direct_supabase_service_bypass",
    `file=${finding.file}`,
    `line=${finding.line}`,
    `matched_call=${finding.matchedCall}`,
    `expected_transport_owner=${finding.expectedTransportOwner}`,
  ].join(":");
}

export function evaluateDirectSupabaseGuardrail(
  findings: readonly DirectSupabaseFinding[],
  serviceBypassBudget = DIRECT_SUPABASE_SERVICE_BYPASS_BUDGET,
): {
  check: ArchitectureGuardrailCheck;
  summary: ArchitectureAntiRegressionReport["directSupabase"];
} {
  const serviceBypassFindings = findings.filter((finding) => finding.classification === "service_bypass");
  const serviceBypassFiles = new Set(serviceBypassFindings.map((finding) => finding.file));
  const errors = [
    ...serviceBypassFindings.map(formatDirectSupabaseServiceBypassFailure),
    ...(serviceBypassFindings.length > serviceBypassBudget
      ? [`service_bypass_budget_exceeded:${serviceBypassFindings.length}>${serviceBypassBudget}`]
      : []),
  ];

  return {
    check: {
      name: "direct_supabase_service_bypass_budget",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      serviceBypassBudget,
      totalFindings: findings.length,
      serviceBypassFindings: serviceBypassFindings.length,
      serviceBypassFiles: serviceBypassFiles.size,
      transportControlledFindings: findings.filter((finding) => finding.classification === "transport_controlled").length,
      testOnlyFindings: findings.filter((finding) => finding.classification === "test_only").length,
      generatedOrIgnoredFindings: findings.filter((finding) => finding.classification === "generated_or_ignored").length,
      topServiceBypassFiles: countByFile(serviceBypassFindings).slice(0, 10),
    },
  };
}

const emptyExceptionCategoryCounts = (): Record<DirectSupabaseExceptionCategory, number> => ({
  must_stay_direct_for_now: 0,
  can_be_migrated_later: 0,
  needs_new_bff_endpoint: 0,
  unsafe_unknown: 0,
});

const emptyOperationCounts = (): Record<DirectSupabaseOperation, number> => ({
  auth: 0,
  storage: 0,
  read: 0,
  write: 0,
  rpc: 0,
  realtime: 0,
});

const classifyExceptionCategory = (
  finding: DirectSupabaseFinding,
): DirectSupabaseExceptionCategory => {
  if (finding.operation === "auth" || finding.operation === "storage" || finding.operation === "realtime") {
    return "must_stay_direct_for_now";
  }
  if (finding.operation === "write") return "needs_new_bff_endpoint";
  if (finding.file.toLowerCase().includes("pdf") || finding.file.toLowerCase().includes("report")) {
    return "needs_new_bff_endpoint";
  }
  if (finding.operation === "read" || finding.operation === "rpc") return "can_be_migrated_later";
  return "unsafe_unknown";
};

const reasonForException = (
  finding: DirectSupabaseFinding,
  category: DirectSupabaseExceptionCategory,
): string => {
  if (category === "must_stay_direct_for_now" && finding.operation === "auth") {
    return "Supabase Auth session/user lifecycle is client-owned today; migrate only through an explicit auth/session boundary.";
  }
  if (category === "must_stay_direct_for_now" && finding.operation === "storage") {
    return "Storage calls need a typed storage boundary with upload/remove semantics and redacted diagnostics before migration.";
  }
  if (category === "must_stay_direct_for_now" && finding.operation === "realtime") {
    return "Realtime channel lifecycle is provider-specific and must remain direct until an owned realtime boundary exists.";
  }
  if (category === "needs_new_bff_endpoint") {
    return "No safe equivalent existing BFF endpoint was proven for this call; migration requires a new typed endpoint or mutation boundary.";
  }
  if (category === "can_be_migrated_later") {
    return "Readonly or RPC call remains as a known service bypass until a matching existing BFF/transport path is selected and tested.";
  }
  return "The scanner could not classify this direct Supabase call safely.";
};

const ownerForException = (
  finding: DirectSupabaseFinding,
  category: DirectSupabaseExceptionCategory,
): string => {
  if (finding.operation === "auth") return "auth/session boundary owner";
  if (finding.operation === "storage") return "storage boundary owner";
  if (finding.operation === "realtime") return "realtime lifecycle owner";
  if (category === "needs_new_bff_endpoint") return "BFF endpoint owner";
  return "domain service owner";
};

const futurePathForException = (
  finding: DirectSupabaseFinding,
  category: DirectSupabaseExceptionCategory,
): string => {
  if (category === "needs_new_bff_endpoint") return "design typed BFF endpoint or mutation boundary with tests";
  if (category === "must_stay_direct_for_now") return finding.suggestedMigrationPath;
  if (category === "can_be_migrated_later") return "migrate to an existing readonly BFF/transport path when an equivalent contract is identified";
  return "manual audit required before allowing or migrating";
};

const registryKey = (finding: Pick<DirectSupabaseFinding, "file" | "operation" | "callTarget">): string =>
  `${finding.file}|${finding.operation}|${finding.callTarget}`;

const registryEntryKey = (
  entry: Pick<DirectSupabaseExceptionRegistryEntry, "file" | "operation" | "callTarget">,
): string => `${entry.file}|${entry.operation}|${entry.callTarget}`;

export function buildDirectSupabaseExceptionEntry(
  finding: DirectSupabaseFinding,
): DirectSupabaseExceptionRegistryEntry {
  const category = classifyExceptionCategory(finding);
  return {
    file: finding.file,
    line: finding.line,
    operation: finding.operation,
    callTarget: finding.callTarget,
    category,
    reasonDirectCallRemains: reasonForException(finding, category),
    owner: ownerForException(finding, category),
    futureMigrationPath: futurePathForException(finding, category),
    risk: finding.risk,
    allowed: category !== "unsafe_unknown",
  };
}

export function buildDirectSupabaseExceptionRegistry(params: {
  findings: readonly DirectSupabaseFinding[];
  generatedAtLocal: string;
}): DirectSupabaseExceptionRegistry {
  const exceptions = params.findings
    .filter((finding) => finding.classification === "service_bypass")
    .map(buildDirectSupabaseExceptionEntry)
    .sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line);
  const categoryCounts = emptyExceptionCategoryCounts();
  const operationCounts = emptyOperationCounts();
  for (const entry of exceptions) {
    categoryCounts[entry.category] += 1;
    operationCounts[entry.operation] += 1;
  }

  return {
    wave: "S_AUDIT_BATTLE_17_DIRECT_SUPABASE_EXCEPTION_CONTAINMENT",
    generatedAtLocal: params.generatedAtLocal,
    source: {
      scanner: "scripts/architecture_anti_regression_suite.ts",
      inventoryArtifacts: [
        "artifacts/S_AUDIT_BATTLE_07_DIRECT_SUPABASE_BYPASS_BATCH_1_inventory.json",
        "artifacts/S_AUDIT_BATTLE_08_DIRECT_SUPABASE_BYPASS_BATCH_2_matrix.json",
        "artifacts/S_AUDIT_BATTLE_16_DIRECT_SUPABASE_BYPASS_BATCH_3_inventory_delta.json",
      ],
    },
    policy: {
      existingAllowedExceptionsPermitted: true,
      newUnclassifiedDirectCallsFailScanner: true,
      registryKey: "file|operation|callTarget",
    },
    summary: {
      totalExceptions: exceptions.length,
      allowedExceptions: exceptions.filter((entry) => entry.allowed).length,
      categoryCounts,
      operationCounts,
    },
    exceptions,
  };
}

const isDirectSupabaseExceptionRegistry = (
  value: unknown,
): value is DirectSupabaseExceptionRegistry => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const registry = value as Partial<DirectSupabaseExceptionRegistry>;
  return registry.wave === "S_AUDIT_BATTLE_17_DIRECT_SUPABASE_EXCEPTION_CONTAINMENT" &&
    !!registry.summary &&
    Array.isArray(registry.exceptions);
};

export function loadDirectSupabaseExceptionRegistry(params: {
  projectRoot: string;
  relativePath?: string;
}): DirectSupabaseExceptionRegistry | null {
  const relativePath = params.relativePath ?? DIRECT_SUPABASE_EXCEPTION_REGISTRY_RELATIVE_PATH;
  const fullPath = path.join(params.projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8")) as unknown;
  if (!isDirectSupabaseExceptionRegistry(parsed)) {
    throw new Error(`Invalid direct Supabase exception registry: ${relativePath}`);
  }
  return parsed;
}

const increment = (counts: Map<string, number>, key: string): void => {
  counts.set(key, (counts.get(key) ?? 0) + 1);
};

export function evaluateDirectSupabaseExceptionGuardrail(params: {
  findings: readonly DirectSupabaseFinding[];
  registry: DirectSupabaseExceptionRegistry | null;
  registryPath?: string;
}): {
  check: ArchitectureGuardrailCheck;
  summary: ArchitectureAntiRegressionReport["directSupabaseExceptionContainment"];
} {
  const registryPath = params.registryPath ?? DIRECT_SUPABASE_EXCEPTION_REGISTRY_RELATIVE_PATH;
  const currentServiceBypassFindings = params.findings.filter(
    (finding) => finding.classification === "service_bypass",
  );
  const categoryCounts = emptyExceptionCategoryCounts();
  const operationCounts = emptyOperationCounts();

  if (!params.registry) {
    return {
      check: {
        name: "direct_supabase_exception_registry",
        status: "fail",
        errors: [`exception_registry_missing:${registryPath}`],
      },
      summary: {
        registryPath,
        registryLoaded: false,
        registryEntries: 0,
        currentServiceBypassFindings: currentServiceBypassFindings.length,
        allowedCurrentFindings: 0,
        unclassifiedCurrentFindings: currentServiceBypassFindings.length,
        disallowedCurrentFindings: 0,
        categoryCounts,
        operationCounts,
      },
    };
  }

  const allowedCounts = new Map<string, number>();
  const currentCounts = new Map<string, number>();
  for (const entry of params.registry.exceptions) {
    categoryCounts[entry.category] += 1;
    operationCounts[entry.operation] += 1;
    if (entry.allowed) increment(allowedCounts, registryEntryKey(entry));
  }
  for (const finding of currentServiceBypassFindings) {
    increment(currentCounts, registryKey(finding));
  }

  const unclassified: string[] = [];
  let unclassifiedCurrentFindingCount = 0;
  for (const [key, count] of currentCounts.entries()) {
    const allowed = allowedCounts.get(key) ?? 0;
    if (count > allowed) {
      unclassified.push(`${key}:${count}>${allowed}`);
      unclassifiedCurrentFindingCount += count - allowed;
    }
  }
  const disallowedCurrentFindings = params.registry.exceptions.filter((entry) => !entry.allowed).length;
  const allowedCurrentFindings = Math.max(0, currentServiceBypassFindings.length - unclassifiedCurrentFindingCount);
  const errors = [
    ...unclassified.map((key) => `unclassified_direct_supabase_call:${key}`),
    ...(disallowedCurrentFindings > 0
      ? [`disallowed_exception_entries:${disallowedCurrentFindings}`]
      : []),
  ];

  return {
    check: {
      name: "direct_supabase_exception_registry",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      registryPath,
      registryLoaded: true,
      registryEntries: params.registry.exceptions.length,
      currentServiceBypassFindings: currentServiceBypassFindings.length,
      allowedCurrentFindings,
      unclassifiedCurrentFindings: unclassifiedCurrentFindingCount,
      disallowedCurrentFindings,
      categoryCounts,
      operationCounts,
    },
  };
}

export function evaluateProductionReadonlyCanaryGuardrail(): {
  check: ArchitectureGuardrailCheck;
  summary: ArchitectureAntiRegressionReport["productionReadonlyCanary"];
} {
  const { classifications, whitelist } = buildProductionBusinessReadonlyCanaryWhitelist({
    postReadRpcApproved: true,
  });
  const registry = validateProductionBusinessReadonlyCanaryRegistry({ classifications });
  const forbiddenMetricValidation = validateProductionBusinessReadonlyCanaryMetricLog({
    routeClass: "catalog_readonly_search_preview",
    statusClass: "2xx",
    latencyP50: 1,
    rawUrl: "https://example.invalid/path?token=redacted",
  });
  const unsafeWhitelist = classifications.filter(
    (classification) =>
      classification.safeForCanary &&
      (!classification.readonlyContractProven ||
        classification.mutationKey ||
        classification.dbWritePossible ||
        classification.rawPayloadLogging ||
        classification.rawRowsLogging),
  );
  const forbiddenMutationOperationCount: number =
    PRODUCTION_BUSINESS_READONLY_FORBIDDEN_MUTATION_OPERATIONS.length;
  const errors = [
    ...registry.errors,
    ...(whitelist.length === 0 ? ["readonly_whitelist_empty"] : []),
    ...(forbiddenMutationOperationCount === 0 ? ["mutation_blacklist_empty"] : []),
    ...(forbiddenMetricValidation.passed ? ["redaction_forbidden_keys_not_enforced"] : []),
    ...unsafeWhitelist.map((classification) => `unsafe_whitelist_route:${classification.id}`),
  ];

  return {
    check: {
      name: "production_readonly_canary_contract",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      whitelistRouteCount: whitelist.length,
      forbiddenMutationOperationCount,
      redactionForbiddenKeysEnforced: !forbiddenMetricValidation.passed,
    },
  };
}

const readProjectFile = (projectRoot: string, relativePath: string): string =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const safeReadProjectFile = (params: {
  readFile: ReadFile;
  relativePath: string;
}): string | null => {
  try {
    return params.readFile(params.relativePath);
  } catch (_error: unknown) {
    return null;
  }
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseJsonRecord = (source: string | null): Record<string, unknown> | null => {
  if (!source) return null;
  try {
    const parsed: unknown = JSON.parse(source);
    return isPlainRecord(parsed) ? parsed : null;
  } catch (_error: unknown) {
    return null;
  }
};

const recordValue = (record: Record<string, unknown> | null, key: string): unknown =>
  record ? record[key] : undefined;

const recordChild = (record: Record<string, unknown> | null, key: string): Record<string, unknown> | null => {
  const value = recordValue(record, key);
  return isPlainRecord(value) ? value : null;
};

const recordString = (record: Record<string, unknown> | null, key: string): string =>
  typeof recordValue(record, key) === "string" ? String(recordValue(record, key)) : "";

const recordNumber = (record: Record<string, unknown> | null, key: string): number | null => {
  const value = recordValue(record, key);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const recordBoolean = (record: Record<string, unknown> | null, key: string): boolean | null => {
  const value = recordValue(record, key);
  return typeof value === "boolean" ? value : null;
};

const recordStringArray = (record: Record<string, unknown> | null, key: string): readonly string[] => {
  const value = recordValue(record, key);
  return Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value : [];
};

const extractConstString = (source: string, constName: string): string | null => {
  const escapedName = constName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`const\\s+${escapedName}\\s*=\\s*\"([^\"]+)\"`).exec(source);
  return match?.[1] ?? null;
};

const directGeminiImportPattern =
  /(?:from\s+["'][^"']*geminiGateway["']|require\(\s*["'][^"']*geminiGateway["']\s*\))/;
const providerImplementationImportPattern =
  /(?:import\s+\{[^}]*\b(?:DisabledModelProvider|LegacyGeminiModelProvider)\b[^}]*\}\s+from\s+["'][^"']*model|from\s+["'][^"']*(?:DisabledModelProvider|LegacyGeminiModelProvider)["'])/;
const openAiLiveCallPattern =
  /(?:api\.openai\.com|new\s+OpenAI\s*\(|\bOpenAI\s*\(\s*\{|chat\.completions\.create|responses\.create)/i;
const aiClientSecretPattern =
  /\b(?:OPENAI_API_KEY|GEMINI_API_KEY|ANTHROPIC_API_KEY|MODEL_API_KEY|AI_PROVIDER_API_KEY)\b|sk-[A-Za-z0-9]{16,}|AIza[A-Za-z0-9_-]{20,}/;

const defaultAiModelBoundarySourceFiles = (projectRoot: string): string[] =>
  SOURCE_ROOTS.flatMap((rootName) =>
    listSourceFiles(path.join(projectRoot, rootName)).map((filePath) =>
      relativeProjectPath(projectRoot, filePath),
    ),
  );

const isAiUiProviderImportForbiddenPath = (file: string): boolean =>
  file.startsWith("src/screens/") ||
  file.startsWith("app/") ||
  file.includes("/components/") ||
  file === "src/features/ai/assistantActions.ts" ||
  file === "src/features/ai/useAssistantVoiceInput.ts";

export function evaluateAiModelBoundaryGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
  sourceFiles?: readonly string[];
}): {
  check: ArchitectureGuardrailCheck;
  summary: AiModelBoundarySummary;
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const sourceFiles = (params.sourceFiles ?? defaultAiModelBoundarySourceFiles(params.projectRoot))
    .map(normalizePath);
  const sourceEntries = sourceFiles.map((file) => ({
    file,
    source: safeReadProjectFile({ readFile, relativePath: file }) ?? "",
  }));
  const modelGatewaySource = safeReadProjectFile({ readFile, relativePath: AI_MODEL_GATEWAY_PATH });
  const modelTypesSource = safeReadProjectFile({ readFile, relativePath: AI_MODEL_TYPES_PATH });
  const disabledProviderSource = safeReadProjectFile({ readFile, relativePath: AI_DISABLED_PROVIDER_PATH });
  const legacyGeminiProviderSource = safeReadProjectFile({ readFile, relativePath: AI_LEGACY_GEMINI_PROVIDER_PATH });
  const assistantClientSource = safeReadProjectFile({ readFile, relativePath: AI_ASSISTANT_CLIENT_PATH });
  const aiReportsSource = safeReadProjectFile({ readFile, relativePath: AI_REPORTS_SERVICE_PATH });

  const directGeminiImportFindings = sourceEntries
    .filter((entry) => directGeminiImportPattern.test(entry.source))
    .filter((entry) => entry.file !== AI_LEGACY_GEMINI_PROVIDER_PATH);
  const uiProviderImportFindings = sourceEntries
    .filter((entry) => isAiUiProviderImportForbiddenPath(entry.file))
    .filter((entry) => providerImplementationImportPattern.test(entry.source));
  const openAiLiveCallFindings = sourceEntries.filter((entry) => openAiLiveCallPattern.test(entry.source));
  const apiKeyClientFindings = sourceEntries
    .filter((entry) => entry.file.startsWith("src/features/ai/") || entry.file.startsWith("src/screens/") || entry.file.startsWith("app/"))
    .filter((entry) => aiClientSecretPattern.test(entry.source));

  const assistantClientUsesGateway =
    Boolean(assistantClientSource?.includes("AiModelGateway")) &&
    !Boolean(assistantClientSource?.includes("geminiGateway")) &&
    !Boolean(assistantClientSource?.includes("requestAiGeneratedText"));
  const aiReportsRedactionContractPresent =
    Boolean(aiReportsSource?.includes("redactAiReportForStorage")) &&
    Boolean(aiReportsSource?.includes("redactAiReportStorageText(input.content)")) &&
    Boolean(aiReportsSource?.includes("rawprompt"));

  const findings = [
    ...directGeminiImportFindings.map((entry) => `direct_gemini_import:file=${entry.file}`),
    ...uiProviderImportFindings.map((entry) => `ui_provider_implementation_import:file=${entry.file}`),
    ...openAiLiveCallFindings.map((entry) => `openai_live_call:file=${entry.file}`),
    ...apiKeyClientFindings.map((entry) => `ai_api_key_client_reference:file=${entry.file}`),
  ];
  const errors = [
    ...(modelGatewaySource ? [] : [`missing_file:${AI_MODEL_GATEWAY_PATH}`]),
    ...(modelTypesSource ? [] : [`missing_file:${AI_MODEL_TYPES_PATH}`]),
    ...(disabledProviderSource ? [] : [`missing_file:${AI_DISABLED_PROVIDER_PATH}`]),
    ...(legacyGeminiProviderSource ? [] : [`missing_file:${AI_LEGACY_GEMINI_PROVIDER_PATH}`]),
    ...(assistantClientUsesGateway ? [] : ["assistant_client_not_using_ai_model_gateway"]),
    ...(aiReportsRedactionContractPresent ? [] : ["ai_reports_redaction_contract_missing"]),
    ...findings,
  ];

  return {
    check: {
      name: "ai_model_provider_boundary",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      aiModelGatewayPresent: Boolean(modelGatewaySource),
      aiModelTypesPresent: Boolean(modelTypesSource),
      aiDisabledProviderPresent: Boolean(disabledProviderSource),
      aiLegacyGeminiProviderPresent: Boolean(legacyGeminiProviderSource),
      assistantClientUsesGateway,
      directGeminiImportsOutsideLegacyProvider: directGeminiImportFindings.length,
      providerImplementationImportsFromUi: uiProviderImportFindings.length,
      openAiLiveCallFindings: openAiLiveCallFindings.length,
      apiKeyClientFindings: apiKeyClientFindings.length,
      aiReportsRedactionContractPresent,
      findings,
    },
  };
}

const aiScreenGatewayImportPattern =
  /(?:from\s+["'][^"']*AiModelGateway["']|import\s+\{[^}]*\bAiModelGateway\b[^}]*\}|from\s+["'][^"']*features\/ai\/model["'])/;

const isAiScreenOrUiPath = (file: string): boolean =>
  file.startsWith("src/screens/") ||
  file.startsWith("app/") ||
  file.includes("/components/");

export function evaluateAiRoleRiskApprovalControlPlaneGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
  sourceFiles?: readonly string[];
}): {
  check: ArchitectureGuardrailCheck;
  summary: AiRoleRiskApprovalControlPlaneSummary;
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const sourceFiles = (params.sourceFiles ?? defaultAiModelBoundarySourceFiles(params.projectRoot))
    .map(normalizePath);
  const sourceEntries = sourceFiles.map((file) => ({
    file,
    source: safeReadProjectFile({ readFile, relativePath: file }) ?? "",
  }));

  const rolePolicySource = safeReadProjectFile({ readFile, relativePath: AI_ROLE_POLICY_PATH });
  const riskPolicySource = safeReadProjectFile({ readFile, relativePath: AI_RISK_POLICY_PATH });
  const screenRegistrySource = safeReadProjectFile({ readFile, relativePath: AI_SCREEN_REGISTRY_PATH });
  const approvalGateSource = safeReadProjectFile({ readFile, relativePath: AI_APPROVAL_GATE_PATH });
  const responsePolicySource = safeReadProjectFile({ readFile, relativePath: AI_PROFESSIONAL_RESPONSE_POLICY_PATH });
  const assistantActionsSource = safeReadProjectFile({ readFile, relativePath: AI_ASSISTANT_ACTIONS_PATH });
  const assistantPromptsSource = safeReadProjectFile({ readFile, relativePath: AI_ASSISTANT_PROMPTS_PATH });
  const assistantScopeContextSource = safeReadProjectFile({ readFile, relativePath: AI_ASSISTANT_SCOPE_CONTEXT_PATH });
  const contextRedactionSource = safeReadProjectFile({ readFile, relativePath: AI_CONTEXT_REDACTION_PATH });
  const auditEventTypesSource = safeReadProjectFile({ readFile, relativePath: AI_AUDIT_EVENT_TYPES_PATH });

  const screenGatewayImportFindings = sourceEntries
    .filter((entry) => isAiScreenOrUiPath(entry.file))
    .filter((entry) => aiScreenGatewayImportPattern.test(entry.source) || providerImplementationImportPattern.test(entry.source));

  const assistantActionsUsesApprovalGate =
    Boolean(assistantActionsSource?.includes("assertNoDirectAiMutation")) &&
    Boolean(assistantActionsSource?.includes("submitAiActionForApproval"));
  const assistantActionsDirectSubmitBlocked =
    assistantActionsUsesApprovalGate &&
    !Boolean(assistantActionsSource?.includes("submitRequestToDirector"));
  const directorFullAccessPolicyPresent =
    Boolean(rolePolicySource?.includes("director: AI_DOMAINS")) &&
    Boolean(rolePolicySource?.includes("control: AI_DOMAINS")) &&
    Boolean(rolePolicySource?.includes("execute_approved_action"));
  const nonDirectorScopePresent =
    Boolean(rolePolicySource?.includes("foreman: [")) &&
    Boolean(rolePolicySource?.includes("buyer: [")) &&
    Boolean(rolePolicySource?.includes("accountant: [")) &&
    Boolean(rolePolicySource?.includes("contractor: [")) &&
    Boolean(rolePolicySource?.includes("unknown: []"));
  const forbiddenActionsBlocked =
    Boolean(riskPolicySource?.includes("direct_supabase_query")) &&
    Boolean(riskPolicySource?.includes("raw_db_export")) &&
    Boolean(riskPolicySource?.includes("delete_data")) &&
    Boolean(riskPolicySource?.includes("bypass_approval")) &&
    Boolean(riskPolicySource?.includes("AI action is forbidden"));
  const approvalRequiredCannotExecuteDirectly =
    Boolean(approvalGateSource?.includes('action.status !== "approved"')) &&
    Boolean(approvalGateSource?.includes("missing idempotency key")) &&
    Boolean(approvalGateSource?.includes("missing audit event")) &&
    Boolean(approvalGateSource?.includes("Direct AI mutation blocked"));
  const promptPolicyBuilderApplied =
    Boolean(responsePolicySource?.includes("buildAiProfessionalResponsePolicyPrompt")) &&
    Boolean(assistantPromptsSource?.includes("buildAiProfessionalResponsePolicyPrompt"));
  const screenContextRedactionPresent =
    Boolean(contextRedactionSource?.includes("redactAiContextForModel")) &&
    Boolean(assistantScopeContextSource?.includes("redactAiContextSummaryText"));
  const auditEventsPresent =
    Boolean(auditEventTypesSource?.includes("ai.policy.checked")) &&
    Boolean(auditEventTypesSource?.includes("ai.action.approval_required")) &&
    Boolean(auditEventTypesSource?.includes("ai.prompt.policy_applied"));

  const promptBypassFindings = [
    ...(assistantPromptsSource && /ignore approval/i.test(assistantPromptsSource)
      ? ["ai_prompt_forbidden_ignore_approval"]
      : []),
    ...(assistantPromptsSource && /bypass approval/i.test(assistantPromptsSource)
      ? ["ai_prompt_forbidden_bypass_approval"]
      : []),
  ];
  const findings = [
    ...screenGatewayImportFindings.map((entry) => `screen_ai_model_gateway_import:file=${entry.file}`),
    ...promptBypassFindings,
  ];
  const errors = [
    ...(rolePolicySource ? [] : [`missing_file:${AI_ROLE_POLICY_PATH}`]),
    ...(riskPolicySource ? [] : [`missing_file:${AI_RISK_POLICY_PATH}`]),
    ...(screenRegistrySource ? [] : [`missing_file:${AI_SCREEN_REGISTRY_PATH}`]),
    ...(approvalGateSource ? [] : [`missing_file:${AI_APPROVAL_GATE_PATH}`]),
    ...(responsePolicySource ? [] : [`missing_file:${AI_PROFESSIONAL_RESPONSE_POLICY_PATH}`]),
    ...(assistantActionsUsesApprovalGate ? [] : ["assistant_actions_not_using_ai_approval_gate"]),
    ...(assistantActionsDirectSubmitBlocked ? [] : ["assistant_actions_direct_submit_not_blocked"]),
    ...(directorFullAccessPolicyPresent ? [] : ["director_full_access_policy_missing"]),
    ...(nonDirectorScopePresent ? [] : ["non_director_scope_policy_missing"]),
    ...(forbiddenActionsBlocked ? [] : ["forbidden_ai_actions_not_blocked"]),
    ...(approvalRequiredCannotExecuteDirectly ? [] : ["approval_required_actions_can_execute_directly"]),
    ...(promptPolicyBuilderApplied ? [] : ["ai_professional_prompt_policy_not_applied"]),
    ...(screenContextRedactionPresent ? [] : ["ai_screen_context_redaction_missing"]),
    ...(auditEventsPresent ? [] : ["ai_audit_event_types_missing"]),
    ...findings,
  ];

  return {
    check: {
      name: "ai_role_risk_approval_control_plane",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      rolePolicyPresent: Boolean(rolePolicySource),
      riskPolicyPresent: Boolean(riskPolicySource),
      screenCapabilityRegistryPresent: Boolean(screenRegistrySource),
      approvalGatePresent: Boolean(approvalGateSource),
      professionalResponsePolicyPresent: Boolean(responsePolicySource),
      assistantActionsUsesApprovalGate,
      assistantActionsDirectSubmitBlocked,
      directorFullAccessPolicyPresent,
      nonDirectorScopePresent,
      forbiddenActionsBlocked,
      approvalRequiredCannotExecuteDirectly,
      promptPolicyBuilderApplied,
      screenContextRedactionPresent,
      auditEventsPresent,
      screenGatewayImports: screenGatewayImportFindings.length,
      findings,
    },
  };
}

export function evaluateCacheRateScopeGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: ArchitectureAntiRegressionReport["cacheRateScope"];
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const cacheSource = readFile("src/shared/scale/cacheShadowRuntime.ts");
  const cacheReadinessContractSource = cacheSource;
  const cacheCanarySource = readFile("scripts/cache_one_route_read_through_canary.ts");
  const stagingBffSource = readFile("scripts/server/stagingBffServerBoundary.ts");
  const providerSource = readFile("src/shared/scale/providerRuntimeConfig.ts");
  const rateCanarySource = readFile("scripts/rate_limit_real_user_canary.ts");
  const cacheConfig = resolveCacheShadowRuntimeConfig(buildCacheReadThroughOneRouteApplyEnv("canary"));
  const persistentApplyEnv = buildCacheReadThroughOneRouteApplyEnv("persistent");
  const persistentApplyConfig = resolveCacheShadowRuntimeConfig(persistentApplyEnv);
  const rateLimitRoute = extractConstString(rateCanarySource, "CANARY_ROUTE") ?? "";
  const rateLimitPercentText = extractConstString(rateCanarySource, "CANARY_PERCENT") ?? "";
  const rateLimitPercent = Number(rateLimitPercentText);
  const canonicalReadThroughKey =
    CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.readThroughV1Enabled === "SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED" &&
    Object.prototype.hasOwnProperty.call(
      persistentApplyEnv,
      CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.readThroughV1Enabled,
    ) &&
    persistentApplyConfig.readThroughV1Enabled === true;
  const readThroughLiteralKeyUsageLocked =
    cacheSource.includes('"SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED"') &&
    !cacheCanarySource.includes('"SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED"') &&
    !stagingBffSource.includes('"SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED"') &&
    !providerSource.includes('"SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED"');
  const persistentReadinessContractLocked =
    canonicalReadThroughKey &&
    isCacheReadThroughOneRouteApplyConfigReady(persistentApplyConfig) &&
    persistentApplyConfig.routeAllowlist.length === 1 &&
    persistentApplyConfig.routeAllowlist[0] === CACHE_READ_THROUGH_ONE_ROUTE &&
    persistentApplyConfig.mode === CACHE_READ_THROUGH_ONE_ROUTE_MODE &&
    cacheReadinessContractSource.includes('"persistent"') &&
    cacheReadinessContractSource.includes("buildCacheReadThroughOneRouteApplyEnv") &&
    cacheReadinessContractSource.includes("CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.readThroughV1Enabled") &&
    cacheCanarySource.includes('buildCacheReadThroughOneRouteApplyEnv("canary")') &&
    stagingBffSource.includes("buildCacheReadThroughReadinessDiagnostics") &&
    stagingBffSource.includes("CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.readThroughV1Enabled") &&
    providerSource.includes("CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.readThroughV1Enabled");
  const cacheCanaryRouteScoped =
    cacheSource.includes("CACHE_SHADOW_RUNTIME_ENV_NAMES") &&
    cacheSource.includes("SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED") &&
    cacheSource.includes("CACHE_READ_THROUGH_V1_ALLOWED_ROUTES") &&
    cacheSource.includes("isCacheReadThroughV1RouteAllowed") &&
    cacheSource.includes("parseRouteAllowlist") &&
    cacheSource.includes("routeAllowed") &&
    cacheConfig.readThroughV1Enabled === true &&
    cacheConfig.routeAllowlist.length === 1 &&
    cacheConfig.routeAllowlist[0] === CACHE_RATE_ALLOWED_ROUTE;
  const errors = [
    ...(cacheCanaryRouteScoped ? [] : ["cache_canary_not_route_scoped"]),
    ...(persistentReadinessContractLocked ? [] : ["cache_persistent_readiness_contract_drifted"]),
    ...(canonicalReadThroughKey ? [] : ["cache_persistent_readiness_key_not_canonical"]),
    ...(readThroughLiteralKeyUsageLocked ? [] : ["cache_read_through_v1_literal_key_duplicated_outside_contract"]),
    ...(rateLimitRoute === CACHE_RATE_ALLOWED_ROUTE
      ? []
      : [`rate_limit_canary_route_changed:${rateLimitRoute || "missing"}`]),
    ...(rateLimitPercent === RATE_LIMIT_ALLOWED_PERCENT
      ? []
      : [`rate_limit_canary_percent_changed:${rateLimitPercentText || "missing"}`]),
  ];

  return {
    check: {
      name: "cache_rate_route_scope",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      cacheCanaryRouteScoped,
      cacheAllowedRoute: cacheConfig.routeAllowlist[0] ?? "",
      rateLimitCanaryRoute: rateLimitRoute,
      rateLimitCanaryPercent: Number.isFinite(rateLimitPercent) ? rateLimitPercent : -1,
      persistentReadinessContractLocked,
      persistentReadinessKeyCanonical: canonicalReadThroughKey,
      readThroughLiteralKeyUsageLocked,
    },
  };
}

export function evaluateCacheColdMissProofGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: ArchitectureAntiRegressionReport["cacheColdMissProof"];
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const testSource = safeReadProjectFile({ readFile, relativePath: CACHE_COLD_MISS_PROOF_TEST_PATH });
  const matrixSource = safeReadProjectFile({ readFile, relativePath: CACHE_COLD_MISS_MATRIX_PATH });
  const proofSource = safeReadProjectFile({ readFile, relativePath: CACHE_COLD_MISS_PROOF_PATH });
  const matrix = parseJsonRecord(matrixSource);
  const baseline = recordChild(matrix, "baseline");
  const proofStrategy = recordChild(matrix, "proofStrategy");
  const routeScope = recordChild(matrix, "routeScope");
  const rollback = recordChild(matrix, "rollbackAndInvalidation");
  const beforeAfter = recordChild(matrix, "beforeAfterMetrics");
  const after = recordChild(beforeAfter, "after");
  const safety = recordChild(matrix, "safety");
  const readThroughAllowedRoutes = recordStringArray(routeScope, "readThroughAllowedRoutes");
  const publicCatalogReadThroughRoutes = recordStringArray(routeScope, "publicCatalogReadThroughRoutes");

  const proofTestPresent =
    testSource !== null &&
    testSource.includes("S_CACHE_01_COLD_MISS_DETERMINISTIC_PROOF") &&
    testSource.includes("expect(await redis.adapter.get(proofKey)).toBeNull()") &&
    testSource.includes("serverTiming: expect.objectContaining({ cacheHit: false })") &&
    testSource.includes("serverTiming: expect.objectContaining({ cacheHit: true })") &&
    testSource.includes("invalidateByTag(\"marketplace\")") &&
    testSource.includes("resolveCacheShadowRuntimeConfig({}).enabled");
  const matrixArtifactPresent = matrix !== null;
  const proofArtifactPresent =
    proofSource !== null &&
    proofSource.includes(CACHE_COLD_MISS_READY_STATUS) &&
    proofSource.includes("No production cache enablement") &&
    proofSource.includes("Supabase Realtime status remains");
  const matrixStatus = recordString(matrix, "status");
  const deterministicProofReady =
    matrixStatus === CACHE_COLD_MISS_READY_STATUS &&
    recordBoolean(after, "deterministicColdMissProof") === true;
  const knownEmptyKeyProof =
    recordBoolean(after, "knownEmptyKeyProof") === true &&
    recordBoolean(proofStrategy, "knownEmptyBeforeFirstRequest") === true;
  const firstMissSecondHitProof =
    recordBoolean(after, "firstMissSecondHitProof") === true &&
    recordNumber(after, "missCount") === 1 &&
    recordNumber(after, "hitCount") === 1 &&
    recordNumber(after, "readThroughCount") === 1 &&
    recordNumber(after, "providerCalls") === 1;
  const utf8SafeProof =
    recordBoolean(after, "utf8SafeProof") === true &&
    recordBoolean(proofStrategy, "utf8Safe") === true;
  const metricsRedactedProof =
    recordBoolean(proofStrategy, "metricsRedacted") === true &&
    recordBoolean(proofStrategy, "routeMetricsRedactionSafe") === true &&
    recordBoolean(proofStrategy, "rawCacheKeyReturned") === false &&
    recordBoolean(proofStrategy, "rawPayloadLogged") === false &&
    recordBoolean(proofStrategy, "piiLogged") === false;
  const routeScopeUnchanged =
    readThroughAllowedRoutes.length === 1 &&
    readThroughAllowedRoutes[0] === CACHE_RATE_ALLOWED_ROUTE &&
    publicCatalogReadThroughRoutes.length === 1 &&
    publicCatalogReadThroughRoutes[0] === CACHE_RATE_ALLOWED_ROUTE &&
    recordBoolean(routeScope, "routeExpansion") === false &&
    recordBoolean(routeScope, "readRoutesCacheDefaultEnabled") === false;
  const rollbackSafeProof =
    recordBoolean(after, "rollbackSafeProof") === true &&
    recordBoolean(rollback, "cacheInvalidationExecutionEnabledByDefault") === false &&
    recordNumber(rollback, "rollbackDeletedEntries") === 1 &&
    recordBoolean(rollback, "postRollbackReadNull") === true &&
    recordBoolean(rollback, "dbWrites") === false;
  const productionCacheStillDisabled =
    recordBoolean(baseline, "productionCacheEnabled") === false &&
    recordBoolean(baseline, "readThroughV1DefaultEnabled") === false &&
    recordBoolean(baseline, "cachePoliciesDefaultEnabled") === false &&
    recordBoolean(safety, "productionCacheEnabled") === false &&
    recordBoolean(safety, "cacheLeftEnabled") === false &&
    recordBoolean(safety, "broadCacheConfigChange") === false;

  const errors = [
    ...(proofTestPresent ? [] : ["cache_cold_miss_proof_test_missing_or_weakened"]),
    ...(matrixArtifactPresent ? [] : ["cache_cold_miss_matrix_missing_or_invalid"]),
    ...(proofArtifactPresent ? [] : ["cache_cold_miss_proof_artifact_missing_or_weakened"]),
    ...(deterministicProofReady ? [] : [`cache_cold_miss_status_not_ready:${matrixStatus || "missing"}`]),
    ...(knownEmptyKeyProof ? [] : ["cache_cold_miss_known_empty_key_not_proven"]),
    ...(firstMissSecondHitProof ? [] : ["cache_cold_miss_first_miss_second_hit_not_proven"]),
    ...(utf8SafeProof ? [] : ["cache_cold_miss_utf8_not_proven"]),
    ...(metricsRedactedProof ? [] : ["cache_cold_miss_metrics_not_redaction_safe"]),
    ...(routeScopeUnchanged ? [] : ["cache_cold_miss_route_scope_changed"]),
    ...(rollbackSafeProof ? [] : ["cache_cold_miss_rollback_not_safe"]),
    ...(productionCacheStillDisabled ? [] : ["cache_cold_miss_production_cache_not_disabled"]),
  ];

  return {
    check: {
      name: "cache_cold_miss_deterministic_proof",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      proofTestPresent,
      matrixArtifactPresent,
      proofArtifactPresent,
      matrixStatus,
      deterministicProofReady,
      knownEmptyKeyProof,
      firstMissSecondHitProof,
      utf8SafeProof,
      metricsRedactedProof,
      routeScopeUnchanged,
      rollbackSafeProof,
      productionCacheStillDisabled,
    },
  };
}

export function evaluateRateLimitMarketplaceCanaryProofGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: ArchitectureAntiRegressionReport["rateLimitMarketplaceCanaryProof"];
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const matrixSource = safeReadProjectFile({ readFile, relativePath: RATE_LIMIT_MARKETPLACE_CANARY_MATRIX_PATH });
  const proofSource = safeReadProjectFile({ readFile, relativePath: RATE_LIMIT_MARKETPLACE_CANARY_PROOF_PATH });
  const matrix = parseJsonRecord(matrixSource);
  const envSnapshot = recordChild(matrix, "env_snapshot_redacted");
  const route = recordString(matrix, "route") || recordString(matrix, "canary_route_class");
  const matrixStatus = recordString(matrix, "final_status");
  const routeScoped =
    matrixStatus === RATE_LIMIT_MARKETPLACE_CANARY_PASS_STATUS &&
    route === CACHE_RATE_ALLOWED_ROUTE &&
    recordNumber(matrix, "route_allowlist_count") === 1 &&
    recordBoolean(matrix, "route_scoped_enforcement") === true &&
    recordBoolean(matrix, "global_real_user_enforcement") === false &&
    recordNumber(matrix, "canary_percent") === RATE_LIMIT_ALLOWED_PERCENT &&
    recordBoolean(matrix, "broad_mutation_route_enforcement") === false &&
    recordBoolean(matrix, "second_route_enabled") === false;
  const selectedSubjectProof =
    recordString(matrix, "selected_subject_proof") === "selected_redacted" &&
    recordString(matrix, "selected_canary_request_status_class") === "2xx" &&
    recordString(matrix, "selected_error_category") === "none";
  const nonSelectedSubjectProof =
    recordString(matrix, "non_selected_subject_proof") === "non_selected_redacted" &&
    recordString(matrix, "non_selected_allow_request_status_class") === "2xx" &&
    recordString(matrix, "non_selected_error_category") === "none";
  const privateSmokeProof =
    recordBoolean(matrix, "private_in_service_smoke_green") === true &&
    recordString(matrix, "synthetic_private_smoke_status_class") === "2xx" &&
    recordString(matrix, "synthetic_private_smoke_error_category") === "none" &&
    recordBoolean(matrix, "synthetic_throttle_still_works") === true;
  const healthReadyStable =
    recordBoolean(matrix, "health_ready_stable") === true &&
    recordNumber(matrix, "production_health_before") === 200 &&
    recordNumber(matrix, "production_ready_before") === 200 &&
    recordNumber(matrix, "production_health_after_deploy") === 200 &&
    recordNumber(matrix, "production_ready_after_deploy") === 200 &&
    recordNumber(matrix, "production_health_after_canary") === 200 &&
    recordNumber(matrix, "production_ready_after_canary") === 200;
  const envSnapshotRedacted =
    envSnapshot !== null &&
    [
      "SCALE_RATE_ENFORCEMENT_MODE",
      "SCALE_RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST",
      "SCALE_RATE_LIMIT_REAL_USER_CANARY_PERCENT",
      "SCALE_RATE_LIMIT_PRODUCTION_ENABLED",
      "SCALE_RATE_LIMIT_STORE_URL",
      "SCALE_RATE_LIMIT_NAMESPACE",
      "BFF_RATE_LIMIT_METADATA_ENABLED",
    ].every((key) => recordString(recordChild(envSnapshot, key), "valueClass") === "present_redacted");
  const redactedProof =
    recordBoolean(matrix, "env_snapshot_captured") === true &&
    envSnapshotRedacted &&
    recordBoolean(matrix, "redaction_enabled") === true &&
    recordBoolean(matrix, "raw_keys_printed") === false &&
    recordBoolean(matrix, "jwt_printed") === false &&
    recordBoolean(matrix, "ip_user_company_printed") === false &&
    recordBoolean(matrix, "secrets_printed") === false &&
    recordBoolean(matrix, "urls_printed") === false &&
    recordBoolean(matrix, "raw_payloads_printed") === false &&
    recordBoolean(matrix, "raw_db_rows_printed") === false &&
    recordBoolean(matrix, "business_rows_printed") === false &&
    recordBoolean(matrix, "db_writes") === false &&
    recordBoolean(matrix, "migrations_applied") === false &&
    recordBoolean(matrix, "cache_changes") === false;
  const canaryRetained =
    recordBoolean(matrix, "canary_retained") === true &&
    recordBoolean(matrix, "rollback_triggered") === false &&
    recordBoolean(matrix, "rollback_succeeded") === false;
  const matrixArtifactPresent = matrix !== null;
  const proofArtifactPresent =
    proofSource !== null &&
    proofSource.includes(RATE_LIMIT_MARKETPLACE_CANARY_PASS_STATUS) &&
    proofSource.includes("- route: marketplace.catalog.search") &&
    proofSource.includes("- canary_percent: 1") &&
    proofSource.includes("- selected_subject_proof: selected_redacted") &&
    proofSource.includes("- non_selected_subject_proof: non_selected_redacted") &&
    proofSource.includes("- private_smoke_green: true");
  const errors = [
    ...(matrixArtifactPresent ? [] : ["rate_limit_marketplace_canary_matrix_missing"]),
    ...(proofArtifactPresent ? [] : ["rate_limit_marketplace_canary_proof_missing_or_stale"]),
    ...(routeScoped ? [] : ["rate_limit_marketplace_canary_scope_not_locked"]),
    ...(selectedSubjectProof ? [] : ["rate_limit_marketplace_selected_subject_not_proven"]),
    ...(nonSelectedSubjectProof ? [] : ["rate_limit_marketplace_non_selected_subject_not_proven"]),
    ...(privateSmokeProof ? [] : ["rate_limit_marketplace_private_smoke_not_green"]),
    ...(healthReadyStable ? [] : ["rate_limit_marketplace_health_ready_not_stable"]),
    ...(redactedProof ? [] : ["rate_limit_marketplace_redaction_or_safety_not_proven"]),
    ...(canaryRetained ? [] : ["rate_limit_marketplace_canary_retention_not_recorded"]),
  ];

  return {
    check: {
      name: "rate_limit_marketplace_1_percent_canary_proof",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      matrixArtifactPresent,
      proofArtifactPresent,
      matrixStatus,
      routeScoped,
      selectedSubjectProof,
      nonSelectedSubjectProof,
      privateSmokeProof,
      healthReadyStable,
      redactedProof,
      canaryRetained,
    },
  };
}

export function evaluateRateLimitMarketplace5PctCanaryProofGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: ArchitectureAntiRegressionReport["rateLimitMarketplace5PctCanaryProof"];
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const matrixSource = safeReadProjectFile({ readFile, relativePath: RATE_LIMIT_MARKETPLACE_5PCT_MATRIX_PATH });
  const proofSource = safeReadProjectFile({ readFile, relativePath: RATE_LIMIT_MARKETPLACE_5PCT_PROOF_PATH });
  const monitorSource = safeReadProjectFile({ readFile, relativePath: RATE_LIMIT_MARKETPLACE_5PCT_MONITOR_MATRIX_PATH });
  const metricsSource = safeReadProjectFile({ readFile, relativePath: RATE_LIMIT_MARKETPLACE_5PCT_MONITOR_METRICS_PATH });
  const matrix = parseJsonRecord(matrixSource);
  const monitor = parseJsonRecord(monitorSource);
  const metrics = parseJsonRecord(metricsSource);
  const verification = recordChild(matrix, "verification");
  const healthReady = recordChild(matrix, "health_ready");
  const healthBefore = recordChild(healthReady, "before");
  const healthAfterDeploy = recordChild(healthReady, "after_deploy");
  const healthAfter = recordChild(healthReady, "after");
  const negative = recordChild(matrix, "negative_confirmations");
  const monitorNegative = recordChild(monitor, "negative_confirmations");
  const matrixStatus = recordString(matrix, "final_status");
  const monitorStatus = recordString(monitor, "final_status");
  const matrixArtifactPresent = matrix !== null;
  const monitorArtifactPresent = monitor !== null;
  const metricsArtifactPresent = metrics !== null;
  const routeScoped =
    matrixStatus === RATE_LIMIT_MARKETPLACE_5PCT_PASS_STATUS &&
    recordString(matrix, "route") === CACHE_RATE_ALLOWED_ROUTE &&
    recordNumber(matrix, "percent") === RATE_LIMIT_5PCT_ALLOWED_PERCENT &&
    recordNumber(matrix, "route_allowlist_count") === 1 &&
    recordBoolean(matrix, "retained") === true &&
    recordBoolean(negative, "all_routes") === false &&
    recordBoolean(negative, "ten_percent") === false &&
    recordBoolean(negative, "cache_changes") === false;
  const selectedSubjectProof =
    recordString(verification, "selected_subject_proof") === "selected_redacted" &&
    recordString(verification, "selected_status_class") === "2xx";
  const nonSelectedSubjectProof =
    recordString(verification, "non_selected_subject_proof") === "non_selected_redacted" &&
    recordString(verification, "non_selected_status_class") === "2xx";
  const privateSmokeProof =
    recordBoolean(verification, "private_smoke_2xx") === true &&
    recordString(metrics, "private_smoke_status_class") === "2xx";
  const wouldAllowProof = recordBoolean(verification, "wouldAllow") === true && recordBoolean(metrics, "wouldAllow") === true;
  const wouldThrottleProof =
    recordBoolean(verification, "wouldThrottle") === true && recordBoolean(metrics, "wouldThrottle") === true;
  const falsePositiveCountZero =
    recordNumber(verification, "false_positive_count") === 0 &&
    recordNumber(metrics, "false_positive_count") === 0 &&
    recordNumber(metrics, "non_selected_blocked_count") === 0;
  const healthStable =
    recordNumber(healthBefore, "health") === 200 &&
    recordNumber(healthBefore, "ready") === 200 &&
    recordNumber(healthAfterDeploy, "health") === 200 &&
    recordNumber(healthAfterDeploy, "ready") === 200 &&
    recordNumber(healthAfter, "health") === 200 &&
    recordNumber(healthAfter, "ready") === 200 &&
    recordNumber(verification, "health_after") === 200 &&
    recordNumber(verification, "ready_after") === 200 &&
    recordNumber(monitor, "health_after") === 200 &&
    recordNumber(monitor, "ready_after") === 200;
  const redactedProof =
    recordBoolean(verification, "metrics_redacted") === true &&
    recordBoolean(monitor, "metrics_redacted") === true &&
    recordBoolean(negative, "raw_subject_user_token_values_printed") === false &&
    recordBoolean(monitorNegative, "raw_subject_user_token_values_printed") === false &&
    recordBoolean(negative, "db_writes") === false &&
    recordBoolean(negative, "production_mutations") === false &&
    recordBoolean(monitorNegative, "db_writes") === false &&
    recordBoolean(monitorNegative, "production_mutations") === false;
  const monitorStable =
    monitorStatus === RATE_LIMIT_MARKETPLACE_5PCT_MONITOR_PASS_STATUS &&
    recordString(monitor, "route") === CACHE_RATE_ALLOWED_ROUTE &&
    recordNumber(monitor, "route_count") === 1 &&
    recordNumber(monitor, "percent") === RATE_LIMIT_5PCT_ALLOWED_PERCENT &&
    recordBoolean(monitor, "non_selected_blocked") === false &&
    recordBoolean(monitor, "private_smoke_2xx") === true &&
    recordBoolean(monitorNegative, "cache_changes") === false &&
    recordNumber(metrics, "sample_size") === 10 &&
    recordNumber(metrics, "allowed_count") === 10 &&
    recordNumber(metrics, "throttled_count") === 0;
  const proofArtifactPresent =
    proofSource !== null &&
    proofSource.includes(RATE_LIMIT_MARKETPLACE_5PCT_PASS_STATUS) &&
    proofSource.includes("- route: marketplace.catalog.search") &&
    proofSource.includes("- percent: 5") &&
    proofSource.includes("- false_positive_count: 0");
  const errors = [
    ...(matrixArtifactPresent ? [] : ["rate_limit_marketplace_5pct_matrix_missing"]),
    ...(monitorArtifactPresent ? [] : ["rate_limit_marketplace_5pct_monitor_missing"]),
    ...(metricsArtifactPresent ? [] : ["rate_limit_marketplace_5pct_metrics_missing"]),
    ...(proofArtifactPresent ? [] : ["rate_limit_marketplace_5pct_proof_missing_or_stale"]),
    ...(routeScoped ? [] : ["rate_limit_marketplace_5pct_scope_not_locked"]),
    ...(selectedSubjectProof ? [] : ["rate_limit_marketplace_5pct_selected_subject_not_proven"]),
    ...(nonSelectedSubjectProof ? [] : ["rate_limit_marketplace_5pct_non_selected_subject_not_proven"]),
    ...(privateSmokeProof ? [] : ["rate_limit_marketplace_5pct_private_smoke_not_green"]),
    ...(wouldAllowProof ? [] : ["rate_limit_marketplace_5pct_would_allow_not_proven"]),
    ...(wouldThrottleProof ? [] : ["rate_limit_marketplace_5pct_would_throttle_not_proven"]),
    ...(falsePositiveCountZero ? [] : ["rate_limit_marketplace_5pct_false_positive_nonzero"]),
    ...(healthStable ? [] : ["rate_limit_marketplace_5pct_health_not_stable"]),
    ...(redactedProof ? [] : ["rate_limit_marketplace_5pct_redaction_or_safety_not_proven"]),
    ...(monitorStable ? [] : ["rate_limit_marketplace_5pct_monitor_not_stable"]),
  ];

  return {
    check: {
      name: "rate_limit_marketplace_5pct_canary_proof",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      matrixArtifactPresent,
      monitorArtifactPresent,
      metricsArtifactPresent,
      proofArtifactPresent,
      matrixStatus,
      monitorStatus,
      routeScoped,
      selectedSubjectProof,
      nonSelectedSubjectProof,
      privateSmokeProof,
      wouldAllowProof,
      wouldThrottleProof,
      falsePositiveCountZero,
      healthStable,
      redactedProof,
      monitorStable,
    },
  };
}

const findProductionRawLoopAllowlistEntry = (
  allowlist: readonly ProductionRawLoopAllowlistEntry[],
  finding: Pick<ProductionRawLoopFinding, "file" | "line" | "pattern">,
): ProductionRawLoopAllowlistEntry | undefined =>
  allowlist.find(
    (entry) =>
      normalizePath(entry.file) === finding.file &&
      entry.line === finding.line &&
      entry.pattern === finding.pattern,
  );

const productionRawLoopPatterns: readonly {
  pattern: ProductionRawLoopPattern;
  regex: RegExp;
}[] = [
  { pattern: "while_true", regex: /\bwhile\s*\(\s*true\s*\)/g },
  { pattern: "for_ever", regex: /\bfor\s*\(\s*;\s*;\s*\)/g },
];

export function scanProductionRawLoopSource(params: {
  file: string;
  source: string;
  allowlist?: readonly ProductionRawLoopAllowlistEntry[];
}): ProductionRawLoopFinding[] {
  const file = normalizePath(params.file);
  const allowlist = params.allowlist ?? PRODUCTION_RAW_LOOP_ALLOWLIST;
  const findings: ProductionRawLoopFinding[] = [];

  params.source.split(/\r?\n/).forEach((lineText, index) => {
    const line = index + 1;
    for (const candidate of productionRawLoopPatterns) {
      candidate.regex.lastIndex = 0;
      const match = candidate.regex.exec(lineText);
      if (!match) continue;
      const allowlistEntry = findProductionRawLoopAllowlistEntry(allowlist, {
        file,
        line,
        pattern: candidate.pattern,
      });
      findings.push({
        file,
        line,
        pattern: candidate.pattern,
        matchedLoop: match[0],
        allowlisted: Boolean(allowlistEntry),
        reason: allowlistEntry?.reason ?? null,
        owner: allowlistEntry?.owner ?? null,
        testCoverage: allowlistEntry?.testCoverage ?? null,
      });
    }
  });

  return findings;
}

export function scanProductionRawLoops(
  projectRoot: string,
  allowlist: readonly ProductionRawLoopAllowlistEntry[] = PRODUCTION_RAW_LOOP_ALLOWLIST,
): ProductionRawLoopFinding[] {
  const sourceRoot = path.join(projectRoot, "src");
  return listSourceFiles(sourceRoot)
    .map((filePath) => relativeProjectPath(projectRoot, filePath))
    .filter((relativePath) => !isTestPath(relativePath))
    .flatMap((relativePath) =>
      scanProductionRawLoopSource({
        file: relativePath,
        source: readProjectFile(projectRoot, relativePath),
        allowlist,
      }),
    );
}

export function evaluateProductionRawLoopGuardrail(params: {
  findings: readonly ProductionRawLoopFinding[];
  allowlist?: readonly ProductionRawLoopAllowlistEntry[];
}): {
  check: ArchitectureGuardrailCheck;
  summary: ArchitectureAntiRegressionReport["productionRawLoops"];
} {
  const allowlist = params.allowlist ?? PRODUCTION_RAW_LOOP_ALLOWLIST;
  const unapprovedFindings = params.findings.filter((finding) => !finding.allowlisted);
  const invalidAllowlistEntries = allowlist.filter(
    (entry) =>
      !entry.reason.trim() ||
      !entry.owner.trim() ||
      !entry.testCoverage.trim(),
  );
  const unusedAllowlistEntries = allowlist.filter(
    (entry) =>
      !params.findings.some(
        (finding) =>
          finding.allowlisted &&
          finding.file === normalizePath(entry.file) &&
          finding.line === entry.line &&
          finding.pattern === entry.pattern,
      ),
  );
  const countsByFile = new Map<string, number>();
  for (const finding of params.findings) {
    countsByFile.set(finding.file, (countsByFile.get(finding.file) ?? 0) + 1);
  }
  const topFiles = Array.from(countsByFile.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));
  const errors = [
    ...unapprovedFindings.map(
      (finding) =>
        `production_raw_loop:file=${finding.file}:line=${finding.line}:matched_loop=${finding.matchedLoop}:expected=${PRODUCTION_RAW_LOOP_EXPECTED_OWNER}`,
    ),
    ...invalidAllowlistEntries.map(
      (entry) =>
        `production_raw_loop_allowlist_missing_metadata:file=${normalizePath(entry.file)}:line=${entry.line}:pattern=${entry.pattern}`,
    ),
    ...unusedAllowlistEntries.map(
      (entry) =>
        `production_raw_loop_allowlist_unused:file=${normalizePath(entry.file)}:line=${entry.line}:pattern=${entry.pattern}`,
    ),
    ...(unapprovedFindings.length > PRODUCTION_RAW_LOOP_BUDGET
      ? [`production_raw_loop_budget_exceeded:${unapprovedFindings.length}>${PRODUCTION_RAW_LOOP_BUDGET}`]
      : []),
  ];

  return {
    check: {
      name: "production_raw_loop_boundary",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      rawLoopBudget: PRODUCTION_RAW_LOOP_BUDGET,
      totalFindings: params.findings.length,
      unapprovedFindings: unapprovedFindings.length,
      allowlistedFindings: params.findings.length - unapprovedFindings.length,
      allowlistEntries: allowlist.length,
      topFiles,
    },
  };
}

const unboundedSelectRatchetActions: readonly SelectInventoryAction[] = [
  "fix_now",
  "needs_rpc_change",
];

const unboundedSelectAllowlistKey = (
  value: {
    file: string;
    line: number;
    queryString: string;
    action: SelectInventoryAction;
  },
): string =>
  `${normalizePath(value.file)}:${value.line}:${value.action}:${value.queryString}`;

const findUnboundedSelectAllowlistEntry = (
  allowlist: readonly UnboundedSelectAllowlistEntry[],
  entry: SelectInventoryEntry,
): UnboundedSelectAllowlistEntry | undefined =>
  allowlist.find(
    (candidate) =>
      unboundedSelectAllowlistKey(candidate) ===
      unboundedSelectAllowlistKey({
        file: entry.file,
        line: entry.line,
        queryString: entry.queryString,
        action: entry.action,
      }),
  );

const enrichUnboundedSelectFinding = (
  entry: SelectInventoryEntry,
  allowlist: readonly UnboundedSelectAllowlistEntry[],
): UnboundedSelectRatchetFinding => {
  const allowlistEntry = findUnboundedSelectAllowlistEntry(allowlist, entry);
  return {
    ...entry,
    allowlisted: Boolean(allowlistEntry),
    owner: allowlistEntry?.owner ?? null,
    allowlistReason: allowlistEntry?.reason ?? null,
    migrationPath: allowlistEntry?.migrationPath ?? null,
    expected: UNBOUNDED_SELECT_EXPECTED,
  };
};

export function scanUnboundedSelectRatchetSource(params: {
  file: string;
  source: string;
  allowlist?: readonly UnboundedSelectAllowlistEntry[];
}): UnboundedSelectRatchetFinding[] {
  const allowlist = params.allowlist ?? UNBOUNDED_SELECT_EXPORT_ALLOWLIST;
  return collectSelectInventoryFromSource({
    file: normalizePath(params.file),
    text: params.source,
  }).entries.map((entry) => enrichUnboundedSelectFinding(entry, allowlist));
}

export function scanUnboundedSelectRatchet(
  projectRoot: string,
  allowlist: readonly UnboundedSelectAllowlistEntry[] = UNBOUNDED_SELECT_EXPORT_ALLOWLIST,
): UnboundedSelectRatchetFinding[] {
  const { inventory } = collectSelectInventory(projectRoot);
  return inventory.map((entry) => enrichUnboundedSelectFinding(entry, allowlist));
}

const formatUnboundedSelectFailure = (
  finding: UnboundedSelectRatchetFinding,
): string =>
  [
    "unbounded_select",
    `file=${finding.file}`,
    `line=${finding.line}`,
    `action=${finding.action}`,
    `query_type=${finding.queryType}`,
    `query=${finding.queryString}`,
    `expected=${finding.expected}`,
  ].join(":");

const formatSelectStarFailure = (
  finding: UnboundedSelectRatchetFinding,
): string =>
  [
    "select_star",
    `file=${finding.file}`,
    `line=${finding.line}`,
    `action=${finding.action}`,
    `query_type=${finding.queryType}`,
    `expected=explicit columns or documented export migration path`,
  ].join(":");

const validateUnboundedSelectAllowlist = (
  allowlist: readonly UnboundedSelectAllowlistEntry[],
  findings: readonly UnboundedSelectRatchetFinding[],
): string[] => {
  const findingKeys = new Set(
    findings
      .filter((finding) => finding.action === "export_allowlist")
      .map((finding) =>
        unboundedSelectAllowlistKey({
          file: finding.file,
          line: finding.line,
          queryString: finding.queryString,
          action: "export_allowlist",
        }),
      ),
  );
  return allowlist.flatMap((entry) => {
    const file = normalizePath(entry.file);
    const key = unboundedSelectAllowlistKey({ ...entry, file });
    const missingMetadata =
      !file.trim() ||
      !Number.isInteger(entry.line) ||
      entry.line <= 0 ||
      !entry.queryString.trim() ||
      entry.action !== "export_allowlist" ||
      !entry.owner.trim() ||
      !entry.reason.trim() ||
      !entry.migrationPath.trim();
    return [
      ...(missingMetadata
        ? [`unbounded_select_allowlist_missing_metadata:file=${file}:line=${entry.line}:action=${entry.action}`]
        : []),
      ...(findingKeys.has(key)
        ? []
        : [`unbounded_select_allowlist_unused:file=${file}:line=${entry.line}:action=${entry.action}:query=${entry.queryString}`]),
    ];
  });
};

export function evaluateUnboundedSelectRatchetGuardrail(params: {
  findings: readonly UnboundedSelectRatchetFinding[];
  allowlist?: readonly UnboundedSelectAllowlistEntry[];
  unboundedSelectBudget?: 0;
  selectStarBudget?: 0;
}): {
  check: ArchitectureGuardrailCheck;
  summary: UnboundedSelectRatchetSummary;
} {
  const allowlist = params.allowlist ?? UNBOUNDED_SELECT_EXPORT_ALLOWLIST;
  const unboundedSelectBudget = params.unboundedSelectBudget ?? UNBOUNDED_SELECT_BUDGET;
  const selectStarBudget = params.selectStarBudget ?? SELECT_STAR_BUDGET;
  const unresolvedUnbounded = params.findings.filter((finding) =>
    unboundedSelectRatchetActions.includes(finding.action),
  );
  const selectStarFindings = params.findings.filter((finding) => finding.selectStar);
  const exportAllowlistFindings = params.findings.filter((finding) => finding.action === "export_allowlist");
  const undocumentedExportAllowlistFindings = exportAllowlistFindings.filter((finding) => !finding.allowlisted);
  const countsByFile = new Map<string, number>();
  for (const finding of [...unresolvedUnbounded, ...selectStarFindings, ...undocumentedExportAllowlistFindings]) {
    countsByFile.set(finding.file, (countsByFile.get(finding.file) ?? 0) + 1);
  }
  const topFiles = Array.from(countsByFile.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));
  const errors = [
    ...unresolvedUnbounded.map(formatUnboundedSelectFailure),
    ...selectStarFindings.map(formatSelectStarFailure),
    ...undocumentedExportAllowlistFindings.map(
      (finding) =>
        `unbounded_select_export_allowlist_undocumented:file=${finding.file}:line=${finding.line}:query=${finding.queryString}`,
    ),
    ...(unresolvedUnbounded.length > unboundedSelectBudget
      ? [`unbounded_select_budget_exceeded:${unresolvedUnbounded.length}>${unboundedSelectBudget}`]
      : []),
    ...(selectStarFindings.length > selectStarBudget
      ? [`select_star_budget_exceeded:${selectStarFindings.length}>${selectStarBudget}`]
      : []),
    ...validateUnboundedSelectAllowlist(allowlist, params.findings),
  ];

  return {
    check: {
      name: "unbounded_select_ratchet",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      unboundedSelectBudget,
      selectStarBudget,
      totalSelectCalls: params.findings.length,
      unresolvedUnboundedSelects: unresolvedUnbounded.length,
      selectStarFindings: selectStarFindings.length,
      exportAllowlistFindings: exportAllowlistFindings.length,
      documentedExportAllowlistFindings: exportAllowlistFindings.length - undocumentedExportAllowlistFindings.length,
      allowlistEntries: allowlist.length,
      topFiles,
    },
  };
}

const unsafeCastPatterns: readonly {
  pattern: UnsafeCastPattern;
  regex: RegExp;
}[] = [
  { pattern: "as_any", regex: /\bas\s+any\b/g },
  { pattern: "ts_ignore", regex: new RegExp(`${"@ts"}-${"ignore"}\\b`, "g") },
  { pattern: "silent_catch", regex: /\bcatch\s*\{\s*\}/g },
];

const unsafeUnknownAsRegex = /\bunknown\s+as\b/g;
const unsafeUnknownAsGuardEvidence =
  /\b(createGuardedPagedQuery|assert[A-Z][A-Za-z0-9_]*|is[A-Z][A-Za-z0-9_]*|has[A-Z][A-Za-z0-9_]*|parse[A-Z][A-Za-z0-9_]*|validate[A-Z][A-Za-z0-9_]*|safeParse|schema|guard|narrow|normalize[A-Z][A-Za-z0-9_]*)\b/;

const unsafeCastScopeForPath = (normalizedPath: string): UnsafeCastScope =>
  normalizedPath.startsWith("tests/") || isTestPath(normalizedPath)
    ? "test_source"
    : "production_source";

const unsafeCastCriticalFolderForPath = (normalizedPath: string): string | null =>
  UNSAFE_CAST_CRITICAL_FOLDERS.find(
    (folder) => normalizedPath === folder || normalizedPath.startsWith(`${folder}/`),
  ) ?? null;

const findUnsafeCastAllowlistEntry = (
  allowlist: readonly UnsafeCastAllowlistEntry[],
  finding: Pick<UnsafeCastFinding, "file" | "line" | "pattern">,
): UnsafeCastAllowlistEntry | undefined =>
  allowlist.find(
    (entry) =>
      normalizePath(entry.file) === finding.file &&
      entry.line === finding.line &&
      entry.pattern === finding.pattern,
  );

const hasRuntimeGuardEvidenceForUnknownAs = (lines: readonly string[], index: number): boolean => {
  const start = Math.max(0, index - 4);
  const nearbySource = lines.slice(start, index + 1).join("\n");
  return unsafeUnknownAsGuardEvidence.test(nearbySource);
};

const buildUnsafeCastFinding = (
  params: {
    file: string;
    line: number;
    pattern: UnsafeCastPattern;
    matchedText: string;
    allowlist: readonly UnsafeCastAllowlistEntry[];
  },
): UnsafeCastFinding => {
  const scope = unsafeCastScopeForPath(params.file);
  const criticalFolder = unsafeCastCriticalFolderForPath(params.file);
  const allowlistEntry = findUnsafeCastAllowlistEntry(params.allowlist, {
    file: params.file,
    line: params.line,
    pattern: params.pattern,
  });

  return {
    file: params.file,
    line: params.line,
    pattern: params.pattern,
    matchedText: params.matchedText,
    scope,
    criticalFolder,
    allowlisted: Boolean(allowlistEntry),
    reason: allowlistEntry?.reason ?? null,
    owner: allowlistEntry?.owner ?? null,
    expiresAtLocalDate: allowlistEntry?.expiresAtLocalDate ?? null,
    migrationWave: allowlistEntry?.migrationWave ?? null,
    expected: UNSAFE_CAST_EXPECTED,
  };
};

export function scanUnsafeCastSource(params: {
  file: string;
  source: string;
  allowlist?: readonly UnsafeCastAllowlistEntry[];
}): UnsafeCastFinding[] {
  const file = normalizePath(params.file);
  const allowlist = params.allowlist ?? UNSAFE_CAST_ALLOWLIST;
  const lines = params.source.split(/\r?\n/);
  const findings: UnsafeCastFinding[] = [];

  lines.forEach((lineText, index) => {
    const line = index + 1;
    for (const candidate of unsafeCastPatterns) {
      candidate.regex.lastIndex = 0;
      const matches = lineText.matchAll(candidate.regex);
      for (const match of matches) {
        findings.push(
          buildUnsafeCastFinding({
            file,
            line,
            pattern: candidate.pattern,
            matchedText: match[0] ?? candidate.pattern,
            allowlist,
          }),
        );
      }
    }

    unsafeUnknownAsRegex.lastIndex = 0;
    if (hasRuntimeGuardEvidenceForUnknownAs(lines, index)) return;
    const unknownMatches = lineText.matchAll(unsafeUnknownAsRegex);
    for (const match of unknownMatches) {
      findings.push(
        buildUnsafeCastFinding({
          file,
          line,
          pattern: "unsafe_unknown_as",
          matchedText: match[0] ?? "unknown_as",
          allowlist,
        }),
      );
    }
  });

  return findings;
}

export function scanUnsafeCastRatchetFindings(
  projectRoot: string,
  allowlist: readonly UnsafeCastAllowlistEntry[] = UNSAFE_CAST_ALLOWLIST,
): UnsafeCastFinding[] {
  const roots = UNSAFE_CAST_SCAN_ROOTS.map((rootName) => path.join(projectRoot, rootName));
  return roots.flatMap((root) =>
    listSourceFiles(root).flatMap((filePath) => {
      const relativePath = relativeProjectPath(projectRoot, filePath);
      return scanUnsafeCastSource({
        file: relativePath,
        source: readProjectFile(projectRoot, relativePath),
        allowlist,
      });
    }),
  );
}

const incrementUnsafeCastCount = (
  counts: UnsafeCastPatternCounts,
  pattern: UnsafeCastPattern,
): void => {
  counts[pattern] += 1;
};

const unsafeCastPatternKeys: readonly UnsafeCastPattern[] = [
  "as_any",
  "ts_ignore",
  "silent_catch",
  "unsafe_unknown_as",
];

const unsafeCastCountForFolder = (
  findings: readonly UnsafeCastFinding[],
  folder: string,
): UnsafeCastPatternCounts => {
  const counts = emptyUnsafeCastPatternCounts();
  for (const finding of findings) {
    if (finding.file === folder || finding.file.startsWith(`${folder}/`)) {
      incrementUnsafeCastCount(counts, finding.pattern);
    }
  }
  return counts;
};

const summarizeUnsafeCastFindings = (
  findings: readonly UnsafeCastFinding[],
  baseline: UnsafeCastRatchetBaseline,
): UnsafeCastRatchetSummary["current"] => {
  const byPattern = emptyUnsafeCastPatternCounts();
  const productionByPattern = emptyUnsafeCastPatternCounts();
  const testByPattern = emptyUnsafeCastPatternCounts();
  let productionSource = 0;
  let testSource = 0;

  for (const finding of findings) {
    incrementUnsafeCastCount(byPattern, finding.pattern);
    if (finding.scope === "production_source") {
      productionSource += 1;
      incrementUnsafeCastCount(productionByPattern, finding.pattern);
    } else {
      testSource += 1;
      incrementUnsafeCastCount(testByPattern, finding.pattern);
    }
  }

  return {
    total: findings.length,
    productionSource,
    testSource,
    byPattern,
    productionByPattern,
    testByPattern,
    criticalFolderByPattern: baseline.criticalFolderByPattern.map((entry) => ({
      folder: entry.folder,
      byPattern: unsafeCastCountForFolder(findings, entry.folder),
    })),
  };
};

const validateUnsafeCastAllowlist = (
  allowlist: readonly UnsafeCastAllowlistEntry[],
  findings: readonly UnsafeCastFinding[],
): string[] => {
  const findingKeys = new Set(
    findings.map((finding) => `${finding.file}:${finding.line}:${finding.pattern}`),
  );
  return allowlist.flatMap((entry) => {
    const file = normalizePath(entry.file);
    const missingMetadata =
      !file.trim() ||
      !Number.isInteger(entry.line) ||
      entry.line <= 0 ||
      !entry.reason.trim() ||
      !entry.owner.trim() ||
      (!entry.expiresAtLocalDate?.trim() && !entry.migrationWave?.trim());
    const key = `${file}:${entry.line}:${entry.pattern}`;
    return [
      ...(missingMetadata
        ? [`unsafe_cast_allowlist_missing_metadata:file=${file}:line=${entry.line}:pattern=${entry.pattern}`]
        : []),
      ...(findingKeys.has(key)
        ? []
        : [`unsafe_cast_allowlist_unused:file=${file}:line=${entry.line}:pattern=${entry.pattern}`]),
    ];
  });
};

const findCriticalFolderBaseline = (
  baseline: UnsafeCastRatchetBaseline,
  folder: string,
): UnsafeCastPatternCounts =>
  baseline.criticalFolderByPattern.find((entry) => entry.folder === folder)?.byPattern ??
  emptyUnsafeCastPatternCounts();

const formatUnsafeCastCriticalFailure = (
  finding: UnsafeCastFinding,
): string =>
  [
    "unsafe_cast_critical_folder_violation",
    `file=${finding.file}`,
    `line=${finding.line}`,
    `pattern=${finding.pattern}`,
    `matched=${finding.matchedText}`,
    `expected=${finding.expected}`,
  ].join(":");

export function evaluateUnsafeCastRatchetGuardrail(params: {
  findings: readonly UnsafeCastFinding[];
  allowlist?: readonly UnsafeCastAllowlistEntry[];
  baseline?: UnsafeCastRatchetBaseline;
}): {
  check: ArchitectureGuardrailCheck;
  summary: UnsafeCastRatchetSummary;
} {
  const allowlist = params.allowlist ?? UNSAFE_CAST_ALLOWLIST;
  const baseline = params.baseline ?? UNSAFE_CAST_RATCHET_BASELINE;
  const current = summarizeUnsafeCastFindings(params.findings, baseline);
  const criticalViolations = params.findings.filter((finding) => {
    if (!finding.criticalFolder || finding.scope !== "production_source" || finding.allowlisted) {
      return false;
    }
    const folderBaseline = findCriticalFolderBaseline(baseline, finding.criticalFolder);
    return folderBaseline[finding.pattern] === 0;
  });
  const countsByFile = new Map<string, number>();
  for (const finding of params.findings) {
    countsByFile.set(finding.file, (countsByFile.get(finding.file) ?? 0) + 1);
  }
  const topFiles = Array.from(countsByFile.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));
  const errors = [
    ...(current.total > baseline.total
      ? [`unsafe_cast_total_ratchet_exceeded:${current.total}>${baseline.total}`]
      : []),
    ...(current.productionSource > baseline.productionSource
      ? [`unsafe_cast_production_ratchet_exceeded:${current.productionSource}>${baseline.productionSource}`]
      : []),
    ...(current.testSource > baseline.testSource
      ? [`unsafe_cast_test_ratchet_exceeded:${current.testSource}>${baseline.testSource}`]
      : []),
    ...unsafeCastPatternKeys.flatMap((pattern) => [
      ...(current.byPattern[pattern] > baseline.byPattern[pattern]
        ? [`unsafe_cast_pattern_ratchet_exceeded:pattern=${pattern}:current=${current.byPattern[pattern]}:baseline=${baseline.byPattern[pattern]}`]
        : []),
      ...(current.productionByPattern[pattern] > baseline.productionByPattern[pattern]
        ? [`unsafe_cast_production_pattern_ratchet_exceeded:pattern=${pattern}:current=${current.productionByPattern[pattern]}:baseline=${baseline.productionByPattern[pattern]}`]
        : []),
      ...(current.testByPattern[pattern] > baseline.testByPattern[pattern]
        ? [`unsafe_cast_test_pattern_ratchet_exceeded:pattern=${pattern}:current=${current.testByPattern[pattern]}:baseline=${baseline.testByPattern[pattern]}`]
        : []),
    ]),
    ...current.criticalFolderByPattern.flatMap((entry) => {
      const folderBaseline = findCriticalFolderBaseline(baseline, entry.folder);
      return unsafeCastPatternKeys.flatMap((pattern) =>
        entry.byPattern[pattern] > folderBaseline[pattern]
          ? [
              `unsafe_cast_critical_folder_ratchet_exceeded:folder=${entry.folder}:pattern=${pattern}:current=${entry.byPattern[pattern]}:baseline=${folderBaseline[pattern]}`,
            ]
          : [],
      );
    }),
    ...criticalViolations.map(formatUnsafeCastCriticalFailure),
    ...validateUnsafeCastAllowlist(allowlist, params.findings),
  ];

  return {
    check: {
      name: "unsafe_cast_ratchet_contract",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      baseline,
      current,
      allowlistedFindings: params.findings.filter((finding) => finding.allowlisted).length,
      allowlistEntries: allowlist.length,
      criticalFolderViolations: criticalViolations.length,
      topFiles,
    },
  };
}

export function scanComponentDebtSource(params: {
  file: string;
  source: string;
}): ComponentDebtEntry {
  return {
    file: normalizePath(params.file),
    lineCount: params.source.split(/\r?\n/).length,
    hookCount: Array.from(params.source.matchAll(/\buse[A-Z][A-Za-z0-9_]*\s*\(/g)).length,
  };
}

export function scanComponentDebt(projectRoot: string): ArchitectureAntiRegressionReport["componentDebt"] {
  const sourceRoot = path.join(projectRoot, "src");
  const entries = listSourceFiles(sourceRoot)
    .filter((filePath) => path.extname(filePath) === ".tsx")
    .filter((filePath) => !isTestPath(normalizePath(filePath)))
    .map((filePath) =>
      scanComponentDebtSource({
        file: relativeProjectPath(projectRoot, filePath),
        source: fs.readFileSync(filePath, "utf8"),
      }),
    );
  const topByLines = [...entries].sort((left, right) => right.lineCount - left.lineCount).slice(0, 12);
  const topByHooks = [...entries].sort((left, right) => right.hookCount - left.hookCount).slice(0, 12);

  return {
    reportOnly: true,
    godComponentLineThreshold: GOD_COMPONENT_LINE_THRESHOLD,
    hookPressureThreshold: HOOK_PRESSURE_THRESHOLD,
    godComponentCount: entries.filter((entry) => entry.lineCount >= GOD_COMPONENT_LINE_THRESHOLD).length,
    hookPressureComponentCount: entries.filter((entry) => entry.hookCount >= HOOK_PRESSURE_THRESHOLD).length,
    topByLines,
    topByHooks,
  };
}

export function runArchitectureAntiRegressionSuite(
  projectRoot = process.cwd(),
): ArchitectureAntiRegressionReport {
  const findings = scanDirectSupabaseBypasses(projectRoot);
  const directSupabase = evaluateDirectSupabaseGuardrail(findings);
  const directSupabaseExceptionContainment = evaluateDirectSupabaseExceptionGuardrail({
    findings,
    registry: loadDirectSupabaseExceptionRegistry({ projectRoot }),
  });
  const productionReadonlyCanary = evaluateProductionReadonlyCanaryGuardrail();
  const cacheRateScope = evaluateCacheRateScopeGuardrail({ projectRoot });
  const cacheColdMissProof = evaluateCacheColdMissProofGuardrail({ projectRoot });
  const rateLimitMarketplaceCanaryProof = evaluateRateLimitMarketplaceCanaryProofGuardrail({ projectRoot });
  const rateLimitMarketplace5PctCanaryProof = evaluateRateLimitMarketplace5PctCanaryProofGuardrail({ projectRoot });
  const unboundedSelectRatchet = evaluateUnboundedSelectRatchetGuardrail({
    findings: scanUnboundedSelectRatchet(projectRoot),
  });
  const productionRawLoops = evaluateProductionRawLoopGuardrail({
    findings: scanProductionRawLoops(projectRoot),
  });
  const unsafeCastRatchet = evaluateUnsafeCastRatchetGuardrail({
    findings: scanUnsafeCastRatchetFindings(projectRoot),
  });
  const flatListTuningRegression = evaluateFlatListTuningRegressionGuardrail(
    scanFlatListTuningRegression(projectRoot),
  );
  const errorHandlingGapRatchet = evaluateErrorHandlingGapRatchet(
    scanErrorHandlingGapRatchet(projectRoot),
  );
  const aiModelBoundary = evaluateAiModelBoundaryGuardrail({ projectRoot });
  const aiRoleRiskApprovalControlPlane = evaluateAiRoleRiskApprovalControlPlaneGuardrail({ projectRoot });
  const componentDebt = scanComponentDebt(projectRoot);
  const componentDebtCheck: ArchitectureGuardrailCheck = {
    name: "component_debt_report",
    status: "report_only",
    errors: [],
  };
  const checks = [
    directSupabase.check,
    directSupabaseExceptionContainment.check,
    productionReadonlyCanary.check,
    cacheRateScope.check,
    cacheColdMissProof.check,
    rateLimitMarketplaceCanaryProof.check,
    rateLimitMarketplace5PctCanaryProof.check,
    unboundedSelectRatchet.check,
    productionRawLoops.check,
    unsafeCastRatchet.check,
    flatListTuningRegression.check,
    errorHandlingGapRatchet.check,
    aiModelBoundary.check,
    aiRoleRiskApprovalControlPlane.check,
    componentDebtCheck,
  ] as const;
  const failed = checks.some((check) => check.status === "fail");

  return {
    final_status: failed
      ? "BLOCKED_ARCHITECTURE_ANTI_REGRESSION_FAILED"
      : "GREEN_ARCHITECTURE_ANTI_REGRESSION_SUITE_ADDED",
    directSupabase: directSupabase.summary,
    directSupabaseExceptionContainment: directSupabaseExceptionContainment.summary,
    productionReadonlyCanary: productionReadonlyCanary.summary,
    cacheRateScope: cacheRateScope.summary,
    cacheColdMissProof: cacheColdMissProof.summary,
    rateLimitMarketplaceCanaryProof: rateLimitMarketplaceCanaryProof.summary,
    rateLimitMarketplace5PctCanaryProof: rateLimitMarketplace5PctCanaryProof.summary,
    unboundedSelectRatchet: unboundedSelectRatchet.summary,
    productionRawLoops: productionRawLoops.summary,
    unsafeCastRatchet: unsafeCastRatchet.summary,
    flatListTuningRegression: flatListTuningRegression.summary,
    errorHandlingGapRatchet: errorHandlingGapRatchet.summary,
    aiModelBoundary: aiModelBoundary.summary,
    aiRoleRiskApprovalControlPlane: aiRoleRiskApprovalControlPlane.summary,
    componentDebt,
    checks,
    safety: {
      productionCalls: false,
      dbWrites: false,
      migrations: false,
      supabaseProjectChanges: false,
      envChanges: false,
      secretsPrinted: false,
    },
  };
}

function printHumanReport(report: ArchitectureAntiRegressionReport): void {
  console.info(`final_status: ${report.final_status}`);
  for (const check of report.checks) {
    console.info(`${check.name}: ${check.status}`);
    for (const error of check.errors) {
      console.info(`- ${error}`);
    }
  }
  console.info(`direct_supabase_service_bypasses: ${report.directSupabase.serviceBypassFindings}`);
  console.info(
    `direct_supabase_exception_unclassified: ${report.directSupabaseExceptionContainment.unclassifiedCurrentFindings}`,
  );
  console.info(`cache_cold_miss_deterministic_proof: ${report.cacheColdMissProof.deterministicProofReady}`);
  console.info(`rate_limit_marketplace_canary_proof: ${report.rateLimitMarketplaceCanaryProof.routeScoped}`);
  console.info(`rate_limit_marketplace_5pct_canary_proof: ${report.rateLimitMarketplace5PctCanaryProof.routeScoped}`);
  console.info(`unbounded_select_ratchet_unresolved: ${report.unboundedSelectRatchet.unresolvedUnboundedSelects}`);
  console.info(`unbounded_select_ratchet_select_star: ${report.unboundedSelectRatchet.selectStarFindings}`);
  console.info(`production_raw_loop_unapproved: ${report.productionRawLoops.unapprovedFindings}`);
  console.info(`unsafe_cast_ratchet_total: ${report.unsafeCastRatchet.current.total}`);
  console.info(`flatlist_tuning_regression_violations: ${report.flatListTuningRegression.violations}`);
  console.info(`error_handling_gap_ratchet_silent_swallow: ${report.errorHandlingGapRatchet.silentSwallow}`);
  console.info(`ai_model_direct_gemini_imports: ${report.aiModelBoundary.directGeminiImportsOutsideLegacyProvider}`);
  console.info(`ai_control_plane_direct_submit_blocked: ${report.aiRoleRiskApprovalControlPlane.assistantActionsDirectSubmitBlocked}`);
  console.info(`ai_control_plane_screen_gateway_imports: ${report.aiRoleRiskApprovalControlPlane.screenGatewayImports}`);
  console.info(`component_god_count_report_only: ${report.componentDebt.godComponentCount}`);
}

function main(): void {
  const args = new Set(process.argv.slice(2));
  if (args.has("--write-direct-supabase-exception-registry")) {
    const findings = scanDirectSupabaseBypasses(process.cwd());
    const registry = buildDirectSupabaseExceptionRegistry({
      findings,
      generatedAtLocal: new Date().toISOString(),
    });
    const registryPath = path.join(process.cwd(), DIRECT_SUPABASE_EXCEPTION_REGISTRY_RELATIVE_PATH);
    fs.mkdirSync(path.dirname(registryPath), { recursive: true });
    fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
  }
  const report = runArchitectureAntiRegressionSuite(process.cwd());
  if (args.has("--json")) {
    console.info(JSON.stringify(report, null, 2));
  } else {
    printHumanReport(report);
  }
  if (report.final_status === "BLOCKED_ARCHITECTURE_ANTI_REGRESSION_FAILED") {
    process.exit(1);
  }
}

const invokedAsCli = /(?:^|\/)architecture_anti_regression_suite\.[tj]s$/.test(
  normalizePath(process.argv[1] ?? ""),
);

if (invokedAsCli) {
  main();
}
