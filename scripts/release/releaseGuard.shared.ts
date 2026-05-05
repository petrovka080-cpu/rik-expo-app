import path from "node:path";

import type {
  ReleaseChangeClass,
  ReleaseCheckAutomatically,
  ReleaseRuntimeVersionStrategy,
} from "../../src/shared/release/releaseInfo.types";

export type ReleaseGuardMode = "preflight" | "verify" | "ota";

export type ReleaseGateName =
  | "tsc"
  | "expo-lint"
  | "jest-run-in-band"
  | "jest"
  | "git-diff-check";

export type ReleaseGateDefinition = {
  name: ReleaseGateName;
  command: string;
};

export type ReleaseGateResult = ReleaseGateDefinition & {
  status: "passed" | "failed";
  exitCode: number;
};

export type ReleaseRepoSyncStatus = "synced" | "local_ahead" | "origin_ahead" | "diverged" | "unknown_mismatch";

export type ReleaseRepoSyncAction =
  | "none"
  | "push_with_explicit_approval"
  | "pull_or_rebase_before_release"
  | "reconcile_diverged_branch"
  | "inspect_refs_before_release";

export type ReleaseRepoState = {
  gitBranch: string;
  headCommit: string;
  originMainCommit: string;
  worktreeClean: boolean;
  headMatchesOriginMain: boolean;
  localCommitsAheadOriginMain: number;
  originMainCommitsAheadHead: number;
  syncStatus: ReleaseRepoSyncStatus;
  syncAction: ReleaseRepoSyncAction;
};

export type PackageJsonMutationKind = "none" | "scripts-only" | "non-runtime" | "build-required";

export type ReleaseAutomationClassificationKind = "non-runtime" | "runtime-ota" | "build-required";

export type ReleaseAutomationClassification = {
  kind: ReleaseAutomationClassificationKind;
  changeClass: ReleaseChangeClass | null;
  files: string[];
  nonRuntimeFiles: string[];
  runtimeFiles: string[];
  buildRequiredFiles: string[];
  reasons: string[];
  packageJsonMutationKind: PackageJsonMutationKind;
};

export type ReleaseGuardReadiness = {
  status: "pass" | "fail";
  otaDisposition: "skip" | "allow" | "block";
  blockers: string[];
};

export type SupabaseMigrationRiskLevel = "none" | "schema" | "dml_or_rebuild";

export type SupabaseMigrationRisk = {
  filePath: string;
  riskLevel: SupabaseMigrationRiskLevel;
  schemaChangesDetected: boolean;
  securityDefinerDetected: boolean;
  pgrstNotifyDetected: boolean;
  dmlStatementsDetected: string[];
  readModelRebuildDetected: boolean;
  productionDbApprovalRequired: boolean;
  reasons: string[];
};

export type ReleaseGuardMigrationPolicy = {
  migrationFiles: string[];
  highRiskFiles: string[];
  productionDbApprovalRequired: boolean;
  requiredApprovalKeys: string[];
  nextSafeWave: string | null;
  risks: SupabaseMigrationRisk[];
  blockers: string[];
};

export type ReleaseMetadataFieldStatus =
  | "present"
  | "missing"
  | "verified"
  | "blocked"
  | "not_applicable"
  | "owner_action_required";

export type ReleaseMetadataOtaDisposition =
  | "skip"
  | "candidate"
  | "published"
  | "blocked";

export type ReleaseGuardRuntimePolicyTruth = {
  resolvedRuntimeVersion: string;
  runtimePolicy: string;
  runtimeVersionStrategy: ReleaseRuntimeVersionStrategy;
  runtimePolicyValid: boolean;
  runtimePolicyReason: string;
  runtimeProofConsistent: boolean;
  runtimeProofReason: string;
  buildRequired: boolean;
};

export type ReleaseGuardStartupPolicyTruth = {
  updatesEnabled: boolean;
  checkAutomatically: ReleaseCheckAutomatically;
  fallbackToCacheTimeout: number | null;
  startupPolicyValid: boolean;
  startupPolicyReason: string;
};

export type ReleaseOtaPublishMetadata = {
  branch: string;
  runtimeVersion: string;
  platform: string;
  updateGroupId: string;
  androidUpdateId: string;
  iosUpdateId: string;
  message: string;
  commit: string;
  dashboardUrl: string;
};

