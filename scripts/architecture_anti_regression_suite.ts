import fs from "node:fs";
import path from "node:path";

import {
  PRODUCTION_BUSINESS_READONLY_FORBIDDEN_MUTATION_OPERATIONS,
  buildProductionBusinessReadonlyCanaryWhitelist,
  validateProductionBusinessReadonlyCanaryMetricLog,
  validateProductionBusinessReadonlyCanaryRegistry,
} from "./load/productionBusinessReadonlyCanary";
import { resolveCacheShadowRuntimeConfig } from "../src/shared/scale/cacheShadowRuntime";

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
  };
  productionRawLoops: {
    rawLoopBudget: 0;
    totalFindings: number;
    unapprovedFindings: number;
    allowlistedFindings: number;
    allowlistEntries: number;
    topFiles: readonly { file: string; count: number }[];
  };
  unsafeCastRatchet: UnsafeCastRatchetSummary;
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
const ROOT_SUPABASE_CLIENT_PATH = "src/lib/supabaseClient.ts";
const DIRECT_SUPABASE_EXPECTED_TRANSPORT_OWNER =
  "src/lib/supabaseClient.ts root client or transport-owned file (*.transport.*, *.bff.*, /server/)";
const DIRECT_SUPABASE_CALL_REGEX =
  /\b(?:supabase(?:Client|Admin)?|params\.supabase|deps\.supabase|args\.supabase)\s*\.\s*(auth|storage|from|rpc|channel|removeChannel|getChannels|realtime)\b/g;
const PRODUCTION_RAW_LOOP_BUDGET = 0;
const PRODUCTION_RAW_LOOP_EXPECTED_OWNER =
  "cancellable worker loop primitive or explicit allowlist with reason, owner, and test coverage";
const PRODUCTION_RAW_LOOP_ALLOWLIST: readonly ProductionRawLoopAllowlistEntry[] = [];
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

const extractConstString = (source: string, constName: string): string | null => {
  const escapedName = constName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`const\\s+${escapedName}\\s*=\\s*\"([^\"]+)\"`).exec(source);
  return match?.[1] ?? null;
};

export function evaluateCacheRateScopeGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: ArchitectureAntiRegressionReport["cacheRateScope"];
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const cacheSource = readFile("src/shared/scale/cacheShadowRuntime.ts");
  const rateCanarySource = readFile("scripts/rate_limit_real_user_canary.ts");
  const cacheConfig = resolveCacheShadowRuntimeConfig({
    SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED: "true",
    SCALE_REDIS_CACHE_SHADOW_MODE: "read_through",
    SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED: "true",
    SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST: CACHE_RATE_ALLOWED_ROUTE,
    SCALE_REDIS_CACHE_SHADOW_PERCENT: "1",
  });
  const rateLimitRoute = extractConstString(rateCanarySource, "CANARY_ROUTE") ?? "";
  const rateLimitPercentText = extractConstString(rateCanarySource, "CANARY_PERCENT") ?? "";
  const rateLimitPercent = Number(rateLimitPercentText);
  const cacheCanaryRouteScoped =
    cacheSource.includes("SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST") &&
    cacheSource.includes("SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED") &&
    cacheSource.includes("parseRouteAllowlist") &&
    cacheSource.includes("routeAllowed") &&
    cacheConfig.readThroughV1Enabled === true &&
    cacheConfig.routeAllowlist.length === 1 &&
    cacheConfig.routeAllowlist[0] === CACHE_RATE_ALLOWED_ROUTE;
  const errors = [
    ...(cacheCanaryRouteScoped ? [] : ["cache_canary_not_route_scoped"]),
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
  const productionRawLoops = evaluateProductionRawLoopGuardrail({
    findings: scanProductionRawLoops(projectRoot),
  });
  const unsafeCastRatchet = evaluateUnsafeCastRatchetGuardrail({
    findings: scanUnsafeCastRatchetFindings(projectRoot),
  });
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
    productionRawLoops.check,
    unsafeCastRatchet.check,
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
    productionRawLoops: productionRawLoops.summary,
    unsafeCastRatchet: unsafeCastRatchet.summary,
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
  console.info(`production_raw_loop_unapproved: ${report.productionRawLoops.unapprovedFindings}`);
  console.info(`unsafe_cast_ratchet_total: ${report.unsafeCastRatchet.current.total}`);
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
