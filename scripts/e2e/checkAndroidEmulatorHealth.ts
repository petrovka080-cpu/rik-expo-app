import { existsSync } from "node:fs";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import { parseAdbDevices, runCommandProbe, type AndroidDeviceInfo, type CommandProbe } from "./androidAdbDeviceHealth";

export const GREEN_ANDROID_LAB_HEALTHY = "GREEN_ANDROID_LAB_HEALTHY" as const;
export const STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN = "STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN" as const;

const HEALTH_ROOT = path.join(".release-runtime", "ai-estimate-android-emulator-health");
const ADB_TIMEOUT_MS = 15_000;
const ADB_SHELL_TIMEOUT_MS = 20_000;
const CHROME_PACKAGE = "com.android.chrome";

export type AndroidEmulatorHealthResult = {
  final_status: typeof GREEN_ANDROID_LAB_HEALTHY | typeof STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN;
  generated_at: string;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  require_emulator: boolean;
  require_chrome: boolean;
  selected_serial: string | null;
  adb_detected: boolean;
  adb_path: string | null;
  adb_version: string | null;
  adb_devices_output: string;
  usable_device_count: number;
  emulator_detected: boolean;
  emulator_state_device: boolean;
  device_state: string | null;
  sys_boot_completed_value: string | null;
  sys_boot_completed: boolean;
  dev_bootcomplete_value: string | null;
  dev_bootcomplete: boolean | null;
  cmd_activity_available: boolean;
  am_available: boolean;
  settings_available: boolean;
  input_available: boolean;
  wm_size_value: string | null;
  wm_size_available: boolean;
  dumpsys_window_available: boolean;
  chrome_package: string | null;
  chrome_installed: boolean;
  chrome_version: string | null;
  chrome_launchable: boolean;
  chrome_process_visible_after_launch: boolean;
  screen_unlocked: boolean;
  setup_wizard_absent: boolean;
  device_provisioned_value: string | null;
  user_setup_complete_value: string | null;
  metro_url_checked: boolean;
  metro_url_reachable_from_emulator: boolean | null;
  android_lab_healthy: boolean;
  blocking_reasons: string[];
  checks: Record<string, boolean | null>;
};

export type AndroidEmulatorHealthRun = {
  artifactPath: string;
  artifact: AndroidEmulatorHealthResult;
};

