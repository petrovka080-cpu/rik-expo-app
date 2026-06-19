import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { RELEASE_PIPELINE_ARTIFACT_DIR } from "../release/computeReleaseFingerprints";

const AVD_NAME = "Pixel_7_API_34";
const DEVICE_ID = process.env.E2E_ANDROID_DEVICE_ID ?? "emulator-5554";

function sdkRoot(): string {
  return process.env.ANDROID_SDK_ROOT ?? process.env.ANDROID_HOME ?? path.join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk");
}

function adbPath(): string {
  return path.join(sdkRoot(), "platform-tools", process.platform === "win32" ? "adb.exe" : "adb");
}

function emulatorPath(): string {
  return path.join(sdkRoot(), "emulator", process.platform === "win32" ? "emulator.exe" : "emulator");
}

function run(command: string, args: string[], timeout = 10_000): { ok: boolean; output: string } {
  try {
    const output = execFileSync(command, args, {
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

function listApi34Processes(): number {
  if (process.platform !== "win32") return 0;
  const result = spawnSync("powershell", [
    "-NoProfile",
    "-Command",
    `@(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match '${AVD_NAME}' }).Count`,
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return Number(result.stdout.trim() || "0");
}

function main(): void {
  fs.mkdirSync(RELEASE_PIPELINE_ARTIFACT_DIR, { recursive: true });
  const adb = adbPath();
  const emulator = emulatorPath();
  const avds = run(emulator, ["-list-avds"]);
  const devices = run(adb, ["devices"]);
  const api = run(adb, ["-s", DEVICE_ID, "shell", "getprop", "ro.build.version.sdk"]);
  const boot = run(adb, ["-s", DEVICE_ID, "shell", "getprop", "sys.boot_completed"]);
  const packageService = run(adb, ["-s", DEVICE_ID, "shell", "service", "check", "package"]);
  const dump = run(adb, ["-s", DEVICE_ID, "shell", "uiautomator", "dump", "/sdcard/release_preflight.xml"], 15_000);
  const xml = dump.ok ? run(adb, ["-s", DEVICE_ID, "shell", "cat", "/sdcard/release_preflight.xml"], 15_000) : { ok: false, output: "" };
  const anrFound = /isn't responding|not responding|Application Not Responding/i.test(xml.output);
  const emulatorCount = listApi34Processes();
  const actualApi = Number(api.output.trim());
  const passed =
    avds.output.split(/\r?\n/).map((item) => item.trim()).includes(AVD_NAME) &&
    devices.output.includes(`${DEVICE_ID}\tdevice`) &&
    actualApi === 34 &&
    boot.output.trim() === "1" &&
    /found/i.test(packageService.output) &&
    !anrFound &&
    emulatorCount <= 1;

  const artifact = {
    final_status: passed ? "GREEN_ANDROID_API34_PREFLIGHT_READY" : "BLOCKED_ANDROID_API34_PREFLIGHT",
    android_actual_api: actualApi || null,
    api36_used_as_substitute: false,
    api34_avd_exists: avds.output.includes(AVD_NAME),
    api34_avd_recreated_unnecessarily: false,
    emulator_count: emulatorCount,
    duplicate_android_emulators: Math.max(0, emulatorCount - 1),
    adb_healthy: devices.ok && devices.output.includes(`${DEVICE_ID}\tdevice`),
    sys_boot_completed: boot.output.trim(),
    package_service_found: /found/i.test(packageService.output),
    system_ui_anr_found: anrFound,
    gradle_invoked: false,
    apk_install_invoked: false,
    artifact_rewrite_from_verify: false,
    fake_green_claimed: false,
  };
  fs.writeFileSync(path.join(RELEASE_PIPELINE_ARTIFACT_DIR, "android_preflight.json"), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(artifact, null, 2));
  if (!passed) process.exit(1);
}

main();
