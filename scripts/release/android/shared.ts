import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { ReleaseCandidate } from "../releaseCandidateState";
import { loadReleaseCandidate } from "../releaseCandidateState";
import {
  candidateAndroidRuntimeDir,
  currentBranch,
  currentHead,
  readJsonObject,
  readJsonObjectIfExists,
  writeJsonFile,
} from "../releasePipelineRuntime";

export const AVD_NAME = "Pixel_7_API_34";
export const DEFAULT_DEVICE_ID = process.env.E2E_ANDROID_DEVICE_ID ?? "emulator-5554";
export const DEFAULT_PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
export const MAIN_ACTIVITY = `${DEFAULT_PACKAGE_NAME}/.MainActivity`;

export type CommandOutput = {
  ok: boolean;
  output: string;
  status: number | null;
};

export function sdkRoot(): string {
  return process.env.ANDROID_SDK_ROOT ?? process.env.ANDROID_HOME ?? path.join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk");
}

export function adbPath(): string {
  return path.join(sdkRoot(), "platform-tools", process.platform === "win32" ? "adb.exe" : "adb");
}

export function emulatorPath(): string {
  return path.join(sdkRoot(), "emulator", process.platform === "win32" ? "emulator.exe" : "emulator");
}

export function run(command: string, args: string[], timeout = 15_000): CommandOutput {
  try {
    const output = execFileSync(command, args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout,
    });
    return { ok: true, output, status: 0 };
  } catch (error) {
    const record = error as { status?: number; stdout?: Buffer | string; stderr?: Buffer | string; message?: string };
    const output = `${String(record.stdout ?? "")}${String(record.stderr ?? "")}${record.message ?? ""}`.trim();
    return { ok: false, output, status: typeof record.status === "number" ? record.status : null };
  }
}

export function sha256File(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

export function androidRuntimePath(candidate: ReleaseCandidate, fileName: string): string {
  return path.join(candidateAndroidRuntimeDir(candidate), fileName);
}

export function writeAndroidJson(candidate: ReleaseCandidate, fileName: string, value: unknown): void {
  writeJsonFile(androidRuntimePath(candidate, fileName), value);
}

export function readAndroidJson(candidate: ReleaseCandidate, fileName: string): Record<string, unknown> {
  return readJsonObject(androidRuntimePath(candidate, fileName));
}

export function readAndroidJsonIfExists(candidate: ReleaseCandidate, fileName: string): Record<string, unknown> | null {
  return readJsonObjectIfExists(androidRuntimePath(candidate, fileName));
}

export function getCandidate(): ReleaseCandidate {
  return loadReleaseCandidate();
}

export function listConnectedDevices(adb = adbPath()): Array<{ id: string; state: string }> {
  const devices = run(adb, ["devices"]);
  if (!devices.ok) return [];
  return devices.output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("List of devices"))
    .map((line) => {
      const [id, state] = line.split(/\s+/);
      return { id, state };
    })
    .filter((device) => device.id && device.state);
}

export function readPackageName(): string {
  const appJsonPath = path.join(process.cwd(), "app.json");
  if (!fs.existsSync(appJsonPath)) return DEFAULT_PACKAGE_NAME;
  const parsed = JSON.parse(fs.readFileSync(appJsonPath, "utf8")) as {
    expo?: { android?: { package?: string } };
  };
  return parsed.expo?.android?.package?.trim() || DEFAULT_PACKAGE_NAME;
}

export function buildIdentityEnv(candidate: ReleaseCandidate): Record<string, string> {
  const now = new Date().toISOString();
  return {
    EXPO_PUBLIC_BUILD_COMMIT: currentHead(),
    EXPO_PUBLIC_BUILD_BRANCH: currentBranch(),
    EXPO_PUBLIC_BUILD_TIME: now,
    EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH: candidate.sourceTreeHash,
    EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH: candidate.productSourceHash,
    EXPO_PUBLIC_RELEASE_NATIVE_BUILD_FINGERPRINT: candidate.nativeBuildHash,
    EXPO_PUBLIC_RELEASE_JS_BUNDLE_FINGERPRINT: candidate.jsBundleFingerprint,
    EXPO_PUBLIC_RELEASE_PROOF_HARNESS_HASH: candidate.proofHarnessHash,
    EXPO_PUBLIC_RELEASE_CANDIDATE_HASH: candidate.candidateHash,
    EXPO_PUBLIC_RELEASE_APK_BUILD_KEY: candidate.apkBuildKey,
    EXPO_PUBLIC_RELEASE_BUILD_CREATED_AT: now,
  };
}

export function gradleReleaseBuildEnv(candidate: ReleaseCandidate): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ...buildIdentityEnv(candidate),
    SENTRY_DISABLE_AUTO_UPLOAD: "true",
  };
  // Expo export:embed disables --reset-cache when CI is set, which can reuse
  // stale transforms for candidate-bound EXPO_PUBLIC release identity values.
  delete env.CI;
  return env;
}

export function spawnGradleAssembleRelease(candidate: ReleaseCandidate): number {
  const gradle = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
  const result = spawnSync(gradle, ["--rerun-tasks", "assembleRelease"], {
    cwd: path.join(process.cwd(), "android"),
    stdio: "inherit",
    shell: process.platform === "win32",
    env: gradleReleaseBuildEnv(candidate),
  });
  return result.status ?? 1;
}

export function apkContainsEmbeddedBundle(apkPath: string): boolean {
  const bytes = fs.readFileSync(apkPath);
  return bytes.includes(Buffer.from("index.android.bundle"));
}

export function releaseBundleContainsCurrentIdentity(candidate: ReleaseCandidate): boolean {
  const bundlePaths = [
    path.join(process.cwd(), "android", "app", "build", "generated", "assets", "createBundleReleaseJsAndAssets", "index.android.bundle"),
    path.join(process.cwd(), "android", "app", "build", "intermediates", "assets", "release", "mergeReleaseAssets", "index.android.bundle"),
  ];
  return bundlePaths.some((bundlePath) => {
    if (!fs.existsSync(bundlePath)) return false;
    const bundle = fs.readFileSync(bundlePath, "utf8");
    return bundle.includes(candidate.candidateHash) && bundle.includes(candidate.productSourceHash);
  });
}

export function truncateOutput(value: string, maxLength = 1600): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}
