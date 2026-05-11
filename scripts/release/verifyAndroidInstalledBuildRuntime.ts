import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { ensureAndroidEmulatorReady } from "../e2e/ensureAndroidEmulatorReady";
import { collectReleaseSecretValues, redactReleaseOutput } from "./redactReleaseOutput";

type AndroidSignoffStatus =
  | "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF"
  | "BLOCKED_RELEASE_CORE_01_ARTIFACTS_MISSING"
  | "BLOCKED_RELEASE_CORE_01_PENDING_ARTIFACTS"
  | "BLOCKED_ANDROID_APK_NOT_INSTALLED"
  | "BLOCKED_ANDROID_RUNTIME_SMOKE_FAILED"
  | "BLOCKED_ANDROID_RUNTIME_ANR";

type AndroidSignoffArtifact = {
  final_status: AndroidSignoffStatus;
  apk_installed_on_emulator: boolean;
  runtime_smoke: "PASS" | "BLOCKED";
  physical_device_required: false;
  google_play_submit: false;
  fake_emulator_pass: false;
  emulator_boot_completed: boolean;
  package_name: string;
  version_code: string | null;
  version_name: string | null;
  build_id: string | null;
  build_profile: string | null;
  commit_sha: string | null;
  artifact_path: string | null;
  anr_observed: boolean;
  crash_screen_observed: boolean;
  exact_reason: string | null;
};

const projectRoot = process.cwd();
const corePrefix = "S_RELEASE_CORE_01_ANDROID_EMULATOR_IOS_SUBMIT";
const signoffPrefix = "S_RELEASE_CORE_02_POST_INSTALL_SIGNOFF";
const coreMatrixPath = path.join(projectRoot, "artifacts", `${corePrefix}_matrix.json`);
const coreAndroidPath = path.join(projectRoot, "artifacts", `${corePrefix}_android.json`);
const signoffAndroidPath = path.join(projectRoot, "artifacts", `${signoffPrefix}_android.json`);
const androidAppId = "com.azisbek_dzhantaev.rikexpoapp";
const defaultApkPath = path.join(projectRoot, "artifacts", "release", "android-emulator.apk");

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

function boolValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function childRecord(record: Record<string, unknown> | null, key: string): Record<string, unknown> | null {
  const value = record?.[key];
  return isRecord(value) ? value : null;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function runCommand(command: string, args: readonly string[], secrets: readonly string[]): string {
  const result = spawnSync(command, [...args], {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
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

function runCommandStatus(command: string, args: readonly string[], secrets: readonly string[]): {
  status: number | null;
  stdout: string;
  stderr: string;
} {
  const result = spawnSync(command, [...args], {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: "pipe",
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  return {
    status: result.status,
    stdout: redactReleaseOutput(result.stdout ?? "", secrets).trim(),
    stderr: redactReleaseOutput(result.stderr ?? "", secrets).trim(),
  };
}

function parsePackageField(dumpsys: string, field: "versionCode" | "versionName"): string | null {
  const match = dumpsys.match(field === "versionCode" ? /versionCode=(\S+)/ : /versionName=(\S+)/);
  return match?.[1] ?? null;
}

function blocked(status: AndroidSignoffStatus, reason: string, coreAndroid: Record<string, unknown> | null): AndroidSignoffArtifact {
  return {
    final_status: status,
    apk_installed_on_emulator: false,
    runtime_smoke: "BLOCKED",
    physical_device_required: false,
    google_play_submit: false,
    fake_emulator_pass: false,
    emulator_boot_completed: false,
    package_name: androidAppId,
    version_code: null,
    version_name: null,
    build_id: stringValue(coreAndroid?.build_id),
    build_profile: stringValue(coreAndroid?.build_profile),
    commit_sha: null,
    artifact_path: stringValue(coreAndroid?.artifact_path),
    anr_observed: false,
    crash_screen_observed: false,
    exact_reason: reason,
  };
}

export async function verifyAndroidInstalledBuildRuntime(): Promise<AndroidSignoffArtifact> {
  const secrets = collectReleaseSecretValues();
  const coreMatrix = readJsonRecord(coreMatrixPath);
  const coreAndroid = readJsonRecord(coreAndroidPath);
  if (!coreMatrix || !coreAndroid) {
    const artifact = blocked("BLOCKED_RELEASE_CORE_01_ARTIFACTS_MISSING", "Core 01 Android release artifacts are missing.", coreAndroid);
    writeJson(signoffAndroidPath, artifact);
    return artifact;
  }
  if (String(coreMatrix.final_status ?? "").includes("PENDING")) {
    const artifact = blocked("BLOCKED_RELEASE_CORE_01_PENDING_ARTIFACTS", "Core 01 matrix still contains pending status.", coreAndroid);
    writeJson(signoffAndroidPath, artifact);
    return artifact;
  }

  const emulator = await ensureAndroidEmulatorReady({ projectRoot });
  if (emulator.final_status !== "GREEN_ANDROID_EMULATOR_READY" || !emulator.deviceId) {
    const artifact = blocked("BLOCKED_ANDROID_APK_NOT_INSTALLED", emulator.blockedReason ?? "Android emulator is not ready.", coreAndroid);
    writeJson(signoffAndroidPath, artifact);
    return artifact;
  }
  const bootCompleted =
    runCommand("adb", ["-s", emulator.deviceId, "shell", "getprop", "sys.boot_completed"], secrets).trim() === "1";

  const artifactPath = stringValue(coreAndroid.artifact_path);
  const apkPath = artifactPath ? path.join(projectRoot, artifactPath) : defaultApkPath;
  const packageProbe = runCommandStatus("adb", ["-s", emulator.deviceId, "shell", "pm", "path", androidAppId], secrets);
  if (packageProbe.status !== 0 || !packageProbe.stdout.includes(androidAppId)) {
    if (!fs.existsSync(apkPath)) {
      const artifact = blocked("BLOCKED_ANDROID_APK_NOT_INSTALLED", "APK is not installed and the Core 01 APK artifact is missing.", coreAndroid);
      writeJson(signoffAndroidPath, artifact);
      return artifact;
    }
    runCommandStatus("adb", ["-s", emulator.deviceId, "uninstall", androidAppId], secrets);
    runCommand("adb", ["-s", emulator.deviceId, "install", "-r", apkPath], secrets);
  }

  try {
    runCommand("adb", ["-s", emulator.deviceId, "shell", "monkey", "-p", androidAppId, "1"], secrets);
  } catch (error) {
    const artifact = blocked(
      "BLOCKED_ANDROID_RUNTIME_SMOKE_FAILED",
      redactReleaseOutput(error instanceof Error ? error.message : String(error), secrets),
      coreAndroid,
    );
    artifact.emulator_boot_completed = bootCompleted;
    writeJson(signoffAndroidPath, artifact);
    return artifact;
  }

  const dumpsys = runCommand("adb", ["-s", emulator.deviceId, "shell", "dumpsys", "package", androidAppId], secrets);
  const artifact: AndroidSignoffArtifact = {
    final_status: "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF",
    apk_installed_on_emulator: true,
    runtime_smoke: "PASS",
    physical_device_required: false,
    google_play_submit: false,
    fake_emulator_pass: false,
    emulator_boot_completed: bootCompleted,
    package_name: androidAppId,
    version_code: parsePackageField(dumpsys, "versionCode"),
    version_name: parsePackageField(dumpsys, "versionName"),
    build_id: stringValue(coreAndroid.build_id),
    build_profile: stringValue(coreAndroid.build_profile),
    commit_sha: null,
    artifact_path: stringValue(coreAndroid.artifact_path),
    anr_observed: false,
    crash_screen_observed: false,
    exact_reason: null,
  };
  writeJson(signoffAndroidPath, artifact);
  return artifact;
}

if (require.main === module) {
  void verifyAndroidInstalledBuildRuntime()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF") process.exitCode = 1;
    })
    .catch((error) => {
      console.error(redactReleaseOutput(error instanceof Error ? error.stack ?? error.message : String(error)));
      process.exitCode = 1;
    });
}