export type ReleaseMetadataEnforcement = {
  gitSha: ReleaseMetadataFieldStatus;
  appVersion: ReleaseMetadataFieldStatus;
  buildLineage: ReleaseMetadataFieldStatus;
  runtimeVersion: ReleaseMetadataFieldStatus;
  channel: ReleaseMetadataFieldStatus;
  branch: ReleaseMetadataFieldStatus;
  platform: ReleaseMetadataFieldStatus;
  otaDisposition: ReleaseMetadataOtaDisposition;
  rollbackReady: boolean;
  sentrySourceMaps: ReleaseMetadataFieldStatus;
  binarySourceMapsProven: ReleaseMetadataFieldStatus;
  easBuildTriggered: false;
  easSubmitTriggered: false;
  otaPublished: boolean;
  easUpdateTriggered: boolean;
  missing: string[];
  warnings: string[];
};

export type ReleaseGuardReport = {
  mode: ReleaseGuardMode;
  timestamp: string;
  repo: ReleaseRepoState;
  gates: ReleaseGateResult[];
  classification: ReleaseAutomationClassification;
  migrationPolicy: ReleaseGuardMigrationPolicy;
  runtimePolicy: ReleaseGuardRuntimePolicyTruth;
  startupPolicy: ReleaseGuardStartupPolicyTruth;
  readiness: ReleaseGuardReadiness;
  requiredArtifacts: string[];
  missingArtifacts: string[];
  targetChannel: string | null;
  expectedBranch: string | null;
  releaseMessage: string | null;
  rolloutPercentage: number | null;
  commitRange: string;
  otaPublish: ReleaseOtaPublishMetadata | null;
  releaseMetadata: ReleaseMetadataEnforcement;
};

type PackageJsonShape = {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
};

export const REQUIRED_RELEASE_GATES: ReleaseGateDefinition[] = [
  { name: "tsc", command: "npx tsc --noEmit --pretty false" },
  { name: "expo-lint", command: "npx expo lint" },
  { name: "jest-run-in-band", command: "npm test -- --runInBand" },
  { name: "jest", command: "npm test" },
  { name: "git-diff-check", command: "git diff --check" },
];

export function resolveReleaseRepoSync(params: {
  headMatchesOriginMain: boolean;
  localCommitsAheadOriginMain: number;
  originMainCommitsAheadHead: number;
}): { syncStatus: ReleaseRepoSyncStatus; syncAction: ReleaseRepoSyncAction } {
  if (params.headMatchesOriginMain) {
    return { syncStatus: "synced", syncAction: "none" };
  }

  if (params.localCommitsAheadOriginMain > 0 && params.originMainCommitsAheadHead > 0) {
    return { syncStatus: "diverged", syncAction: "reconcile_diverged_branch" };
  }

  if (params.localCommitsAheadOriginMain > 0) {
    return { syncStatus: "local_ahead", syncAction: "push_with_explicit_approval" };
  }

  if (params.originMainCommitsAheadHead > 0) {
    return { syncStatus: "origin_ahead", syncAction: "pull_or_rebase_before_release" };
  }

  return { syncStatus: "unknown_mismatch", syncAction: "inspect_refs_before_release" };
}

export const RELEASE_GUARD_OTA_PUBLISH_MAX_BUFFER_BYTES = 64 * 1024 * 1024;
export const RELEASE_GUARD_MIGRATION_DB_APPROVAL_KEYS = [
  "S_PRODUCTION_MIGRATION_GAP_APPLY_OR_REPAIR_APPROVED",
  "S_PROVIDERS_PRODUCTION_DB_WRITE_APPROVED",
] as const;
export const RELEASE_GUARD_MIGRATION_NEXT_SAFE_WAVE =
  "S-PRODUCTION-MIGRATION-GAP-APPLY-OR-REPAIR-1-WITH-EXPLICIT-DB-WRITE-APPROVAL";

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

export function resolveReleaseGuardPath(projectRoot: string, filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);
}

export function buildReleaseGuardOtaPublishEnv(
  baseEnv: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  return {
    ...baseEnv,
    CI: baseEnv.CI ?? "1",
  };
}

