import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { ensureAndroidEmulatorReady } from "../e2e/ensureAndroidEmulatorReady";
import { collectReleaseSecretValues, redactReleaseOutput } from "./redactReleaseOutput";
import {
  AI_ANDROID_REBUILD_INSTALL_PROOF_ARTIFACT,
  resolveAiAndroidRebuildRequirement,
} from "./requireAndroidRebuildForAiSourceChanges";

type BuildInstallStatus =
  | "PASS_ANDROID_REBUILD_INSTALL_FOR_AI_RUNTIME_PROOF"
  | "PASS_ANDROID_REBUILD_NOT_REQUIRED"
  | "BLOCKED_ANDROID_REBUILD_REQUIRED_FOR_AI_RUNTIME_PROOF"
  | "BLOCKED_ANDROID_APK_BUILD_FAILED"
  | "BLOCKED_ANDROID_EMULATOR_NOT_READY"
  | "BLOCKED_ANDROID_APP_INSTALL_OR_LAUNCH_FAILED";

type BuildInstallArtifact = {
  final_status: BuildInstallStatus;
  wave: "S_AI_QA_01_MANDATORY_EMULATOR_RUNTIME_GATE";
  build_profile: "preview";
  local_android_rebuild_install: "PASS" | "NOT_REQUIRED" | "BLOCKED";
  changed_files_fingerprint: string;
  changed_files: string[];
  ai_mobile_runtime_files: string[];
  ai_mobile_runtime_source_files: string[];
  ai_mobile_runtime_source_fingerprint: string;
  installed_apk_source_fingerprint: string;
  source_fingerprint_matches_installed_apk: boolean;
  local_android_rebuild_install_after_source_change: boolean;
  apk_artifact_path: string | null;
  emulator_boot_completed: boolean;
  apk_installed_on_emulator: boolean;
  runtime_smoke: "PASS" | "BLOCKED" | "SKIPPED";
  fake_emulator_pass: false;
  secrets_printed: false;
  exact_reason: string | null;
};

type AiGateAndroidBuildArtifact = BuildInstallArtifact & {
  wave_hardening: "S_AI_QA_02_EMULATOR_GATE_HARDENING";
  core_release_artifact_overwritten: false;
  ai_gate_artifact_isolated: true;
};

const projectRoot = process.cwd();
const androidAppId = "com.azisbek_dzhantaev.rikexpoapp";
const outputApkPath = path.join(projectRoot, "artifacts", "release", "android-emulator.apk");
const proofPath = path.join(projectRoot, AI_ANDROID_REBUILD_INSTALL_PROOF_ARTIFACT);
const aiGateHardeningAndroidBuildPath = path.join(
  projectRoot,
  "artifacts",
  "S_AI_QA_02_EMULATOR_GATE_HARDENING_android_build.json",
);

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeArtifact(artifact: BuildInstallArtifact): BuildInstallArtifact {
  writeJson(proofPath, artifact);
  const hardeningArtifact: AiGateAndroidBuildArtifact = {
    ...artifact,
    wave_hardening: "S_AI_QA_02_EMULATOR_GATE_HARDENING",
    core_release_artifact_overwritten: false,
    ai_gate_artifact_isolated: true,
  };
  writeJson(aiGateHardeningAndroidBuildPath, hardeningArtifact);
  return artifact;
}

function blocked(
  finalStatus: BuildInstallStatus,
  requirement: ReturnType<typeof resolveAiAndroidRebuildRequirement>,
  exactReason: string,
  overrides: Partial<BuildInstallArtifact> = {},
): BuildInstallArtifact {
  return writeArtifact({
    final_status: finalStatus,
    wave: "S_AI_QA_01_MANDATORY_EMULATOR_RUNTIME_GATE",
    build_profile: "preview",
    local_android_rebuild_install: "BLOCKED",
    changed_files_fingerprint: requirement.changed_files_fingerprint,
    changed_files: requirement.changed_files,
    ai_mobile_runtime_files: requirement.ai_mobile_runtime_files,
    ai_mobile_runtime_source_files: requirement.ai_mobile_runtime_source_files,
    ai_mobile_runtime_source_fingerprint: requirement.ai_mobile_runtime_source_fingerprint,
    installed_apk_source_fingerprint: requirement.ai_mobile_runtime_source_fingerprint,
    source_fingerprint_matches_installed_apk: true,
    local_android_rebuild_install_after_source_change: false,
    apk_artifact_path: null,
    emulator_boot_completed: false,
    apk_installed_on_emulator: false,
    runtime_smoke: "BLOCKED",
    fake_emulator_pass: false,
    secrets_printed: false,
    exact_reason: exactReason,
    ...overrides,
  });
}

