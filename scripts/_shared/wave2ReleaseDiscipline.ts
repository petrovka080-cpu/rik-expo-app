export type Gate = "GREEN" | "NOT GREEN";

export type ExclusionClassification =
  | "release-critical"
  | "generated-allowed"
  | "local-only"
  | "unknown";

export type KnownExclusion = {
  path: string;
  reason: string;
  classification: ExclusionClassification;
};

export type ProofArtifacts = {
  required: string[];
  optional: string[];
  transient: string[];
};

export type ReleaseLedger = {
  batchName: string;
  date: string;
  scope: string[];
  exactChangedFiles: string[];
  exactSqlMigrations: string[];
  exactScriptsVerifiers: string[];
  exactTestCommands: string[];
  proofArtifacts: ProofArtifacts;
  commitSha: string | null;
  pushTarget: string | null;
  ota: {
    published: boolean;
    development: string | null;
    preview: string | null;
    production: string | null;
    note: string | null;
  };
  rollbackNote: string;
  honestStatus: Gate;
  knownExclusions: KnownExclusion[];
};

export type DirtyPathClassification = "current-batch" | "known-exclusion" | "unaccounted";
export type IntrinsicPathKind = "release-critical" | "generated-allowed" | "local-only" | "unknown";

export type DirtyPathAssessment = {
  path: string;
  gitCode: string;
  intrinsicKind: IntrinsicPathKind;
  accounting: DirtyPathClassification;
};

export type ReleaseDisciplineEvaluation = {
  ledgerMissingFields: string[];
  missingRequiredProofs: string[];
  dirtyAssessments: DirtyPathAssessment[];
  unaccountedDirtyPaths: string[];
  forbiddenLocalOnlyPaths: string[];
  unknownDirtyPaths: string[];
  releaseMappingValid: boolean;
  greenDefinitionSatisfied: boolean;
};

const ROOT_RELEASE_CRITICAL_FILES = new Set([
  "App.tsx",
  "README.md",
  "app.json",
  "babel.config.js",
  "deno.lock",
  "eas.json",
  "eslint.config.js",
  "expo-env.d.ts",
  "jest.config.js",
  "package-lock.json",
  "package.json",
  "tsconfig.json",
  ".gitignore",
  ".gitattributes",
  ".editorconfig",
]);

export const ALLOWED_ARTIFACT_SUFFIXES = [
  "-smoke.json",
  "-parity.json",
  "-proof.md",
  "-proof.json",
  "-jest.json",
  "-summary.json",
  "-chain.json",
];

const LOCAL_ONLY_PATTERNS = [
  /^System\.Management\.Automation\.Internal\.Host/i,
  /^\.expo\//i,
  /^\.idea\//i,
  /^\.vscode\//i,
  /^node_modules\//i,
  /^tmp\//i,
  /\.log$/i,
  /\.tmp$/i,
  /\.bak$/i,
];

export function normalizeRepoPath(input: string) {
  return String(input || "").replace(/\\/g, "/").replace(/^\.\/+/, "").trim();
}

export function intrinsicPathKind(pathValue: string): IntrinsicPathKind {
  const path = normalizeRepoPath(pathValue);
  if (!path) return "unknown";
  if (ROOT_RELEASE_CRITICAL_FILES.has(path)) return "release-critical";
  if (
    path.startsWith("app/") ||
    path.startsWith("src/") ||
    path.startsWith("scripts/") ||
    path.startsWith("docs/") ||
    path.startsWith("artifacts/release-ledgers/") ||
    path.startsWith("supabase/") ||
    path.startsWith("android/") ||
    path.startsWith("assets/") ||
    path.startsWith("types/")
  ) {
    return "release-critical";
  }
  if (path.startsWith("artifacts/") && ALLOWED_ARTIFACT_SUFFIXES.some((suffix) => path.endsWith(suffix))) {
    return "generated-allowed";
  }
  if (LOCAL_ONLY_PATTERNS.some((pattern) => pattern.test(path))) {
    return "local-only";
  }
  return "unknown";
}

export function ledgerMissingFields(ledger: ReleaseLedger) {
  const missing: string[] = [];
  if (!normalizeRepoPath(ledger.batchName)) missing.push("batchName");
  if (!normalizeRepoPath(ledger.date)) missing.push("date");
  if (!Array.isArray(ledger.scope) || ledger.scope.length === 0) missing.push("scope");
  if (!Array.isArray(ledger.exactChangedFiles) || ledger.exactChangedFiles.length === 0) missing.push("exactChangedFiles");
  if (!Array.isArray(ledger.exactScriptsVerifiers) || ledger.exactScriptsVerifiers.length === 0) {
    missing.push("exactScriptsVerifiers");
  }
  if (!Array.isArray(ledger.exactTestCommands) || ledger.exactTestCommands.length === 0) {
    missing.push("exactTestCommands");
  }
  if (!ledger.proofArtifacts || !Array.isArray(ledger.proofArtifacts.required) || ledger.proofArtifacts.required.length === 0) {
    missing.push("proofArtifacts.required");
  }
  if (!normalizeRepoPath(ledger.rollbackNote)) missing.push("rollbackNote");
  if (ledger.honestStatus !== "GREEN" && ledger.honestStatus !== "NOT GREEN") missing.push("honestStatus");
  if (!Array.isArray(ledger.knownExclusions)) missing.push("knownExclusions");
  return missing;
}

