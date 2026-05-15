import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

import { redactE2eSecrets } from "./redactE2eSecrets";

export type AndroidMaestroDriverPreflightStatus =
  | "GREEN_ANDROID_MAESTRO_DRIVER_PREFLIGHT_READY"
  | "BLOCKED_HOST_HAS_NO_ANDROID_SDK_OR_AVD"
  | "BLOCKED_ANDROID_MAESTRO_API34_AVD_NOT_AVAILABLE"
  | "BLOCKED_ANDROID_ADB_RUNTIME_UNSTABLE"
  | "BLOCKED_ANDROID_APK_NOT_INSTALLED";

export type AndroidMaestroDriverPreflightArtifact = {
  wave: "S_ANDROID_MAESTRO_DRIVER_STABILITY_REPAIR";
  runId: string;
  startedAt: string;
  finishedAt: string;
  final_status: AndroidMaestroDriverPreflightStatus;
  exact_reason: string | null;
  preferred_avd_name: string;
  selected_avd: string | null;
  selected_serial: string | null;
  selected_android_api_level: string | null;
  selected_device_model: string | null;
  avds_found: string[];
  connected_devices_before: string[];
  connected_devices_after: string[];
  maestro_version: string | null;
  adb_version: string | null;
  adb_path: "present_redacted" | "missing";
  emulator_path: "present_redacted" | "missing";
  maestro_path: "present_redacted" | "missing";
  maestro_driver_startup_timeout_ms: 180000;
  port_7001_preflight: string[];
  port_7001_after_cleanup: string[];
  stale_maestro_processes_killed: number;
  port_7001_maestro_processes_killed: number;
  device_maestro_packages_before: string[];
  device_maestro_packages_uninstalled: string[];
  device_maestro_packages_reinstalled: boolean;
  app_install_status: "PASS" | "ALREADY_INSTALLED" | "BLOCKED_APK_MISSING" | "BLOCKED_INSTALL_FAILED";
  app_installed_on_selected_device: boolean;
  explicit_device_serial_used: boolean;
  fake_green_claimed: false;
  artifact_path: string;
};

export type AndroidMaestroRunResult = {
  stdout: string;
  stderr: string;
  deviceId: string;
  selectedAvd: string | null;
  androidApiLevel: string | null;
  maestroVersion: string | null;
  preflightArtifactPath: string;
  debugOutputDir: string;
  testOutputDir: string;
  firstAttemptDriverFailure: boolean;
  retryAttempted: boolean;
};

export class AndroidMaestroDriverRunError extends Error {
  readonly driverUnavailable: boolean;
  readonly adbRuntimeUnstable: boolean;
  readonly retryAttempted: boolean;
  readonly firstAttemptDriverFailure: boolean;
  readonly preflight: AndroidMaestroDriverPreflightArtifact | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly status: number | null;

  constructor(params: {
    message: string;
    driverUnavailable: boolean;
    adbRuntimeUnstable: boolean;
    retryAttempted: boolean;
    firstAttemptDriverFailure: boolean;
    preflight: AndroidMaestroDriverPreflightArtifact | null;
    stdout: string;
    stderr: string;
    status: number | null;
  }) {
    super(params.message);
    this.name = "AndroidMaestroDriverRunError";
    this.driverUnavailable = params.driverUnavailable;
    this.adbRuntimeUnstable = params.adbRuntimeUnstable;
    this.retryAttempted = params.retryAttempted;
    this.firstAttemptDriverFailure = params.firstAttemptDriverFailure;
    this.preflight = params.preflight;
    this.stdout = params.stdout;
    this.stderr = params.stderr;
    this.status = params.status;
  }
}

type CommandRunResult = {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
};

type EnsureAndroidMaestroDriverReadyOptions = {
  projectRoot?: string;
  runId?: string;
  preferredAvdName?: string;
  launchIfNeeded?: boolean;
  uninstallDeviceMaestroPackages?: boolean;
  ensureAppInstalled?: boolean;
};

type RunMaestroTestWithDriverRepairOptions = {
  projectRoot?: string;
  runId?: string;
  flowPaths: readonly string[];
  env?: Record<string, string>;
  secrets?: readonly string[];
  timeoutMs?: number;
  maestroBinary?: string;
  deviceId?: string;
  preflight?: AndroidMaestroDriverPreflightArtifact;
  reportPath?: string;
  extraArgs?: readonly string[];
};

const wave = "S_ANDROID_MAESTRO_DRIVER_STABILITY_REPAIR";
const artifactRelativePath = path.join("artifacts", `${wave}_preflight.json`);
const defaultAppId = "com.azisbek_dzhantaev.rikexpoapp";
const defaultDriverStartupTimeoutMs = 180_000;
const bootTimeoutMs = 180_000;
const pollIntervalMs = 2_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function commandShell(command: string): boolean {
  return process.platform === "win32" && /\.(bat|cmd)$/i.test(command);
}