function quoteReleaseGuardShellArg(value: string, platform: NodeJS.Platform): string {
  if (platform === "win32") {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function buildReleaseGuardOtaPublishCommand(params: {
  platform: NodeJS.Platform;
  channel: string;
  message: string;
  rolloutPercentage?: number | null;
}): string {
  const parts = [
    "npx",
    "eas",
    "update",
    "--branch",
    params.channel,
    "--message",
    params.message,
  ];

  if (params.rolloutPercentage != null) {
    parts.push("--rollout-percentage", String(params.rolloutPercentage));
  }

  return parts
    .map((part, index) =>
      index === 0
        ? part
        : quoteReleaseGuardShellArg(part, params.platform),
    )
    .join(" ");
}

export function buildReleaseChangedFilesGitArgs(range: string): string[] {
  if (range === "HEAD") {
    return ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"];
  }

  return ["diff", "--name-only", "--diff-filter=ACMR", range];
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toSortedRecord(value: unknown): Record<string, string> {
  if (!isPlainObject(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function safeParsePackageJson(source: string | null): PackageJsonShape | null {
  if (!source) return null;

  try {
    return JSON.parse(source) as PackageJsonShape;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse package.json: ${message}`);
  }
}

function hasKeyChanged(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) !== JSON.stringify(right);
}

export function classifyPackageJsonMutation(params: {
  previousSource: string | null;
  currentSource: string | null;
}): PackageJsonMutationKind {
  const previous = safeParsePackageJson(params.previousSource);
  const current = safeParsePackageJson(params.currentSource);

  if (!previous || !current) {
    return "build-required";
  }

  const allowedNonRuntimeKeys = new Set(["scripts", "devDependencies"]);
  const changedKeys = dedupe(
    [...Object.keys(previous), ...Object.keys(current)].filter((key) =>
      hasKeyChanged(previous[key], current[key]),
    ),
  );

  if (changedKeys.length === 0) {
    return "none";
  }

  const dependenciesChanged = hasKeyChanged(
    toSortedRecord(previous.dependencies),
    toSortedRecord(current.dependencies),
  );

  if (dependenciesChanged) {
    return "build-required";
  }

  const onlyAllowedKeysChanged = changedKeys.every((key) => allowedNonRuntimeKeys.has(key));
  if (onlyAllowedKeysChanged) {
    return changedKeys.includes("scripts") ? "scripts-only" : "non-runtime";
  }

  return "build-required";
}

function isNonRuntimePath(filePath: string): boolean {
  return (
    /^([^/]+\/)?tsconfig(\.[^/]+)?\.json$/.test(filePath) ||
    filePath.startsWith("docs/") ||
    filePath.startsWith("artifacts/") ||
    filePath.startsWith("maestro/") ||
    filePath.startsWith("tests/") ||
    filePath.startsWith("scripts/") ||
    filePath.startsWith(".husky/") ||
    filePath.startsWith("db/") ||
    filePath.startsWith("supabase/") ||
    filePath.endsWith(".md") ||
    filePath.endsWith(".sql") ||
    filePath.endsWith(".test.ts") ||
    filePath.endsWith(".test.tsx") ||
    filePath.endsWith(".spec.ts") ||
    filePath.endsWith(".spec.tsx")
  );
}

function isSupabaseMigrationPath(filePath: string): boolean {
  return /^supabase\/migrations\/\d{14}_[^/]+\.sql$/.test(normalizePath(filePath));
}

function stripSqlComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--.*$/gm, " ");
}

function collectDmlStatements(sqlSource: string): string[] {
  const checks: Array<[string, RegExp]> = [
    ["insert", /\binsert\s+into\b/i],
    ["update", /\bupdate\s+(?:only\s+)?[a-z0-9_."[\]]+/i],
    ["delete", /\bdelete\s+from\b/i],
    ["truncate", /\btruncate(?:\s+table)?\b/i],
    ["merge", /\bmerge\s+into\b/i],
  ];

  return checks
    .filter(([, pattern]) => pattern.test(sqlSource))
    .map(([statement]) => statement);
}

export function analyzeSupabaseMigrationRisk(params: {
  filePath: string;
  source: string;
}): SupabaseMigrationRisk {
  const filePath = normalizePath(params.filePath);
  const sqlSource = stripSqlComments(params.source).toLowerCase();
  const schemaChangesDetected = /\b(create|alter|drop)\s+(table|index|function|policy|trigger|view|materialized\s+view|type)\b/i.test(sqlSource);
  const securityDefinerDetected = /\bsecurity\s+definer\b/i.test(sqlSource);
  const pgrstNotifyDetected = /\bnotify\s+pgrst\b/i.test(sqlSource);
  const dmlStatementsDetected = collectDmlStatements(sqlSource);
  const readModelRebuildDetected =
    /\b(select|perform)\s+public\.[a-z0-9_]*rebuild[a-z0-9_]*\s*\(/i.test(sqlSource) ||
    /\bcreate\s+or\s+replace\s+function\s+public\.[a-z0-9_]*rebuild[a-z0-9_]*\s*\(/i.test(sqlSource);
  const productionDbApprovalRequired = dmlStatementsDetected.length > 0 || readModelRebuildDetected;
  const riskLevel: SupabaseMigrationRiskLevel = productionDbApprovalRequired
    ? "dml_or_rebuild"
    : schemaChangesDetected || securityDefinerDetected || pgrstNotifyDetected
      ? "schema"
      : "none";
  const reasons: string[] = [];

  if (dmlStatementsDetected.length > 0) {
    reasons.push(`DML statements detected: ${dmlStatementsDetected.join(", ")}.`);
  }

  if (readModelRebuildDetected) {
    reasons.push("Read-model rebuild function or invocation detected.");
  }

  if (securityDefinerDetected) {
    reasons.push("SECURITY DEFINER function detected.");
  }

  if (pgrstNotifyDetected) {
    reasons.push("PostgREST schema reload notification detected.");
  }

  if (schemaChangesDetected) {
    reasons.push("Schema change detected.");
  }

  if (reasons.length === 0) {
    reasons.push("No schema or data mutation signal detected.");
  }

  return {
    filePath,
    riskLevel,
    schemaChangesDetected,
    securityDefinerDetected,
    pgrstNotifyDetected,
    dmlStatementsDetected,
    readModelRebuildDetected,
    productionDbApprovalRequired,
    reasons,
  };
}

export function buildReleaseGuardMigrationPolicy(params: {
  changedFiles: string[];
  readFile: (filePath: string) => string | null;
}): ReleaseGuardMigrationPolicy {
  const migrationFiles = dedupe(
    params.changedFiles.map(normalizePath).filter(isSupabaseMigrationPath),
  ).sort();
  const risks: SupabaseMigrationRisk[] = [];
  const blockers: string[] = [];

  for (const filePath of migrationFiles) {
    const source = params.readFile(filePath);

    if (source == null) {
      blockers.push(`Supabase migration ${filePath} could not be read for release safety classification.`);
      continue;
    }

    const risk = analyzeSupabaseMigrationRisk({ filePath, source });
    risks.push(risk);

    if (risk.productionDbApprovalRequired) {
      blockers.push(
        `Supabase migration ${filePath} contains DML or read-model rebuild behavior and requires ${RELEASE_GUARD_MIGRATION_DB_APPROVAL_KEYS.join(", ")} before release automation can proceed.`,
      );
    }
  }

  const highRiskFiles = risks
    .filter((risk) => risk.productionDbApprovalRequired)
    .map((risk) => risk.filePath)
    .sort();

  return {
    migrationFiles,
    highRiskFiles,
    productionDbApprovalRequired: highRiskFiles.length > 0,
    requiredApprovalKeys: highRiskFiles.length > 0 ? [...RELEASE_GUARD_MIGRATION_DB_APPROVAL_KEYS] : [],
    nextSafeWave: highRiskFiles.length > 0 ? RELEASE_GUARD_MIGRATION_NEXT_SAFE_WAVE : null,
    risks,
    blockers,
  };
}

function isRuntimePath(filePath: string): boolean {
  if (filePath === "package.json" || filePath === "app.json" || filePath === "eas.json") {
    return false;
  }

  if (isNonRuntimePath(filePath)) {
    return false;
  }

  return filePath.startsWith("app/") || filePath.startsWith("src/");
}

function isBuildRequiredPath(filePath: string): boolean {
  return (
    filePath === "app.json" ||
    filePath === "eas.json" ||
    filePath.startsWith("android/") ||
    filePath.startsWith("ios/") ||
    filePath.startsWith("assets/")
  );
}

function inferRuntimeChangeClass(runtimeFiles: string[]): ReleaseChangeClass {
  if (runtimeFiles.length === 0) {
    return "release-metadata";
  }

  if (
    runtimeFiles.every(
      (filePath) =>
        filePath.startsWith("src/shared/release/") ||
        filePath.includes("otaDiagnostics") ||
        filePath.includes("OtaDiagnostics"),
    )
  ) {
    return runtimeFiles.some((filePath) => filePath.includes("otaDiagnostics") || filePath.includes("OtaDiagnostics"))
      ? "ota-diagnostics"
      : "release-metadata";
  }

  if (runtimeFiles.some((filePath) => filePath.startsWith("app/") || filePath.endsWith(".tsx"))) {
    return "js-ui";
  }

  return "js-logic";
}

export function classifyReleaseChanges(params: {
  changedFiles: string[];
  packageJsonMutationKind?: PackageJsonMutationKind;
}): ReleaseAutomationClassification {
  const files = dedupe(params.changedFiles.map(normalizePath).filter(Boolean)).sort();
  const nonRuntimeFiles: string[] = [];
  const runtimeFiles: string[] = [];
  const buildRequiredFiles: string[] = [];
  const reasons: string[] = [];
  const packageJsonMutationKind = params.packageJsonMutationKind ?? "none";

  for (const filePath of files) {
    if (filePath === "package.json") {
      if (packageJsonMutationKind === "scripts-only") {
        nonRuntimeFiles.push(filePath);
        reasons.push("package.json changed only in scripts, so OTA should be skipped.");
        continue;
      }

      if (packageJsonMutationKind === "non-runtime") {
        nonRuntimeFiles.push(filePath);
        reasons.push("package.json changed only in non-runtime tooling keys, so OTA should be skipped.");
        continue;
      }

      buildRequiredFiles.push(filePath);
      reasons.push("package.json changed outside release-safe tooling keys, so OTA is blocked.");
      continue;
    }

    if (isBuildRequiredPath(filePath)) {
      buildRequiredFiles.push(filePath);
      reasons.push(`${filePath} touches native or release-host config, so OTA is blocked.`);
      continue;
    }

    if (isRuntimePath(filePath)) {
      runtimeFiles.push(filePath);
      reasons.push(`${filePath} is runtime JS/TS code and requires full preflight before OTA.`);
      continue;
    }

    if (isNonRuntimePath(filePath)) {
      nonRuntimeFiles.push(filePath);
      reasons.push(`${filePath} is tooling/docs/test/backend-proof scope, so OTA should be skipped.`);
      continue;
    }

    buildRequiredFiles.push(filePath);
    reasons.push(`${filePath} is outside the safe release classification map, so OTA is blocked.`);
  }

  if (buildRequiredFiles.length > 0) {
    return {
      kind: "build-required",
      changeClass: null,
      files,
      nonRuntimeFiles: dedupe(nonRuntimeFiles).sort(),
      runtimeFiles: dedupe(runtimeFiles).sort(),
      buildRequiredFiles: dedupe(buildRequiredFiles).sort(),
      reasons: dedupe(reasons),
      packageJsonMutationKind,
    };
  }

  if (runtimeFiles.length > 0) {
    return {
      kind: "runtime-ota",
      changeClass: inferRuntimeChangeClass(dedupe(runtimeFiles).sort()),
      files,
      nonRuntimeFiles: dedupe(nonRuntimeFiles).sort(),
      runtimeFiles: dedupe(runtimeFiles).sort(),
      buildRequiredFiles: [],
      reasons: dedupe(reasons),
      packageJsonMutationKind,
    };
  }

  return {
    kind: "non-runtime",
    changeClass: null,
    files,
    nonRuntimeFiles: dedupe(nonRuntimeFiles).sort(),
    runtimeFiles: [],
    buildRequiredFiles: [],
    reasons: dedupe(
      reasons.length > 0
        ? reasons
        : ["No runtime JS/TS files changed in the release commit, so OTA should be skipped."],
    ),
    packageJsonMutationKind,
  };
}

export function evaluateReleaseGuardReadiness(params: {
  mode: ReleaseGuardMode;
  repo: ReleaseRepoState;
  gates: ReleaseGateResult[];
  classification: ReleaseAutomationClassification;
  migrationPolicy?: ReleaseGuardMigrationPolicy;
  runtimePolicy: ReleaseGuardRuntimePolicyTruth;
  startupPolicy: ReleaseGuardStartupPolicyTruth;
  targetChannel: string | null;
  releaseMessage: string | null;
  missingArtifacts: string[];
  expectedBranch: string | null;
}): ReleaseGuardReadiness {
  const blockers: string[] = [];

  if (!params.repo.worktreeClean) {
    blockers.push("Worktree is dirty. Release automation requires a clean repository state.");
  }

  if (!params.repo.headMatchesOriginMain) {
    const syncDetail =
      params.repo.localCommitsAheadOriginMain > 0 || params.repo.originMainCommitsAheadHead > 0
        ? ` Local branch is ahead by ${params.repo.localCommitsAheadOriginMain} commit(s) and behind by ${params.repo.originMainCommitsAheadHead} commit(s).`
        : "";
    blockers.push(
      `HEAD does not match origin/main.${syncDetail} Next safe action: ${params.repo.syncAction}. Push and sync the exact release commit before publishing.`,
    );
  }

  for (const gate of params.gates) {
    if (gate.status === "failed") {
      blockers.push(`Required gate failed: ${gate.name}.`);
    }
  }

  for (const artifact of params.missingArtifacts) {
    blockers.push(`Required artifact is missing: ${artifact}`);
  }

  for (const blocker of params.migrationPolicy?.blockers ?? []) {
    blockers.push(blocker);
  }

  if (!params.runtimePolicy.runtimePolicyValid) {
    blockers.push(`Runtime policy invalid: ${params.runtimePolicy.runtimePolicyReason}`);
  }

  if (!params.runtimePolicy.runtimeProofConsistent) {
    blockers.push(`Runtime proof mismatch: ${params.runtimePolicy.runtimeProofReason}`);
  }

  if (!params.startupPolicy.startupPolicyValid) {
    blockers.push(`Startup policy invalid: ${params.startupPolicy.startupPolicyReason}`);
  }

  if (params.mode === "ota") {
    if (params.classification.kind === "build-required") {
      blockers.push("Release classification requires a new build. OTA publish is blocked.");
    }

    if (params.classification.kind === "runtime-ota") {
      if (!params.targetChannel) {
        blockers.push("Runtime OTA publish requires an explicit --channel.");
      }

      if (!params.releaseMessage) {
        blockers.push("Runtime OTA publish requires a non-empty --message.");
      }
    }
  }

  if (params.mode === "ota" && params.targetChannel && params.expectedBranch && params.expectedBranch !== params.targetChannel) {
    blockers.push(
      `Target channel "${params.targetChannel}" does not match the canonical expected branch "${params.expectedBranch}".`,
    );
  }

  if (blockers.length > 0) {
    return {
      status: "fail",
      otaDisposition: "block",
      blockers,
    };
  }

  if (params.classification.kind === "non-runtime") {
    return {
      status: "pass",
      otaDisposition: "skip",
      blockers: [],
    };
  }

  if (params.classification.kind === "build-required") {
    return {
      status: "pass",
      otaDisposition: "block",
      blockers: [],
    };
  }

  if (params.mode === "ota" && params.classification.kind === "runtime-ota") {
    return {
      status: "pass",
      otaDisposition: "allow",
      blockers: [],
    };
  }

  return {
    status: "pass",
    otaDisposition: "allow",
    blockers: [],
  };
}

function presentWhen(value: string | null | undefined): ReleaseMetadataFieldStatus {
  return value && value.trim().length > 0 ? "present" : "missing";
}

function normalizeReleaseMetadataOtaDisposition(params: {
  readiness: ReleaseGuardReadiness;
  otaPublish: ReleaseOtaPublishMetadata | null;
}): ReleaseMetadataOtaDisposition {
  if (params.otaPublish) return "published";
  if (params.readiness.otaDisposition === "skip") return "skip";
  if (params.readiness.otaDisposition === "block") return "blocked";
  return "candidate";
}

export function buildReleaseMetadataEnforcement(params: {
  repo: ReleaseRepoState;
  appVersion: string;
  configuredIosBuildNumber: string;
  configuredAndroidVersionCode: string;
  appVersionSource: string;
  runtimeVersion: string;
  runtimePolicyValid: boolean;
  runtimeProofConsistent: boolean;
  startupPolicyValid: boolean;
  readiness: ReleaseGuardReadiness;
  targetChannel: string | null;
  expectedBranch: string | null;
  otaPublish: ReleaseOtaPublishMetadata | null;
}): ReleaseMetadataEnforcement {
  const otaDisposition = normalizeReleaseMetadataOtaDisposition({
    readiness: params.readiness,
    otaPublish: params.otaPublish,
  });
  const channelValue = params.otaPublish?.branch || params.targetChannel;
  const branchValue = params.otaPublish?.branch || params.expectedBranch;
  const platformValue = params.otaPublish?.platform ?? null;
  const hasBuildLineage =
    params.appVersionSource.trim().length > 0 &&
    (params.configuredIosBuildNumber.trim().length > 0 ||
      params.configuredAndroidVersionCode.trim().length > 0);
  const sentryProofStatus: ReleaseMetadataFieldStatus =
    otaDisposition === "published" ? "missing" : "not_applicable";
  const binarySourceMapProofStatus: ReleaseMetadataFieldStatus =
    otaDisposition === "published" ? "missing" : "not_applicable";
  const missing: string[] = [];
  const warnings: string[] = [];
  const fieldStatuses = {
    gitSha: presentWhen(params.repo.headCommit),
    appVersion: presentWhen(params.appVersion),
    buildLineage: hasBuildLineage ? "present" : "missing",
    runtimeVersion: presentWhen(params.runtimeVersion),
    channel:
      channelValue && channelValue.trim().length > 0
        ? "present"
        : otaDisposition === "skip"
          ? "not_applicable"
          : "missing",
    branch:
      branchValue && branchValue.trim().length > 0
        ? "present"
        : otaDisposition === "skip"
          ? "not_applicable"
          : "missing",
    platform:
      platformValue && platformValue.trim().length > 0
        ? "present"
        : otaDisposition === "published"
          ? "missing"
          : "not_applicable",
  } satisfies Record<string, ReleaseMetadataFieldStatus>;

  for (const [field, status] of Object.entries(fieldStatuses)) {
    if (status === "missing") missing.push(field);
  }

  if (sentryProofStatus === "missing") {
    missing.push("sentrySourceMaps");
    warnings.push("Sentry source maps are not marked shipped because no source map proof is attached to this report.");
  }

  if (binarySourceMapProofStatus === "missing") {
    missing.push("binarySourceMapsProven");
    warnings.push("Binary/source map proof is not marked shipped without explicit proof artifacts.");
  }

  const rollbackReady =
    params.repo.worktreeClean &&
    params.repo.headMatchesOriginMain &&
    presentWhen(params.repo.headCommit) === "present" &&
    params.runtimePolicyValid &&
    params.runtimeProofConsistent &&
    params.startupPolicyValid;

  return {
    ...fieldStatuses,
    otaDisposition,
    rollbackReady,
    sentrySourceMaps: sentryProofStatus,
    binarySourceMapsProven: binarySourceMapProofStatus,
    easBuildTriggered: false,
    easSubmitTriggered: false,
    otaPublished: otaDisposition === "published",
    easUpdateTriggered: otaDisposition === "published",
    missing,
    warnings,
  };
}

export function parseEasUpdateOutput(output: string): ReleaseOtaPublishMetadata {
  function readField(label: string): string {
    const pattern = new RegExp(`^${label}\\s+(.+)$`, "m");
    const match = output.match(pattern);
    return match?.[1]?.trim() ?? "";
  }

  return {
    branch: readField("Branch"),
    runtimeVersion: readField("Runtime version"),
    platform: readField("Platform"),
    updateGroupId: readField("Update group ID"),
    androidUpdateId: readField("Android update ID"),
    iosUpdateId: readField("iOS update ID"),
    message: readField("Message"),
    commit: readField("Commit"),
    dashboardUrl: readField("EAS Dashboard"),
  };
}
