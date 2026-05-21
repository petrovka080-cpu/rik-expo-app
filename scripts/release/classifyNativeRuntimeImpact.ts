import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  IOS_EAS_UPDATE_FAST_QA_POLICY,
  classifyNativeRuntimeImpact,
  type NativeImpactPackageJsonMutationKind,
} from "./nativeRuntimeImpact";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const ARTIFACT_PREFIX = "S_IOS_EAS_UPDATE_CHANNEL_FAST_QA_NO_REBUILD";

type NativeImpactCliReport = ReturnType<typeof classifyNativeRuntimeImpact> & {
  wave: typeof IOS_EAS_UPDATE_FAST_QA_POLICY.wave;
  generatedAt: string;
  policy: typeof IOS_EAS_UPDATE_FAST_QA_POLICY;
  changedFileSource: "git_dirty_worktree" | "explicit_files";
  iosBuildForbiddenForJsOnlyChanges: boolean;
  nextDeliveryAction:
    | "publish_ota_to_installed_channel_branch"
    | "new_ios_build_required"
    | "no_runtime_delivery_required";
};

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

function runGit(args: string[]): string[] {
  const result = spawnSync("git", args, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
    throw new Error(output || `git ${args.join(" ")} failed`);
  }

  return (result.stdout ?? "")
    .split(/\r?\n/)
    .map(normalizePath)
    .filter(Boolean);
}

function readGitText(args: string[]): string | null {
  const result = spawnSync("git", args, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return result.status === 0 ? result.stdout ?? "" : null;
}

function readDirtyWorktreeFiles(): string[] {
  const tracked = runGit(["diff", "--name-only", "--diff-filter=ACMRTUXB", "HEAD", "--"]);
  const untracked = runGit(["ls-files", "--others", "--exclude-standard"]);
  return [...new Set([...tracked, ...untracked])].sort();
}

function parseJsonRecord(source: string | null): Record<string, unknown> | null {
  if (!source) return null;
  try {
    const parsed: unknown = JSON.parse(source);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function sortedJson(value: unknown): string {
  if (value === undefined) return "null";

  if (Array.isArray(value)) {
    return JSON.stringify(value.map((item) => JSON.parse(sortedJson(item))));
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return JSON.stringify(
      Object.keys(record)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = JSON.parse(sortedJson(record[key]));
          return acc;
        }, {}),
    );
  }

  return JSON.stringify(value);
}

function inferPackageJsonMutationKind(files: readonly string[]): NativeImpactPackageJsonMutationKind {
  if (!files.includes("package.json")) return "none";

  const previous = parseJsonRecord(readGitText(["show", "HEAD:package.json"]));
  const currentPath = path.join(PROJECT_ROOT, "package.json");
  const current = fs.existsSync(currentPath) ? parseJsonRecord(fs.readFileSync(currentPath, "utf8")) : null;
  if (!previous || !current) return "dependencies-or-native-risk";

  const previousScripts = sortedJson(previous.scripts ?? {});
  const currentScripts = sortedJson(current.scripts ?? {});
  const previousWithoutScripts = { ...previous };
  const currentWithoutScripts = { ...current };
  delete previousWithoutScripts.scripts;
  delete currentWithoutScripts.scripts;

  if (previousScripts !== currentScripts && sortedJson(previousWithoutScripts) === sortedJson(currentWithoutScripts)) {
    return "scripts-only";
  }

  const previousDependencies = sortedJson({
    dependencies: previous.dependencies ?? {},
    devDependencies: previous.devDependencies ?? {},
    optionalDependencies: previous.optionalDependencies ?? {},
    peerDependencies: previous.peerDependencies ?? {},
  });
  const currentDependencies = sortedJson({
    dependencies: current.dependencies ?? {},
    devDependencies: current.devDependencies ?? {},
    optionalDependencies: current.optionalDependencies ?? {},
    peerDependencies: current.peerDependencies ?? {},
  });

  return previousDependencies === currentDependencies ? "non-runtime" : "dependencies-or-native-risk";
}

function parseArgs(argv: string[]): {
  json: boolean;
  files: string[];
  packageJsonMutationKind: NativeImpactPackageJsonMutationKind;
} {
  const files: string[] = [];
  let json = false;
  let packageJsonMutationKind: NativeImpactPackageJsonMutationKind = "dependencies-or-native-risk";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      json = true;
      continue;
    }

    if (arg === "--file") {
      const value = argv[index + 1];
      if (!value) throw new Error("--file requires a path");
      files.push(value);
      index += 1;
      continue;
    }

    if (arg === "--files") {
      const value = argv[index + 1];
      if (!value) throw new Error("--files requires a comma-separated list");
      files.push(...value.split(","));
      index += 1;
      continue;
    }

    if (arg === "--package-json-mutation-kind") {
      const value = argv[index + 1] as NativeImpactPackageJsonMutationKind | undefined;
      if (
        value !== "none" &&
        value !== "scripts-only" &&
        value !== "non-runtime" &&
        value !== "dependencies-or-native-risk"
      ) {
        throw new Error(
          "--package-json-mutation-kind must be one of none, scripts-only, non-runtime, dependencies-or-native-risk",
        );
      }
      packageJsonMutationKind = value;
      index += 1;
      continue;
    }
  }

  return { json, files, packageJsonMutationKind };
}

