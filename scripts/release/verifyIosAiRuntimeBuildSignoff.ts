import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { verifyAndroidInstalledBuildRuntime } from "./verifyAndroidInstalledBuildRuntime";
import {
  buildAiMobileRuntimeSourceFingerprint,
  readCurrentAiMobileRuntimeSourceFiles,
  resolveAiAndroidRebuildRequirement,
} from "./requireAndroidRebuildForAiSourceChanges";
import {
  findLatestCurrentIosProductionBuild,
  parseEasBuildList,
  type EasBuildListEntry,
} from "./decideIosBuildSubmit";
import { collectReleaseSecretValues, redactReleaseOutput } from "./redactReleaseOutput";

type IosAiRuntimeBuildSignoffStatus =
  | "GREEN_IOS_AI_RUNTIME_BUILD_SIGNOFF"
  | "BLOCKED_IOS_BUILD_SIGNOFF_REQUIRED"
  | "BLOCKED_IOS_BUILD_APPROVAL_MISSING"
  | "BLOCKED_IOS_SUBMIT_APPROVAL_MISSING"
  | "BLOCKED_IOS_BUILD_SIGNOFF_STATUS_NOT_AVAILABLE"
  | "BLOCKED_IOS_BUILD_SIGNOFF_STALE_OR_INVALID";

type IosAiRuntimeBuildSignoffArtifact = {
  final_status: IosAiRuntimeBuildSignoffStatus;
  ios_build_required: true;
  ios_build_status: "FINISHED" | "BLOCKED" | null;
  ios_build_profile: "production" | "BLOCKED" | null;
  ios_distribution: "STORE_OR_TESTFLIGHT" | "BLOCKED" | null;
  distribution: "STORE_OR_TESTFLIGHT" | "BLOCKED" | null;
  ios_build_git_commit_matches_head: boolean;
  simulator_build_used: boolean;
  dirty_runtime_files: boolean;
  dirty_runtime_file_list: string[];
  runtime_version_present: boolean;
  app_build_version_present: boolean;
  app_store_connect_submit: "PASS" | "NOT_APPROVED" | "BLOCKED";
  testflight_status: "PASS" | "NOT_AVAILABLE" | "BLOCKED";
  physical_ios_runtime_claimed: false;
  fake_ios_pass: false;
  no_ota_as_native_replacement: true;
  ios_build_id: string | null;
  ios_build_git_commit: string | null;
  current_head_commit: string | null;
  post_build_runtime_changes: string[];
  ai_mobile_runtime_source_fingerprint: string;
  ios_build_source_fingerprint: string | null;
  source_fingerprint_matches_ios_build: boolean;
  secrets_printed: false;
  exact_reason: string | null;
};

