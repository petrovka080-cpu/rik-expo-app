import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

export type CommandProbe = {
  command: string;
  args: string[];
  stdout: string;
  stderr: string;
  exit_code: number | null;
  duration_ms: number;
  timed_out: boolean;
  error: string | null;
};

export type AndroidDeviceInfo = {
  id: string;
  state: string;
  raw: string;
  is_emulator: boolean;
};

export type AndroidAdbDiagnosis = {
  timestamp: string;
  platform: NodeJS.Platform;
  os_release: string;
  ANDROID_HOME: string | null;
  ANDROID_SDK_ROOT: string | null;
  adb_path: string | null;
  adb_version: CommandProbe;
  emulator_path: string | null;
  java_version: CommandProbe;
  node_version: string;
  expo_version: CommandProbe;
  adb_server_state: {
    initial_devices_timed_out: boolean;
    restart_attempted: boolean;
    retry_devices_timed_out: boolean;
  };
  adb_devices_stdout: string;
  adb_devices_stderr: string;
  adb_devices_exit_code: number | null;
  adb_devices_duration_ms: number;
  adb_devices_command_completed: boolean;
  adb_kill_server_result: CommandProbe | null;
  adb_start_server_result: CommandProbe | null;
  adb_devices_retry_result: CommandProbe | null;
  emulator_list_avds_result: CommandProbe;
  running_emulator_processes: string[];
  metro_processes: string[];
  dev_client_processes: string[];
  android_devices: AndroidDeviceInfo[];
  android_emulators: AndroidDeviceInfo[];
  selected_device_id: string | null;
  android_emulator_detected: boolean;
  failure_reason: string | null;
};

function normalizeOutput(value: unknown): string {
  if (typeof value === "string") return value;
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  return "";
}

export function runCommandProbe(command: string, args: string[] = [], timeoutMs = 10_000): CommandProbe {
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: timeoutMs,
    windowsHide: true,
  });
  const error = result.error as (Error & { code?: string }) | undefined;
  const timedOut = error?.code === "ETIMEDOUT" || result.signal === "SIGTERM";
  return {
    command,
    args,
    stdout: normalizeOutput(result.stdout),
    stderr: normalizeOutput(result.stderr),
    exit_code: typeof result.status === "number" ? result.status : null,
    duration_ms: Date.now() - started,
    timed_out: timedOut,
    error: error?.message ?? null,
  };
}

function lookupExecutable(command: string): string | null {
  const lookup =
    process.platform === "win32"
      ? runCommandProbe("where", [command], 5000)
      : runCommandProbe("which", [command], 5000);
  const found = lookup.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)[0] ?? null;
  if (lookup.exit_code === 0 && !lookup.timed_out && found) return found;

  const sdkRoot = process.env.ANDROID_SDK_ROOT ?? process.env.ANDROID_HOME;
  if (!sdkRoot) return null;
  const sdkCandidate =
    command === "adb"
      ? path.join(sdkRoot, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb")
      : command === "emulator"
        ? path.join(sdkRoot, "emulator", process.platform === "win32" ? "emulator.exe" : "emulator")
        : null;
  return sdkCandidate;
}

export function parseAdbDevices(stdout: string): AndroidDeviceInfo[] {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^List of devices attached/i.test(line))
    .map((line) => {
      const [id = "", state = "unknown"] = line.split(/\s+/);
      return {
        id,
        state,
        raw: line,
        is_emulator: /^emulator-\d+$/i.test(id),
      };
    })
    .filter((device) => device.id.length > 0);
}