export function batchOwnedPaths(ledger: ReleaseLedger) {
  return new Set(
    [
      ...ledger.exactChangedFiles,
      ...ledger.exactSqlMigrations,
      ...ledger.exactScriptsVerifiers,
      ...ledger.proofArtifacts.required,
      ...ledger.proofArtifacts.optional,
      ...ledger.proofArtifacts.transient,
    ].map(normalizeRepoPath).filter(Boolean),
  );
}

export function exclusionMap(ledger: ReleaseLedger) {
  return new Map(ledger.knownExclusions.map((entry) => [normalizeRepoPath(entry.path), entry]));
}

export function assessDirtyPaths(
  dirtyPaths: Array<{ path: string; gitCode: string }>,
  ledger: ReleaseLedger,
): DirtyPathAssessment[] {
  const batchPaths = batchOwnedPaths(ledger);
  const exclusions = exclusionMap(ledger);
  return dirtyPaths.map((entry) => {
    const path = normalizeRepoPath(entry.path);
    let accounting: DirtyPathClassification = "unaccounted";
    if (batchPaths.has(path)) accounting = "current-batch";
    else if (exclusions.has(path)) accounting = "known-exclusion";
    return {
      path,
      gitCode: entry.gitCode,
      intrinsicKind: intrinsicPathKind(path),
      accounting,
    };
  });
}

export function releaseMappingValid(ledger: ReleaseLedger) {
  const commitOk = ledger.commitSha == null || /^[0-9a-f]{7,40}$/i.test(ledger.commitSha);
  const pushOk = ledger.pushTarget == null || normalizeRepoPath(ledger.pushTarget).length > 0;
  const otaPublished = ledger.ota.published === true;
  const otaChannelsPresent =
    normalizeRepoPath(ledger.ota.development || "").length > 0 &&
    normalizeRepoPath(ledger.ota.preview || "").length > 0 &&
    normalizeRepoPath(ledger.ota.production || "").length > 0;
  const otaNonPublishedNoted = ledger.ota.published === false && normalizeRepoPath(ledger.ota.note || "").length > 0;

  if (!commitOk || !pushOk) return false;
  if (ledger.honestStatus !== "GREEN") {
    return otaPublished ? otaChannelsPresent : otaNonPublishedNoted;
  }

  if (!ledger.commitSha || !ledger.pushTarget) return false;
  if (otaPublished) return otaChannelsPresent;
  return otaNonPublishedNoted;
}

export function evaluateReleaseDiscipline(
  ledger: ReleaseLedger,
  dirtyPaths: Array<{ path: string; gitCode: string }>,
  existingPaths: Set<string>,
): ReleaseDisciplineEvaluation {
  const missingFields = ledgerMissingFields(ledger);
  const assessments = assessDirtyPaths(dirtyPaths, ledger);
  const missingProofs = ledger.proofArtifacts.required
    .map(normalizeRepoPath)
    .filter((entry) => entry && !existingPaths.has(entry));

  const unaccountedDirtyPaths = assessments
    .filter((entry) => entry.accounting === "unaccounted")
    .map((entry) => entry.path);
  const forbiddenLocalOnlyPaths = assessments
    .filter((entry) => entry.intrinsicKind === "local-only")
    .map((entry) => entry.path);
  const unknownDirtyPaths = assessments
    .filter((entry) => entry.intrinsicKind === "unknown" && entry.accounting !== "known-exclusion")
    .map((entry) => entry.path);
  const mappingValid = releaseMappingValid(ledger);
  const greenDefinitionSatisfied =
    missingFields.length === 0 &&
    missingProofs.length === 0 &&
    unaccountedDirtyPaths.length === 0 &&
    forbiddenLocalOnlyPaths.length === 0 &&
    unknownDirtyPaths.length === 0 &&
    mappingValid;

  return {
    ledgerMissingFields: missingFields,
    missingRequiredProofs: missingProofs,
    dirtyAssessments: assessments,
    unaccountedDirtyPaths,
    forbiddenLocalOnlyPaths,
    unknownDirtyPaths,
    releaseMappingValid: mappingValid,
    greenDefinitionSatisfied,
  };
}
