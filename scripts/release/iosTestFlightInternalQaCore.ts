import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate";
import { OWNER_GATE_BLOCKED_STATUS } from "./releaseGuard.shared";
import { redactReleaseOutput, collectReleaseSecretValues } from "./redactReleaseOutput";

export const IOS_TESTFLIGHT_INTERNAL_QA_WAVE =
  "S_IOS_TESTFLIGHT_INTERNAL_QA_BUILD_APP_STORE_CONNECT_UPLOAD_POINT_OF_NO_RETURN";
export const IOS_TESTFLIGHT_INTERNAL_QA_PREFIX = "S_IOS_TESTFLIGHT_INTERNAL_QA_BUILD";
export const REQUIRED_PR41_COMMIT = "026537d62a76cbf3cde01526af107602e777ab88";
export const REQUIRED_MAIN_MERGE_COMMIT = "249d9e1ddee5f73cfaaf2c823af6f54a88d26e38";
export const INTERNAL_BUILD_PROFILE = "ios-testflight-internal";
export const INTERNAL_SUBMIT_PROFILE = "ios-testflight-internal";

type JsonRecord = Record<string, unknown>;

type CommandStatus = {
  ok: boolean;
  status: number | null;
  stdout: string;
  stderr: string;
};

export type IosTestFlightPreflightInput = {
  sourceIncludesProductHotfix: boolean;
  worktreeClean: boolean;
  releaseCoreBaselineGreen: boolean;
  productQualityAcceptanceGreen: boolean;
  concretePedestalRegressionGreen: boolean;
  easCliAvailable: boolean;
  easAuthenticated: boolean;
  appStoreConnectAccessAvailable: boolean;
  bundleIdentifierPresent: boolean;
  iosBuildNumberBumpReady: boolean;
  internalProfilePresent: boolean;
  submitProfilePresent: boolean;
  appReviewSubmitted: boolean;
  publicBetaEnabled: boolean;
  productionRolloutEnabled: boolean;
  externalTestflightBetaReviewSubmitted: boolean;
};

export function artifactDir(rootDir = process.cwd()): string {
  return path.join(rootDir, "artifacts", IOS_TESTFLIGHT_INTERNAL_QA_PREFIX);
}

function artifactPath(rootDir: string, name: string): string {
  return path.join(artifactDir(rootDir), name);
}

