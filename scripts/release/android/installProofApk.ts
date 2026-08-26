import fs from "node:fs";

import {
  DEFAULT_DEVICE_ID,
  adbPath,
  getCandidate,
  readAndroidJson,
  readAndroidJsonIfExists,
  readPackageName,
  run,
  truncateOutput,
  writeAndroidJson,
} from "./shared";

const INSTALL_TIMEOUT_MS = 300_000;

function readInstalledApkSha256(
  adb: string,
  deviceId: string,
  packageName: string,
): { path: string | null; sha256: string | null; output: string } {
  const packagePath = run(
    adb,
    ["-s", deviceId, "shell", "pm", "path", packageName],
    30_000,
  );
  const installedPath = packagePath.ok
    ? packagePath.output
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .find((line) => line.startsWith("package:") && line.endsWith("/base.apk"))
        ?.slice("package:".length) ?? null
    : null;
  if (!installedPath) {
    return { path: null, sha256: null, output: packagePath.output };
  }
  const digest = run(
    adb,
    ["-s", deviceId, "shell", "sha256sum", installedPath],
    60_000,
  );
  const sha256 = digest.ok
    ? digest.output.match(/\b[0-9a-f]{64}\b/iu)?.[0]?.toLowerCase() ?? null
    : null;
  return {
    path: installedPath,
    sha256,
    output: `${packagePath.output}\n${digest.output}`,
  };
}

function installApk(adb: string, deviceId: string, apkPath: string): { ok: boolean; output: string; fallback_used: boolean } {
  const streamed = run(adb, ["-s", deviceId, "install", "-r", apkPath], INSTALL_TIMEOUT_MS);
  if (streamed.ok) return { ok: true, output: streamed.output, fallback_used: false };
  const remoteApk = "/data/local/tmp/rik-release-pipeline.apk";
  const pushed = run(adb, ["-s", deviceId, "push", apkPath, remoteApk], INSTALL_TIMEOUT_MS);
  if (!pushed.ok) {
    return {
      ok: false,
      output: `${streamed.output}\nADB_PUSH_INSTALL_FALLBACK_FAILED:${pushed.output}`,
      fallback_used: true,
    };
  }
  const installed = run(adb, ["-s", deviceId, "shell", "pm", "install", "-r", remoteApk], INSTALL_TIMEOUT_MS);
  run(adb, ["-s", deviceId, "shell", "rm", "-f", remoteApk], 10_000);
  return {
    ok: installed.ok,
    output: `${streamed.output}\nADB_PUSH_INSTALL_FALLBACK_USED:${pushed.output}\nPM_INSTALL_OUTPUT:${installed.output}`,
    fallback_used: true,
  };
}

function main(): void {
  const candidate = getCandidate();
  const build = readAndroidJson(candidate, "build.json");
  const previous = readAndroidJsonIfExists(candidate, "install.json");
  const apkPath = String(build.apk_path ?? "");
  const apkSha256 = String(build.apk_sha256 ?? "");
  const deviceId = process.env.E2E_ANDROID_DEVICE_ID ?? DEFAULT_DEVICE_ID;
  const packageName = readPackageName();
  const failures: string[] = [];
  const buildIdentityMatches =
    previous?.apk_sha256 === apkSha256 &&
    previous?.candidate_hash === candidate.candidateHash &&
    previous?.install_ok === true;

  let installOk = true;
  let installOutput = "INSTALL_SKIPPED_BUILD_IDENTITY_MATCHED";
  let fallbackUsed = false;

  if (!buildIdentityMatches) {
    if (!apkPath || !fs.existsSync(apkPath)) {
      failures.push("APK_MISSING_FOR_INSTALL");
      installOk = false;
    } else {
      const installed = installApk(adbPath(), deviceId, apkPath);
      installOk = installed.ok;
      installOutput = installed.output;
      fallbackUsed = installed.fallback_used;
      if (!installOk) failures.push("ADB_INSTALL_FAILED");
    }
  }

  const installedApk = installOk
    ? readInstalledApkSha256(adbPath(), deviceId, packageName)
    : { path: null, sha256: null, output: "INSTALL_NOT_GREEN" };
  const installedApkByteExact =
    Boolean(apkSha256) && installedApk.sha256 === apkSha256;
  if (!installedApk.path) failures.push("INSTALLED_BASE_APK_PATH_MISSING");
  if (!installedApk.sha256) failures.push("INSTALLED_BASE_APK_SHA256_MISSING");
  if (installedApk.sha256 && !installedApkByteExact) {
    failures.push("INSTALLED_BASE_APK_SHA256_MISMATCH");
  }

  const passed = installOk && installedApkByteExact && failures.length === 0;
  const artifact = {
    final_status: passed ? "GREEN_ANDROID_API34_PIPELINE_INSTALL_READY" : "BLOCKED_ANDROID_API34_PIPELINE_INSTALL",
    candidate_id: candidate.candidate_id,
    candidate_hash: candidate.candidateHash,
    apk_sha256: apkSha256,
    package_name: packageName,
    device_id: deviceId,
    install_ok: installOk,
    install_skipped_build_identity_matched: buildIdentityMatches,
    adb_install_invoked: !buildIdentityMatches,
    fallback_push_pm_install_used: fallbackUsed,
    install_output: truncateOutput(installOutput),
    installed_apk_path: installedApk.path,
    installed_apk_sha256: installedApk.sha256,
    installed_apk_byte_exact: installedApkByteExact,
    installed_apk_digest_output: truncateOutput(installedApk.output),
    failures,
    fake_green_claimed: false,
  };
  writeAndroidJson(candidate, "install.json", artifact);
  console.log(JSON.stringify(artifact, null, 2));
  if (!passed) process.exit(1);
}

main();
