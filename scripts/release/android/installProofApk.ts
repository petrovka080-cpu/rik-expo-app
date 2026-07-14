import fs from "node:fs";

import {
  DEFAULT_DEVICE_ID,
  adbPath,
  getCandidate,
  readAndroidJson,
  readAndroidJsonIfExists,
  run,
  truncateOutput,
  writeAndroidJson,
} from "./shared";

const INSTALL_TIMEOUT_MS = 300_000;

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

  const passed = installOk && failures.length === 0;
  const artifact = {
    final_status: passed ? "GREEN_ANDROID_API34_PIPELINE_INSTALL_READY" : "BLOCKED_ANDROID_API34_PIPELINE_INSTALL",
    candidate_id: candidate.candidate_id,
    candidate_hash: candidate.candidateHash,
    apk_sha256: apkSha256,
    device_id: deviceId,
    install_ok: installOk,
    install_skipped_build_identity_matched: buildIdentityMatches,
    adb_install_invoked: !buildIdentityMatches,
    fallback_push_pm_install_used: fallbackUsed,
    install_output: truncateOutput(installOutput),
    failures,
    fake_green_claimed: false,
  };
  writeAndroidJson(candidate, "install.json", artifact);
  console.log(JSON.stringify(artifact, null, 2));
  if (!passed) process.exit(1);
}

main();
