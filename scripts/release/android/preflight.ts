import fs from "node:fs";

import {
  AVD_NAME,
  DEFAULT_DEVICE_ID,
  adbPath,
  emulatorPath,
  getCandidate,
  listConnectedDevices,
  run,
  writeAndroidJson,
} from "./shared";

function main(): void {
  const candidate = getCandidate();
  const adb = adbPath();
  const emulator = emulatorPath();
  const avds = run(emulator, ["-list-avds"]);
  const devices = listConnectedDevices(adb);
  const activeEmulators = devices.filter((device) => device.id.startsWith("emulator-") && device.state === "device");
  const deviceId = process.env.E2E_ANDROID_DEVICE_ID ?? activeEmulators[0]?.id ?? DEFAULT_DEVICE_ID;
  const api = run(adb, ["-s", deviceId, "shell", "getprop", "ro.build.version.sdk"]);
  const boot = run(adb, ["-s", deviceId, "shell", "getprop", "sys.boot_completed"]);
  const actualApi = Number(api.output.trim());
  const failures: string[] = [];

  if (!fs.existsSync(adb)) failures.push("ADB_MISSING");
  if (!fs.existsSync(emulator)) failures.push("EMULATOR_MISSING");
  if (!avds.output.split(/\r?\n/).map((item) => item.trim()).includes(AVD_NAME)) failures.push("API34_AVD_MISSING");
  if (activeEmulators.length !== 1) failures.push("ANDROID_EMULATOR_COUNT_NOT_ONE");
  if (actualApi !== 34) failures.push("ANDROID_ACTUAL_API_NOT_34");
  if (actualApi === 36) failures.push("API36_USED_AS_SUBSTITUTE");
  if (boot.output.trim() !== "1") failures.push("ANDROID_BOOT_NOT_COMPLETED");

  const passed = failures.length === 0;
  const artifact = {
    final_status: passed ? "GREEN_ANDROID_API34_PIPELINE_PREFLIGHT_READY" : "BLOCKED_ANDROID_API34_PIPELINE_PREFLIGHT",
    candidate_id: candidate.candidate_id,
    device_id: deviceId,
    android_actual_api: Number.isFinite(actualApi) ? actualApi : null,
    api36_used: actualApi === 36,
    api34_avd_exists: !failures.includes("API34_AVD_MISSING"),
    emulator_count: activeEmulators.length,
    exactly_one_emulator: activeEmulators.length === 1,
    sys_boot_completed: boot.output.trim(),
    adb_healthy: devices.some((device) => device.id === deviceId && device.state === "device"),
    gradle_invoked: false,
    apk_install_invoked: false,
    metro_required: false,
    failures,
    fake_green_claimed: false,
  };
  writeAndroidJson(candidate, "preflight.json", artifact);
  console.log(JSON.stringify(artifact, null, 2));
  if (!passed) process.exit(1);
}

main();
