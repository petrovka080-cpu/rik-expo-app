import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export type AiAndroidRebuildRequirementStatus =
  | "PASS_ANDROID_REBUILD_NOT_REQUIRED"
  | "PASS_ANDROID_REBUILD_PROOF_PRESENT"
  | "BLOCKED_ANDROID_REBUILD_REQUIRED_FOR_DIRTY_AI_WORKTREE"
  | "BLOCKED_ANDROID_REBUILD_REQUIRED_FOR_AI_RUNTIME_PROOF";

export type AiAndroidRebuildRequirement = {
  final_status: AiAndroidRebuildRequirementStatus;
  require_rebuild: boolean;
  changed_files: string[];
  ai_mobile_runtime_files: string[];
  ai_mobile_runtime_source_files: string[];
  ai_mobile_runtime_source_fingerprint: string;
  installed_apk_source_fingerprint: string | null;
  source_fingerprint_matches_installed_apk: boolean;
  local_android_rebuild_install_after_source_change: boolean;
  backend_or_scripts_only: boolean;
  installed_runtime_smoke_required: true;
  local_android_rebuild_install_required: boolean;
  local_android_rebuild_install: "PASS" | "NOT_REQUIRED" | "BLOCKED";
  proof_artifact_path: string;
  changed_files_fingerprint: string;
  exact_reason: string | null;
};

export const AI_ANDROID_REBUILD_INSTALL_PROOF_ARTIFACT =
  "artifacts/S_AI_QA_01_ANDROID_REBUILD_INSTALL.json";

const AI_MOBILE_RUNTIME_PREFIXES = [
  "src/features/ai/",
  "src/screens/",
  "src/components/",
  "app/",
] as const;

const NAVIGATION_RUNTIME_PREFIXES = [
  "src/navigation/",
  "src/lib/navigation/",
  "src/lib/entry/",
] as const;

const AI_MOBILE_RUNTIME_SOURCE_PREFIXES = [
  ...AI_MOBILE_RUNTIME_PREFIXES,
  ...NAVIGATION_RUNTIME_PREFIXES,
] as const;

function normalizeProjectPath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

function runGit(projectRoot: string, args: readonly string[]): string[] {
  const result = spawnSync("git", [...args], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) return [];
  return result.stdout
    .split(/\r?\n/)
    .map(normalizeProjectPath)
    .filter(Boolean);
}

function hasHeadParent(projectRoot: string): boolean {
  return spawnSync("git", ["rev-parse", "--verify", "HEAD^"], {
    cwd: projectRoot,
    stdio: "ignore",
  }).status === 0;
}

function dedupeSorted(values: readonly string[]): string[] {
  return [...new Set(values.map(normalizeProjectPath).filter(Boolean))].sort();
}

export function buildAiChangedFilesFingerprint(changedFiles: readonly string[]): string {
  return crypto
    .createHash("sha256")
    .update(dedupeSorted(changedFiles).join("\n"))
    .digest("hex");
}

