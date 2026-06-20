import {
  DEFAULT_DEVICE_ID,
  MAIN_ACTIVITY,
  adbPath,
  getCandidate,
  readPackageName,
  run,
  truncateOutput,
  writeAndroidJson,
} from "./shared";

const SMOKE_TIMEOUT_MS = 10 * 60 * 1000;

function dumpUi(adb: string, deviceId: string): string {
  run(adb, ["-s", deviceId, "shell", "uiautomator", "dump", "/sdcard/release_pipeline_root.xml"], 20_000);
  return run(adb, ["-s", deviceId, "shell", "cat", "/sdcard/release_pipeline_root.xml"], 20_000).output;
}

function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function main(): void {
  const candidate = getCandidate();
  const adb = adbPath();
  const deviceId = process.env.E2E_ANDROID_DEVICE_ID ?? DEFAULT_DEVICE_ID;
  const packageName = readPackageName();
  const mainActivity = `${packageName}/.MainActivity`;
  const failures: string[] = [];

  run(adb, ["-s", deviceId, "shell", "am", "force-stop", packageName], 20_000);
  const started = run(adb, ["-s", deviceId, "shell", "am", "start", "-n", mainActivity || MAIN_ACTIVITY], 30_000);
  if (!started.ok) failures.push("MAIN_ACTIVITY_START_FAILED");

  const deadline = Date.now() + SMOKE_TIMEOUT_MS;
  let lastDump = "";
  let appRootReady = false;
  let buildIdentityMatches = false;
  while (Date.now() < deadline) {
    lastDump = dumpUi(adb, deviceId);
    appRootReady = /BUILD_IDENTITY|build-identity|BUILD_IDENTITY_HOST/.test(lastDump);
    buildIdentityMatches = lastDump.includes(candidate.candidateHash) || lastDump.includes(candidate.productSourceHash);
    if (appRootReady && buildIdentityMatches) break;
    sleep(3_000);
  }

  if (!appRootReady) failures.push("APP_ROOT_BUILD_IDENTITY_MARKER_MISSING");
  if (!buildIdentityMatches) failures.push("BUILD_IDENTITY_CANDIDATE_MISMATCH");

  const passed = failures.length === 0;
  const artifact = {
    final_status: passed ? "GREEN_ANDROID_API34_PIPELINE_SMOKE_READY" : "BLOCKED_ANDROID_API34_PIPELINE_SMOKE",
    candidate_id: candidate.candidate_id,
    candidate_hash: candidate.candidateHash,
    product_source_hash: candidate.productSourceHash,
    device_id: deviceId,
    package_name: packageName,
    main_activity: mainActivity,
    android_app_root_ready: appRootReady,
    android_build_identity_matches: buildIdentityMatches,
    android_uses_dev_client: false,
    android_uses_metro: false,
    business_route_opened: false,
    auth_login_attempted: false,
    smoke_timeout_ms: SMOKE_TIMEOUT_MS,
    ui_dump_sample: truncateOutput(lastDump),
    failures,
    fake_green_claimed: false,
  };
  writeAndroidJson(candidate, "smoke.json", artifact);
  console.log(JSON.stringify(artifact, null, 2));
  if (!passed) process.exit(1);
}

main();
