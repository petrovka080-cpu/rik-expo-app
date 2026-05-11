import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { collectReleaseSecretValues, redactReleaseOutput } from "./redactReleaseOutput";

type IosSignoffStatus =
  | "GREEN_IOS_BUILD_SUBMIT_SIGNOFF"
  | "BLOCKED_RELEASE_CORE_01_ARTIFACTS_MISSING"
  | "BLOCKED_RELEASE_CORE_01_PENDING_ARTIFACTS"
  | "BLOCKED_IOS_BUILD_ID_MISSING"
  | "BLOCKED_IOS_SUBMIT_NOT_STARTED"
  | "BLOCKED_IOS_SUBMIT_STATUS_NOT_AVAILABLE"
  | "BLOCKED_IOS_APP_STORE_PROCESSING_FAILED";

type IosSignoffArtifact = {
  final_status: IosSignoffStatus;
  new_build_created: boolean;
  build_id: string | null;
  build_status: string | null;
  build_profile: string | null;
  submit_profile: string | null;
  submit_started: boolean;
  submit_finished: boolean;
  submit_status_captured: boolean;
  app_store_connect_submit_proof: boolean;
  testflight_or_processing_status_captured: boolean;
  simulator_build_used_for_submit: boolean;
  fake_submit_pass: false;
  build_git_commit: string | null;
  current_head_commit: string | null;
  post_build_commits_non_runtime_only: boolean;
  runtime_version: string | null;
  app_build_version: string | null;
  exact_reason: string | null;
};