function argValue(name: string): string | null {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function normalize(value: string): string {
  return value.replace(/\r/g, "").trim();
}

function firstLine(value: string): string | null {
  return normalize(value).split(/\n/).map((line) => line.trim()).filter(Boolean)[0] ?? null;
}

function lookupExecutable(command: string): string | null {
  const lookup = process.platform === "win32"
    ? runCommandProbe("where", [command], 5000)
    : runCommandProbe("which", [command], 5000);
  const found = firstLine(lookup.stdout);
  if (lookup.exit_code === 0 && !lookup.timed_out && found) return found;

  const sdkRoot = process.env.ANDROID_SDK_ROOT ?? process.env.ANDROID_HOME;
  if (!sdkRoot) return null;
  const candidate = command === "adb"
    ? path.join(sdkRoot, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb")
    : null;
  return candidate && existsSync(candidate) ? candidate : null;
}

function adbCommand(): string {
  return lookupExecutable("adb") ?? "adb";
}

function adbProbe(args: string[], timeoutMs = ADB_TIMEOUT_MS): CommandProbe {
  return runCommandProbe(adbCommand(), args, timeoutMs);
}

function serialArgs(serial: string | null, args: string[]): string[] {
  return serial ? ["-s", serial, ...args] : args;
}

function adbShell(serial: string | null, shellArgs: string[], timeoutMs = ADB_SHELL_TIMEOUT_MS): CommandProbe {
  return adbProbe(serialArgs(serial, ["shell", ...shellArgs]), timeoutMs);
}

function probeOk(probe: CommandProbe): boolean {
  return probe.exit_code === 0 && !probe.timed_out && probe.error == null;
}

function shellOutput(serial: string | null, shellArgs: string[], timeoutMs = ADB_SHELL_TIMEOUT_MS): string | null {
  const probe = adbShell(serial, shellArgs, timeoutMs);
  if (!probeOk(probe)) return null;
  return normalize(probe.stdout);
}

function selectDevice(devices: AndroidDeviceInfo[], input: {
  serial?: string | null;
  requireEmulator?: boolean;
}): { selected: AndroidDeviceInfo | null; blockers: string[]; usable: AndroidDeviceInfo[] } {
  const usable = devices.filter((device) => device.state === "device");
  if (input.serial) {
    const selected = devices.find((device) => device.id === input.serial) ?? null;
    return {
      selected,
      usable,
      blockers: [
        selected ? "" : `selected_serial_missing:${input.serial}`,
        selected?.state === "device" ? "" : `selected_serial_not_device:${selected?.state ?? "missing"}`,
        input.requireEmulator === true && selected && !selected.is_emulator ? "selected_serial_not_emulator" : "",
      ].filter(Boolean),
    };
  }

  const candidates = input.requireEmulator ? usable.filter((device) => device.is_emulator) : usable;
  return {
    selected: candidates.length === 1 ? candidates[0] : null,
    usable,
    blockers: [
      candidates.length > 0 ? "" : input.requireEmulator ? "no_usable_emulator_device" : "no_usable_android_device",
      candidates.length <= 1 ? "" : `multiple_usable_android_devices:${candidates.map((device) => device.id).join(",")}`,
    ].filter(Boolean),
  };
}

function versionFromDumpsys(stdout: string): string | null {
  const match = stdout.match(/versionName=([^\s]+)/);
  return match?.[1] ?? null;
}

function parseWindowLockState(stdout: string): boolean {
  const text = stdout.toLowerCase();
  return ![
    "mdreaminglockscreen=true",
    "mshowinglockscreen=true",
    "isshowing=true",
    "isstatusbarkeyguard=true",
    "mkeyguardshowing=true",
  ].some((marker) => text.includes(marker));
}

function parseProvisioned(value: string | null): boolean {
  return value === "1" || value === "true";
}

function maybeReverseBaseUrl(serial: string | null, baseUrl: string | null): boolean | null {
  if (!baseUrl) return null;
  const parsed = new URL(baseUrl);
  const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
  const reverse = adbProbe(serialArgs(serial, ["reverse", `tcp:${port}`, `tcp:${port}`]), ADB_TIMEOUT_MS);
  if (!probeOk(reverse)) return false;
  const launch = adbShell(serial, [
    "am",
    "start",
    "-n",
    `${CHROME_PACKAGE}/com.google.android.apps.chrome.Main`,
    "-a",
    "android.intent.action.VIEW",
    "-d",
    baseUrl.replace(/\/+$/, ""),
  ]);
  return probeOk(launch);
}

export function checkAndroidEmulatorHealth(options: {
  requireEmulator?: boolean;
  requireChrome?: boolean;
  serial?: string | null;
  baseUrl?: string | null;
  writeArtifact?: boolean;
} = {}): AndroidEmulatorHealthRun {
  const requireEmulator = options.requireEmulator === true;
  const requireChrome = options.requireChrome === true;
  const serial = options.serial ?? process.env.ANDROID_SERIAL ?? null;
  const adbPath = lookupExecutable("adb");
  const adbVersionProbe = adbProbe(["version"], ADB_TIMEOUT_MS);
  const adbDetected = adbPath != null && probeOk(adbVersionProbe);
  const devicesProbe = adbDetected ? adbProbe(["devices", "-l"], ADB_TIMEOUT_MS) : null;
  const devices = devicesProbe ? parseAdbDevices(devicesProbe.stdout) : [];
  const selection = selectDevice(devices, { serial, requireEmulator });
  const selectedSerial = selection.selected?.id ?? null;
  const selectedState = selection.selected?.state ?? null;
  const emulatorDetected = devices.some((device) => device.is_emulator && device.state === "device");

  if (selectedSerial) {
    adbProbe(serialArgs(selectedSerial, ["wait-for-device"]), ADB_TIMEOUT_MS);
    adbShell(selectedSerial, ["input", "keyevent", "KEYCODE_WAKEUP"], 8000);
    adbShell(selectedSerial, ["wm", "dismiss-keyguard"], 8000);
  }

  const sysBootCompletedValue = selectedSerial ? shellOutput(selectedSerial, ["getprop", "sys.boot_completed"], 8000) : null;
  const devBootcompleteValue = selectedSerial ? shellOutput(selectedSerial, ["getprop", "dev.bootcomplete"], 8000) : null;
  const cmdActivity = selectedSerial ? adbShell(selectedSerial, ["cmd", "activity", "get-current-user"], 10_000) : null;
  const am = selectedSerial ? adbShell(selectedSerial, ["command", "-v", "am"], 10_000) : null;
  const settings = selectedSerial ? adbShell(selectedSerial, ["settings", "get", "secure", "user_setup_complete"], 10_000) : null;
  const input = selectedSerial ? adbShell(selectedSerial, ["input", "keyevent", "KEYCODE_WAKEUP"], 10_000) : null;
  const wmSizeValue = selectedSerial ? shellOutput(selectedSerial, ["wm", "size"], 10_000) : null;
  const dumpsysWindow = selectedSerial ? shellOutput(selectedSerial, ["dumpsys", "window"], 15_000) : null;
  const userSetupCompleteValue = selectedSerial ? shellOutput(selectedSerial, ["settings", "get", "secure", "user_setup_complete"], 10_000) : null;
  const deviceProvisionedValue = selectedSerial ? shellOutput(selectedSerial, ["settings", "get", "global", "device_provisioned"], 10_000) : null;
  const chromePathProbe = selectedSerial ? adbShell(selectedSerial, ["pm", "path", CHROME_PACKAGE], 10_000) : null;
  const chromeDumpsys = selectedSerial ? adbShell(selectedSerial, ["dumpsys", "package", CHROME_PACKAGE], 15_000) : null;
  const chromeLaunch = selectedSerial
    ? adbShell(selectedSerial, [
      "am",
      "start",
      "-n",
      `${CHROME_PACKAGE}/com.google.android.apps.chrome.Main`,
      "-a",
      "android.intent.action.VIEW",
      "-d",
      "about:blank",
    ], 15_000)
    : null;
  const chromePid = selectedSerial ? shellOutput(selectedSerial, ["pidof", CHROME_PACKAGE], 10_000) : null;
  const metroReachable = selectedSerial ? maybeReverseBaseUrl(selectedSerial, options.baseUrl ?? null) : null;

  const sysBootCompleted = sysBootCompletedValue === "1";
  const devBootcomplete = devBootcompleteValue ? devBootcompleteValue === "1" : null;
  const cmdActivityAvailable = cmdActivity ? probeOk(cmdActivity) : false;
  const amAvailable = am ? probeOk(am) : false;
  const settingsAvailable = settings ? probeOk(settings) : false;
  const inputAvailable = input ? probeOk(input) : false;
  const wmSizeAvailable = Boolean(wmSizeValue && /size:/i.test(wmSizeValue));
  const dumpsysWindowAvailable = Boolean(dumpsysWindow && dumpsysWindow.length > 0);
  const chromeInstalled = chromePathProbe ? probeOk(chromePathProbe) && chromePathProbe.stdout.includes(`package:`) : false;
  const chromeLaunchable = chromeLaunch ? probeOk(chromeLaunch) : false;
  const chromeProcessVisible = Boolean(chromePid && chromePid.length > 0);
  const screenUnlocked = dumpsysWindow ? parseWindowLockState(dumpsysWindow) : false;
  const setupWizardAbsent = parseProvisioned(deviceProvisionedValue) && parseProvisioned(userSetupCompleteValue);
  const requiredChecks = {
    adb_detected: adbDetected,
    emulator_detected: requireEmulator ? emulatorDetected : true,
    emulator_state_device: Boolean(selection.selected && selection.selected.state === "device"),
    sys_boot_completed: sysBootCompleted,
    dev_bootcomplete: devBootcomplete,
    cmd_activity_available: cmdActivityAvailable,
    am_available: amAvailable,
    settings_available: settingsAvailable,
    input_available: inputAvailable,
    wm_size_available: wmSizeAvailable,
    dumpsys_window_available: dumpsysWindowAvailable,
    chrome_installed: requireChrome ? chromeInstalled : true,
    chrome_launchable: requireChrome ? chromeLaunchable : true,
    chrome_process_visible_after_launch: requireChrome ? chromeProcessVisible : true,
    screen_unlocked: screenUnlocked,
    setup_wizard_absent: setupWizardAbsent,
    metro_url_reachable_from_emulator: metroReachable,
  };
  const blockingReasons = [
    adbDetected ? "" : "adb_not_detected",
    devicesProbe && probeOk(devicesProbe) ? "" : "adb_devices_failed",
    ...selection.blockers,
    requireEmulator && !emulatorDetected ? "emulator_not_detected" : "",
    selection.selected?.state === "device" ? "" : `device_state_not_device:${selectedState ?? "missing"}`,
    sysBootCompleted ? "" : `sys_boot_completed_not_1:${sysBootCompletedValue ?? "missing"}`,
    devBootcomplete == null || devBootcomplete ? "" : `dev_bootcomplete_not_1:${devBootcompleteValue}`,
    cmdActivityAvailable ? "" : "cmd_activity_missing",
    amAvailable ? "" : "am_missing",
    settingsAvailable ? "" : "settings_missing",
    inputAvailable ? "" : "input_missing",
    wmSizeAvailable ? "" : "wm_size_missing",
    dumpsysWindowAvailable ? "" : "dumpsys_window_missing",
    requireChrome && !chromeInstalled ? "chrome_not_installed" : "",
    requireChrome && !chromeLaunchable ? "chrome_not_launchable" : "",
    requireChrome && !chromeProcessVisible ? "chrome_process_not_visible_after_launch" : "",
    screenUnlocked ? "" : "screen_locked_or_keyguard_visible",
    setupWizardAbsent ? "" : "setup_wizard_or_device_provisioning_incomplete",
    metroReachable === false ? "metro_url_not_reachable_from_emulator" : "",
  ].filter(Boolean);
  const androidLabHealthy = blockingReasons.length === 0;
  const artifact: AndroidEmulatorHealthResult = {
    final_status: androidLabHealthy ? GREEN_ANDROID_LAB_HEALTHY : STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN,
    generated_at: new Date().toISOString(),
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]),
    require_emulator: requireEmulator,
    require_chrome: requireChrome,
    selected_serial: selectedSerial,
    adb_detected: adbDetected,
    adb_path: adbPath,
    adb_version: firstLine(adbVersionProbe.stdout),
    adb_devices_output: devicesProbe?.stdout ?? "",
    usable_device_count: selection.usable.length,
    emulator_detected: emulatorDetected,
    emulator_state_device: Boolean(selection.selected && selection.selected.is_emulator && selection.selected.state === "device"),
    device_state: selectedState,
    sys_boot_completed_value: sysBootCompletedValue,
    sys_boot_completed: sysBootCompleted,
    dev_bootcomplete_value: devBootcompleteValue,
    dev_bootcomplete: devBootcomplete,
    cmd_activity_available: cmdActivityAvailable,
    am_available: amAvailable,
    settings_available: settingsAvailable,
    input_available: inputAvailable,
    wm_size_value: wmSizeValue,
    wm_size_available: wmSizeAvailable,
    dumpsys_window_available: dumpsysWindowAvailable,
    chrome_package: chromeInstalled ? CHROME_PACKAGE : null,
    chrome_installed: chromeInstalled,
    chrome_version: chromeDumpsys && probeOk(chromeDumpsys) ? versionFromDumpsys(chromeDumpsys.stdout) : null,
    chrome_launchable: chromeLaunchable,
    chrome_process_visible_after_launch: chromeProcessVisible,
    screen_unlocked: screenUnlocked,
    setup_wizard_absent: setupWizardAbsent,
    device_provisioned_value: deviceProvisionedValue,
    user_setup_complete_value: userSetupCompleteValue,
    metro_url_checked: Boolean(options.baseUrl),
    metro_url_reachable_from_emulator: metroReachable,
    android_lab_healthy: androidLabHealthy,
    blocking_reasons: blockingReasons,
    checks: requiredChecks,
  };
  const artifactPath = path.join(HEALTH_ROOT, timestampForPath(), "summary.json");
  if (options.writeArtifact !== false) writeJson(artifactPath, artifact);
  return { artifactPath, artifact };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/checkAndroidEmulatorHealth.ts")) {
  const result = checkAndroidEmulatorHealth({
    requireEmulator: hasFlag("require-emulator"),
    requireChrome: hasFlag("require-chrome"),
    serial: argValue("serial"),
    baseUrl: argValue("base-url") ?? process.env.RIK_WEB_BASE_URL ?? null,
  });
  console.log(JSON.stringify({
    final_status: result.artifact.final_status,
    adb_detected: result.artifact.adb_detected,
    emulator_detected: result.artifact.emulator_detected,
    emulator_state_device: result.artifact.emulator_state_device,
    sys_boot_completed: result.artifact.sys_boot_completed,
    cmd_activity_available: result.artifact.cmd_activity_available,
    chrome_installed: result.artifact.chrome_installed,
    chrome_launchable: result.artifact.chrome_launchable,
    screen_unlocked: result.artifact.screen_unlocked,
    setup_wizard_absent: result.artifact.setup_wizard_absent,
    android_lab_healthy: result.artifact.android_lab_healthy,
    blocking_reasons: result.artifact.blocking_reasons,
    artifact: result.artifactPath,
  }, null, 2));
  if (!result.artifact.android_lab_healthy) process.exitCode = 1;
}