function listProcesses(): string[] {
  if (process.platform === "win32") {
    const probe = runCommandProbe("tasklist", ["/FO", "CSV", "/NH"], 10_000);
    if (probe.exit_code !== 0 || probe.timed_out) return [];
    return probe.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  const probe = runCommandProbe("ps", ["-eo", "pid,comm,args"], 10_000);
  if (probe.exit_code !== 0 || probe.timed_out) return [];
  return probe.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function processMatches(lines: string[], pattern: RegExp): string[] {
  return lines.filter((line) => pattern.test(line)).slice(0, 80);
}

function classifyFailure(finalDevices: CommandProbe, devices: AndroidDeviceInfo[]): string | null {
  if (finalDevices.timed_out) return "adb_devices_hang";
  if (finalDevices.exit_code !== 0) return "adb_devices_command_failed";
  if (!devices.some((device) => device.is_emulator && device.state === "device")) {
    return "no_android_emulator_detected";
  }
  return null;
}

export function diagnoseAndroidAdb(options: { adbTimeoutMs?: number } = {}): AndroidAdbDiagnosis {
  const timeoutMs = options.adbTimeoutMs ?? 8_000;
  const adbPath = lookupExecutable("adb");
  const emulatorPath = lookupExecutable("emulator");
  const allProcesses = listProcesses();

  const adbCommand = adbPath ?? "adb";
  const emulatorCommand = emulatorPath ?? "emulator";
  const adbVersion = runCommandProbe(adbCommand, ["version"], 8000);
  const initialDevices = runCommandProbe(adbCommand, ["devices", "-l"], timeoutMs);
  let killServer: CommandProbe | null = null;
  let startServer: CommandProbe | null = null;
  let retryDevices: CommandProbe | null = null;
  let finalDevices = initialDevices;

  if (initialDevices.timed_out) {
    killServer = runCommandProbe(adbCommand, ["kill-server"], 10_000);
    startServer = runCommandProbe(adbCommand, ["start-server"], 15_000);
    retryDevices = runCommandProbe(adbCommand, ["devices", "-l"], timeoutMs);
    finalDevices = retryDevices;
  }

  const androidDevices = parseAdbDevices(finalDevices.stdout);
  const androidEmulators = androidDevices.filter((device) => device.is_emulator && device.state === "device");
  const emulatorListAvds = runCommandProbe(emulatorCommand, ["-list-avds"], 10_000);
  const javaVersion = runCommandProbe("java", ["-version"], 8000);
  const expoVersion =
    process.platform === "win32"
      ? runCommandProbe("cmd.exe", ["/d", "/s", "/c", "npx expo --version"], 20_000)
      : runCommandProbe("npx", ["expo", "--version"], 20_000);

  return {
    timestamp: new Date().toISOString(),
    platform: process.platform,
    os_release: os.release(),
    ANDROID_HOME: process.env.ANDROID_HOME ?? null,
    ANDROID_SDK_ROOT: process.env.ANDROID_SDK_ROOT ?? null,
    adb_path: adbPath,
    adb_version: adbVersion,
    emulator_path: emulatorPath,
    java_version: javaVersion,
    node_version: process.version,
    expo_version: expoVersion,
    adb_server_state: {
      initial_devices_timed_out: initialDevices.timed_out,
      restart_attempted: initialDevices.timed_out,
      retry_devices_timed_out: retryDevices?.timed_out ?? false,
    },
    adb_devices_stdout: finalDevices.stdout,
    adb_devices_stderr: finalDevices.stderr,
    adb_devices_exit_code: finalDevices.exit_code,
    adb_devices_duration_ms: finalDevices.duration_ms,
    adb_devices_command_completed: !finalDevices.timed_out,
    adb_kill_server_result: killServer,
    adb_start_server_result: startServer,
    adb_devices_retry_result: retryDevices,
    emulator_list_avds_result: emulatorListAvds,
    running_emulator_processes: processMatches(allProcesses, /emulator|qemu-system/i),
    metro_processes: processMatches(allProcesses, /metro|expo|react-native|node/i),
    dev_client_processes: processMatches(allProcesses, /expo|rikexpoapp|dev-client/i),
    android_devices: androidDevices,
    android_emulators: androidEmulators,
    selected_device_id: androidEmulators[0]?.id ?? null,
    android_emulator_detected: androidEmulators.length > 0,
    failure_reason: classifyFailure(finalDevices, androidDevices),
  };
}

export function relativeArtifactPath(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}
