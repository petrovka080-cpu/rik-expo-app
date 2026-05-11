import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

export type AndroidDeviceState = "none" | "connected";

export type AndroidEmulatorReadyStatus =
  | "GREEN_ANDROID_EMULATOR_READY"
  | "BLOCKED_HOST_HAS_NO_ANDROID_SDK_OR_AVD";

export type AndroidEmulatorReadyResult = {
  final_status: AndroidEmulatorReadyStatus;
  adbDetected: boolean;
  emulatorDetected: boolean;
  deviceBefore: AndroidDeviceState;
  avdsFound: number;
  selectedAvd: string | null;
  bootAttempted: boolean;
  bootCompleted: boolean;
  deviceAfter: AndroidDeviceState;
  deviceId: string | null;
  animationsDisabled: boolean;
  blockedReason: string | null;
  fakePassClaimed: false;
};

export type CommandRunResult = {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
};

export type CommandRunner = (command: string, args: readonly string[]) => CommandRunResult;
export type ProcessStarter = (command: string, args: readonly string[]) => void;
export type SleepFn = (ms: number) => Promise<void>;

type EnsureAndroidEmulatorReadyOptions = {
  projectRoot?: string;
  env?: NodeJS.ProcessEnv;
  runCommand?: CommandRunner;
  startProcess?: ProcessStarter;
  sleep?: SleepFn;
  bootTimeoutMs?: number;
  pollIntervalMs?: number;
  artifactPath?: string;
};

const DEFAULT_BOOT_TIMEOUT_MS = 180_000;
const DEFAULT_POLL_INTERVAL_MS = 2_000;
const BOOTSTRAP_ARTIFACT = path.join(
  "artifacts",
  "S_AI_CORE_03A_EMULATOR_BOOTSTRAP_result.json",
);

const redactPathForDiagnostics = (value: string | null): string | null => {
  if (!value) return null;
  return value
    .replace(/C:\\Users\\[^\\]+/gi, "C:\\Users\\[redacted]")
    .replace(/\/Users\/[^/]+/gi, "/Users/[redacted]");
};

function defaultRunCommand(command: string, args: readonly string[]): CommandRunResult {
  const result = spawnSync(command, [...args], {
    encoding: "utf8",
    stdio: "pipe",
    shell: process.platform === "win32" && /\.(bat|cmd)$/i.test(command),
  });

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error instanceof Error ? result.error : undefined,
  };
}

function defaultStartProcess(command: string, args: readonly string[]): void {
  const child = spawn(command, [...args], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
}

const defaultSleep: SleepFn = async (ms) =>
  await new Promise((resolve) => setTimeout(resolve, ms));

export function parseAdbDevices(output: string): string[] {
  return output
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/))
    .filter((parts) => parts[1] === "device")
    .map((parts) => parts[0])
    .filter(Boolean);
}

