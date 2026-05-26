import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { parseAdbDevices, runCommandProbe, type AndroidDeviceInfo, type CommandProbe } from "./androidAdbDeviceHealth";

export const ANDROID_API34_ACCEPTANCE_WAVE =
  "S_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING_POINT_OF_NO_RETURN";
export const ANDROID_API34_ACCEPTANCE_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING",
);
export const API34_AVD_NAME = "Pixel_7_API_34";
export const API34_SYSTEM_IMAGE = "system-images;android-34;google_apis;x86_64";
export const API34_DEVICE_PROFILE = "pixel_7";
export const API34_DEVICE_READY = "GREEN_ANDROID_API34_DEVICE_READY";

export type AndroidApi34DeviceStatus =
  | typeof API34_DEVICE_READY
  | "BLOCKED_ANDROID_API36_NOT_ALLOWED_FOR_ACCEPTANCE"
  | "BLOCKED_ANDROID_API34_AVD_NOT_AVAILABLE"
  | "BLOCKED_ANDROID_API34_DEVICE_NOT_READY";

type AndroidProcess = {
  process_id: number;
  name: string;
  command_line: string;
};

export type AndroidApi34DeviceReadyResult = {
  wave: typeof ANDROID_API34_ACCEPTANCE_WAVE;
  final_status: AndroidApi34DeviceStatus;
  timestamp: string;
  root_cause: "API36_16K_EMULATOR_ADB_TRANSPORT_BUG";
  api36_rejected_for_acceptance: true;
  api34_required_for_acceptance: true;
  avd_name: typeof API34_AVD_NAME;
  android_sdk: number | null;
  cpu_abi: string | null;
  device_state: string | null;
  device_id: string | null;
  single_device_active: boolean;
  adb_path: string | null;
  emulator_path: string | null;
  sdkmanager_path: string | null;
  avdmanager_path: string | null;
  available_avds: string[];
  api36_detected_initially: boolean;
  api36_processes_initial: AndroidProcess[];
  api36_processes_after_cleanup: AndroidProcess[];
  api36_cleanup_results: CommandProbe[];
  api34_cold_boot_restart_results: CommandProbe[];
  adb_taskkill_result: CommandProbe | null;
  adb_kill_server_result: CommandProbe;
  adb_start_server_result: CommandProbe;
  emulator_start_attempted: boolean;
  emulator_start_command: string[] | null;
  emulator_list_avds_result: CommandProbe;
  sdkmanager_install_result: CommandProbe | null;
  avdmanager_create_result: CommandProbe | null;
  adb_devices_result: CommandProbe | null;
  adb_devices: AndroidDeviceInfo[];
  sys_boot_completed: string | null;
  product_name: string | null;
  failure_reason: string | null;
};

type EnsureOptions = {
  artifactDir?: string;
  bootTimeoutMs?: number;
  allowCreateAvd?: boolean;
};

function ensureDir(artifactDir: string): void {
  fs.mkdirSync(path.join(artifactDir, "screenshots"), { recursive: true });
  fs.mkdirSync(path.join(artifactDir, "ui"), { recursive: true });
}