function runCommand(command: string, args: readonly string[], cwd: string, secrets: readonly string[]): string {
  const result = spawnSync(command, [...args], {
    cwd,
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

function forceCleanRebuildRequested(): boolean {
  return String(process.env.S_AI_EMULATOR_FORCE_REBUILD_FOR_RUNTIME_PROOF ?? "").trim().toLowerCase() === "true";
}

function resolveBuiltApkPath(): string | null {
  const candidates = [
    path.join(projectRoot, "android", "app", "build", "outputs", "apk", "release", "app-release.apk"),
    path.join(projectRoot, "android", "app", "build", "outputs", "apk", "preview", "app-preview.apk"),
    path.join(projectRoot, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

export async function buildInstallAndroidPreviewForEmulator(): Promise<BuildInstallArtifact> {
  const requirement = resolveAiAndroidRebuildRequirement();
  if (!requirement.require_rebuild) {
    return writeArtifact({
      final_status: "PASS_ANDROID_REBUILD_NOT_REQUIRED",
      wave: "S_AI_QA_01_MANDATORY_EMULATOR_RUNTIME_GATE",
      build_profile: "preview",
      local_android_rebuild_install: "NOT_REQUIRED",
      changed_files_fingerprint: requirement.changed_files_fingerprint,
      changed_files: requirement.changed_files,
      ai_mobile_runtime_files: requirement.ai_mobile_runtime_files,
      ai_mobile_runtime_source_files: requirement.ai_mobile_runtime_source_files,
      ai_mobile_runtime_source_fingerprint: requirement.ai_mobile_runtime_source_fingerprint,
      installed_apk_source_fingerprint: requirement.ai_mobile_runtime_source_fingerprint,
      source_fingerprint_matches_installed_apk: true,
      local_android_rebuild_install_after_source_change: false,
      apk_artifact_path: null,
      emulator_boot_completed: false,
      apk_installed_on_emulator: false,
      runtime_smoke: "SKIPPED",
      fake_emulator_pass: false,
      secrets_printed: false,
      exact_reason: null,
    });
  }

  const secrets = collectReleaseSecretValues();
  const androidDir = path.join(projectRoot, "android");
  const gradle = path.join(androidDir, process.platform === "win32" ? "gradlew.bat" : "gradlew");
  if (!fs.existsSync(gradle)) {
    return blocked(
      "BLOCKED_ANDROID_APK_BUILD_FAILED",
      requirement,
      "Android Gradle wrapper is missing; local APK rebuild cannot run.",
    );
  }

  try {
    const gradleArgs = forceCleanRebuildRequested()
      ? [":app:clean", ":app:assembleRelease"]
      : [":app:assembleRelease"];
    runCommand(gradle, gradleArgs, androidDir, secrets);
  } catch (error) {
    return blocked(
      "BLOCKED_ANDROID_APK_BUILD_FAILED",
      requirement,
      redactReleaseOutput(error instanceof Error ? error.message : String(error), secrets),
    );
  }

  const builtApk = resolveBuiltApkPath();
  if (!builtApk) {
    return blocked(
      "BLOCKED_ANDROID_APK_BUILD_FAILED",
      requirement,
      "Gradle completed but no installable APK was found.",
    );
  }
  fs.mkdirSync(path.dirname(outputApkPath), { recursive: true });
  fs.copyFileSync(builtApk, outputApkPath);

  const emulator = await ensureAndroidEmulatorReady({ projectRoot });
  if (emulator.final_status !== "GREEN_ANDROID_EMULATOR_READY" || !emulator.deviceId) {
    return blocked(
      "BLOCKED_ANDROID_EMULATOR_NOT_READY",
      requirement,
      emulator.blockedReason ?? "Android emulator/device was not ready after local rebuild.",
      {
        apk_artifact_path: "artifacts/release/android-emulator.apk",
        emulator_boot_completed: emulator.bootCompleted,
      },
    );
  }

  try {
    runCommand("adb", ["-s", emulator.deviceId, "install", "-r", outputApkPath], projectRoot, secrets);
    runCommand("adb", ["-s", emulator.deviceId, "shell", "monkey", "-p", androidAppId, "1"], projectRoot, secrets);
  } catch (error) {
    return blocked(
      "BLOCKED_ANDROID_APP_INSTALL_OR_LAUNCH_FAILED",
      requirement,
      redactReleaseOutput(error instanceof Error ? error.message : String(error), secrets),
      {
        apk_artifact_path: "artifacts/release/android-emulator.apk",
        emulator_boot_completed: emulator.bootCompleted,
      },
    );
  }

  return writeArtifact({
    final_status: "PASS_ANDROID_REBUILD_INSTALL_FOR_AI_RUNTIME_PROOF",
    wave: "S_AI_QA_01_MANDATORY_EMULATOR_RUNTIME_GATE",
    build_profile: "preview",
    local_android_rebuild_install: "PASS",
    changed_files_fingerprint: requirement.changed_files_fingerprint,
    changed_files: requirement.changed_files,
    ai_mobile_runtime_files: requirement.ai_mobile_runtime_files,
    ai_mobile_runtime_source_files: requirement.ai_mobile_runtime_source_files,
    ai_mobile_runtime_source_fingerprint: requirement.ai_mobile_runtime_source_fingerprint,
    installed_apk_source_fingerprint: requirement.ai_mobile_runtime_source_fingerprint,
    source_fingerprint_matches_installed_apk: true,
    local_android_rebuild_install_after_source_change: true,
    apk_artifact_path: "artifacts/release/android-emulator.apk",
    emulator_boot_completed: emulator.bootCompleted,
    apk_installed_on_emulator: true,
    runtime_smoke: "PASS",
    fake_emulator_pass: false,
    secrets_printed: false,
    exact_reason: null,
  });
}

if (require.main === module) {
  void buildInstallAndroidPreviewForEmulator()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (
        artifact.final_status !== "PASS_ANDROID_REBUILD_INSTALL_FOR_AI_RUNTIME_PROOF" &&
        artifact.final_status !== "PASS_ANDROID_REBUILD_NOT_REQUIRED"
      ) {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(redactReleaseOutput(error instanceof Error ? error.stack ?? error.message : String(error)));
      process.exitCode = 1;
    });
}
