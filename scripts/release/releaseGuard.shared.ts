import type { ReleaseChangeClass } from "../../src/shared/release/releaseInfo.types";

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

export type ReleaseRepoState = {
  gitBranch: string;
  headCommit: string;
  originMainCommit: string;
  worktreeClean: boolean;
  headMatchesOriginMain: boolean;
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

export type ReleaseGuardReport = {
  mode: ReleaseGuardMode;
  timestamp: string;
  repo: ReleaseRepoState;
  gates: ReleaseGateResult[];
  classification: ReleaseAutomationClassification;
  readiness: ReleaseGuardReadiness;
  requiredArtifacts: string[];
  missingArtifacts: string[];
  targetChannel: string | null;
  expectedBranch: string | null;
  releaseMessage: string | null;
  commitRange: string;
  otaPublish: ReleaseOtaPublishMetadata | null;
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

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
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
    filePath.startsWith("docs/") ||
    filePath.startsWith("artifacts/") ||
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
    blockers.push("HEAD does not match origin/main. Push and sync the exact release commit before publishing.");
  }

  for (const gate of params.gates) {
    if (gate.status === "failed") {
      blockers.push(`Required gate failed: ${gate.name}.`);
    }
  }

  for (const artifact of params.missingArtifacts) {
    blockers.push(`Required artifact is missing: ${artifact}`);
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