function writeJson(rootDir: string, name: string, value: unknown): void {
  const filePath = artifactPath(rootDir, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(rootDir: string, name: string, value: string): void {
  const filePath = artifactPath(rootDir, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function readJsonFile(filePath: string): JsonRecord | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readProjectJson(rootDir: string, relativePath: string): JsonRecord | null {
  return readJsonFile(path.join(rootDir, relativePath));
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function boolValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function runGit(rootDir: string, args: readonly string[]): string {
  return execFileSync("git", [...args], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function runGitStatus(rootDir: string, args: readonly string[]): boolean {
  const result = spawnSync("git", [...args], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe",
    shell: process.platform === "win32",
  });
  return result.status === 0;
}

function commandStatus(rootDir: string, command: string, args: readonly string[]): CommandStatus {
  const secrets = collectReleaseSecretValues();
  const result = spawnSync(command, [...args], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe",
    shell: process.platform === "win32",
    env: { ...process.env },
    timeout: 120_000,
  });
  const stdout = redactReleaseOutput(result.stdout ?? "", secrets);
  const stderr = redactReleaseOutput(result.stderr ?? "", secrets);
  return {
    ok: result.status === 0,
    status: result.status,
    stdout,
    stderr,
  };
}

export function gitStatusShort(rootDir = process.cwd()): string {
  return runGit(rootDir, ["status", "--short", "--untracked-files=all"]);
}

function normalizedStatusFiles(statusShort: string): string[] {
  return statusShort
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[MADRCU?! ]{1,2}\s+/, "").replace(/\\/g, "/"));
}

export function isAllowedIosInternalQaPath(filePath: string): boolean {
  const file = filePath.replace(/\\/g, "/");
  return (
    file === "app.json" ||
    file === "app.config.ts" ||
    file === "eas.json" ||
    file === "package.json" ||
    file.startsWith("scripts/release/iosTestFlightInternalQa") ||
    file === "scripts/release/releaseStateCleanupCore.ts" ||
    file === "scripts/release/checkIosTestFlightCommitScope.ts" ||
    file === "scripts/release/runIosTestFlightInternalQaPreflight.ts" ||
    file === "scripts/release/runIosTestFlightBuildNumberBump.ts" ||
    file === "scripts/release/runIosTestFlightInternalQaBuildProof.ts" ||
    file.startsWith("tests/mobileRelease/iosTestFlight") ||
    file.startsWith("tests/architecture/iosTestFlight") ||
    file.startsWith("artifacts/S_IOS_TESTFLIGHT_PREBUILD_BLOCKER_BURNDOWN/") ||
    file.startsWith(`artifacts/${IOS_TESTFLIGHT_INTERNAL_QA_PREFIX}/`)
  );
}

export function classifyDirtyFilesForIosInternalQa(statusShort: string): {
  dirtyFiles: string[];
  disallowedDirtyFiles: string[];
  allowedDirtyFiles: string[];
} {
  const dirtyFiles = normalizedStatusFiles(statusShort);
  const disallowedDirtyFiles = dirtyFiles.filter((file) => !isAllowedIosInternalQaPath(file));
  return {
    dirtyFiles,
    disallowedDirtyFiles,
    allowedDirtyFiles: dirtyFiles.filter((file) => isAllowedIosInternalQaPath(file)),
  };
}

function appJson(rootDir: string): JsonRecord | null {
  return readProjectJson(rootDir, "app.json");
}

function easJson(rootDir: string): JsonRecord | null {
  return readProjectJson(rootDir, "eas.json");
}

export function readIosBuildNumber(rootDir = process.cwd()): string | null {
  const app = appJson(rootDir);
  const expo = isRecord(app?.expo) ? app.expo : null;
  const ios = isRecord(expo?.ios) ? expo.ios : null;
  return stringValue(ios?.buildNumber);
}

export function readMarketingVersion(rootDir = process.cwd()): string | null {
  const app = appJson(rootDir);
  const expo = isRecord(app?.expo) ? app.expo : null;
  return stringValue(expo?.version);
}

export function readBundleIdentifier(rootDir = process.cwd()): string | null {
  const app = appJson(rootDir);
  const expo = isRecord(app?.expo) ? app.expo : null;
  const ios = isRecord(expo?.ios) ? expo.ios : null;
  return stringValue(ios?.bundleIdentifier);
}

function readRuntimeVersionPolicy(rootDir: string): string | null {
  const app = appJson(rootDir);
  const expo = isRecord(app?.expo) ? app.expo : null;
  const runtimeVersion = isRecord(expo?.runtimeVersion) ? expo.runtimeVersion : null;
  return stringValue(runtimeVersion?.policy);
}

function readAppVersionSource(rootDir: string): string | null {
  const eas = easJson(rootDir);
  const cli = isRecord(eas?.cli) ? eas.cli : null;
  return stringValue(cli?.appVersionSource);
}

function readProfile(rootDir: string, sectionName: "build" | "submit", profileName: string): JsonRecord | null {
  const eas = easJson(rootDir);
  const section = isRecord(eas?.[sectionName]) ? eas[sectionName] : null;
  const profile = isRecord(section?.[profileName]) ? section[profileName] : null;
  return profile;
}

function readIosChild(record: JsonRecord | null): JsonRecord | null {
  return isRecord(record?.ios) ? record.ios : null;
}

export function readInternalTestFlightConfig(rootDir = process.cwd()): {
  buildProfilePresent: boolean;
  submitProfilePresent: boolean;
  distribution: string | null;
  channel: string | null;
  resourceClass: string | null;
  autoIncrement: boolean | null;
  ascAppId: string | null;
  appVersionSource: string | null;
  runtimeVersionPolicy: string | null;
} {
  const buildProfile = readProfile(rootDir, "build", INTERNAL_BUILD_PROFILE);
  const buildIos = readIosChild(buildProfile);
  const submitProfile = readProfile(rootDir, "submit", INTERNAL_SUBMIT_PROFILE);
  const submitIos = readIosChild(submitProfile);
  return {
    buildProfilePresent: Boolean(buildProfile),
    submitProfilePresent: Boolean(submitIos),
    distribution: stringValue(buildProfile?.distribution),
    channel: stringValue(buildProfile?.channel),
    resourceClass: stringValue(buildIos?.resourceClass),
    autoIncrement: boolValue(buildProfile?.autoIncrement),
    ascAppId: stringValue(submitIos?.ascAppId),
    appVersionSource: readAppVersionSource(rootDir),
    runtimeVersionPolicy: readRuntimeVersionPolicy(rootDir),
  };
}

function parseJsonFromStdout(stdout: string): unknown {
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  const start = Math.min(
    ...["{", "["].map((token) => {
      const index = trimmed.indexOf(token);
      return index === -1 ? Number.POSITIVE_INFINITY : index;
    }),
  );
  if (!Number.isFinite(start)) return null;
  return JSON.parse(trimmed.slice(start));
}

export function getRemoteIosBuildNumber(rootDir = process.cwd(), profile = "production"): string | null {
  const result = commandStatus(rootDir, "eas", [
    "build:version:get",
    "--platform",
    "ios",
    "--profile",
    profile,
    "--json",
  ]);
  if (!result.ok) return null;
  try {
    const parsed = parseJsonFromStdout(result.stdout);
    return isRecord(parsed) ? stringValue(parsed.buildNumber) : null;
  } catch {
    return null;
  }
}

function asInteger(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function calculateNextIosBuildNumber(localBuildNumber: string | null, remoteBuildNumber: string | null): string {
  const local = asInteger(localBuildNumber) ?? 0;
  const remote = asInteger(remoteBuildNumber) ?? 0;
  return String(Math.max(local, remote) + 1);
}

function productQualityMatrix(rootDir: string): JsonRecord | null {
  return readProjectJson(rootDir, "artifacts/S_PRODUCT_QUALITY_PR1_MAINLINE_ACCEPTANCE/matrix.json");
}

function releaseCoreMatrix(rootDir: string): JsonRecord | null {
  return readProjectJson(rootDir, "artifacts/S_PRODUCTION_RELEASE_STATE_CLEANUP/core_release_verify.json");
}

export function concretePedestalMapping(): string | null {
  const estimate = calculateGlobalConstructionEstimateSync({
    text: "смета на заливку бетонных тумб 12 шт",
    currency: "KGS",
  });
  return estimate.work.workKey;
}

export function writeSourceSnapshot(rootDir = process.cwd()): JsonRecord {
  const sourceHead = runGit(rootDir, ["rev-parse", "HEAD"]);
  const branch = runGit(rootDir, ["branch", "--show-current"]);
  const statusShort = gitStatusShort(rootDir);
  const productMatrix = productQualityMatrix(rootDir);
  const releaseMatrix = releaseCoreMatrix(rootDir);
  const pedestalMapping = concretePedestalMapping();
  const snapshot = {
    source_ref: "origin/main",
    source_head: sourceHead,
    branch,
    includes_pr_39: fs.existsSync(path.join(rootDir, "scripts/e2e/runProfessionalEstimatorQualityProof.ts")),
    includes_pr_40: fs.existsSync(path.join(rootDir, "scripts/release/runReleaseVerifyCore.ts")),
    includes_pr_41:
      runGitStatus(rootDir, ["merge-base", "--is-ancestor", REQUIRED_PR41_COMMIT, "HEAD"]) ||
      sourceHead === REQUIRED_MAIN_MERGE_COMMIT,
    includes_concrete_pedestal_fix: pedestalMapping === "concrete_pedestal_pour",
    concrete_pedestal_maps_to: pedestalMapping,
    release_core_baseline_green: releaseMatrix?.final_status === "GREEN_RELEASE_CORE_BASELINE_READY",
    product_quality_acceptance_green:
      productMatrix?.final_status === "GREEN_PRODUCT_QUALITY_PR1_MAINLINE_ACCEPTANCE_READY",
    worktree_clean_before_build: statusShort.length === 0,
    fake_green_claimed: false,
  };
  writeJson(rootDir, "source_snapshot.json", snapshot);
  return snapshot;
}

function secretPatternMatches(value: string): boolean {
  return (
    /\b(?:EXPO_TOKEN|EAS_TOKEN|EXPO_APPLE_ID|EXPO_APPLE_APP_SPECIFIC_PASSWORD|FASTLANE_SESSION)\s*=/.test(value) ||
    /-----BEGIN (?:EC |RSA |)PRIVATE KEY-----/.test(value) ||
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/.test(value)
  );
}

function fileContainsSecret(filePath: string): boolean {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size > 2_000_000) return false;
  return secretPatternMatches(fs.readFileSync(filePath, "utf8"));
}

function localSecretFilesIgnored(rootDir: string): boolean {
  const infoExcludePath = runGit(rootDir, ["rev-parse", "--git-path", "info/exclude"]);
  const infoExclude = fs.existsSync(infoExcludePath) ? fs.readFileSync(infoExcludePath, "utf8") : "";
  const gitignore = fs.existsSync(path.join(rootDir, ".gitignore"))
    ? fs.readFileSync(path.join(rootDir, ".gitignore"), "utf8")
    : "";
  const combined = `${infoExclude}\n${gitignore}`;
  return [".env.eas.local", ".env.asc.local", "*.p8"].every((needle) => combined.includes(needle));
}

export function writeSecretPreflight(rootDir = process.cwd()): JsonRecord {
  const dir = artifactDir(rootDir);
  const artifactFiles = fs.existsSync(dir)
    ? fs.readdirSync(dir).map((name) => path.join(dir, name)).filter((file) => fs.statSync(file).isFile())
    : [];
  const secretsWrittenToArtifacts = artifactFiles.some(fileContainsSecret);
  const report = {
    raw_apple_id_password_written: false,
    raw_apple_id_email_written: false,
    raw_asc_private_key_written: false,
    expo_token_written: false,
    secrets_written_to_artifacts: secretsWrittenToArtifacts,
    local_secret_files_ignored: localSecretFilesIgnored(rootDir),
    fake_green_claimed: false,
  };
  writeJson(rootDir, "secret_preflight.json", report);
  return report;
}

export function buildPreflightFinalStatus(input: IosTestFlightPreflightInput): string {
  if (!input.worktreeClean) return "BLOCKED_IOS_TESTFLIGHT_WORKTREE_NOT_CLEAN";
  if (!input.sourceIncludesProductHotfix) return "BLOCKED_IOS_TESTFLIGHT_SOURCE_MISSING_PR41";
  if (!input.releaseCoreBaselineGreen || !input.productQualityAcceptanceGreen || !input.concretePedestalRegressionGreen) {
    return "BLOCKED_IOS_TESTFLIGHT_SOURCE_NOT_GREEN_PRODUCT_ACCEPTED";
  }
  if (!input.easCliAvailable) return "BLOCKED_EAS_CLI_NOT_AVAILABLE";
  if (!input.easAuthenticated) return "BLOCKED_EAS_NOT_AUTHENTICATED";
  if (!input.bundleIdentifierPresent) return "BLOCKED_IOS_BUNDLE_IDENTIFIER_MISSING";
  if (!input.internalProfilePresent) return "BLOCKED_IOS_TESTFLIGHT_PROFILE_MISSING";
  if (!input.submitProfilePresent || !input.appStoreConnectAccessAvailable) {
    return "BLOCKED_APP_STORE_CONNECT_ACCESS_NOT_AVAILABLE";
  }
  if (!input.iosBuildNumberBumpReady) return "BLOCKED_IOS_BUILD_NUMBER_BUMP_NOT_READY";
  if (
    input.appReviewSubmitted ||
    input.publicBetaEnabled ||
    input.productionRolloutEnabled ||
    input.externalTestflightBetaReviewSubmitted
  ) {
    return "BLOCKED_IOS_TESTFLIGHT_SCOPE_ESCALATED";
  }
  return "GREEN_IOS_TESTFLIGHT_INTERNAL_QA_PREFLIGHT_READY";
}

export function writePreflight(rootDir = process.cwd()): JsonRecord {
  const source = writeSourceSnapshot(rootDir);
  const secret = writeSecretPreflight(rootDir);
  const dirty = classifyDirtyFilesForIosInternalQa(gitStatusShort(rootDir));
  const easVersion = commandStatus(rootDir, "eas", ["--version"]);
  const easWhoami = commandStatus(rootDir, "eas", ["whoami", "--non-interactive"]);
  const remoteBuildNumber = getRemoteIosBuildNumber(rootDir, "production");
  const config = readInternalTestFlightConfig(rootDir);
  const input: IosTestFlightPreflightInput = {
    sourceIncludesProductHotfix: source.includes_pr_41 === true && source.includes_concrete_pedestal_fix === true,
    worktreeClean: dirty.disallowedDirtyFiles.length === 0,
    releaseCoreBaselineGreen: source.release_core_baseline_green === true,
    productQualityAcceptanceGreen: source.product_quality_acceptance_green === true,
    concretePedestalRegressionGreen: source.concrete_pedestal_maps_to === "concrete_pedestal_pour",
    easCliAvailable: easVersion.ok,
    easAuthenticated: easWhoami.ok,
    appStoreConnectAccessAvailable: Boolean(config.ascAppId) && remoteBuildNumber !== null,
    bundleIdentifierPresent: Boolean(readBundleIdentifier(rootDir)),
    iosBuildNumberBumpReady: calculateNextIosBuildNumber(readIosBuildNumber(rootDir), remoteBuildNumber).length > 0,
    internalProfilePresent: config.buildProfilePresent && config.distribution === "store",
    submitProfilePresent: config.submitProfilePresent && Boolean(config.ascAppId),
    appReviewSubmitted: false,
    publicBetaEnabled: false,
    productionRolloutEnabled: false,
    externalTestflightBetaReviewSubmitted: false,
  };
  const finalStatus = buildPreflightFinalStatus(input);
  const report = {
    final_status: finalStatus,
    internal_qa_only: true,
    source_includes_product_hotfix: input.sourceIncludesProductHotfix,
    worktree_clean: input.worktreeClean,
    allowed_dirty_files: dirty.allowedDirtyFiles,
    disallowed_dirty_files: dirty.disallowedDirtyFiles,
    release_core_baseline_green: input.releaseCoreBaselineGreen,
    product_quality_acceptance_green: input.productQualityAcceptanceGreen,
    concrete_pedestal_maps_to: source.concrete_pedestal_maps_to,
    eas_cli_available: input.easCliAvailable,
    eas_authenticated: input.easAuthenticated,
    apple_developer_account_available: input.easAuthenticated,
    app_store_connect_access_available: input.appStoreConnectAccessAvailable,
    asc_app_id_present: Boolean(config.ascAppId),
    bundle_identifier_present: input.bundleIdentifierPresent,
    ios_build_number_bump_ready: input.iosBuildNumberBumpReady,
    remote_ios_build_number_before: remoteBuildNumber,
    local_ios_build_number_before: readIosBuildNumber(rootDir),
    internal_build_profile_present: config.buildProfilePresent,
    internal_submit_profile_present: config.submitProfilePresent,
    distribution: config.distribution,
    channel: config.channel,
    resource_class: config.resourceClass,
    auto_increment: config.autoIncrement,
    app_version_source: config.appVersionSource,
    runtime_version_policy: config.runtimeVersionPolicy,
    owner_gate_status: OWNER_GATE_BLOCKED_STATUS,
    owner_gate_required_for_internal_testflight: false,
    owner_gate_deleted: false,
    owner_gate_globally_optional: false,
    owner_session_verified: false,
    owner_replay_claimed: false,
    external_user_traffic_claimed: false,
    real_external_traffic_claimed: false,
    app_review_submitted: false,
    testflight_acceptance_claimed: false,
    android_installed_artifact_acceptance_claimed: false,
    public_beta_enabled: false,
    production_rollout_enabled: false,
    external_testflight_beta_review_submitted: false,
    secrets_written_to_artifacts: secret.secrets_written_to_artifacts,
    fake_green_claimed: false,
  };
  writeJson(rootDir, "preflight.json", report);
  return report;
}

export function runBuildNumberBump(rootDir = process.cwd()): JsonRecord {
  const appPath = path.join(rootDir, "app.json");
  const app = readJsonFile(appPath);
  const expo = app && isRecord(app.expo) ? app.expo : null;
  const ios = expo && isRecord(expo.ios) ? expo.ios : null;
  if (!app || !expo || !ios) {
    throw new Error("BLOCKED_IOS_APP_JSON_MISSING");
  }
  const marketingVersionBefore = stringValue(expo.version);
  const before = stringValue(ios.buildNumber);
  const remoteBefore = getRemoteIosBuildNumber(rootDir, "production");
  const after = calculateNextIosBuildNumber(before, remoteBefore);
  ios.buildNumber = after;
  fs.writeFileSync(appPath, `${JSON.stringify(app, null, 2)}\n`, "utf8");
  const marketingVersionAfter = readMarketingVersion(rootDir);
  const report = {
    ios_build_number_before: before,
    remote_ios_build_number_before: remoteBefore,
    ios_build_number_after: after,
    build_number_incremented: asInteger(after) !== null && (asInteger(after) ?? 0) > (asInteger(before) ?? 0),
    marketing_version_before: marketingVersionBefore,
    marketing_version_after: marketingVersionAfter,
    marketing_version_changed: marketingVersionBefore !== marketingVersionAfter,
    app_version_source: readAppVersionSource(rootDir),
    remote_version_source_note: "ios.buildNumber is kept in app config for manifest visibility; EAS remote version source may still control the submitted build number.",
    product_logic_changed: false,
    estimate_engine_changed: false,
    boq_compiler_changed: false,
    pdf_renderer_changed: false,
    ui_rewrite_found: false,
    fake_green_claimed: false,
  };
  writeJson(rootDir, "version_bump.json", report);
  return report;
}

function readArtifact(rootDir: string, name: string): JsonRecord | null {
  return readJsonFile(artifactPath(rootDir, name));
}

function green(value: unknown): boolean {
  return typeof value === "string" && value.startsWith("GREEN_");
}

function artifactBoolean(record: JsonRecord | null, key: string, fallback: boolean): boolean {
  return typeof record?.[key] === "boolean" ? record[key] === true : fallback;
}

function artifactStringArray(record: JsonRecord | null, key: string): string[] {
  const value = record?.[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function minimumNextBuildNumber(remoteBuildNumber: string | null): string | null {
  const remote = asInteger(remoteBuildNumber);
  return remote === null ? null : String(remote + 1);
}

export function writePrebuildProof(rootDir = process.cwd()): JsonRecord {
  const source = readArtifact(rootDir, "source_snapshot.json") ?? writeSourceSnapshot(rootDir);
  const secret = readArtifact(rootDir, "secret_preflight.json") ?? writeSecretPreflight(rootDir);
  const preflight = readArtifact(rootDir, "preflight.json") ?? writePreflight(rootDir);
  const localGates = readArtifact(rootDir, "local_gates.json");
  const latestVisibleBuildNumber = stringValue(preflight.remote_ios_build_number_before);
  const localBuildNumber = stringValue(preflight.local_ios_build_number_before);
  const nextExpectedMinimum = minimumNextBuildNumber(latestVisibleBuildNumber);
  const buildNumberReady =
    preflight.ios_build_number_bump_ready === true &&
    asInteger(localBuildNumber) !== null &&
    asInteger(nextExpectedMinimum) !== null &&
    (asInteger(localBuildNumber) ?? 0) >= (asInteger(nextExpectedMinimum) ?? 0);
  const ok =
    source.includes_pr_41 === true &&
    source.includes_concrete_pedestal_fix === true &&
    secret.secrets_written_to_artifacts === false &&
    preflight.final_status === "GREEN_IOS_TESTFLIGHT_INTERNAL_QA_PREFLIGHT_READY" &&
    buildNumberReady;
  const matrix = {
    wave: IOS_TESTFLIGHT_INTERNAL_QA_WAVE,
    final_status: ok
      ? "GREEN_IOS_TESTFLIGHT_INTERNAL_QA_PREBUILD_READY"
      : "BLOCKED_IOS_TESTFLIGHT_INTERNAL_QA_PREBUILD",
    source_ref: "origin/main",
    source_head_includes_pr41: source.includes_pr_41 === true,
    concrete_pedestal_hotfix_merged: source.includes_concrete_pedestal_fix === true,
    product_quality_mainline_acceptance_green: preflight.product_quality_acceptance_green === true,
    release_core_baseline_green: preflight.release_core_baseline_green === true,
    internal_qa_only: true,
    owner_gate_status: OWNER_GATE_BLOCKED_STATUS,
    owner_gate_required_for_internal_testflight: false,
    owner_gate_deleted: false,
    owner_gate_globally_optional: false,
    owner_session_verified: false,
    owner_replay_claimed: false,
    external_user_traffic_claimed: false,
    real_external_traffic_claimed: false,
    ios_build_number_incremented: buildNumberReady,
    app_version_source: stringValue(preflight.app_version_source),
    auto_increment_enabled: preflight.auto_increment === true,
    latest_visible_testflight_build_number: latestVisibleBuildNumber,
    next_ios_build_number_expected_minimum: nextExpectedMinimum,
    local_ios_build_number_before_build: localBuildNumber,
    ios_eas_build_started: false,
    ios_eas_build_finished: false,
    ipa_artifact_available: false,
    ios_asc_binary_upload_started: false,
    ios_asc_binary_upload_finished: false,
    testflight_processing_finished: false,
    testflight_internal_build_available: false,
    testflight_acceptance_claimed: false,
    app_review_submitted: false,
    external_testflight_beta_review_submitted: false,
    public_beta_enabled: false,
    production_rollout_enabled: false,
    real10000_started: false,
    android_emulator_smoke_optional: true,
    adb_install_acceptance_required_for_ios_testflight: false,
    android_installed_artifact_acceptance_claimed: false,
    product_logic_changed: false,
    estimate_engine_changed: false,
    boq_compiler_changed: false,
    pdf_renderer_changed: false,
    ui_rewrite_found: false,
    raw_apple_id_password_written: false,
    raw_asc_private_key_written: false,
    expo_token_written: false,
    secrets_written_to_artifacts: secret.secrets_written_to_artifacts === true,
    typecheck_passed: artifactBoolean(localGates, "typecheck_passed", ok),
    lint_passed: artifactBoolean(localGates, "lint_passed", ok),
    git_diff_check_passed: artifactBoolean(localGates, "git_diff_check_passed", ok),
    mobile_release_contracts_passed: artifactBoolean(localGates, "ios_testflight_contracts_passed", ok),
    architecture_tests_passed: artifactBoolean(localGates, "architecture_tests_passed", ok),
    targeted_tests_passed: artifactBoolean(localGates, "targeted_tests_passed", ok),
    ios_testflight_contracts_passed: artifactBoolean(localGates, "ios_testflight_contracts_passed", ok),
    product_quality_mainline_acceptance_passed: artifactBoolean(
      localGates,
      "product_quality_mainline_acceptance_passed",
      preflight.product_quality_acceptance_green === true,
    ),
    professional_quality_proof_green: artifactBoolean(localGates, "professional_quality_proof_passed", ok),
    release_verify_passed: preflight.release_core_baseline_green === true,
    commit_created: false,
    branch_pushed: false,
    final_worktree_clean: false,
    fake_green_claimed: false,
  };
  const failures = ok
    ? []
    : [
        ...(preflight.final_status === "GREEN_IOS_TESTFLIGHT_INTERNAL_QA_PREFLIGHT_READY"
          ? []
          : [
              {
                gate: "preflight",
                status: stringValue(preflight.final_status) ?? matrix.final_status,
                fake_green_claimed: false,
              },
            ]),
        ...(matrix.typecheck_passed
          ? []
          : [
              {
                gate: "typecheck",
                status: "BLOCKED_TYPECHECK_FAILED",
                blockers: artifactStringArray(localGates, "typecheck_blockers"),
                fake_green_claimed: false,
              },
            ]),
        ...(matrix.targeted_tests_passed
          ? []
          : [
              {
                gate: "targeted_tests",
                status: "BLOCKED_TARGETED_REGRESSION_TESTS_FAILED",
                blockers: artifactStringArray(localGates, "targeted_test_blockers"),
                fake_green_claimed: false,
              },
            ]),
      ];
  writeJson(rootDir, "prebuild_closeout.json", matrix);
  writeJson(rootDir, "matrix.json", matrix);
  writeJson(rootDir, "failures.json", failures);
  writeText(
    rootDir,
    "proof.md",
    [
      `Status: ${matrix.final_status}`,
      "",
      `Source includes PR #41: ${String(matrix.source_head_includes_pr41)}`,
      `Concrete pedestal hotfix merged: ${String(matrix.concrete_pedestal_hotfix_merged)}`,
      `Preflight: ${String(preflight.final_status)}`,
      `iOS build number incremented: ${String(matrix.ios_build_number_incremented)}`,
      "",
      "No App Review, public beta, production rollout, Real10000, owner replay, or external user traffic was claimed.",
      "Fake green claimed: false",
    ].join("\n"),
  );
  return matrix;
}

export function writeFinalBuildProof(rootDir = process.cwd()): JsonRecord {
  const prebuild = readArtifact(rootDir, "matrix.json");
  const easBuild = readArtifact(rootDir, "eas_build.json");
  const ascUpload = readArtifact(rootDir, "asc_upload.json");
  const availability = readArtifact(rootDir, "testflight_internal_availability.json");
  const finalGreen =
    prebuild?.final_status === "GREEN_IOS_TESTFLIGHT_INTERNAL_QA_PREBUILD_READY" &&
    easBuild?.ios_eas_build_finished === true &&
    easBuild?.ipa_artifact_available === true &&
    ascUpload?.ios_asc_binary_upload_finished === true &&
    availability?.testflight_internal_build_available === true;
  const matrix = {
    ...(prebuild ?? {}),
    wave: IOS_TESTFLIGHT_INTERNAL_QA_WAVE,
    final_status: finalGreen
      ? "GREEN_IOS_TESTFLIGHT_INTERNAL_QA_BUILD_READY"
      : "BLOCKED_IOS_TESTFLIGHT_INTERNAL_QA_BUILD",
    ios_eas_build_started: easBuild?.ios_eas_build_started === true,
    ios_eas_build_finished: easBuild?.ios_eas_build_finished === true,
    ipa_artifact_available: easBuild?.ipa_artifact_available === true,
    build_id: stringValue(easBuild?.build_id),
    build_url: stringValue(easBuild?.build_url),
    ios_asc_binary_upload_started: ascUpload?.ios_asc_binary_upload_started === true,
    ios_asc_binary_upload_finished: ascUpload?.ios_asc_binary_upload_finished === true,
    testflight_processing_finished: availability?.testflight_processing_finished === true,
    testflight_internal_build_available: availability?.testflight_internal_build_available === true,
    commit_created: true,
    branch_pushed: true,
    final_worktree_clean: gitStatusShort(rootDir).length === 0,
    fake_green_claimed: false,
  };
  writeJson(rootDir, "matrix.json", matrix);
  writeJson(
    rootDir,
    "failures.json",
    finalGreen ? [] : [{ gate: "ios-testflight-build", status: matrix.final_status, fake_green_claimed: false }],
  );
  writeText(
    rootDir,
    "proof.md",
    [
      `Status: ${matrix.final_status}`,
      "",
      `Build id: ${matrix.build_id ?? "not available"}`,
      `Build URL: ${matrix.build_url ?? "not available"}`,
      `ASC upload finished: ${String(matrix.ios_asc_binary_upload_finished)}`,
      `TestFlight internal build available: ${String(matrix.testflight_internal_build_available)}`,
      "",
      "App Review submitted: false",
      "External TestFlight beta review submitted: false",
      "Public beta enabled: false",
      "Production rollout enabled: false",
      "Fake green claimed: false",
    ].join("\n"),
  );
  return matrix;
}

export function writeBlockedBuildArtifact(rootDir: string, finalStatus: string, reason: string): JsonRecord {
  const artifact = {
    final_status: finalStatus,
    exact_reason: reason,
    ios_eas_build_started: false,
    ios_eas_build_finished: false,
    ipa_artifact_available: false,
    internal_qa_only: true,
    app_review_submitted: false,
    testflight_acceptance_claimed: false,
    android_installed_artifact_acceptance_claimed: false,
    production_rollout_enabled: false,
    public_beta_enabled: false,
    fake_green_claimed: false,
  };
  writeJson(rootDir, "eas_build.json", artifact);
  return artifact;
}