function buildContentFingerprint(projectRoot: string, relativeFiles: readonly string[]): string {
  const hash = crypto.createHash("sha256");
  for (const relativePath of dedupeSorted(relativeFiles)) {
    const absolutePath = path.join(projectRoot, relativePath);
    hash.update(relativePath);
    hash.update("\0");
    if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
      hash.update(fs.readFileSync(absolutePath));
    } else {
      hash.update("MISSING");
    }
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function isAiMobileRuntimeRebuildPath(filePath: string): boolean {
  const normalized = normalizeProjectPath(filePath);
  if (!normalized) return false;
  if (AI_MOBILE_RUNTIME_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true;
  if (NAVIGATION_RUNTIME_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true;
  if (/^tests\/e2e\/.*\.ya?ml$/i.test(normalized)) return true;
  return false;
}

function isAiMobileRuntimeSourcePath(filePath: string): boolean {
  const normalized = normalizeProjectPath(filePath);
  if (!normalized) return false;
  if (/\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(normalized)) return false;
  if (normalized.includes("/__tests__/")) return false;
  if (AI_MOBILE_RUNTIME_SOURCE_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true;
  if (/^tests\/e2e\/.*\.ya?ml$/i.test(normalized)) return true;
  return false;
}

export function readCurrentAiMobileRuntimeSourceFiles(params: {
  projectRoot?: string;
  changedFiles?: readonly string[];
} = {}): string[] {
  const projectRoot = params.projectRoot ?? process.cwd();
  const tracked = runGit(projectRoot, [
    "ls-files",
    ...AI_MOBILE_RUNTIME_SOURCE_PREFIXES,
    "tests/e2e",
  ]);
  return dedupeSorted([
    ...tracked.filter(isAiMobileRuntimeSourcePath),
    ...(params.changedFiles ?? []).filter(isAiMobileRuntimeSourcePath),
  ]).filter((filePath) => !filePath.startsWith("artifacts/"));
}

export function buildAiMobileRuntimeSourceFingerprint(params: {
  projectRoot?: string;
  sourceFiles?: readonly string[];
  changedFiles?: readonly string[];
} = {}): string {
  const projectRoot = params.projectRoot ?? process.cwd();
  const sourceFiles = params.sourceFiles ?? readCurrentAiMobileRuntimeSourceFiles({
    projectRoot,
    changedFiles: params.changedFiles,
  });
  return buildContentFingerprint(projectRoot, sourceFiles);
}

export function readCurrentWaveChangedFiles(projectRoot = process.cwd()): string[] {
  const aheadOfOrigin = runGit(projectRoot, ["diff", "--name-only", "--diff-filter=ACMR", "origin/main...HEAD"]);
  const staged = runGit(projectRoot, ["diff", "--name-only", "--diff-filter=ACMR", "--cached"]);
  const unstaged = runGit(projectRoot, ["diff", "--name-only", "--diff-filter=ACMR"]);
  const untracked = runGit(projectRoot, ["ls-files", "--others", "--exclude-standard"]);
  const lastCommit = aheadOfOrigin.length === 0 && staged.length === 0 && unstaged.length === 0 && hasHeadParent(projectRoot)
    ? runGit(projectRoot, ["diff", "--name-only", "--diff-filter=ACMR", "HEAD^..HEAD"])
    : [];

  return dedupeSorted([
    ...aheadOfOrigin,
    ...staged,
    ...unstaged,
    ...untracked,
    ...lastCommit,
  ]).filter((filePath) => !filePath.startsWith("artifacts/"));
}

function readJsonRecord(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function proofMatchesCurrentChangeSet(params: {
  projectRoot: string;
  proofArtifactPath: string;
  changedFilesFingerprint: string;
  sourceFingerprint: string;
}): boolean {
  const proof = readJsonRecord(path.join(params.projectRoot, params.proofArtifactPath));
  return (
    proof?.final_status === "PASS_ANDROID_REBUILD_INSTALL_FOR_AI_RUNTIME_PROOF" &&
    proof?.changed_files_fingerprint === params.changedFilesFingerprint &&
    proof?.installed_apk_source_fingerprint === params.sourceFingerprint &&
    proof?.ai_mobile_runtime_source_fingerprint === params.sourceFingerprint &&
    proof?.source_fingerprint_matches_installed_apk === true &&
    proof?.local_android_rebuild_install_after_source_change === true &&
    proof?.fake_emulator_pass === false
  );
}

function proofMatchesCurrentSourceFingerprint(params: {
  projectRoot: string;
  proofArtifactPath: string;
  sourceFingerprint: string;
}): boolean {
  const proof = readJsonRecord(path.join(params.projectRoot, params.proofArtifactPath));
  return (
    proof?.final_status === "PASS_ANDROID_REBUILD_INSTALL_FOR_AI_RUNTIME_PROOF" &&
    proof?.installed_apk_source_fingerprint === params.sourceFingerprint &&
    proof?.ai_mobile_runtime_source_fingerprint === params.sourceFingerprint &&
    proof?.source_fingerprint_matches_installed_apk === true &&
    proof?.local_android_rebuild_install_after_source_change === true &&
    proof?.fake_emulator_pass === false
  );
}

function readInstalledApkSourceFingerprint(projectRoot: string, proofArtifactPath: string): string | null {
  const proof = readJsonRecord(path.join(projectRoot, proofArtifactPath));
  const fingerprint = proof?.installed_apk_source_fingerprint;
  return typeof fingerprint === "string" && fingerprint.trim().length > 0 ? fingerprint.trim() : null;
}

export function resolveAiAndroidRebuildRequirement(params: {
  projectRoot?: string;
  changedFiles?: readonly string[];
  proofArtifactPath?: string;
  forceRebuild?: boolean;
} = {}): AiAndroidRebuildRequirement {
  const projectRoot = params.projectRoot ?? process.cwd();
  const changedFiles = dedupeSorted(params.changedFiles ?? readCurrentWaveChangedFiles(projectRoot));
  const aiMobileRuntimeFiles = changedFiles.filter(isAiMobileRuntimeRebuildPath);
  const aiMobileRuntimeSourceFiles = readCurrentAiMobileRuntimeSourceFiles({ projectRoot, changedFiles });
  const aiMobileRuntimeSourceFingerprint = buildAiMobileRuntimeSourceFingerprint({
    projectRoot,
    sourceFiles: aiMobileRuntimeSourceFiles,
  });
  const forceRebuild =
    params.forceRebuild === true ||
    String(process.env.S_AI_EMULATOR_FORCE_REBUILD_FOR_RUNTIME_PROOF ?? "").trim().toLowerCase() === "true";
  const proofArtifactPath = params.proofArtifactPath ?? AI_ANDROID_REBUILD_INSTALL_PROOF_ARTIFACT;
  const installedApkSourceFingerprint = readInstalledApkSourceFingerprint(projectRoot, proofArtifactPath);
  const sourceFingerprintMatchesInstalledApk =
    installedApkSourceFingerprint === aiMobileRuntimeSourceFingerprint;
  const requireRebuild =
    aiMobileRuntimeFiles.length > 0 ||
    forceRebuild ||
    !sourceFingerprintMatchesInstalledApk;
  const changedFilesFingerprint = buildAiChangedFilesFingerprint(changedFiles);
  const proofReady = requireRebuild
    ? proofMatchesCurrentChangeSet({
        projectRoot,
        proofArtifactPath,
        changedFilesFingerprint,
        sourceFingerprint: aiMobileRuntimeSourceFingerprint,
      }) ||
      proofMatchesCurrentSourceFingerprint({
        projectRoot,
        proofArtifactPath,
        sourceFingerprint: aiMobileRuntimeSourceFingerprint,
      })
    : false;

  if (!requireRebuild) {
    return {
      final_status: "PASS_ANDROID_REBUILD_NOT_REQUIRED",
      require_rebuild: false,
      changed_files: changedFiles,
      ai_mobile_runtime_files: [],
      ai_mobile_runtime_source_files: aiMobileRuntimeSourceFiles,
      ai_mobile_runtime_source_fingerprint: aiMobileRuntimeSourceFingerprint,
      installed_apk_source_fingerprint: installedApkSourceFingerprint,
      source_fingerprint_matches_installed_apk: true,
      local_android_rebuild_install_after_source_change: false,
      backend_or_scripts_only: true,
      installed_runtime_smoke_required: true,
      local_android_rebuild_install_required: false,
      local_android_rebuild_install: "NOT_REQUIRED",
      proof_artifact_path: proofArtifactPath,
      changed_files_fingerprint: changedFilesFingerprint,
      exact_reason: null,
    };
  }

  if (proofReady) {
    return {
      final_status: "PASS_ANDROID_REBUILD_PROOF_PRESENT",
      require_rebuild: true,
      changed_files: changedFiles,
      ai_mobile_runtime_files: aiMobileRuntimeFiles,
      ai_mobile_runtime_source_files: aiMobileRuntimeSourceFiles,
      ai_mobile_runtime_source_fingerprint: aiMobileRuntimeSourceFingerprint,
      installed_apk_source_fingerprint: installedApkSourceFingerprint,
      source_fingerprint_matches_installed_apk: true,
      local_android_rebuild_install_after_source_change: true,
      backend_or_scripts_only: false,
      installed_runtime_smoke_required: true,
      local_android_rebuild_install_required: true,
      local_android_rebuild_install: "PASS",
      proof_artifact_path: proofArtifactPath,
      changed_files_fingerprint: changedFilesFingerprint,
      exact_reason: null,
    };
  }

  const dirtyWorktreeBlocker = aiMobileRuntimeFiles.length > 0;
  return {
    final_status: dirtyWorktreeBlocker
      ? "BLOCKED_ANDROID_REBUILD_REQUIRED_FOR_DIRTY_AI_WORKTREE"
      : "BLOCKED_ANDROID_REBUILD_REQUIRED_FOR_AI_RUNTIME_PROOF",
    require_rebuild: true,
    changed_files: changedFiles,
    ai_mobile_runtime_files: aiMobileRuntimeFiles,
    ai_mobile_runtime_source_files: aiMobileRuntimeSourceFiles,
    ai_mobile_runtime_source_fingerprint: aiMobileRuntimeSourceFingerprint,
    installed_apk_source_fingerprint: installedApkSourceFingerprint,
    source_fingerprint_matches_installed_apk: false,
    local_android_rebuild_install_after_source_change: false,
    backend_or_scripts_only: false,
    installed_runtime_smoke_required: true,
    local_android_rebuild_install_required: true,
    local_android_rebuild_install: "BLOCKED",
    proof_artifact_path: proofArtifactPath,
    changed_files_fingerprint: changedFilesFingerprint,
    exact_reason:
      forceRebuild
        ? "Forced Android rebuild/install requested for AI runtime proof."
        : dirtyWorktreeBlocker
          ? "AI/mobile runtime files changed in the current worktree; run scripts/release/buildInstallAndroidPreviewForEmulator.ts before emulator proof."
          : "Installed APK proof is missing or stale for the current AI/mobile runtime source fingerprint.",
  };
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

if (require.main === module) {
  const result = resolveAiAndroidRebuildRequirement();
  writeJson(
    path.join(process.cwd(), "artifacts", "S_AI_QA_01_ANDROID_REBUILD_POLICY.json"),
    {
      wave: "S_AI_QA_01_MANDATORY_EMULATOR_RUNTIME_GATE",
      ...result,
      secrets_printed: false,
    },
  );
  console.info(JSON.stringify(result, null, 2));
  if (result.final_status === "BLOCKED_ANDROID_REBUILD_REQUIRED_FOR_AI_RUNTIME_PROOF") {
    process.exitCode = 1;
  }
}
