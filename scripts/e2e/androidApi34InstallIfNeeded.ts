import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { RELEASE_PIPELINE_ARTIFACT_DIR, computeReleaseFingerprints } from "../release/computeReleaseFingerprints";

const DEVICE_ID = process.env.E2E_ANDROID_DEVICE_ID ?? "emulator-5554";
const INSTALL_TIMEOUT_MS = Number(process.env.LIVE_ANDROID_APK_INSTALL_TIMEOUT_MS ?? "300000");

function sdkRoot(): string {
  return process.env.ANDROID_SDK_ROOT ?? process.env.ANDROID_HOME ?? path.join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk");
}

function adbPath(): string {
  return path.join(sdkRoot(), "platform-tools", process.platform === "win32" ? "adb.exe" : "adb");
}

function run(adb: string, args: string[], timeout = 15_000): { ok: boolean; output: string } {
  try {
    const output = execFileSync(adb, args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout,
    });
    return { ok: true, output };
  } catch (error) {
    return { ok: false, output: error instanceof Error ? error.message : String(error) };
  }
}

function readBuildCache(): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(RELEASE_PIPELINE_ARTIFACT_DIR, "android_build_cache.json"), "utf8")) as Record<string, unknown>;
}

function installApk(adb: string, apkPath: string): { ok: boolean; output: string; fallback_used: boolean } {
  const streamed = run(adb, ["-s", DEVICE_ID, "install", "-r", apkPath], INSTALL_TIMEOUT_MS);
  if (streamed.ok) return { ok: true, output: streamed.output, fallback_used: false };
  const remoteApk = "/data/local/tmp/rik-release-app.apk";
  const pushed = run(adb, ["-s", DEVICE_ID, "push", apkPath, remoteApk], INSTALL_TIMEOUT_MS);
  if (!pushed.ok) {
    return { ok: false, output: `${streamed.output}\nADB_PUSH_INSTALL_FALLBACK_FAILED:${pushed.output}`, fallback_used: true };
  }
  const installed = run(adb, ["-s", DEVICE_ID, "shell", "pm", "install", "-r", remoteApk], INSTALL_TIMEOUT_MS);
  run(adb, ["-s", DEVICE_ID, "shell", "rm", "-f", remoteApk], 10_000);
  return {
    ok: installed.ok,
    output: `${streamed.output}\nADB_PUSH_INSTALL_FALLBACK_USED:${pushed.output}\nPM_INSTALL_OUTPUT:${installed.output}`,
    fallback_used: true,
  };
}

function main(): void {
  fs.mkdirSync(RELEASE_PIPELINE_ARTIFACT_DIR, { recursive: true });
  const fingerprints = computeReleaseFingerprints();
  const buildCache = readBuildCache();
  const previousPath = path.join(RELEASE_PIPELINE_ARTIFACT_DIR, "android_install.json");
  const previous = fs.existsSync(previousPath) ? JSON.parse(fs.readFileSync(previousPath, "utf8")) as Record<string, unknown> : null;
  const buildIdentityMatches =
    previous?.native_build_fingerprint === fingerprints.nativeBuildFingerprint &&
    previous?.js_bundle_fingerprint === fingerprints.jsBundleFingerprint &&
    previous?.source_tree_hash === fingerprints.sourceTreeHash &&
    previous?.apk_sha256 === buildCache.apk_sha256 &&
    previous?.install_ok === true;
  let installOutput = "INSTALL_SKIPPED_BUILD_IDENTITY_MATCHED";
  let installOk = true;
  let fallbackUsed = false;

  if (!buildIdentityMatches) {
    const apkPath = String(buildCache.apk_path ?? "");
    if (!apkPath || !fs.existsSync(apkPath)) throw new Error("BLOCKED_ANDROID_API34_CACHED_APK_MISSING");
    const installed = installApk(adbPath(), apkPath);
    installOutput = installed.output;
    installOk = installed.ok;
    fallbackUsed = installed.fallback_used;
  }

  const artifact = {
    final_status: installOk ? "GREEN_ANDROID_API34_INSTALL_READY" : "BLOCKED_ANDROID_API34_INSTALL_FAILED",
    source_tree_hash: fingerprints.sourceTreeHash,
    native_build_fingerprint: fingerprints.nativeBuildFingerprint,
    js_bundle_fingerprint: fingerprints.jsBundleFingerprint,
    apk_sha256: buildCache.apk_sha256,
    install_ok: installOk,
    install_skipped_build_identity_matched: buildIdentityMatches,
    adb_install_invoked: !buildIdentityMatches,
    fallback_push_pm_install_used: fallbackUsed,
    install_output: installOutput.slice(0, 1200),
    fake_green_claimed: false,
  };
  fs.writeFileSync(previousPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(artifact, null, 2));
  if (!installOk) process.exit(1);
}

main();