const projectRoot = process.cwd();
const corePrefix = "S_RELEASE_CORE_01_ANDROID_EMULATOR_IOS_SUBMIT";
const signoffPrefix = "S_RELEASE_CORE_02_POST_INSTALL_SIGNOFF";
const coreMatrixPath = path.join(projectRoot, "artifacts", `${corePrefix}_matrix.json`);
const coreIosPath = path.join(projectRoot, "artifacts", `${corePrefix}_ios.json`);
const signoffIosPath = path.join(projectRoot, "artifacts", `${signoffPrefix}_ios.json`);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJsonRecord(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null;
  const parsed: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return isRecord(parsed) ? parsed : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function boolValue(value: unknown): boolean {
  return value === true;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
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

function isNonRuntimeReleaseProofFile(file: string): boolean {
  return (
    file.startsWith("artifacts/") ||
    file.startsWith("docs/") ||
    file.startsWith("tests/") ||
    file.startsWith("scripts/release/") ||
    file === "scripts/architecture_anti_regression_suite.ts" ||
    file === "tests/architecture/architectureAntiRegressionSuite.test.ts"
  );
}

function blocked(
  status: IosSignoffStatus,
  reason: string,
  coreIos: Record<string, unknown> | null,
): IosSignoffArtifact {
  return {
    final_status: status,
    new_build_created: boolValue(coreIos?.new_build_created),
    build_id: stringValue(coreIos?.build_id),
    build_status: null,
    build_profile: stringValue(coreIos?.build_profile),
    submit_profile: stringValue(coreIos?.submit_profile),
    submit_started: boolValue(coreIos?.eas_submit_started),
    submit_finished: boolValue(coreIos?.eas_submit_finished),
    submit_status_captured: false,
    app_store_connect_submit_proof: boolValue(coreIos?.app_store_connect_submit_proof),
    testflight_or_processing_status_captured: boolValue(coreIos?.testflight_or_processing_status_captured),
    simulator_build_used_for_submit: boolValue(coreIos?.simulator_build_used_for_submit),
    fake_submit_pass: false,
    build_git_commit: null,
    current_head_commit: null,
    post_build_commits_non_runtime_only: false,
    runtime_version: null,
    app_build_version: null,
    exact_reason: reason,
  };
}

export function verifyIosBuildSubmitStatus(): IosSignoffArtifact {
  const secrets = collectReleaseSecretValues();
  const coreMatrix = readJsonRecord(coreMatrixPath);
  const coreIos = readJsonRecord(coreIosPath);
  if (!coreMatrix || !coreIos) {
    const artifact = blocked("BLOCKED_RELEASE_CORE_01_ARTIFACTS_MISSING", "Core 01 iOS release artifacts are missing.", coreIos);
    writeJson(signoffIosPath, artifact);
    return artifact;
  }
  if (String(coreMatrix.final_status ?? "").includes("PENDING")) {
    const artifact = blocked("BLOCKED_RELEASE_CORE_01_PENDING_ARTIFACTS", "Core 01 matrix still contains pending status.", coreIos);
    writeJson(signoffIosPath, artifact);
    return artifact;
  }

  const buildId = stringValue(coreIos.build_id);
  if (!buildId) {
    const artifact = blocked("BLOCKED_IOS_BUILD_ID_MISSING", "Core 01 iOS build id is missing.", coreIos);
    writeJson(signoffIosPath, artifact);
    return artifact;
  }
  if (!boolValue(coreIos.eas_submit_started)) {
    const artifact = blocked("BLOCKED_IOS_SUBMIT_NOT_STARTED", "Core 01 iOS submit was not started.", coreIos);
    writeJson(signoffIosPath, artifact);
    return artifact;
  }
  if (boolValue(coreIos.simulator_build_used_for_submit)) {
    const artifact = blocked("BLOCKED_IOS_APP_STORE_PROCESSING_FAILED", "Core 01 iOS artifact claims a simulator build was submitted.", coreIos);
    writeJson(signoffIosPath, artifact);
    return artifact;
  }

  let buildView: Record<string, unknown>;
  try {
    buildView = parseJsonObject(runCommand("npx", ["eas", "build:view", buildId, "--json"], secrets));
  } catch (error) {
    const artifact = blocked(
      "BLOCKED_IOS_SUBMIT_STATUS_NOT_AVAILABLE",
      redactReleaseOutput(error instanceof Error ? error.message : String(error), secrets),
      coreIos,
    );
    writeJson(signoffIosPath, artifact);
    return artifact;
  }

  const buildStatus = stringValue(buildView.status);
  const buildProfile = stringValue(buildView.buildProfile);
  const platform = stringValue(buildView.platform);
  const distribution = stringValue(buildView.distribution);
  const buildGitCommit = stringValue(buildView.gitCommitHash);
  const currentHead = runCommand("git", ["rev-parse", "HEAD"], secrets);
  const changedFiles = buildGitCommit ? changedFilesSince(buildGitCommit, secrets) : [];
  const nonRuntimeOnly = buildGitCommit === currentHead || changedFiles.every(isNonRuntimeReleaseProofFile);

  if (
    buildStatus !== "FINISHED" ||
    platform !== "IOS" ||
    buildProfile !== "production" ||
    distribution !== "STORE" ||
    !nonRuntimeOnly
  ) {
    const artifact = blocked("BLOCKED_IOS_APP_STORE_PROCESSING_FAILED", "iOS build proof is stale, unfinished, or not submit-compatible.", coreIos);
    artifact.build_status = buildStatus;
    artifact.build_git_commit = buildGitCommit;
    artifact.current_head_commit = currentHead;
    artifact.post_build_commits_non_runtime_only = nonRuntimeOnly;
    artifact.runtime_version = stringValue(buildView.runtimeVersion);
    artifact.app_build_version = stringValue(buildView.appBuildVersion);
    writeJson(signoffIosPath, artifact);
    return artifact;
  }

  const submitStatusCaptured =
    boolValue(coreIos.eas_submit_finished) ||
    boolValue(coreIos.app_store_connect_submit_proof) ||
    boolValue(coreIos.testflight_or_processing_status_captured);
  if (!submitStatusCaptured) {
    const artifact = blocked("BLOCKED_IOS_SUBMIT_STATUS_NOT_AVAILABLE", "No App Store Connect/TestFlight submit status was captured.", coreIos);
    writeJson(signoffIosPath, artifact);
    return artifact;
  }

  const artifact: IosSignoffArtifact = {
    final_status: "GREEN_IOS_BUILD_SUBMIT_SIGNOFF",
    new_build_created: true,
    build_id: buildId,
    build_status: buildStatus,
    build_profile: buildProfile,
    submit_profile: stringValue(coreIos.submit_profile),
    submit_started: true,
    submit_finished: boolValue(coreIos.eas_submit_finished),
    submit_status_captured: true,
    app_store_connect_submit_proof: boolValue(coreIos.app_store_connect_submit_proof),
    testflight_or_processing_status_captured: boolValue(coreIos.testflight_or_processing_status_captured),
    simulator_build_used_for_submit: false,
    fake_submit_pass: false,
    build_git_commit: buildGitCommit,
    current_head_commit: currentHead,
    post_build_commits_non_runtime_only: nonRuntimeOnly,
    runtime_version: stringValue(buildView.runtimeVersion),
    app_build_version: stringValue(buildView.appBuildVersion),
    exact_reason: null,
  };
  writeJson(signoffIosPath, artifact);
  return artifact;
}

if (require.main === module) {
  try {
    const artifact = verifyIosBuildSubmitStatus();
    console.info(JSON.stringify(artifact, null, 2));
    if (artifact.final_status !== "GREEN_IOS_BUILD_SUBMIT_SIGNOFF") process.exitCode = 1;
  } catch (error) {
    console.error(redactReleaseOutput(error instanceof Error ? error.stack ?? error.message : String(error)));
    process.exitCode = 1;
  }
}