function runCommand(
  command: string,
  args: readonly string[] = [],
  options: {
    projectRoot?: string;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
    maxBuffer?: number;
  } = {},
): CommandRunResult {
  const result = spawnSync(command, [...args], {
    cwd: options.projectRoot ?? process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
    shell: commandShell(command),
    timeout: options.timeoutMs ?? 120_000,
    killSignal: "SIGTERM",
    maxBuffer: options.maxBuffer ?? 16 * 1024 * 1024,
    env: options.env ?? process.env,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error instanceof Error ? result.error : undefined,
  };
}

function runRequired(
  command: string,
  args: readonly string[],
  options: Parameters<typeof runCommand>[2] = {},
): string {
  const result = runCommand(command, args, options);
  if (result.error || result.status !== 0) {
    throw new Error(
      `Command failed: ${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}\n${result.error?.message ?? ""}`.trim(),
    );
  }
  return result.stdout.trim();
}

function detectAndroidSdkRoot(env: NodeJS.ProcessEnv): string | null {
  return (
    env.ANDROID_HOME ??
    env.ANDROID_SDK_ROOT ??
    (env.LOCALAPPDATA ? path.join(env.LOCALAPPDATA, "Android", "Sdk") : null)
  );
}

function resolveAdbPath(env: NodeJS.ProcessEnv): string | null {
  const sdkRoot = detectAndroidSdkRoot(env);
  const sdkAdb = sdkRoot
    ? path.join(sdkRoot, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb")
    : null;
  if (sdkAdb && fs.existsSync(sdkAdb)) return sdkAdb;
  const locator = process.platform === "win32" ? "where" : "which";
  const found = runCommand(locator, ["adb"]);
  if (found.status !== 0) return null;
  return found.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? null;
}

function resolveEmulatorPath(env: NodeJS.ProcessEnv): string | null {
  const sdkRoot = detectAndroidSdkRoot(env);
  const sdkEmulator = sdkRoot
    ? path.join(sdkRoot, "emulator", process.platform === "win32" ? "emulator.exe" : "emulator")
    : null;
  if (sdkEmulator && fs.existsSync(sdkEmulator)) return sdkEmulator;
  const locator = process.platform === "win32" ? "where" : "which";
  const found = runCommand(locator, ["emulator"]);
  if (found.status !== 0) return null;
  return found.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? null;
}

export function resolveMaestroBinary(env: NodeJS.ProcessEnv = process.env): string {
  return (
    env.MAESTRO_CLI_PATH ??
    path.join(
      env.LOCALAPPDATA ?? "",
      "maestro-cli",
      "maestro",
      "bin",
      process.platform === "win32" ? "maestro.bat" : "maestro",
    )
  );
}

function parseAvdList(output: string): string[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseAdbDevices(output: string): string[] {
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

function selectApi34Avd(avds: readonly string[], preferredAvdName: string): string | null {
  if (avds.includes(preferredAvdName)) return preferredAvdName;
  const pixelFallback = avds.find((avd) => avd === "Pixel_7_API_34");
  if (pixelFallback) return pixelFallback;
  return avds.find((avd) => /api[_-]?34|android[_-]?34/i.test(avd)) ?? null;
}

function readDeviceProp(adbPath: string, serial: string, prop: string, projectRoot: string): string | null {
  const result = runCommand(adbPath, ["-s", serial, "shell", "getprop", prop], { projectRoot, timeoutMs: 30_000 });
  if (result.status !== 0) return null;
  return result.stdout.trim() || null;
}

function readConnectedDevices(adbPath: string, projectRoot: string): string[] {
  const result = runCommand(adbPath, ["devices"], { projectRoot, timeoutMs: 30_000 });
  if (result.status !== 0) return [];
  return parseAdbDevices(result.stdout);
}

function readDeviceApiLevel(adbPath: string, serial: string, projectRoot: string): string | null {
  return readDeviceProp(adbPath, serial, "ro.build.version.sdk", projectRoot);
}

function readDeviceModel(adbPath: string, serial: string, projectRoot: string): string | null {
  return readDeviceProp(adbPath, serial, "ro.product.model", projectRoot);
}

function readBootCompleted(adbPath: string, serial: string, projectRoot: string): boolean {
  return readDeviceProp(adbPath, serial, "sys.boot_completed", projectRoot) === "1";
}

function findConnectedApi34Device(adbPath: string, projectRoot: string): string | null {
  const requestedSerial = String(process.env.S_ANDROID_MAESTRO_SERIAL ?? "").trim();
  const devices = readConnectedDevices(adbPath, projectRoot);
  if (requestedSerial && devices.includes(requestedSerial)) {
    const requestedApi = readDeviceApiLevel(adbPath, requestedSerial, projectRoot);
    if (requestedApi === "34" && readBootCompleted(adbPath, requestedSerial, projectRoot)) return requestedSerial;
  }
  for (const serial of devices) {
    if (readDeviceApiLevel(adbPath, serial, projectRoot) === "34" && readBootCompleted(adbPath, serial, projectRoot)) {
      return serial;
    }
  }
  return null;
}

function startEmulator(emulatorPath: string, avdName: string): void {
  const child = spawn(
    emulatorPath,
    ["-avd", avdName, "-no-window", "-no-audio", "-gpu", "swiftshader_indirect", "-no-snapshot"],
    {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    },
  );
  child.unref();
}

async function waitForApi34Boot(adbPath: string, projectRoot: string): Promise<string | null> {
  const deadline = Date.now() + bootTimeoutMs;
  while (Date.now() < deadline) {
    const serial = findConnectedApi34Device(adbPath, projectRoot);
    if (serial) return serial;
    await sleep(pollIntervalMs);
  }
  return null;
}

function disableAnimations(adbPath: string, serial: string, projectRoot: string): void {
  for (const key of ["window_animation_scale", "transition_animation_scale", "animator_duration_scale"]) {
    runCommand(adbPath, ["-s", serial, "shell", "settings", "put", "global", key, "0"], {
      projectRoot,
      timeoutMs: 30_000,
    });
  }
}

function readMaestroVersion(maestroBinary: string, projectRoot: string): string | null {
  if (!fs.existsSync(maestroBinary)) return null;
  const result = runCommand(maestroBinary, ["--version"], { projectRoot, timeoutMs: 45_000 });
  const output = `${result.stdout}\n${result.stderr}`;
  const versions = output.match(/\b\d+\.\d+\.\d+\b/g);
  return versions?.[versions.length - 1] ?? output.trim().split(/\r?\n/).findLast((line) => line.trim())?.trim() ?? null;
}

function readAdbVersion(adbPath: string, projectRoot: string): string | null {
  const result = runCommand(adbPath, ["version"], { projectRoot, timeoutMs: 30_000 });
  if (result.status !== 0) return null;
  const lines = result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.join(" | ") || null;
}

function runPowerShell(command: string, projectRoot: string): string {
  if (process.platform !== "win32") return "";
  const result = runCommand(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
    { projectRoot, timeoutMs: 60_000 },
  );
  return `${result.stdout}\n${result.stderr}`.trim();
}

function cleanupStaleMaestroProcesses(projectRoot: string): number {
  const command = [
    "$matches = Get-CimInstance Win32_Process | Where-Object {",
    "  $_.ProcessId -ne $PID -and",
    "  $_.Name -match 'java|maestro' -and",
    "  ($_.CommandLine -match 'maestro\\.cli\\.AppKt|mobile-dev-inc|maestro-cli')",
    "};",
    "$matches | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue };",
    "($matches | Measure-Object).Count",
  ].join(" ");
  const output = runPowerShell(command, projectRoot);
  const count = Number(output.match(/\d+/)?.[0] ?? 0);
  return Number.isFinite(count) ? count : 0;
}

function readPort7001Lines(projectRoot: string): string[] {
  const result = runCommand("netstat", ["-ano"], { projectRoot, timeoutMs: 30_000 });
  if (result.status !== 0) return [];
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes(":7001"));
}

function processCommandLineForPid(pid: string, projectRoot: string): string {
  if (process.platform !== "win32") return "";
  return runPowerShell(
    `Get-CimInstance Win32_Process -Filter "ProcessId=${pid}" | Select-Object -ExpandProperty CommandLine`,
    projectRoot,
  );
}

function cleanupMaestroPort7001(projectRoot: string): number {
  const pids = new Set(
    readPort7001Lines(projectRoot)
      .map((line) => line.split(/\s+/).filter(Boolean).at(-1) ?? "")
      .filter((pid) => /^\d+$/.test(pid)),
  );
  let killed = 0;
  for (const pid of pids) {
    const commandLine = processCommandLineForPid(pid, projectRoot);
    if (!/maestro\.cli\.AppKt|mobile-dev-inc|maestro-cli/i.test(commandLine)) continue;
    runPowerShell(`Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue`, projectRoot);
    killed += 1;
  }
  return killed;
}

function listDeviceMaestroPackages(adbPath: string, serial: string, projectRoot: string): string[] {
  const result = runCommand(adbPath, ["-s", serial, "shell", "pm", "list", "packages"], {
    projectRoot,
    timeoutMs: 45_000,
  });
  if (result.status !== 0) return [];
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.replace(/^package:/, "").trim())
    .filter((line) => /maestro/i.test(line));
}

function uninstallDeviceMaestroPackages(
  adbPath: string,
  serial: string,
  projectRoot: string,
  packages: readonly string[],
): string[] {
  const uninstalled: string[] = [];
  for (const pkg of packages) {
    const result = runCommand(adbPath, ["-s", serial, "uninstall", pkg], { projectRoot, timeoutMs: 60_000 });
    if (result.status === 0 || /Success/i.test(`${result.stdout}\n${result.stderr}`)) {
      uninstalled.push(pkg);
    }
  }
  return uninstalled;
}

function readCoreApkPath(projectRoot: string): string | null {
  const coreAndroidPath = path.join(projectRoot, "artifacts", "S_RELEASE_CORE_01_ANDROID_EMULATOR_IOS_SUBMIT_android.json");
  if (!fs.existsSync(coreAndroidPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(coreAndroidPath, "utf8")) as { artifact_path?: unknown };
    const relative = typeof parsed.artifact_path === "string" ? parsed.artifact_path.trim() : "";
    return relative ? path.join(projectRoot, relative) : null;
  } catch {
    return null;
  }
}

function resolveExistingApkPath(projectRoot: string): string | null {
  const candidates = [
    readCoreApkPath(projectRoot),
    path.join(projectRoot, "artifacts", "release", "android-emulator.apk"),
    path.join(projectRoot, "android", "app", "build", "outputs", "apk", "release", "app-release.apk"),
  ].filter((candidate): candidate is string => Boolean(candidate));
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function ensureAppInstalledOnDevice(adbPath: string, serial: string, projectRoot: string): AndroidMaestroDriverPreflightArtifact["app_install_status"] {
  const packageProbe = runCommand(adbPath, ["-s", serial, "shell", "pm", "path", defaultAppId], {
    projectRoot,
    timeoutMs: 45_000,
  });
  if (packageProbe.status === 0 && packageProbe.stdout.includes(defaultAppId)) return "ALREADY_INSTALLED";

  const apkPath = resolveExistingApkPath(projectRoot);
  if (!apkPath) return "BLOCKED_APK_MISSING";
  const install = runCommand(adbPath, ["-s", serial, "install", "-r", apkPath], {
    projectRoot,
    timeoutMs: 180_000,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (install.status !== 0) return "BLOCKED_INSTALL_FAILED";
  const verify = runCommand(adbPath, ["-s", serial, "shell", "pm", "path", defaultAppId], {
    projectRoot,
    timeoutMs: 45_000,
  });
  return verify.status === 0 && verify.stdout.includes(defaultAppId) ? "PASS" : "BLOCKED_INSTALL_FAILED";
}

function writePreflightArtifact(projectRoot: string, artifact: AndroidMaestroDriverPreflightArtifact): void {
  const fullPath = path.isAbsolute(artifact.artifact_path)
    ? artifact.artifact_path
    : path.join(projectRoot, artifact.artifact_path);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
}

function buildBlockedPreflight(params: {
  projectRoot: string;
  runId: string;
  startedAt: string;
  status: AndroidMaestroDriverPreflightStatus;
  exactReason: string;
  preferredAvdName: string;
  selectedAvd?: string | null;
  avds?: string[];
  connectedBefore?: string[];
  maestroVersion?: string | null;
  adbVersion?: string | null;
  adbPathPresent?: boolean;
  emulatorPathPresent?: boolean;
  maestroPathPresent?: boolean;
  port7001Before?: string[];
  staleKilled?: number;
  portKilled?: number;
}): AndroidMaestroDriverPreflightArtifact {
  const artifact: AndroidMaestroDriverPreflightArtifact = {
    wave,
    runId: params.runId,
    startedAt: params.startedAt,
    finishedAt: new Date().toISOString(),
    final_status: params.status,
    exact_reason: params.exactReason,
    preferred_avd_name: params.preferredAvdName,
    selected_avd: params.selectedAvd ?? null,
    selected_serial: null,
    selected_android_api_level: null,
    selected_device_model: null,
    avds_found: params.avds ?? [],
    connected_devices_before: params.connectedBefore ?? [],
    connected_devices_after: params.connectedBefore ?? [],
    maestro_version: params.maestroVersion ?? null,
    adb_version: params.adbVersion ?? null,
    adb_path: params.adbPathPresent ? "present_redacted" : "missing",
    emulator_path: params.emulatorPathPresent ? "present_redacted" : "missing",
    maestro_path: params.maestroPathPresent ? "present_redacted" : "missing",
    maestro_driver_startup_timeout_ms: defaultDriverStartupTimeoutMs,
    port_7001_preflight: params.port7001Before ?? [],
    port_7001_after_cleanup: [],
    stale_maestro_processes_killed: params.staleKilled ?? 0,
    port_7001_maestro_processes_killed: params.portKilled ?? 0,
    device_maestro_packages_before: [],
    device_maestro_packages_uninstalled: [],
    device_maestro_packages_reinstalled: false,
    app_install_status: "BLOCKED_APK_MISSING",
    app_installed_on_selected_device: false,
    explicit_device_serial_used: false,
    fake_green_claimed: false,
    artifact_path: artifactRelativePath,
  };
  writePreflightArtifact(params.projectRoot, artifact);
  return artifact;
}

export async function ensureAndroidMaestroDriverReady(
  options: EnsureAndroidMaestroDriverReadyOptions = {},
): Promise<AndroidMaestroDriverPreflightArtifact> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const runId = options.runId ?? `${wave}_${new Date().toISOString().replace(/[:.]/g, "")}`;
  const startedAt = new Date().toISOString();
  const preferredAvdName =
    options.preferredAvdName ??
    process.env.S_ANDROID_MAESTRO_AVD_NAME ??
    "Medium_Phone_API_34_Maestro";
  const launchIfNeeded = options.launchIfNeeded ?? true;
  const uninstallPackages = options.uninstallDeviceMaestroPackages ?? true;
  const ensureAppInstalled = options.ensureAppInstalled ?? true;

  process.env.MAESTRO_DRIVER_STARTUP_TIMEOUT = String(defaultDriverStartupTimeoutMs);

  const maestroBinary = resolveMaestroBinary();
  const maestroVersion = readMaestroVersion(maestroBinary, projectRoot);
  const staleKilled = cleanupStaleMaestroProcesses(projectRoot);
  const port7001Before = readPort7001Lines(projectRoot);
  const portKilled = cleanupMaestroPort7001(projectRoot);
  const port7001AfterCleanup = readPort7001Lines(projectRoot);

  const adbPath = resolveAdbPath(process.env);
  const emulatorPath = resolveEmulatorPath(process.env);
  if (!adbPath || !emulatorPath) {
    return buildBlockedPreflight({
      projectRoot,
      runId,
      startedAt,
      status: "BLOCKED_HOST_HAS_NO_ANDROID_SDK_OR_AVD",
      exactReason: "Android SDK adb or emulator binary was not detected.",
      preferredAvdName,
      maestroVersion,
      adbPathPresent: Boolean(adbPath),
      emulatorPathPresent: Boolean(emulatorPath),
      maestroPathPresent: fs.existsSync(maestroBinary),
      port7001Before,
      staleKilled,
      portKilled,
    });
  }

  const adbVersion = readAdbVersion(adbPath, projectRoot);
  runCommand(adbPath, ["start-server"], { projectRoot, timeoutMs: 45_000 });
  const connectedBefore = readConnectedDevices(adbPath, projectRoot);
  const avds = parseAvdList(runRequired(emulatorPath, ["-list-avds"], { projectRoot, timeoutMs: 45_000 }));
  const selectedAvd = selectApi34Avd(avds, preferredAvdName);
  if (!selectedAvd) {
    return buildBlockedPreflight({
      projectRoot,
      runId,
      startedAt,
      status: "BLOCKED_ANDROID_MAESTRO_API34_AVD_NOT_AVAILABLE",
      exactReason: "No Android API 34 AVD is available for the Maestro mandatory matrix gate.",
      preferredAvdName,
      avds,
      connectedBefore,
      maestroVersion,
      adbVersion,
      adbPathPresent: true,
      emulatorPathPresent: true,
      maestroPathPresent: fs.existsSync(maestroBinary),
      port7001Before,
      staleKilled,
      portKilled,
    });
  }

  let selectedSerial = findConnectedApi34Device(adbPath, projectRoot);
  if (!selectedSerial && launchIfNeeded) {
    startEmulator(emulatorPath, selectedAvd);
    await sleep(8_000);
    selectedSerial = await waitForApi34Boot(adbPath, projectRoot);
  }

  if (!selectedSerial) {
    return buildBlockedPreflight({
      projectRoot,
      runId,
      startedAt,
      status: "BLOCKED_ANDROID_ADB_RUNTIME_UNSTABLE",
      exactReason: `Android API 34 AVD ${selectedAvd} did not expose a boot-completed adb device before timeout.`,
      preferredAvdName,
      selectedAvd,
      avds,
      connectedBefore,
      maestroVersion,
      adbVersion,
      adbPathPresent: true,
      emulatorPathPresent: true,
      maestroPathPresent: fs.existsSync(maestroBinary),
      port7001Before,
      staleKilled,
      portKilled,
    });
  }

  disableAnimations(adbPath, selectedSerial, projectRoot);
  const apiLevel = readDeviceApiLevel(adbPath, selectedSerial, projectRoot);
  const model = readDeviceModel(adbPath, selectedSerial, projectRoot);
  const packagesBefore = uninstallPackages
    ? listDeviceMaestroPackages(adbPath, selectedSerial, projectRoot)
    : [];
  const packagesUninstalled = uninstallPackages
    ? uninstallDeviceMaestroPackages(adbPath, selectedSerial, projectRoot, packagesBefore)
    : [];
  const appInstallStatus = ensureAppInstalled
    ? ensureAppInstalledOnDevice(adbPath, selectedSerial, projectRoot)
    : "ALREADY_INSTALLED";
  const appInstalled = appInstallStatus === "PASS" || appInstallStatus === "ALREADY_INSTALLED";
  const finalStatus: AndroidMaestroDriverPreflightStatus = appInstalled
    ? "GREEN_ANDROID_MAESTRO_DRIVER_PREFLIGHT_READY"
    : "BLOCKED_ANDROID_APK_NOT_INSTALLED";

  process.env.S_ANDROID_MAESTRO_SERIAL = selectedSerial;
  process.env.S_ANDROID_MAESTRO_SELECTED_AVD = selectedAvd;
  process.env.S_ANDROID_MAESTRO_ANDROID_API_LEVEL = apiLevel ?? "";
  process.env.ANDROID_SERIAL = selectedSerial;

  const artifact: AndroidMaestroDriverPreflightArtifact = {
    wave,
    runId,
    startedAt,
    finishedAt: new Date().toISOString(),
    final_status: finalStatus,
    exact_reason: appInstalled
      ? null
      : "Selected API34 Maestro emulator is booted, but the app APK is not installed and no existing APK artifact was available to install.",
    preferred_avd_name: preferredAvdName,
    selected_avd: selectedAvd,
    selected_serial: selectedSerial,
    selected_android_api_level: apiLevel,
    selected_device_model: model,
    avds_found: avds,
    connected_devices_before: connectedBefore,
    connected_devices_after: readConnectedDevices(adbPath, projectRoot),
    maestro_version: maestroVersion,
    adb_version: adbVersion,
    adb_path: "present_redacted",
    emulator_path: "present_redacted",
    maestro_path: fs.existsSync(maestroBinary) ? "present_redacted" : "missing",
    maestro_driver_startup_timeout_ms: defaultDriverStartupTimeoutMs,
    port_7001_preflight: port7001Before,
    port_7001_after_cleanup: port7001AfterCleanup,
    stale_maestro_processes_killed: staleKilled,
    port_7001_maestro_processes_killed: portKilled,
    device_maestro_packages_before: packagesBefore,
    device_maestro_packages_uninstalled: packagesUninstalled,
    device_maestro_packages_reinstalled: false,
    app_install_status: appInstallStatus,
    app_installed_on_selected_device: appInstalled,
    explicit_device_serial_used: true,
    fake_green_claimed: false,
    artifact_path: artifactRelativePath,
  };

  writePreflightArtifact(projectRoot, artifact);
  return artifact;
}

export function isAndroidMaestroDriverUnavailable(input: unknown): boolean {
  const text = input instanceof Error ? `${input.name}: ${input.message}\n${input.stack ?? ""}` : String(input ?? "");
  if (/FATAL EXCEPTION|app crashed|Application crash|Process crashed|ANR/i.test(text)) return false;
  if (/Assertion is false|assertVisible|No visible element|Element .* not found|View .* not found|not visible|id: "ai\.|id: "auth\./i.test(text)) {
    return false;
  }
  return /grpc_unavailable|gRPC\s+UNAVAILABLE|UNAVAILABLE:|command_timeout|Getting device info|Connection refused.*127\.0\.0\.1:7001|localhost:7001|TcpForwarder|DEADLINE_EXCEEDED|driver did not start|Android driver unreachable|Maestro Android driver|gRPC server|Connection reset|ETIMEDOUT|timed out|timeout/i.test(
    text,
  );
}

export function isAndroidAdbRuntimeUnstable(input: unknown): boolean {
  const text = input instanceof Error ? `${input.name}: ${input.message}\n${input.stack ?? ""}` : String(input ?? "");
  return /no devices\/emulators found|device offline|device not found|adb: device|unauthorized|sys\.boot_completed.*0/i.test(text);
}

function isUiAssertionFailure(input: unknown): boolean {
  const text = input instanceof Error ? `${input.name}: ${input.message}\n${input.stack ?? ""}` : String(input ?? "");
  return /Assertion is false|assertVisible|No visible element|Element .* not found|View .* not found|not visible|id: "ai\.|id: "auth\./i.test(text);
}

function makeMaestroOutputDirs(projectRoot: string, runId: string): {
  debugOutputDir: string;
  testOutputDir: string;
} {
  const safeRunId = runId.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const debugOutputDir = path.join(projectRoot, "artifacts", "maestro_debug", safeRunId);
  const testOutputDir = path.join(projectRoot, "artifacts", "maestro_output", safeRunId);
  fs.mkdirSync(debugOutputDir, { recursive: true });
  fs.mkdirSync(testOutputDir, { recursive: true });
  return { debugOutputDir, testOutputDir };
}

const maestroTextArtifactExtensions = new Set([
  ".html",
  ".json",
  ".log",
  ".md",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
]);

function scrubMaestroArtifactTree(rootDir: string, secrets: readonly string[]): void {
  if (!fs.existsSync(rootDir)) return;
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      scrubMaestroArtifactTree(entryPath, secrets);
      continue;
    }
    if (!entry.isFile() || !maestroTextArtifactExtensions.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }
    try {
      const raw = fs.readFileSync(entryPath, "utf8");
      const redacted = redactE2eSecrets(raw, secrets);
      if (redacted !== raw) fs.writeFileSync(entryPath, redacted, "utf8");
    } catch {
      // Best effort: binary or locked Maestro files should not hide the real test result.
    }
  }
}

function scrubMaestroRunArtifacts(
  dirs: { debugOutputDir: string; testOutputDir: string },
  secrets: readonly string[],
): void {
  scrubMaestroArtifactTree(dirs.debugOutputDir, secrets);
  scrubMaestroArtifactTree(dirs.testOutputDir, secrets);
}

function buildMaestroTestArgs(params: {
  serial: string;
  flowPaths: readonly string[];
  debugOutputDir: string;
  testOutputDir: string;
  reportPath?: string;
  extraArgs?: readonly string[];
}): string[] {
  const args = [
    "test",
    "--udid",
    params.serial,
    "--platform",
    "android",
    "--debug-output",
    params.debugOutputDir,
    "--test-output-dir",
    params.testOutputDir,
    "--flatten-debug-output",
    "--no-ansi",
    "--reinstall-driver",
  ];
  if (params.reportPath) {
    args.push("--format", "junit", "--output", params.reportPath);
  }
  args.push(...(params.extraArgs ?? []), ...params.flowPaths);
  return args;
}

function runMaestroOnce(params: {
  projectRoot: string;
  maestroBinary: string;
  args: readonly string[];
  env: Record<string, string>;
  secrets: readonly string[];
  timeoutMs: number;
}): CommandRunResult {
  const result = runCommand(params.maestroBinary, params.args, {
    projectRoot: params.projectRoot,
    timeoutMs: params.timeoutMs,
    maxBuffer: 64 * 1024 * 1024,
    env: {
      ...process.env,
      ...params.env,
      MAESTRO_DRIVER_STARTUP_TIMEOUT: String(defaultDriverStartupTimeoutMs),
      MAESTRO_CLI_NO_ANALYTICS: "1",
      MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: "true",
    },
  });
  return {
    status: result.status,
    stdout: redactE2eSecrets(result.stdout, params.secrets),
    stderr: redactE2eSecrets(result.stderr, params.secrets),
    error: result.error,
  };
}

function maestroFailureMessage(params: {
  runId: string;
  result: CommandRunResult;
  preflight: AndroidMaestroDriverPreflightArtifact | null;
  retryAttempted: boolean;
  firstAttemptDriverFailure: boolean;
}): string {
  const text = `${params.result.stdout}\n${params.result.stderr}\n${params.result.error?.message ?? ""}`.trim();
  const driverUnavailable = isAndroidMaestroDriverUnavailable(text);
  const adbUnstable = isAndroidAdbRuntimeUnstable(text);
  const assertionFailure = isUiAssertionFailure(text);
  const prefix = driverUnavailable
    ? "Maestro Android driver failed before UI assertions"
    : adbUnstable
      ? "Android/ADB runtime became unstable before Maestro UI assertions"
      : assertionFailure
        ? "Maestro UI assertion failed after driver connection"
      : "Maestro flow failed";
  return [
    `${prefix}; runId=${params.runId}; retry_attempted=${String(params.retryAttempted)}; first_attempt_driver_failure=${String(params.firstAttemptDriverFailure)}.`,
    `serial=${params.preflight?.selected_serial ?? "unknown"}; api=${params.preflight?.selected_android_api_level ?? "unknown"}; avd=${params.preflight?.selected_avd ?? "unknown"}; maestro_version=${params.preflight?.maestro_version ?? "unknown"}.`,
    `port_7001_preflight=${JSON.stringify(params.preflight?.port_7001_preflight ?? [])}; port_7001_after_cleanup=${JSON.stringify(params.preflight?.port_7001_after_cleanup ?? [])}.`,
    text,
  ].join("\n");
}

export async function runMaestroTestWithDriverRepair(
  options: RunMaestroTestWithDriverRepairOptions,
): Promise<AndroidMaestroRunResult> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const runId = options.runId ?? `${wave}_maestro_${new Date().toISOString().replace(/[:.]/g, "")}`;
  const secrets = options.secrets ?? [];
  const maestroBinary = options.maestroBinary ?? resolveMaestroBinary();
  const preflight =
    options.preflight ??
    await ensureAndroidMaestroDriverReady({
      projectRoot,
      runId: `${runId}_preflight`,
      ensureAppInstalled: true,
      uninstallDeviceMaestroPackages: true,
    });

  if (preflight.final_status !== "GREEN_ANDROID_MAESTRO_DRIVER_PREFLIGHT_READY" || !preflight.selected_serial) {
    throw new AndroidMaestroDriverRunError({
      message: preflight.exact_reason ?? "Android Maestro driver preflight did not reach a booted API34 emulator.",
      driverUnavailable: false,
      adbRuntimeUnstable: true,
      retryAttempted: false,
      firstAttemptDriverFailure: false,
      preflight,
      stdout: "",
      stderr: "",
      status: 1,
    });
  }
  if (!fs.existsSync(maestroBinary)) {
    throw new AndroidMaestroDriverRunError({
      message: "Maestro CLI is not available.",
      driverUnavailable: true,
      adbRuntimeUnstable: false,
      retryAttempted: false,
      firstAttemptDriverFailure: false,
      preflight,
      stdout: "",
      stderr: "",
      status: 1,
    });
  }

  const dirs = makeMaestroOutputDirs(projectRoot, runId);
  const args = buildMaestroTestArgs({
    serial: options.deviceId ?? preflight.selected_serial,
    flowPaths: options.flowPaths,
    debugOutputDir: dirs.debugOutputDir,
    testOutputDir: dirs.testOutputDir,
    reportPath: options.reportPath,
    extraArgs: options.extraArgs,
  });
  const first = runMaestroOnce({
    projectRoot,
    maestroBinary,
    args,
    env: options.env ?? {},
    secrets,
    timeoutMs: options.timeoutMs ?? 180_000,
  });
  scrubMaestroRunArtifacts(dirs, secrets);
  if (!first.error && first.status === 0) {
    return {
      stdout: first.stdout.trim(),
      stderr: first.stderr.trim(),
      deviceId: preflight.selected_serial,
      selectedAvd: preflight.selected_avd,
      androidApiLevel: preflight.selected_android_api_level,
      maestroVersion: preflight.maestro_version,
      preflightArtifactPath: preflight.artifact_path,
      debugOutputDir: dirs.debugOutputDir,
      testOutputDir: dirs.testOutputDir,
      firstAttemptDriverFailure: false,
      retryAttempted: false,
    };
  }

  const firstText = `${first.stdout}\n${first.stderr}\n${first.error?.message ?? ""}`;
  const driverUnavailable = isAndroidMaestroDriverUnavailable(firstText);
  const adbUnstable = isAndroidAdbRuntimeUnstable(firstText);
  const assertionFailure = isUiAssertionFailure(firstText);
  if (!driverUnavailable || assertionFailure) {
    throw new AndroidMaestroDriverRunError({
      message: maestroFailureMessage({
        runId,
        result: first,
        preflight,
        retryAttempted: false,
        firstAttemptDriverFailure: false,
      }),
      driverUnavailable: assertionFailure ? false : driverUnavailable,
      adbRuntimeUnstable: adbUnstable,
      retryAttempted: false,
      firstAttemptDriverFailure: false,
      preflight,
      stdout: first.stdout,
      stderr: first.stderr,
      status: first.status,
    });
  }

  const retryPreflight = await ensureAndroidMaestroDriverReady({
    projectRoot,
    runId: `${runId}_retry_preflight`,
    preferredAvdName: preflight.selected_avd ?? undefined,
    ensureAppInstalled: true,
    uninstallDeviceMaestroPackages: true,
  });
  const retry = runMaestroOnce({
    projectRoot,
    maestroBinary,
    args: buildMaestroTestArgs({
      serial: retryPreflight.selected_serial ?? preflight.selected_serial,
      flowPaths: options.flowPaths,
      debugOutputDir: dirs.debugOutputDir,
      testOutputDir: dirs.testOutputDir,
      reportPath: options.reportPath,
      extraArgs: options.extraArgs,
    }),
    env: options.env ?? {},
    secrets,
    timeoutMs: options.timeoutMs ?? 180_000,
  });
  scrubMaestroRunArtifacts(dirs, secrets);
  if (!retry.error && retry.status === 0 && retryPreflight.selected_serial) {
    return {
      stdout: retry.stdout.trim(),
      stderr: retry.stderr.trim(),
      deviceId: retryPreflight.selected_serial,
      selectedAvd: retryPreflight.selected_avd,
      androidApiLevel: retryPreflight.selected_android_api_level,
      maestroVersion: retryPreflight.maestro_version,
      preflightArtifactPath: retryPreflight.artifact_path,
      debugOutputDir: dirs.debugOutputDir,
      testOutputDir: dirs.testOutputDir,
      firstAttemptDriverFailure: true,
      retryAttempted: true,
    };
  }

  throw new AndroidMaestroDriverRunError({
    message: maestroFailureMessage({
      runId,
      result: retry,
      preflight: retryPreflight,
      retryAttempted: true,
      firstAttemptDriverFailure: true,
    }),
    driverUnavailable: isAndroidMaestroDriverUnavailable(`${retry.stdout}\n${retry.stderr}\n${retry.error?.message ?? ""}`),
    adbRuntimeUnstable: isAndroidAdbRuntimeUnstable(`${retry.stdout}\n${retry.stderr}\n${retry.error?.message ?? ""}`),
    retryAttempted: true,
    firstAttemptDriverFailure: true,
    preflight: retryPreflight,
    stdout: retry.stdout,
    stderr: retry.stderr,
    status: retry.status,
  });
}

if (require.main === module) {
  void ensureAndroidMaestroDriverReady()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_ANDROID_MAESTRO_DRIVER_PREFLIGHT_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