function writeJson(artifactDir: string, name: string, value: unknown): void {
  ensureDir(artifactDir);
  fs.writeFileSync(path.join(artifactDir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function candidatePath(...parts: string[]): string | null {
  const filePath = path.join(...parts);
  return fs.existsSync(filePath) ? filePath : null;
}

function firstExisting(candidates: Array<string | null>): string | null {
  return candidates.find((candidate) => Boolean(candidate && fs.existsSync(candidate))) ?? null;
}

function sdkRoot(): string | null {
  return process.env.ANDROID_SDK_ROOT ?? process.env.ANDROID_HOME ?? null;
}

function lookupExecutable(command: string): string | null {
  const lookup = process.platform === "win32" ? runCommandProbe("where", [command], 5000) : runCommandProbe("which", [command], 5000);
  const fromPath = lookup.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)[0] ?? null;
  if (lookup.exit_code === 0 && !lookup.timed_out && fromPath) return fromPath;

  const root = sdkRoot();
  if (!root) return null;
  if (command === "adb") {
    return candidatePath(root, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb");
  }
  if (command === "emulator") {
    return candidatePath(root, "emulator", process.platform === "win32" ? "emulator.exe" : "emulator");
  }
  const extension = process.platform === "win32" ? ".bat" : "";
  return firstExisting([
    candidatePath(root, "cmdline-tools", "latest", "bin", `${command}${extension}`),
    candidatePath(root, "cmdline-tools", "bin", `${command}${extension}`),
    candidatePath(root, "tools", "bin", `${command}${extension}`),
  ]);
}

function listAndroidProcesses(): AndroidProcess[] {
  if (process.platform === "win32") {
    const script = [
      "$items = Get-CimInstance Win32_Process |",
      "Where-Object { $_.Name -match '^(emulator|qemu-system|adb)' } |",
      "Select-Object ProcessId,Name,CommandLine;",
      "$items | ConvertTo-Json -Depth 3 -Compress",
    ].join(" ");
    const result = runCommandProbe("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], 10_000);
    if (result.exit_code !== 0 || result.timed_out || !result.stdout.trim()) return [];
    try {
      const parsed = JSON.parse(result.stdout) as
        | { ProcessId?: number; Name?: string; CommandLine?: string }
        | Array<{ ProcessId?: number; Name?: string; CommandLine?: string }>;
      return (Array.isArray(parsed) ? parsed : [parsed])
        .filter((item) => typeof item.ProcessId === "number")
        .map((item) => ({
          process_id: Number(item.ProcessId),
          name: item.Name ?? "",
          command_line: item.CommandLine ?? "",
        }));
    } catch {
      return [];
    }
  }

  const result = runCommandProbe("ps", ["-eo", "pid,comm,args"], 10_000);
  if (result.exit_code !== 0 || result.timed_out) return [];
  return result.stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(\S+)\s+([\s\S]+)$/);
      return {
        process_id: Number(match?.[1] ?? 0),
        name: match?.[2] ?? "",
        command_line: match?.[3] ?? line,
      };
    })
    .filter((item) => item.process_id > 0 && /emulator|qemu-system|adb/i.test(`${item.name} ${item.command_line}`));
}

function isApi36Process(processInfo: AndroidProcess): boolean {
  return /Medium_Phone_API_36|API_36|android-36|sdk_gphone16k|gphone16k|16k/i.test(
    `${processInfo.name} ${processInfo.command_line}`,
  );
}

function isApi34Process(processInfo: AndroidProcess): boolean {
  return new RegExp(API34_AVD_NAME, "i").test(`${processInfo.name} ${processInfo.command_line}`);
}

function killProcess(processInfo: AndroidProcess): CommandProbe {
  if (process.platform === "win32") {
    return runCommandProbe("taskkill", ["/PID", String(processInfo.process_id), "/T", "/F"], 15_000);
  }
  return runCommandProbe("kill", ["-TERM", String(processInfo.process_id)], 10_000);
}

function taskkillAdb(): CommandProbe | null {
  if (process.platform !== "win32") return null;
  return runCommandProbe("taskkill", ["/IM", "adb.exe", "/F"], 10_000);
}

function parseAvds(result: CommandProbe): string[] {
  if (result.exit_code !== 0 || result.timed_out) return [];
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getProp(adbPath: string, deviceId: string, prop: string): string | null {
  const result = runCommandProbe(adbPath, ["-s", deviceId, "shell", "getprop", prop], 8000);
  if (result.exit_code !== 0 || result.timed_out) return null;
  return result.stdout.trim() || null;
}

async function waitForSingleDevice(adbPath: string, timeoutMs: number): Promise<{
  devices: AndroidDeviceInfo[];
  adbDevicesResult: CommandProbe | null;
}> {
  const startedAt = Date.now();
  let lastResult: CommandProbe | null = null;
  while (Date.now() - startedAt < timeoutMs) {
    lastResult = runCommandProbe(adbPath, ["devices", "-l"], 8000);
    if (lastResult.timed_out) {
      taskkillAdb();
      await sleep(1500);
      continue;
    }
    const devices = parseAdbDevices(lastResult.stdout).filter((device) => device.state === "device");
    if (devices.length > 0) {
      return { devices, adbDevicesResult: lastResult };
    }
    await sleep(3000);
  }
  return { devices: [], adbDevicesResult: lastResult };
}

async function waitForBoot(adbPath: string, deviceId: string, timeoutMs: number): Promise<string | null> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const boot = getProp(adbPath, deviceId, "sys.boot_completed");
    if (boot === "1") return boot;
    await sleep(3000);
  }
  return getProp(adbPath, deviceId, "sys.boot_completed");
}