function writeJsonArtifact(name: string, value: unknown): void {
  const artifactsDir = path.join(PROJECT_ROOT, "artifacts");
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function buildReport(params: {
  files: string[];
  changedFileSource: NativeImpactCliReport["changedFileSource"];
  packageJsonMutationKind: NativeImpactPackageJsonMutationKind;
}): NativeImpactCliReport {
  const classification = classifyNativeRuntimeImpact({
    changedFiles: params.files,
    packageJsonMutationKind: params.packageJsonMutationKind,
  });
  const nextDeliveryAction = classification.iosBuildRequired
    ? "new_ios_build_required"
    : classification.otaRequired || classification.backendMigrationPresent
      ? "publish_ota_to_installed_channel_branch"
      : "no_runtime_delivery_required";

  return {
    wave: IOS_EAS_UPDATE_FAST_QA_POLICY.wave,
    generatedAt: new Date().toISOString(),
    policy: IOS_EAS_UPDATE_FAST_QA_POLICY,
    changedFileSource: params.changedFileSource,
    ...classification,
    iosBuildForbiddenForJsOnlyChanges: !classification.nativeImpact,
    nextDeliveryAction,
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const explicitFiles = args.files.map(normalizePath).filter(Boolean);
  const files = explicitFiles.length > 0 ? explicitFiles : readDirtyWorktreeFiles();
  const packageJsonMutationKind =
    args.packageJsonMutationKind === "dependencies-or-native-risk"
      ? inferPackageJsonMutationKind(files)
      : args.packageJsonMutationKind;
  const report = buildReport({
    files,
    changedFileSource: explicitFiles.length > 0 ? "explicit_files" : "git_dirty_worktree",
    packageJsonMutationKind,
  });

  writeJsonArtifact(`${ARTIFACT_PREFIX}_native_impact.json`, report);
  writeJsonArtifact(`${ARTIFACT_PREFIX}_inventory.json`, {
    wave: report.wave,
    generatedAt: report.generatedAt,
    changedFileSource: report.changedFileSource,
    changedFiles: report.files,
    changedFilesCount: report.files.length,
    nativeImpact: report.nativeImpact,
    iosBuildRequired: report.iosBuildRequired,
    otaAllowed: report.otaAllowed,
  });

  if (args.json) {
    console.info(JSON.stringify(report, null, 2));
    return;
  }

  console.info(`Native impact: ${String(report.nativeImpact)}`);
  console.info(`iOS build required: ${String(report.iosBuildRequired)}`);
  console.info(`OTA allowed: ${String(report.otaAllowed)}`);
  console.info(`Next delivery action: ${report.nextDeliveryAction}`);
  if (report.nativeBuildRequiredFiles.length > 0) {
    console.info("Native-impact files:");
    for (const file of report.nativeBuildRequiredFiles) {
      console.info(`- ${file}`);
    }
  }
}

main();