export function parseAvdList(output: string): string[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function selectAndroidAvd(params: {
  avds: readonly string[];
  requestedAvd?: string;
  expectedPattern?: string;
}): string | null {
  if (params.requestedAvd && params.avds.includes(params.requestedAvd)) {
    return params.requestedAvd;
  }

  if (params.expectedPattern) {
    const patternMatch = params.avds.find((avd) => avd.includes(params.expectedPattern ?? ""));
    if (patternMatch) return patternMatch;
  }

  return params.avds[0] ?? null;
}

function detectAndroidSdkRoot(env: NodeJS.ProcessEnv): string | null {
  return (
    env.ANDROID_HOME ??
    env.ANDROID_SDK_ROOT ??
    (env.LOCALAPPDATA ? path.join(env.LOCALAPPDATA, "Android", "Sdk") : null)
  );
}

function resolveAdbPath(env: NodeJS.ProcessEnv, runCommand: CommandRunner): string | null {
  const sdkRoot = detectAndroidSdkRoot(env);
  const sdkAdb = sdkRoot
    ? path.join(sdkRoot, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb")
    : null;
  if (sdkAdb && fs.existsSync(sdkAdb)) return sdkAdb;

  const locator = process.platform === "win32" ? "where" : "which";
  const result = runCommand(locator, ["adb"]);
  if (result.status !== 0) return null;
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? null;
}

function resolveEmulatorPath(env: NodeJS.ProcessEnv, runCommand: CommandRunner): string | null {
  const sdkRoot = detectAndroidSdkRoot(env);
  const sdkEmulator = sdkRoot
    ? path.join(sdkRoot, "emulator", process.platform === "win32" ? "emulator.exe" : "emulator")
    : null;
  if (sdkEmulator && fs.existsSync(sdkEmulator)) return sdkEmulator;

  const locator = process.platform === "win32" ? "where" : "which";
  const result = runCommand(locator, ["emulator"]);
  if (result.status !== 0) return null;
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? null;
}

function runRequired(command: string, args: readonly string[], runCommand: CommandRunner): string {
  const result = runCommand(command, args);
  if (result.status !== 0 || result.error) {
    throw new Error(
      `Command failed: ${command} ${args.join(" ")} ${result.stderr || result.error?.message || ""}`.trim(),
    );
  }
  return result.stdout.trim();
}

function makeResult(params: Partial<AndroidEmulatorReadyResult>): AndroidEmulatorReadyResult {
  return {
    final_status: params.final_status ?? "BLOCKED_HOST_HAS_NO_ANDROID_SDK_OR_AVD",
    adbDetected: params.adbDetected ?? false,
    emulatorDetected: params.emulatorDetected ?? false,
    deviceBefore: params.deviceBefore ?? "none",
    avdsFound: params.avdsFound ?? 0,
    selectedAvd: params.selectedAvd ?? null,
    bootAttempted: params.bootAttempted ?? false,
    bootCompleted: params.bootCompleted ?? false,
    deviceAfter: params.deviceAfter ?? "none",
    deviceId: params.deviceId ?? null,
    animationsDisabled: params.animationsDisabled ?? false,
    blockedReason: params.blockedReason ?? null,
    fakePassClaimed: false,
  };
}

function writeBootstrapArtifact(projectRoot: string, artifactPath: string, result: AndroidEmulatorReadyResult): void {
  const fullPath = path.isAbsolute(artifactPath) ? artifactPath : path.join(projectRoot, artifactPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(
    fullPath,
    `${JSON.stringify(
      {
        ...result,
        selectedAvd: result.selectedAvd,
        adbPath: result.adbDetected ? "present_redacted" : "missing",
        emulatorPath: result.emulatorDetected ? "present_redacted" : "missing",
      },
      null,
      2,
    )}\n`,
  );
}

async function waitForDevice(params: {
  adbPath: string;
  runCommand: CommandRunner;
  sleep: SleepFn;
  timeoutMs: number;
  pollIntervalMs: number;
}): Promise<string | null> {
  const deadline = Date.now() + params.timeoutMs;
  while (Date.now() < deadline) {
    const devices = parseAdbDevices(runRequired(params.adbPath, ["devices"], params.runCommand));
    if (devices.length > 0) return devices[0];
    await params.sleep(params.pollIntervalMs);
  }
  return null;
}

async function waitForBootCompleted(params: {
  adbPath: string;
  deviceId: string;
  runCommand: CommandRunner;
  sleep: SleepFn;
  timeoutMs: number;
  pollIntervalMs: number;
}): Promise<boolean> {
  const deadline = Date.now() + params.timeoutMs;
  while (Date.now() < deadline) {
    const bootCompleted = runRequired(
      params.adbPath,
      ["-s", params.deviceId, "shell", "getprop", "sys.boot_completed"],
      params.runCommand,
    ).trim();
    if (bootCompleted === "1") return true;
    await params.sleep(params.pollIntervalMs);
  }
  return false;
}

function disableAnimations(params: {
  adbPath: string;
  deviceId: string;
  runCommand: CommandRunner;
}): boolean {
  for (const key of ["window_animation_scale", "transition_animation_scale", "animator_duration_scale"]) {
    runRequired(params.adbPath, ["-s", params.deviceId, "shell", "settings", "put", "global", key, "0"], params.runCommand);
  }
  return true;
}

export async function ensureAndroidEmulatorReady(
  options: EnsureAndroidEmulatorReadyOptions = {},
): Promise<AndroidEmulatorReadyResult> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const env = options.env ?? process.env;
  const runCommand = options.runCommand ?? defaultRunCommand;
  const startProcess = options.startProcess ?? defaultStartProcess;
  const sleep = options.sleep ?? defaultSleep;
  const bootTimeoutMs = options.bootTimeoutMs ?? Number(env.E2E_ANDROID_BOOT_TIMEOUT_MS ?? DEFAULT_BOOT_TIMEOUT_MS);
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const artifactPath = options.artifactPath ?? BOOTSTRAP_ARTIFACT;

  const adbPath = resolveAdbPath(env, runCommand);
  if (!adbPath) {
    const result = makeResult({ blockedReason: "adb binary was not detected." });
    writeBootstrapArtifact(projectRoot, artifactPath, result);
    return result;
  }

  const initialDevices = parseAdbDevices(runRequired(adbPath, ["devices"], runCommand));
  const deviceBefore: AndroidDeviceState = initialDevices.length > 0 ? "connected" : "none";
  if (initialDevices.length > 0) {
    const deviceId = initialDevices[0];
    const animationsDisabled = disableAnimations({ adbPath, deviceId, runCommand });
    const result = makeResult({
      final_status: "GREEN_ANDROID_EMULATOR_READY",
      adbDetected: true,
      emulatorDetected: true,
      deviceBefore,
      deviceAfter: "connected",
      deviceId,
      animationsDisabled,
    });
    writeBootstrapArtifact(projectRoot, artifactPath, result);
    return result;
  }

  const emulatorPath = resolveEmulatorPath(env, runCommand);
  if (!emulatorPath) {
    const result = makeResult({
      adbDetected: true,
      deviceBefore,
      blockedReason: "Android emulator binary was not detected.",
    });
    writeBootstrapArtifact(projectRoot, artifactPath, result);
    return result;
  }

  const avds = parseAvdList(runRequired(emulatorPath, ["-list-avds"], runCommand));
  const selectedAvd = selectAndroidAvd({
    avds,
    requestedAvd: env.E2E_ANDROID_AVD_NAME,
    expectedPattern: env.MAESTRO_EXPECTED_AVD_PATTERN ?? "API_34",
  });

  if (!selectedAvd) {
    const result = makeResult({
      adbDetected: true,
      emulatorDetected: true,
      deviceBefore,
      avdsFound: avds.length,
      blockedReason: "No Android Virtual Device was available for e2e execution.",
    });
    writeBootstrapArtifact(projectRoot, artifactPath, result);
    return result;
  }

  startProcess(emulatorPath, ["-avd", selectedAvd, "-no-snapshot-save"]);

  const deviceId = await waitForDevice({
    adbPath,
    runCommand,
    sleep,
    timeoutMs: bootTimeoutMs,
    pollIntervalMs,
  });

  if (!deviceId) {
    const result = makeResult({
      adbDetected: true,
      emulatorDetected: true,
      deviceBefore,
      avdsFound: avds.length,
      selectedAvd,
      bootAttempted: true,
      blockedReason: "Emulator boot did not expose an adb device before timeout.",
    });
    writeBootstrapArtifact(projectRoot, artifactPath, result);
    return result;
  }

  const bootCompleted = await waitForBootCompleted({
    adbPath,
    deviceId,
    runCommand,
    sleep,
    timeoutMs: bootTimeoutMs,
    pollIntervalMs,
  });

  const animationsDisabled = bootCompleted
    ? disableAnimations({ adbPath, deviceId, runCommand })
    : false;

  const result = makeResult({
    final_status: bootCompleted ? "GREEN_ANDROID_EMULATOR_READY" : "BLOCKED_HOST_HAS_NO_ANDROID_SDK_OR_AVD",
    adbDetected: true,
    emulatorDetected: true,
    deviceBefore,
    avdsFound: avds.length,
    selectedAvd: redactPathForDiagnostics(selectedAvd),
    bootAttempted: true,
    bootCompleted,
    deviceAfter: bootCompleted ? "connected" : "none",
    deviceId: bootCompleted ? deviceId : null,
    animationsDisabled,
    blockedReason: bootCompleted ? null : "Emulator sys.boot_completed did not become 1 before timeout.",
  });
  writeBootstrapArtifact(projectRoot, artifactPath, result);
  return result;
}

if (require.main === module) {
  void ensureAndroidEmulatorReady().then((result) => {
    console.info(JSON.stringify(result, null, 2));
    if (result.final_status !== "GREEN_ANDROID_EMULATOR_READY") {
      process.exitCode = 1;
    }
  });
}