function startEmulator(emulatorPath: string): string[] {
  const args = ["-avd", API34_AVD_NAME, "-no-snapshot-load", "-no-audio", "-no-boot-anim"];
  const child = spawn(emulatorPath, args, {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  return [emulatorPath, ...args];
}

function buildBaseResult(params: {
  adbPath: string | null;
  emulatorPath: string | null;
  sdkmanagerPath: string | null;
  avdmanagerPath: string | null;
  emulatorListAvdsResult: CommandProbe;
  availableAvds: string[];
  initialApi36Processes: AndroidProcess[];
  api36CleanupResults: CommandProbe[];
  api34ColdBootRestartResults: CommandProbe[];
  adbTaskkillResult: CommandProbe | null;
  adbKillServerResult: CommandProbe;
  adbStartServerResult: CommandProbe;
  sdkmanagerInstallResult: CommandProbe | null;
  avdmanagerCreateResult: CommandProbe | null;
  finalStatus: AndroidApi34DeviceStatus;
  failureReason: string | null;
}): AndroidApi34DeviceReadyResult {
  return {
    wave: ANDROID_API34_ACCEPTANCE_WAVE,
    final_status: params.finalStatus,
    timestamp: new Date().toISOString(),
    root_cause: "API36_16K_EMULATOR_ADB_TRANSPORT_BUG",
    api36_rejected_for_acceptance: true,
    api34_required_for_acceptance: true,
    avd_name: API34_AVD_NAME,
    android_sdk: null,
    cpu_abi: null,
    device_state: null,
    device_id: null,
    single_device_active: false,
    adb_path: params.adbPath,
    emulator_path: params.emulatorPath,
    sdkmanager_path: params.sdkmanagerPath,
    avdmanager_path: params.avdmanagerPath,
    available_avds: params.availableAvds,
    api36_detected_initially: params.initialApi36Processes.length > 0,
    api36_processes_initial: params.initialApi36Processes,
    api36_processes_after_cleanup: listAndroidProcesses().filter(isApi36Process),
    api36_cleanup_results: params.api36CleanupResults,
    api34_cold_boot_restart_results: params.api34ColdBootRestartResults,
    adb_taskkill_result: params.adbTaskkillResult,
    adb_kill_server_result: params.adbKillServerResult,
    adb_start_server_result: params.adbStartServerResult,
    emulator_start_attempted: false,
    emulator_start_command: null,
    emulator_list_avds_result: params.emulatorListAvdsResult,
    sdkmanager_install_result: params.sdkmanagerInstallResult,
    avdmanager_create_result: params.avdmanagerCreateResult,
    adb_devices_result: null,
    adb_devices: [],
    sys_boot_completed: null,
    product_name: null,
    failure_reason: params.failureReason,
  };
}

export async function ensureAndroidApi34DeviceReady(
  options: EnsureOptions = {},
): Promise<AndroidApi34DeviceReadyResult> {
  const artifactDir = options.artifactDir ?? ANDROID_API34_ACCEPTANCE_DIR;
  const bootTimeoutMs = options.bootTimeoutMs ?? 180_000;
  const allowCreateAvd = options.allowCreateAvd ?? true;
  ensureDir(artifactDir);

  const adbPath = lookupExecutable("adb");
  const emulatorPath = lookupExecutable("emulator");
  const sdkmanagerPath = lookupExecutable("sdkmanager");
  const avdmanagerPath = lookupExecutable("avdmanager");
  const emulatorListAvdsResult = emulatorPath
    ? runCommandProbe(emulatorPath, ["-list-avds"], 10_000)
    : runCommandProbe("emulator", ["-list-avds"], 1000);
  let availableAvds = parseAvds(emulatorListAvdsResult);
  let sdkmanagerInstallResult: CommandProbe | null = null;
  let avdmanagerCreateResult: CommandProbe | null = null;
  const initialProcesses = listAndroidProcesses();
  const initialApi36Processes = initialProcesses.filter(isApi36Process);
  const api36CleanupResults = initialApi36Processes.map(killProcess);
  if (initialApi36Processes.length > 0) {
    await sleep(3000);
  }
  const remainingApi36Processes = listAndroidProcesses().filter(isApi36Process);

  const api34ColdBootRestartResults = listAndroidProcesses().filter(isApi34Process).map(killProcess);
  if (api34ColdBootRestartResults.length > 0) {
    await sleep(3000);
  }

  const adbTaskkillResult = taskkillAdb();
  const adbKillServerResult = adbPath ? runCommandProbe(adbPath, ["kill-server"], 10_000) : runCommandProbe("adb", ["kill-server"], 1000);
  const adbStartServerResult = adbPath ? runCommandProbe(adbPath, ["start-server"], 15_000) : runCommandProbe("adb", ["start-server"], 1000);

  const commonParams = {
    adbPath,
    emulatorPath,
    sdkmanagerPath,
    avdmanagerPath,
    emulatorListAvdsResult,
    availableAvds,
    initialApi36Processes,
    api36CleanupResults,
    api34ColdBootRestartResults,
    adbTaskkillResult,
    adbKillServerResult,
    adbStartServerResult,
    sdkmanagerInstallResult,
    avdmanagerCreateResult,
  };

  if (remainingApi36Processes.length > 0) {
    const result = buildBaseResult({
      ...commonParams,
      finalStatus: "BLOCKED_ANDROID_API36_NOT_ALLOWED_FOR_ACCEPTANCE",
      failureReason: "API36_16K_EMULATOR_STILL_RUNNING_AFTER_CLEANUP",
    });
    writeJson(artifactDir, "android_api34_environment.json", result);
    writeJson(artifactDir, "device_health.json", result);
    return result;
  }

  if (!adbPath || !emulatorPath) {
    const result = buildBaseResult({
      ...commonParams,
      finalStatus: "BLOCKED_ANDROID_API34_AVD_NOT_AVAILABLE",
      failureReason: !adbPath ? "ADB_NOT_FOUND" : "EMULATOR_NOT_FOUND",
    });
    writeJson(artifactDir, "android_api34_environment.json", result);
    writeJson(artifactDir, "device_health.json", result);
    return result;
  }

  if (!availableAvds.includes(API34_AVD_NAME)) {
    if (!allowCreateAvd || !sdkmanagerPath || !avdmanagerPath) {
      const result = buildBaseResult({
        ...commonParams,
        finalStatus: "BLOCKED_ANDROID_API34_AVD_NOT_AVAILABLE",
        failureReason: "PIXEL_7_API_34_AVD_MISSING_AND_CANNOT_CREATE",
      });
      writeJson(artifactDir, "android_api34_environment.json", result);
      writeJson(artifactDir, "device_health.json", result);
      return result;
    }

    sdkmanagerInstallResult = runCommandProbe(sdkmanagerPath, ["--install", API34_SYSTEM_IMAGE], 300_000);
    avdmanagerCreateResult = runCommandProbe(
      avdmanagerPath,
      ["create", "avd", "--name", API34_AVD_NAME, "--package", API34_SYSTEM_IMAGE, "--device", API34_DEVICE_PROFILE, "--force"],
      120_000,
    );
    availableAvds = parseAvds(runCommandProbe(emulatorPath, ["-list-avds"], 10_000));
  }

  if (!availableAvds.includes(API34_AVD_NAME)) {
    const result = buildBaseResult({
      ...commonParams,
      availableAvds,
      sdkmanagerInstallResult,
      avdmanagerCreateResult,
      finalStatus: "BLOCKED_ANDROID_API34_AVD_NOT_AVAILABLE",
      failureReason: "PIXEL_7_API_34_AVD_NOT_LISTED_AFTER_SETUP",
    });
    writeJson(artifactDir, "android_api34_environment.json", result);
    writeJson(artifactDir, "avd_setup.json", result);
    writeJson(artifactDir, "device_health.json", result);
    return result;
  }

  const emulatorStartCommand = startEmulator(emulatorPath);
  const deviceWait = await waitForSingleDevice(adbPath, bootTimeoutMs);
  const activeDevices = deviceWait.devices.filter((device) => device.state === "device");
  const device = activeDevices[0] ?? null;
  const sysBootCompleted = device ? await waitForBoot(adbPath, device.id, bootTimeoutMs) : null;
  const androidSdk = device ? Number(getProp(adbPath, device.id, "ro.build.version.sdk")) : null;
  const cpuAbi = device ? getProp(adbPath, device.id, "ro.product.cpu.abi") : null;
  const productName = device ? getProp(adbPath, device.id, "ro.product.name") : null;
  const api36DeviceDetected = androidSdk === 36 || /sdk_gphone16k|gphone16k|16k/i.test(productName ?? "");
  const healthy =
    !api36DeviceDetected &&
    activeDevices.length === 1 &&
    device?.state === "device" &&
    sysBootCompleted === "1" &&
    androidSdk === 34 &&
    cpuAbi === "x86_64";

  const result: AndroidApi34DeviceReadyResult = {
    ...buildBaseResult({
      ...commonParams,
      availableAvds,
      sdkmanagerInstallResult,
      avdmanagerCreateResult,
      finalStatus: api36DeviceDetected
        ? "BLOCKED_ANDROID_API36_NOT_ALLOWED_FOR_ACCEPTANCE"
        : healthy
          ? API34_DEVICE_READY
          : "BLOCKED_ANDROID_API34_DEVICE_NOT_READY",
      failureReason: api36DeviceDetected
        ? "API36_OR_16K_DEVICE_DETECTED_FOR_ACCEPTANCE"
        : healthy
          ? null
          : "PIXEL_7_API_34_DEVICE_NOT_HEALTHY",
    }),
    android_sdk: Number.isFinite(androidSdk) ? androidSdk : null,
    cpu_abi: cpuAbi,
    device_state: device?.state ?? null,
    device_id: device?.id ?? null,
    single_device_active: activeDevices.length === 1,
    emulator_start_attempted: true,
    emulator_start_command: emulatorStartCommand,
    adb_devices_result: deviceWait.adbDevicesResult,
    adb_devices: activeDevices,
    sys_boot_completed: sysBootCompleted,
    product_name: productName,
  };

  writeJson(artifactDir, "android_api34_environment.json", result);
  writeJson(artifactDir, "avd_setup.json", {
    avd_name: API34_AVD_NAME,
    system_image: API34_SYSTEM_IMAGE,
    device_profile: API34_DEVICE_PROFILE,
    available_avds: availableAvds,
    sdkmanager_install_result: sdkmanagerInstallResult,
    avdmanager_create_result: avdmanagerCreateResult,
    emulator_start_command: emulatorStartCommand,
  });
  writeJson(artifactDir, "device_health.json", result);
  return result;
}

async function main(): Promise<void> {
  const result = await ensureAndroidApi34DeviceReady();
  if (result.final_status !== API34_DEVICE_READY) {
    process.exitCode = 1;
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("ensureAndroidApi34DeviceReady.ts")) {
  void main();
}