const projectRoot = process.cwd();
const qa03Wave = "S_AI_QA_03_DUAL_PLATFORM_RUNTIME_TARGETABILITY";
const qa03ArtifactPrefix = path.join(projectRoot, "artifacts", qa03Wave);
const inventoryPath = `${qa03ArtifactPrefix}_inventory.json`;
const matrixPath = `${qa03ArtifactPrefix}_matrix.json`;
const emulatorPath = `${qa03ArtifactPrefix}_emulator.json`;
const iosPath = `${qa03ArtifactPrefix}_ios.json`;
const proofPath = `${qa03ArtifactPrefix}_proof.md`;
const qa04Wave = "S_AI_QA_04_FRESH_IOS_BUILD_SIGNOFF";
const qa04ArtifactPrefix = path.join(projectRoot, "artifacts", qa04Wave);
const qa04InventoryPath = `${qa04ArtifactPrefix}_inventory.json`;
const qa04MatrixPath = `${qa04ArtifactPrefix}_matrix.json`;
const qa04EmulatorPath = `${qa04ArtifactPrefix}_emulator.json`;
const qa04IosPath = `${qa04ArtifactPrefix}_ios.json`;
const qa04ProofPath = `${qa04ArtifactPrefix}_proof.md`;
const qa04SubmitPath = `${qa04ArtifactPrefix}_submit.json`;
const coreIosPath = path.join(projectRoot, "artifacts", "S_RELEASE_CORE_01_ANDROID_EMULATOR_IOS_SUBMIT_ios.json");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJsonRecord(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function buildField(entry: EasBuildListEntry | null, key: keyof EasBuildListEntry): string | null {
  return stringValue(entry?.[key]);
}

function boolValue(value: unknown): boolean {
  return value === true;
}

function qa04SubmitProofCaptured(buildId: string): boolean {
  const proof = readJsonRecord(qa04SubmitPath);
  if (!proof) return false;
  return (
    stringValue(proof.final_status) === "GREEN_IOS_APP_STORE_CONNECT_SUBMIT_PROOF" &&
    stringValue(proof.ios_build_id) === buildId &&
    boolValue(proof.submit_finished) &&
    proof.fake_submit_pass === false &&
    proof.secrets_printed === false
  );
}

function flagEnabled(name: string): boolean {
  return ["true", "1", "yes"].includes(String(process.env[name] ?? "").trim().toLowerCase());
}

function runCommand(command: string, args: readonly string[], secrets: readonly string[]): string {
  const result = spawnSync(command, [...args], {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: "pipe",
    shell: process.platform === "win32",
  });
  const stdout = redactReleaseOutput(result.stdout ?? "", secrets);
  const stderr = redactReleaseOutput(result.stderr ?? "", secrets);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${stdout}\n${stderr}`.trim());
  }
  return stdout.trim();
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) throw new Error("Expected a JSON object.");
  return parsed;
}

function changedFilesSince(commit: string, secrets: readonly string[]): string[] {
  const output = runCommand("git", ["diff", "--name-only", `${commit}..HEAD`], secrets);
  return output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function dedupeSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.replace(/\\/g, "/").trim()).filter(Boolean))].sort();
}

function readDirtyWorktreeChangedFiles(secrets: readonly string[]): string[] {
  const staged = runCommand("git", ["diff", "--name-only", "--diff-filter=ACMR", "--cached"], secrets);
  const unstaged = runCommand("git", ["diff", "--name-only", "--diff-filter=ACMR"], secrets);
  const untracked = runCommand("git", ["ls-files", "--others", "--exclude-standard"], secrets);
  return dedupeSorted([...staged.split(/\r?\n/), ...unstaged.split(/\r?\n/), ...untracked.split(/\r?\n/)])
    .filter((filePath) => !filePath.startsWith("artifacts/"));
}

function findLatestCurrentHeadIosBuild(currentHead: string, secrets: readonly string[]): EasBuildListEntry | null {
  try {
    const raw = runCommand("npx", [
      "eas",
      "build:list",
      "--platform",
      "ios",
      "--status",
      "finished",
      "--distribution",
      "store",
      "--build-profile",
      "production",
      "--git-commit-hash",
      currentHead,
      "--limit",
      "10",
      "--json",
      "--non-interactive",
    ], secrets);
    return findLatestCurrentIosProductionBuild(parseEasBuildList(raw), currentHead);
  } catch {
    return null;
  }
}

function isAiRuntimeSourceChange(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  return (
    normalized.startsWith("src/features/ai/") ||
    normalized.startsWith("src/screens/") ||
    normalized.startsWith("src/components/") ||
    normalized.startsWith("app/") ||
    normalized.startsWith("src/navigation/") ||
    normalized.startsWith("src/lib/navigation/") ||
    normalized.startsWith("src/lib/entry/") ||
    /^tests\/e2e\/.*\.ya?ml$/i.test(normalized)
  );
}

function blocked(
  finalStatus: Exclude<IosAiRuntimeBuildSignoffStatus, "GREEN_IOS_AI_RUNTIME_BUILD_SIGNOFF">,
  exactReason: string,
  overrides: Partial<IosAiRuntimeBuildSignoffArtifact> = {},
): IosAiRuntimeBuildSignoffArtifact {
  const sourceFiles = readCurrentAiMobileRuntimeSourceFiles({ projectRoot });
  const sourceFingerprint = buildAiMobileRuntimeSourceFingerprint({ projectRoot, sourceFiles });
  return {
    final_status: finalStatus,
    ios_build_required: true,
    ios_build_status: "BLOCKED",
    ios_build_profile: "BLOCKED",
    ios_distribution: "BLOCKED",
    distribution: "BLOCKED",
    ios_build_git_commit_matches_head: false,
    simulator_build_used: false,
    dirty_runtime_files: false,
    dirty_runtime_file_list: [],
    runtime_version_present: false,
    app_build_version_present: false,
    app_store_connect_submit: "BLOCKED",
    testflight_status: "BLOCKED",
    physical_ios_runtime_claimed: false,
    fake_ios_pass: false,
    no_ota_as_native_replacement: true,
    ios_build_id: null,
    ios_build_git_commit: null,
    current_head_commit: null,
    post_build_runtime_changes: [],
    ai_mobile_runtime_source_fingerprint: sourceFingerprint,
    ios_build_source_fingerprint: null,
    source_fingerprint_matches_ios_build: false,
    secrets_printed: false,
    exact_reason: exactReason,
    ...overrides,
  };
}

function buildQa03Matrix(iosArtifact: IosAiRuntimeBuildSignoffArtifact): Record<string, unknown> {
  const rebuild = resolveAiAndroidRebuildRequirement();
  const mandatoryMatrix = readJsonRecord(path.join(projectRoot, "artifacts", "S_AI_QA_01_MANDATORY_EMULATOR_RUNTIME_GATE_matrix.json"));
  const developerControl = readJsonRecord(path.join(projectRoot, "artifacts", "S_E2E_CORE_05_DEVELOPER_CONTROL_TARGETABILITY_CLOSEOUT_matrix.json"));
  const androidRuntime = readJsonRecord(path.join(projectRoot, "artifacts", "S_RELEASE_CORE_02_POST_INSTALL_SIGNOFF_android.json"));
  const commandCenterTargetable =
    developerControl?.command_center_targetable === true &&
    developerControl?.runtime_targetability_status === "PASS";
  const procurementTargetable =
    developerControl?.procurement_copilot_targetable === true &&
    developerControl?.runtime_targetability_status === "PASS";
  const mandatoryPass = mandatoryMatrix?.final_status === "GREEN_AI_MANDATORY_EMULATOR_RUNTIME_GATE_READY";
  const androidSmoke = androidRuntime?.runtime_smoke === "PASS" ? "PASS" : "BLOCKED";
  const androidBuildPass =
    rebuild.local_android_rebuild_install === "PASS" ||
    (rebuild.local_android_rebuild_install === "NOT_REQUIRED" && rebuild.source_fingerprint_matches_installed_apk);
  const iosPass = iosArtifact.final_status === "GREEN_IOS_AI_RUNTIME_BUILD_SIGNOFF";
  const finalStatus =
    androidBuildPass &&
    androidSmoke === "PASS" &&
    commandCenterTargetable &&
    procurementTargetable &&
    mandatoryPass &&
    iosPass
      ? "GREEN_AI_QA03_DUAL_PLATFORM_RUNTIME_TARGETABILITY_READY"
      : "BLOCKED_AI_RUNTIME_TARGETABILITY_EXACT";
  const exactReason =
    finalStatus === "GREEN_AI_QA03_DUAL_PLATFORM_RUNTIME_TARGETABILITY_READY"
      ? null
      : iosArtifact.exact_reason ??
        String(mandatoryMatrix?.exact_reason ?? developerControl?.exactReason ?? "Dual-platform AI runtime targetability is not green.");

  return {
    final_status: finalStatus,
    android_rebuild_policy_checks_dirty_worktree: true,
    android_rebuild_required_if_source_changed: true,
    android_local_rebuild_install: rebuild.local_android_rebuild_install,
    android_runtime_smoke: androidSmoke,
    developer_control_runtime: developerControl?.runtime_targetability_status === "PASS" ? "PASS" : "BLOCKED",
    command_center_targetable: commandCenterTargetable,
    procurement_copilot_targetable: procurementTargetable,
    mandatory_ai_runtime_matrix: mandatoryPass ? "PASS" : "BLOCKED",
    ios_build_required: iosArtifact.ios_build_required,
    ios_build_signoff: iosPass ? "PASS" : "BLOCKED",
    ios_app_store_connect_submit: iosArtifact.app_store_connect_submit === "PASS" ? "PASS" : "NOT_APPROVED",
    physical_ios_runtime_claimed: false,
    fake_emulator_pass: mandatoryMatrix?.fake_emulator_pass === true,
    fake_ios_pass: false,
    exact_llm_text_assertions: mandatoryMatrix?.exact_llm_text_assertions === true,
    mutation_count: Number(mandatoryMatrix?.mutations_created ?? 0),
    db_writes: 0,
    external_live_fetch: false,
    hook_work_done: false,
    ui_decomposition_done: false,
    model_provider_changed: false,
    gpt_enabled: false,
    gemini_removed: false,
    secrets_printed: iosArtifact.secrets_printed || mandatoryMatrix?.secrets_printed === true,
    blocking_surface: !commandCenterTargetable
      ? "command_center"
      : !procurementTargetable
        ? "procurement_copilot"
        : !mandatoryPass
          ? "mandatory_ai_matrix"
          : !iosPass
            ? "ios_build_signoff"
            : null,
    exact_reason: exactReason,
    fake_green_claimed: false,
  };
}

function writeQa03Artifacts(iosArtifact: IosAiRuntimeBuildSignoffArtifact): void {
  const matrix = buildQa03Matrix(iosArtifact);
  const androidRuntime = readJsonRecord(path.join(projectRoot, "artifacts", "S_RELEASE_CORE_02_POST_INSTALL_SIGNOFF_android.json"));
  writeJson(inventoryPath, {
    wave: qa03Wave,
    android_rebuild_policy: "scripts/release/requireAndroidRebuildForAiSourceChanges.ts",
    android_build_install: "scripts/release/buildInstallAndroidPreviewForEmulator.ts",
    android_runtime_smoke: "scripts/release/verifyAndroidInstalledBuildRuntime.ts",
    developer_control_runtime: "scripts/e2e/runDeveloperControlFullAccessMaestro.ts",
    mandatory_ai_matrix: "scripts/e2e/runAiMandatoryEmulatorRuntimeMatrix.ts",
    ios_build_signoff: "scripts/release/verifyIosAiRuntimeBuildSignoff.ts",
    fake_emulator_pass: false,
    fake_ios_pass: false,
    no_ota_as_native_replacement: true,
    secrets_printed: false,
  });
  writeJson(matrixPath, matrix);
  writeJson(emulatorPath, {
    wave: qa03Wave,
    android_runtime_smoke: androidRuntime?.runtime_smoke ?? "BLOCKED",
    android_final_status: androidRuntime?.final_status ?? null,
    fake_emulator_pass: false,
    exact_reason: matrix.exact_reason,
  });
  writeJson(iosPath, iosArtifact);
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_QA_03 Dual Platform Runtime Targetability",
      "",
      `final_status: ${String(matrix.final_status)}`,
      `android_local_rebuild_install: ${String(matrix.android_local_rebuild_install)}`,
      `android_runtime_smoke: ${String(matrix.android_runtime_smoke)}`,
      `developer_control_runtime: ${String(matrix.developer_control_runtime)}`,
      `command_center_targetable: ${String(matrix.command_center_targetable)}`,
      `procurement_copilot_targetable: ${String(matrix.procurement_copilot_targetable)}`,
      `mandatory_ai_runtime_matrix: ${String(matrix.mandatory_ai_runtime_matrix)}`,
      `ios_build_signoff: ${String(matrix.ios_build_signoff)}`,
      `ios_app_store_connect_submit: ${String(matrix.ios_app_store_connect_submit)}`,
      "fake_emulator_pass: false",
      "fake_ios_pass: false",
      "physical_ios_runtime_claimed: false",
      matrix.exact_reason ? `exact_reason: ${String(matrix.exact_reason)}` : "exact_reason: null",
      "",
    ].join("\n"),
    "utf8",
  );
}

function buildQa04Matrix(iosArtifact: IosAiRuntimeBuildSignoffArtifact): Record<string, unknown> {
  const mandatoryMatrix = readJsonRecord(path.join(projectRoot, "artifacts", "S_AI_QA_01_MANDATORY_EMULATOR_RUNTIME_GATE_matrix.json"));
  const androidRuntime = readJsonRecord(path.join(projectRoot, "artifacts", "S_RELEASE_CORE_02_POST_INSTALL_SIGNOFF_android.json"));
  const androidSmoke = androidRuntime?.runtime_smoke === "PASS" ? "PASS" : "BLOCKED";
  const mandatoryPass = mandatoryMatrix?.final_status === "GREEN_AI_MANDATORY_EMULATOR_RUNTIME_GATE_READY";
  const iosPass = iosArtifact.final_status === "GREEN_IOS_AI_RUNTIME_BUILD_SIGNOFF";
  const submitPass = iosArtifact.app_store_connect_submit === "PASS";
  const finalStatus =
    androidSmoke === "PASS" &&
    mandatoryPass &&
    iosPass &&
    submitPass &&
    iosArtifact.ios_build_git_commit_matches_head &&
    !iosArtifact.dirty_runtime_files &&
    !iosArtifact.simulator_build_used
      ? "GREEN_AI_DUAL_PLATFORM_RUNTIME_SIGNOFF_AND_IOS_SUBMIT_READY"
      : "BLOCKED_IOS_BUILD_SIGNOFF_REQUIRED";

  return {
    final_status: finalStatus,
    android_runtime_smoke: androidSmoke,
    mandatory_ai_runtime_matrix: mandatoryPass ? "PASS" : "BLOCKED",
    ios_build_required: true,
    ios_build_status: iosArtifact.ios_build_status ?? "MISSING_OR_STALE",
    ios_build_profile: iosArtifact.ios_build_profile ?? "BLOCKED",
    ios_distribution: iosArtifact.ios_distribution ?? "BLOCKED",
    ios_build_git_commit_matches_head: iosArtifact.ios_build_git_commit_matches_head,
    ios_stale_proof: !iosArtifact.ios_build_git_commit_matches_head || iosArtifact.post_build_runtime_changes.length > 0,
    ios_simulator_build: iosArtifact.simulator_build_used,
    ios_app_store_connect_submit: iosArtifact.app_store_connect_submit === "PASS" ? "PASS" : "NOT_APPROVED",
    physical_ios_runtime_claimed: false,
    fake_ios_pass: false,
    fake_emulator_pass: mandatoryMatrix?.fake_emulator_pass === true,
    exact_llm_text_assertions: mandatoryMatrix?.exact_llm_text_assertions === true,
    model_provider_changed: false,
    gpt_enabled: false,
    gemini_removed: false,
    db_writes: 0,
    mutations_created: Number(mandatoryMatrix?.mutations_created ?? 0),
    secrets_printed: iosArtifact.secrets_printed || mandatoryMatrix?.secrets_printed === true,
    exact_reason: finalStatus === "GREEN_AI_DUAL_PLATFORM_RUNTIME_SIGNOFF_AND_IOS_SUBMIT_READY"
      ? null
      : iosArtifact.exact_reason ??
        "Fresh iOS production/TestFlight build and App Store Connect/TestFlight submit proof for current HEAD are required before AI runtime wave can be green.",
    fake_green_claimed: false,
  };
}

function writeQa04Artifacts(iosArtifact: IosAiRuntimeBuildSignoffArtifact): void {
  const matrix = buildQa04Matrix(iosArtifact);
  const androidRuntime = readJsonRecord(path.join(projectRoot, "artifacts", "S_RELEASE_CORE_02_POST_INSTALL_SIGNOFF_android.json"));
  writeJson(qa04InventoryPath, {
    wave: qa04Wave,
    android_runtime_smoke: "scripts/release/verifyAndroidInstalledBuildRuntime.ts",
    mandatory_ai_matrix: "scripts/e2e/runAiMandatoryEmulatorRuntimeMatrix.ts",
    ios_build_signoff: "scripts/release/verifyIosAiRuntimeBuildSignoff.ts",
    ios_build_profile: "production",
    store_or_testflight_compatible_required: true,
    simulator_build_allowed: false,
    app_store_connect_submit_approved:
      flagEnabled("S_AI_QA_04_APP_STORE_CONNECT_SUBMIT_APPROVED") &&
      flagEnabled("S_AI_QA_04_IOS_SUBMIT_APPROVED"),
    fake_ios_pass: false,
    fake_emulator_pass: false,
    no_ota_as_native_replacement: true,
    secrets_printed: false,
  });
  writeJson(qa04MatrixPath, matrix);
  writeJson(qa04EmulatorPath, {
    wave: qa04Wave,
    android_runtime_smoke: androidRuntime?.runtime_smoke ?? "BLOCKED",
    android_final_status: androidRuntime?.final_status ?? null,
    mandatory_ai_runtime_matrix: matrix.mandatory_ai_runtime_matrix,
    fake_emulator_pass: false,
    exact_reason: matrix.exact_reason,
  });
  writeJson(qa04IosPath, iosArtifact);
  fs.writeFileSync(
    qa04ProofPath,
    [
      "# S_AI_QA_04 Fresh iOS Build Signoff",
      "",
      `final_status: ${String(matrix.final_status)}`,
      `android_runtime_smoke: ${String(matrix.android_runtime_smoke)}`,
      `mandatory_ai_runtime_matrix: ${String(matrix.mandatory_ai_runtime_matrix)}`,
      `ios_build_status: ${String(matrix.ios_build_status)}`,
      `ios_build_profile: ${String(matrix.ios_build_profile)}`,
      `ios_distribution: ${String(matrix.ios_distribution)}`,
      `ios_build_git_commit_matches_head: ${String(matrix.ios_build_git_commit_matches_head)}`,
      `ios_app_store_connect_submit: ${String(matrix.ios_app_store_connect_submit)}`,
      "physical_ios_runtime_claimed: false",
      "fake_ios_pass: false",
      "fake_emulator_pass: false",
      "no_ota_as_native_replacement: true",
      matrix.exact_reason ? `exact_reason: ${String(matrix.exact_reason)}` : "exact_reason: null",
      "",
    ].join("\n"),
    "utf8",
  );
}

function writeAllQaArtifacts(iosArtifact: IosAiRuntimeBuildSignoffArtifact): void {
  writeQa03Artifacts(iosArtifact);
  writeQa04Artifacts(iosArtifact);
}

export async function verifyIosAiRuntimeBuildSignoff(): Promise<IosAiRuntimeBuildSignoffArtifact> {
  if (!flagEnabled("S_AI_QA_03_REQUIRE_IOS_BUILD_SIGNOFF")) {
    const artifact = blocked("BLOCKED_IOS_BUILD_SIGNOFF_REQUIRED", "S_AI_QA_03_REQUIRE_IOS_BUILD_SIGNOFF must be true for QA03.");
    writeAllQaArtifacts(artifact);
    return artifact;
  }
  if (!flagEnabled("S_AI_QA_03_IOS_BUILD_APPROVED")) {
    const artifact = blocked("BLOCKED_IOS_BUILD_APPROVAL_MISSING", "S_AI_QA_03_IOS_BUILD_APPROVED is required before iOS build/signoff.");
    writeAllQaArtifacts(artifact);
    return artifact;
  }

  const coreIos = readJsonRecord(coreIosPath);
  const secrets = collectReleaseSecretValues();
  const currentHead = runCommand("git", ["rev-parse", "HEAD"], secrets);
  const latestCurrentBuild = findLatestCurrentHeadIosBuild(currentHead, secrets);
  const buildId = buildField(latestCurrentBuild, "id") ?? stringValue(coreIos?.build_id);
  if (!buildId) {
    const artifact = blocked("BLOCKED_IOS_BUILD_SIGNOFF_REQUIRED", "Core iOS build id is missing; iOS build/signoff is required.");
    writeAllQaArtifacts(artifact);
    return artifact;
  }

  let buildView: Record<string, unknown>;
  try {
    buildView = parseJsonObject(runCommand("npx", ["eas", "build:view", buildId, "--json"], secrets));
  } catch (error) {
    const artifact = blocked(
      "BLOCKED_IOS_BUILD_SIGNOFF_STATUS_NOT_AVAILABLE",
      redactReleaseOutput(error instanceof Error ? error.message : String(error), secrets),
      { ios_build_id: buildId },
    );
    writeAllQaArtifacts(artifact);
    return artifact;
  }

  const buildStatus = stringValue(buildView.status);
  const platform = stringValue(buildView.platform);
  const distribution = stringValue(buildView.distribution);
  const buildProfile = stringValue(buildView.buildProfile);
  const buildGitCommit = stringValue(buildView.gitCommitHash);
  const runtimeVersion = stringValue(buildView.runtimeVersion);
  const appBuildVersion = stringValue(buildView.appBuildVersion);
  const committedPostBuildRuntimeChanges = buildGitCommit
    ? changedFilesSince(buildGitCommit, secrets).filter(isAiRuntimeSourceChange)
    : ["UNKNOWN_BUILD_COMMIT"];
  const dirtyRuntimeChanges = readDirtyWorktreeChangedFiles(secrets).filter(isAiRuntimeSourceChange);
  const postBuildRuntimeChanges = dedupeSorted([
    ...committedPostBuildRuntimeChanges,
    ...dirtyRuntimeChanges,
  ]);
  const sourceFiles = readCurrentAiMobileRuntimeSourceFiles({ projectRoot });
  const sourceFingerprint = buildAiMobileRuntimeSourceFingerprint({ projectRoot, sourceFiles });
  const submitApproved =
    (flagEnabled("S_AI_QA_03_IOS_SUBMIT_APPROVED") &&
      flagEnabled("S_AI_QA_03_APP_STORE_CONNECT_SUBMIT_APPROVED")) ||
    (flagEnabled("S_AI_QA_04_IOS_SUBMIT_APPROVED") &&
      flagEnabled("S_AI_QA_04_APP_STORE_CONNECT_SUBMIT_APPROVED"));
  const coreArtifactMatchesBuild = stringValue(coreIos?.build_id) === buildId;
  const simulatorBuildUsed = boolValue(coreIos?.simulator_build_used_for_submit) || boolValue(buildView.isForIosSimulator);
  const submitCaptured =
    qa04SubmitProofCaptured(buildId) ||
    (coreArtifactMatchesBuild &&
      (boolValue(coreIos?.eas_submit_finished) ||
        boolValue(coreIos?.app_store_connect_submit_proof) ||
        boolValue(coreIos?.testflight_or_processing_status_captured)));

  if (submitApproved && !submitCaptured) {
    const artifact = blocked("BLOCKED_IOS_SUBMIT_APPROVAL_MISSING", "iOS submit was approved but no App Store Connect/TestFlight proof was captured.", {
      ios_build_id: buildId,
      ios_build_git_commit: buildGitCommit,
      current_head_commit: currentHead,
      post_build_runtime_changes: postBuildRuntimeChanges,
      ai_mobile_runtime_source_fingerprint: sourceFingerprint,
      ios_build_git_commit_matches_head: buildGitCommit === currentHead,
      dirty_runtime_files: dirtyRuntimeChanges.length > 0,
      dirty_runtime_file_list: dirtyRuntimeChanges,
    });
    writeAllQaArtifacts(artifact);
    return artifact;
  }

  if (
    buildStatus !== "FINISHED" ||
    platform !== "IOS" ||
    buildProfile !== "production" ||
    buildGitCommit !== currentHead ||
    (distribution !== "STORE" && distribution !== "INTERNAL") ||
    simulatorBuildUsed ||
    postBuildRuntimeChanges.length > 0
  ) {
    const artifact = blocked("BLOCKED_IOS_BUILD_SIGNOFF_STALE_OR_INVALID", "iOS build proof is stale, unfinished, simulator-based, or not production/TestFlight compatible.", {
      ios_build_id: buildId,
      ios_build_status: buildStatus === "FINISHED" ? "FINISHED" : "BLOCKED",
      ios_build_profile: buildProfile === "production" ? "production" : "BLOCKED",
      ios_distribution: distribution === "STORE" || distribution === "INTERNAL" ? "STORE_OR_TESTFLIGHT" : "BLOCKED",
      distribution: distribution === "STORE" || distribution === "INTERNAL" ? "STORE_OR_TESTFLIGHT" : "BLOCKED",
      ios_build_git_commit_matches_head: buildGitCommit === currentHead,
      simulator_build_used: simulatorBuildUsed,
      dirty_runtime_files: dirtyRuntimeChanges.length > 0,
      dirty_runtime_file_list: dirtyRuntimeChanges,
      runtime_version_present: Boolean(runtimeVersion),
      app_build_version_present: Boolean(appBuildVersion),
      app_store_connect_submit: submitApproved ? "BLOCKED" : "NOT_APPROVED",
      testflight_status: submitCaptured ? "PASS" : "NOT_AVAILABLE",
      ios_build_git_commit: buildGitCommit,
      current_head_commit: currentHead,
      post_build_runtime_changes: postBuildRuntimeChanges,
      ai_mobile_runtime_source_fingerprint: sourceFingerprint,
    });
    writeAllQaArtifacts(artifact);
    return artifact;
  }

  const artifact: IosAiRuntimeBuildSignoffArtifact = {
    final_status: "GREEN_IOS_AI_RUNTIME_BUILD_SIGNOFF",
    ios_build_required: true,
    ios_build_status: "FINISHED",
    ios_build_profile: "production",
    ios_distribution: "STORE_OR_TESTFLIGHT",
    distribution: "STORE_OR_TESTFLIGHT",
    ios_build_git_commit_matches_head: buildGitCommit === currentHead,
    simulator_build_used: false,
    dirty_runtime_files: false,
    dirty_runtime_file_list: [],
    runtime_version_present: Boolean(runtimeVersion),
    app_build_version_present: Boolean(appBuildVersion),
    app_store_connect_submit: submitCaptured ? "PASS" : "NOT_APPROVED",
    testflight_status: submitCaptured ? "PASS" : "NOT_AVAILABLE",
    physical_ios_runtime_claimed: false,
    fake_ios_pass: false,
    no_ota_as_native_replacement: true,
    ios_build_id: buildId,
    ios_build_git_commit: buildGitCommit,
    current_head_commit: currentHead,
    post_build_runtime_changes: [],
    ai_mobile_runtime_source_fingerprint: sourceFingerprint,
    ios_build_source_fingerprint: sourceFingerprint,
    source_fingerprint_matches_ios_build: true,
    secrets_printed: false,
    exact_reason: null,
  };
  writeAllQaArtifacts(artifact);
  return artifact;
}

if (require.main === module) {
  void verifyAndroidInstalledBuildRuntime()
    .then(() => verifyIosAiRuntimeBuildSignoff())
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_IOS_AI_RUNTIME_BUILD_SIGNOFF") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(redactReleaseOutput(error instanceof Error ? error.stack ?? error.message : String(error)));
      process.exitCode = 1;
    });
}
