import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  AI_EMULATOR_GATE_HARDENING_MATRIX_ARTIFACT,
  AI_MANDATORY_EMULATOR_RUNTIME_GATE_MATRIX_ARTIFACT,
  AI_QA03_DUAL_PLATFORM_RUNTIME_TARGETABILITY_MATRIX_ARTIFACT,
  AI_QA04_FRESH_IOS_BUILD_SIGNOFF_MATRIX_ARTIFACT,
} from "./aiMandatoryEmulatorGateEvaluation";
import { collectReleaseSecretValues, redactReleaseOutput } from "./redactReleaseOutput";

type NativeAiReleaseProofStatus =
  | "GREEN_NATIVE_AI_RELEASE_PROOF_READY"
  | "BLOCKED_ANDROID_ADB_RUNTIME_UNSTABLE"
  | "BLOCKED_ANDROID_UIAUTOMATOR_DUMP_TIMEOUT"
  | "BLOCKED_ANDROID_RN_BOOT_BLANK_AFTER_LAUNCH"
  | "BLOCKED_ANDROID_RN_BOOT_BLANK_AFTER_DEEPLINK"
  | "BLOCKED_ANDROID_AUTH_SESSION_NOT_AVAILABLE_AFTER_LOGIN"
  | "BLOCKED_ANDROID_DEEPLINK_ROUTE_NOT_HANDLED"
  | "BLOCKED_ANDROID_DEBUG_RUNTIME_COPY_VISIBLE_TO_NORMAL_USER"
  | "BLOCKED_ANDROID_APP_CODE_STALE_REBUILD_REQUIRED"
  | "BLOCKED_IOS_RUNTIME_PROOF_HOST_UNAVAILABLE"
  | "BLOCKED_IOS_SIMULATOR_NOT_AVAILABLE"
  | "BLOCKED_IOS_DEVICE_NOT_AVAILABLE"
  | "BLOCKED_IOS_BUILD_SIGNOFF_REQUIRED"
  | "BLOCKED_AI_QA04_IOS_BUILD_STALE_COMMIT"
  | "BLOCKED_AI_QA04_IOS_SUBMIT_PROOF_MISSING"
  | "BLOCKED_RELEASE_GATES_RED";

type CommandResult = {
  status: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  errorMessage: string | null;
};

type AndroidRouteProof = {
  route: string;
  artifact: string;
  dumpPass: boolean;
  rnViewsVisible: boolean;
  routeSpecificContentVisible: boolean;
  aiRouteTargetable: boolean;
  blankScreen: boolean;
  loginScreenObserved: boolean;
  debugRuntimeCopyVisible: boolean;
  exactBlocker: NativeAiReleaseProofStatus | null;
  exactReason: string | null;
};

const projectRoot = process.cwd();
const wave = "S_NATIVE_AI_RELEASE_PROOF_BLOCKERS_CLOSEOUT";
const artifactPrefix = path.join(projectRoot, "artifacts", "S_NATIVE_AI_RELEASE_PROOF_BLOCKERS");
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const androidPath = `${artifactPrefix}_android.json`;
const iosPath = `${artifactPrefix}_ios.json`;
const proofPath = `${artifactPrefix}_proof.md`;
const preflightPath = `${artifactPrefix}_preflight.txt`;
const gitStatusPath = `${artifactPrefix}_git_status.txt`;
const gitLogPath = `${artifactPrefix}_git_log.txt`;
const iosAppInventoryPath = `${artifactPrefix}_IOS_app_inventory.json`;
const iosEasJsonPath = `${artifactPrefix}_IOS_eas_json.txt`;
const iosCurrentHeadPath = `${artifactPrefix}_IOS_current_head.txt`;
const iosChannelsPath = `${artifactPrefix}_IOS_channels.txt`;
const iosBranchesPath = `${artifactPrefix}_IOS_branches.txt`;
const iosUpdatesPath = `${artifactPrefix}_IOS_updates.txt`;
const androidAdbDevicesPath = `${artifactPrefix}_ANDROID_adb_devices.txt`;
const androidLaunchUiPath = `${artifactPrefix}_ANDROID_ui_launch.xml`;
const androidLogcatPath = `${artifactPrefix}_ANDROID_logcat_excerpt.txt`;
const packageName = "com.azisbek_dzhantaev.rikexpoapp";
const androidUiDumpTimeoutMs = 60_000;
const androidUiDumpRetryCount = 1;
const routes = [
  "rik:///ai",
  "rik:///ai-command-center",
  "rik://ai-command-center",
  "rik:///ai-procurement-copilot",
  "rik:///ai-approval-inbox",
] as const;

const aiRuntimeSourcePrefixes = [
  "src/features/ai/",
  "src/screens/",
  "src/components/",
  "app/",
  "src/navigation/",
  "src/lib/navigation/",
  "src/lib/entry/",
];
const nativeConfigPrefixes = ["ios/", "android/", "plugins/"];
const nativeConfigFiles = ["app.json", "app.config.js", "app.config.ts", "eas.json", "package.json"];
const currentWaveAllowedDirtyPaths = new Set([
  "scripts/release/verifyNativeAiReleaseProofBlockers.ts",
  "tests/release/verifyNativeAiReleaseProofBlockers.contract.test.ts",
  "scripts/e2e/runAiRoleScreenKnowledgeMaestro.ts",
  "tests/e2e/runAiRoleScreenKnowledgeMaestro.contract.test.ts",
  "artifacts/S_AI_CORE_03B_EXPLICIT_ROLE_SECRETS_E2E_emulator.json",
  "artifacts/S_ANDROID_MAESTRO_PARENT_MATRIX_CHILD_ISOLATION_freshness.json",
]);
const currentWaveAllowedDirtyPrefixes = [
  "artifacts/S_NATIVE_AI_RELEASE_PROOF_BLOCKERS",
  "artifacts/S_AI_QA_01_MANDATORY_EMULATOR_RUNTIME_GATE_",
  "artifacts/S_AI_QA_02_EMULATOR_GATE_HARDENING_",
  "artifacts/S_ANDROID_MAESTRO_DRIVER_STABILITY_REPAIR_",
] as const;

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

function artifactRelative(filePath: string): string {
  return normalizePath(path.relative(projectRoot, filePath));
}

function writeText(filePath: string, value: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function writeJson(filePath: string, value: unknown): void {
  writeText(filePath, JSON.stringify(value, null, 2));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJsonRecord(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function shouldUseShell(command: string): boolean {
  return process.platform === "win32" && /^(npx|npm|eas)$/i.test(path.basename(command, path.extname(command)));
}

function runCommand(command: string, args: readonly string[], timeoutMs = 60_000): CommandResult {
  const secrets = collectReleaseSecretValues();
  const result = spawnSync(command, [...args], {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    shell: shouldUseShell(command),
    stdio: "pipe",
    timeout: timeoutMs,
  });
  return {
    status: result.status,
    stdout: redactReleaseOutput(result.stdout ?? "", secrets).trim(),
    stderr: redactReleaseOutput(result.stderr ?? "", secrets).trim(),
    timedOut: result.error instanceof Error && result.error.message.toLowerCase().includes("timed out"),
    errorMessage: result.error instanceof Error ? result.error.message : null,
  };
}

function commandText(command: string, args: readonly string[], timeoutMs = 60_000): string {
  const result = runCommand(command, args, timeoutMs);
  return [
    `$ ${command} ${args.join(" ")}`,
    `exit=${result.status ?? "null"} timedOut=${result.timedOut}`,
    result.stdout,
    result.stderr,
    result.errorMessage ? `error=${result.errorMessage}` : "",
  ].filter(Boolean).join("\n");
}

function requireStdout(command: string, args: readonly string[], timeoutMs = 60_000): string {
  const result = runCommand(command, args, timeoutMs);
  if (result.status !== 0 || result.timedOut) {
    throw new Error(
      `Command failed: ${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}\n${result.errorMessage ?? ""}`.trim(),
    );
  }
  return result.stdout;
}

function splitLines(value: string): string[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function safeRouteFileName(route: string): string {
  return route.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

function parseAdbDevices(output: string): string[] {
  return output
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /\sdevice\b/.test(line))
    .map((line) => line.split(/\s+/)[0])
    .filter((serial) => serial.startsWith("emulator-"));
}

function resolveAdbCommand(): string {
  const sdkAdb = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "Android", "Sdk", "platform-tools", process.platform === "win32" ? "adb.exe" : "adb")
    : null;
  if (sdkAdb && fs.existsSync(sdkAdb)) return sdkAdb;
  return "adb";
}

function selectAndroidSerial(devices: readonly string[]): string | null {
  const requested = String(
    process.env.S_ANDROID_MAESTRO_SERIAL ??
      process.env.E2E_ANDROID_DEVICE_ID ??
      process.env.ANDROID_SERIAL ??
      "",
  ).trim();
  if (requested && devices.includes(requested)) return requested;
  if (devices.includes("emulator-5556")) return "emulator-5556";
  return devices[0] ?? null;
}

function containsAny(source: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(source));
}

function extractVisibleTexts(source: string): string[] {
  return [...source.matchAll(/\btext="([^"]*)"/g)]
    .map((match) => match[1] ?? "")
    .map((value) => value.replace(/\\u([0-9a-f]{4})/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16))))
    .map((value) => value.trim())
    .filter(Boolean);
}

function classifyUiDump(params: {
  source: string;
  route?: string;
  timedOut: boolean;
  status: number | null;
  errorText: string;
}): Omit<AndroidRouteProof, "route" | "artifact"> {
  if (params.timedOut) {
    return {
      dumpPass: false,
      rnViewsVisible: false,
      routeSpecificContentVisible: false,
      aiRouteTargetable: false,
      blankScreen: false,
      loginScreenObserved: false,
      debugRuntimeCopyVisible: false,
      exactBlocker: "BLOCKED_ANDROID_UIAUTOMATOR_DUMP_TIMEOUT",
      exactReason: `uiautomator dump timed out: ${params.errorText}`,
    };
  }
  if (params.status !== 0 || params.source.trim().length === 0) {
    return {
      dumpPass: false,
      rnViewsVisible: false,
      routeSpecificContentVisible: false,
      aiRouteTargetable: false,
      blankScreen: true,
      loginScreenObserved: false,
      debugRuntimeCopyVisible: false,
      exactBlocker: "BLOCKED_ANDROID_RN_BOOT_BLANK_AFTER_LAUNCH",
      exactReason: `uiautomator dump failed or returned empty output: ${params.errorText}`,
    };
  }

  const source = params.source;
  const visibleText = extractVisibleTexts(source).join("\n");
  const loginScreenObserved =
    /(войти|sign in|log in|login|пароль|password)/i.test(visibleText) ||
    (/email|почта/i.test(visibleText) && /(зарегистр|reset|forgot|пароль|password|sign in|log in|login|войти)/i.test(visibleText));
  const debugRuntimeCopyVisible = containsAny(source, [
    /text="[^"]*(provider|runtime|transport|module unavailable|ai keys unavailable|raw json|screenid|route key)[^"]*"/i,
  ]);
  const aiRouteTargetable = containsAny(source, [
    /AI помощник/i,
    /Финансы сегодня/i,
    /Снабжение сегодня/i,
    /Склад сегодня/i,
    /Решения на сегодня/i,
    /Работы сегодня/i,
    /ai\./i,
    /command/i,
    /approval/i,
  ]);
  const routeSpecificContentVisible =
    !params.route ||
    (params.route.includes("procurement") && containsAny(source, [/procurement|снабж|закуп/i])) ||
    (params.route.includes("approval") && containsAny(source, [/approval|соглас/i])) ||
    (params.route.includes("command") && containsAny(source, [/command|решен|задач|approval/i])) ||
    (params.route.endsWith(":///ai") && aiRouteTargetable) ||
    (params.route.includes("://ai-command-center") && containsAny(source, [/command|решен|задач|approval/i]));
  const rnViewsVisible = containsAny(source, [/resource-id=/i, /class="android\.view\.View"/i, /class="android\.widget\./i]);
  const blankScreen = !rnViewsVisible || source.replace(/\s/g, "").length < 200;

  let exactBlocker: NativeAiReleaseProofStatus | null = null;
  let exactReason: string | null = null;
  if (loginScreenObserved) {
    exactBlocker = "BLOCKED_ANDROID_AUTH_SESSION_NOT_AVAILABLE_AFTER_LOGIN";
    exactReason = "Login/auth text is visible after native launch or deeplink proof.";
  } else if (debugRuntimeCopyVisible) {
    exactBlocker = "BLOCKED_ANDROID_DEBUG_RUNTIME_COPY_VISIBLE_TO_NORMAL_USER";
    exactReason = "Normal-user UI dump contains provider/runtime/module/debug copy.";
  } else if (blankScreen) {
    exactBlocker = params.route ? "BLOCKED_ANDROID_RN_BOOT_BLANK_AFTER_DEEPLINK" : "BLOCKED_ANDROID_RN_BOOT_BLANK_AFTER_LAUNCH";
    exactReason = "RN view tree is blank or not visible in uiautomator dump.";
  } else if (params.route && !routeSpecificContentVisible) {
    exactBlocker = "BLOCKED_ANDROID_DEEPLINK_ROUTE_NOT_HANDLED";
    exactReason = `Route-specific content was not visible for ${params.route}.`;
  }

  return {
    dumpPass: true,
    rnViewsVisible,
    routeSpecificContentVisible,
    aiRouteTargetable,
    blankScreen,
    loginScreenObserved,
    debugRuntimeCopyVisible,
    exactBlocker,
    exactReason,
  };
}

function dumpUi(params: {
  adb: string;
  serial: string;
  remotePath: string;
  artifactPath: string;
  route?: string;
  timeoutMs?: number;
}): Omit<AndroidRouteProof, "route" | "artifact"> {
  const attempts: CommandResult[] = [];
  let result: CommandResult | null = null;
  for (let attempt = 0; attempt <= androidUiDumpRetryCount; attempt += 1) {
    result = runCommand(
      params.adb,
      ["-s", params.serial, "shell", `uiautomator dump ${params.remotePath} && cat ${params.remotePath}`],
      params.timeoutMs ?? androidUiDumpTimeoutMs,
    );
    attempts.push(result);
    const needsRetry = (result.timedOut || result.status !== 0 || result.stdout.trim().length === 0) && attempt < androidUiDumpRetryCount;
    if (!needsRetry) break;
    runCommand(params.adb, ["-s", params.serial, "wait-for-device"], 30_000);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2_000);
  }
  const finalResult = result ?? attempts[attempts.length - 1];
  if (!finalResult) {
    throw new Error("Android uiautomator dump did not execute any attempts.");
  }
  writeText(
    params.artifactPath,
    attempts
      .map((attempt, index) => [
        `# attempt=${index + 1}`,
        attempt.stdout,
        attempt.stderr,
        attempt.errorMessage ?? "",
      ].filter(Boolean).join("\n"))
      .join("\n\n"),
  );
  return classifyUiDump({
    source: finalResult.stdout,
    route: params.route,
    timedOut: finalResult.timedOut,
    status: finalResult.status,
    errorText: [finalResult.stderr, finalResult.errorMessage ?? ""].filter(Boolean).join("\n"),
  });
}

function runAndroidProof(): Record<string, unknown> {
  const adb = resolveAdbCommand();
  const devicesResult = runCommand(adb, ["devices", "-l"], 30_000);
  writeText(androidAdbDevicesPath, [devicesResult.stdout, devicesResult.stderr].filter(Boolean).join("\n"));
  const devices = parseAdbDevices(devicesResult.stdout);
  const selectedSerial = selectAndroidSerial(devices);

  if (!selectedSerial) {
    return {
      final_status: "BLOCKED_ANDROID_ADB_RUNTIME_UNSTABLE",
      adb_command: adb === "adb" ? "adb" : "sdk-adb",
      devices,
      selected_serial: null,
      package_name: packageName,
      emulator_selected_correctly: false,
      package_installed: false,
      app_launches: false,
      uiautomator_dump_pass: false,
      android_ai_routes_targetable: false,
      android_blank_screen: false,
      android_debug_runtime_copy_visible: false,
      exact_reason: "No online Android emulator device was available from adb devices -l.",
      fake_green_claimed: false,
    };
  }

  const bootCompleted = runCommand(adb, ["-s", selectedSerial, "shell", "getprop", "sys.boot_completed"], 15_000).stdout.trim() === "1";
  const packageProbe = runCommand(adb, ["-s", selectedSerial, "shell", "pm", "path", packageName], 20_000);
  const packageInstalled = packageProbe.status === 0 && packageProbe.stdout.includes(packageName);

  runCommand(adb, ["-s", selectedSerial, "shell", "am", "force-stop", packageName], 20_000);
  runCommand(adb, ["-s", selectedSerial, "shell", "monkey", "-p", packageName, "-c", "android.intent.category.LAUNCHER", "1"], 20_000);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 45_000);
  const launchProof = dumpUi({
    adb,
    serial: selectedSerial,
    remotePath: "/sdcard/S_NATIVE_AI_ANDROID_ui_launch.xml",
    artifactPath: androidLaunchUiPath,
  });

  const routeProofs: AndroidRouteProof[] = routes.map((route, index) => {
    runCommand(adb, ["-s", selectedSerial, "shell", "am", "force-stop", packageName], 20_000);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2_000);
    runCommand(adb, ["-s", selectedSerial, "shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", route, packageName], 20_000);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 45_000);
    const artifact = `${artifactPrefix}_ANDROID_ui_${index + 1}_${safeRouteFileName(route)}.xml`;
    const proof = dumpUi({
      adb,
      serial: selectedSerial,
      remotePath: "/sdcard/S_NATIVE_AI_ANDROID_ui_route.xml",
      artifactPath: artifact,
      route,
    });
    return {
      route,
      artifact: artifactRelative(artifact),
      ...proof,
    };
  });

  const routeBlocker = routeProofs.find((proof) => proof.exactBlocker);
  const allRoutesTargetable = routeProofs.every((proof) => proof.dumpPass && proof.rnViewsVisible && proof.routeSpecificContentVisible && !proof.exactBlocker);
  const anyBlankScreen = launchProof.blankScreen || routeProofs.some((proof) => proof.blankScreen);
  const anyDebugCopy = launchProof.debugRuntimeCopyVisible || routeProofs.some((proof) => proof.debugRuntimeCopyVisible);
  const dumpPass = launchProof.dumpPass && routeProofs.every((proof) => proof.dumpPass);

  if (!dumpPass || launchProof.exactBlocker || routeBlocker) {
    const logcat = runCommand(adb, ["-s", selectedSerial, "logcat", "-d", "-t", "300"], 30_000);
    writeText(androidLogcatPath, [logcat.stdout, logcat.stderr, logcat.errorMessage ?? ""].filter(Boolean).join("\n"));
  }

  const finalStatus =
    (!packageInstalled || !bootCompleted)
      ? "BLOCKED_ANDROID_ADB_RUNTIME_UNSTABLE"
      : launchProof.exactBlocker ?? routeBlocker?.exactBlocker ?? "GREEN_NATIVE_AI_RELEASE_PROOF_READY";
  const exactReason =
    !bootCompleted
      ? "Selected Android emulator did not report sys.boot_completed=1."
      : !packageInstalled
        ? `Package ${packageName} is not installed on ${selectedSerial}.`
        : launchProof.exactReason ?? routeBlocker?.exactReason ?? null;

  return {
    final_status: finalStatus,
    adb_command: adb === "adb" ? "adb" : "sdk-adb",
    devices,
    selected_serial: selectedSerial,
    package_name: packageName,
    emulator_selected_correctly: true,
    boot_completed: bootCompleted,
    package_installed: packageInstalled,
    app_launches: launchProof.dumpPass && launchProof.rnViewsVisible && !launchProof.blankScreen,
    uiautomator_dump_pass: dumpPass,
    launch_artifact: artifactRelative(androidLaunchUiPath),
    launch_proof: launchProof,
    routes: routeProofs,
    android_ai_routes_targetable: allRoutesTargetable,
    android_blank_screen: anyBlankScreen,
    android_debug_runtime_copy_visible: anyDebugCopy,
    logcat_artifact: fs.existsSync(androidLogcatPath) ? artifactRelative(androidLogcatPath) : null,
    exact_reason: exactReason,
    fake_green_claimed: false,
  };
}

function loadAppInventory(): Record<string, unknown> {
  const appJson = readJsonRecord(path.join(projectRoot, "app.json"));
  const expo = isRecord(appJson?.expo) ? appJson.expo : {};
  return {
    name: expo.name ?? null,
    slug: expo.slug ?? null,
    scheme: expo.scheme ?? null,
    version: expo.version ?? null,
    ios: isRecord(expo.ios) ? expo.ios : null,
    updates: isRecord(expo.updates) ? expo.updates : null,
    runtimeVersion: expo.runtimeVersion ?? null,
  };
}

function runOptionalEasArtifact(args: readonly string[], outputPath: string): { attempted: boolean; status: number | null; timedOut: boolean } {
  const result = runCommand("npx", ["eas", ...args], 60_000);
  writeText(outputPath, [result.stdout, result.stderr, result.errorMessage ?? ""].filter(Boolean).join("\n"));
  return {
    attempted: true,
    status: result.status,
    timedOut: result.timedOut,
  };
}

function changedFilesSince(commit: string | null): string[] {
  if (!commit) return [];
  const result = runCommand("git", ["diff", "--name-only", `${commit}..HEAD`], 60_000);
  return result.status === 0 ? splitLines(result.stdout).map(normalizePath) : [];
}

function isAppSourcePath(filePath: string): boolean {
  const normalized = normalizePath(filePath);
  return aiRuntimeSourcePrefixes.some((prefix) => normalized.startsWith(prefix));
}

function isNativeConfigPath(filePath: string): boolean {
  const normalized = normalizePath(filePath);
  return nativeConfigPrefixes.some((prefix) => normalized.startsWith(prefix)) || nativeConfigFiles.includes(normalized);
}

function runIosProof(currentHead: string): Record<string, unknown> {
  const appInventory = loadAppInventory();
  writeJson(iosAppInventoryPath, appInventory);
  if (fs.existsSync(path.join(projectRoot, "eas.json"))) {
    writeText(iosEasJsonPath, fs.readFileSync(path.join(projectRoot, "eas.json"), "utf8"));
  }
  writeText(iosCurrentHeadPath, currentHead);
  const easArtifacts = {
    channels: runOptionalEasArtifact(["channel:list", "--non-interactive"], iosChannelsPath),
    branches: runOptionalEasArtifact(["branch:list", "--non-interactive"], iosBranchesPath),
    updates: runOptionalEasArtifact(["update:list", "--limit", "20", "--non-interactive"], iosUpdatesPath),
  };

  const qa04 = readJsonRecord(path.join(projectRoot, AI_QA04_FRESH_IOS_BUILD_SIGNOFF_MATRIX_ARTIFACT));
  const coreIos = readJsonRecord(path.join(projectRoot, "artifacts", "S_RELEASE_CORE_02_POST_INSTALL_SIGNOFF_ios.json"));
  const currentHeadBuild = readJsonRecord(path.join(projectRoot, "artifacts", "S_RELEASE_IOS_SIGNOFF_CURRENT_HEAD_build.json"));
  const currentHeadSubmit = readJsonRecord(path.join(projectRoot, "artifacts", "S_RELEASE_IOS_SIGNOFF_CURRENT_HEAD_submit.json"));
  const lastSignoffCommit =
    stringValue(currentHeadBuild?.gitCommitHash) ??
    stringValue(coreIos?.current_head_commit) ??
    stringValue(qa04?.current_head_commit) ??
    stringValue(qa04?.ios_build_git_commit);
  const changedSinceLastSignoff = changedFilesSince(lastSignoffCommit);
  const appSourceChangedSinceLastIosSignoff = changedSinceLastSignoff.some(isAppSourcePath);
  const nativeConfigChangedSinceLastIosSignoff = changedSinceLastSignoff.some(isNativeConfigPath);
  const hostCanRunIosSimulator = process.platform === "darwin";
  const buildMatchesHead =
    booleanValue(qa04?.ios_build_git_commit_matches_head) === true ||
    (stringValue(currentHeadBuild?.currentHead) === currentHead && booleanValue(currentHeadBuild?.buildMatchesCurrentHead) === true);
  const submitMatchesHead =
    stringValue(currentHeadSubmit?.currentHead) === currentHead &&
    booleanValue(currentHeadSubmit?.submitMatchesCurrentHead) === true &&
    stringValue(currentHeadSubmit?.final_status) === "GREEN_IOS_APP_STORE_CONNECT_SUBMIT_PROOF";
  const iosBuildSignoffCurrent = !appSourceChangedSinceLastIosSignoff || buildMatchesHead;
  const iosSubmitProofCurrent = !appSourceChangedSinceLastIosSignoff || submitMatchesHead;
  const nativeBuildRequired = nativeConfigChangedSinceLastIosSignoff;

  const exactBlockers: NativeAiReleaseProofStatus[] = [];
  if (!hostCanRunIosSimulator && appSourceChangedSinceLastIosSignoff) {
    exactBlockers.push("BLOCKED_IOS_RUNTIME_PROOF_HOST_UNAVAILABLE");
    exactBlockers.push("BLOCKED_IOS_SIMULATOR_NOT_AVAILABLE");
  }
  if (!iosBuildSignoffCurrent) exactBlockers.push("BLOCKED_IOS_BUILD_SIGNOFF_REQUIRED", "BLOCKED_AI_QA04_IOS_BUILD_STALE_COMMIT");
  if (!iosSubmitProofCurrent) exactBlockers.push("BLOCKED_AI_QA04_IOS_SUBMIT_PROOF_MISSING");
  if (nativeBuildRequired) exactBlockers.push("BLOCKED_IOS_NATIVE_BUILD_REQUIRED" as NativeAiReleaseProofStatus);

  return {
    final_status: exactBlockers[0] ?? "GREEN_NATIVE_AI_RELEASE_PROOF_READY",
    host_platform: process.platform,
    ios_runtime_host_available: hostCanRunIosSimulator,
    ios_simulator_available: hostCanRunIosSimulator,
    app_inventory_artifact: artifactRelative(iosAppInventoryPath),
    eas_json_artifact: fs.existsSync(iosEasJsonPath) ? artifactRelative(iosEasJsonPath) : null,
    eas_artifacts: {
      channels: { ...easArtifacts.channels, artifact: artifactRelative(iosChannelsPath) },
      branches: { ...easArtifacts.branches, artifact: artifactRelative(iosBranchesPath) },
      updates: { ...easArtifacts.updates, artifact: artifactRelative(iosUpdatesPath) },
    },
    current_head: currentHead,
    last_ios_signed_off_commit: lastSignoffCommit,
    changed_files_since_last_ios_signoff: changedSinceLastSignoff,
    app_source_changed_since_last_ios_signoff: appSourceChangedSinceLastIosSignoff,
    native_config_changed_since_last_ios_signoff: nativeConfigChangedSinceLastIosSignoff,
    ios_delivery_proof_current: iosBuildSignoffCurrent && iosSubmitProofCurrent,
    ios_build_signoff_current: iosBuildSignoffCurrent,
    ios_submit_proof_current: iosSubmitProofCurrent,
    ios_channel_runtime_compatible: !nativeBuildRequired,
    ios_native_build_required: nativeBuildRequired,
    ios_build_git_commit_matches_head: buildMatchesHead,
    ios_app_store_connect_submit: iosSubmitProofCurrent ? "PASS" : "NOT_APPROVED",
    web_used_as_native_proof: false,
    android_used_as_ios_proof: false,
    blind_ios_build: false,
    blind_ota_publish: false,
    fake_green_claimed: false,
    exact_blockers: [...new Set(exactBlockers)],
    exact_reason: exactBlockers.length > 0
      ? `iOS signoff is not current for HEAD ${currentHead}; host=${process.platform}; last iOS signoff=${lastSignoffCommit ?? "missing"}.`
      : null,
  };
}

function statusFromRecord(record: Record<string, unknown>): string | null {
  return stringValue(record.final_status);
}

function isCurrentWavePath(statusLine: string): boolean {
  const pathOnly = statusLine.startsWith("##")
    ? statusLine
    : statusLine.replace(/^[ MADRCU?!]{1,2}\s+/, "").trim();
  const normalized = normalizePath(pathOnly);
  return (
    currentWaveAllowedDirtyPaths.has(normalized) ||
    currentWaveAllowedDirtyPrefixes.some((prefix) => normalized.startsWith(prefix))
  );
}

function writePreflight(): Record<string, unknown> {
  const statusRaw = requireStdout("git", ["status", "--short", "--branch"]);
  const aheadRaw = requireStdout("git", ["rev-list", "--left-right", "--count", "HEAD...origin/main"]);
  const status = commandText("git", ["status", "--short", "--branch"]);
  const aheadBehind = commandText("git", ["rev-list", "--left-right", "--count", "HEAD...origin/main"]);
  const log = commandText("git", ["log", "--oneline", "-10"]);
  const diffNameOnly = commandText("git", ["diff", "--name-only"]);
  const diffStat = commandText("git", ["diff", "--stat"]);
  const diffCheck = commandText("git", ["diff", "--check"]);
  writeText(gitStatusPath, status);
  writeText(gitLogPath, log);
  writeText(preflightPath, [status, aheadBehind, log, diffNameOnly, diffStat, diffCheck].join("\n\n"));
  const [ahead, behind] = aheadRaw.split(/\s+/).map((value) => Number(value));
  const statusLines = splitLines(statusRaw);
  const cleanExceptCurrentWave = statusLines.every((line) => line.startsWith("##") || isCurrentWavePath(line));
  return {
    git_status: statusRaw,
    ahead_behind: aheadRaw,
    current_head_synced_with_origin: ahead === 0 && behind === 0,
    worktree_clean: cleanExceptCurrentWave,
    worktree_clean_scope: "clean except current native proof verifier, role-runner hardening, and generated proof artifacts",
    preflight_artifact: artifactRelative(preflightPath),
    git_status_artifact: artifactRelative(gitStatusPath),
    git_log_artifact: artifactRelative(gitLogPath),
  };
}

function firstNativeBlocker(android: Record<string, unknown>, ios: Record<string, unknown>, preflight: Record<string, unknown>): NativeAiReleaseProofStatus {
  if (preflight.current_head_synced_with_origin !== true || preflight.worktree_clean !== true) return "BLOCKED_RELEASE_GATES_RED";
  const androidStatus = statusFromRecord(android);
  if (androidStatus && androidStatus !== "GREEN_NATIVE_AI_RELEASE_PROOF_READY") return androidStatus as NativeAiReleaseProofStatus;
  const iosBlockers = Array.isArray(ios.exact_blockers) ? ios.exact_blockers : [];
  if (iosBlockers.length > 0 && typeof iosBlockers[0] === "string") return iosBlockers[0] as NativeAiReleaseProofStatus;
  return "GREEN_NATIVE_AI_RELEASE_PROOF_READY";
}

function buildProofMarkdown(params: {
  matrix: Record<string, unknown>;
  android: Record<string, unknown>;
  ios: Record<string, unknown>;
  inventory: Record<string, unknown>;
}): string {
  const blockers = Array.isArray(params.matrix.exact_blockers) ? params.matrix.exact_blockers : [];
  return [
    "# S_NATIVE_AI_RELEASE_PROOF_BLOCKERS_CLOSEOUT",
    "",
    `Final status: ${params.matrix.final_status}`,
    "",
    "## Repo",
    `- Current HEAD: ${params.inventory.current_head}`,
    `- Synced with origin: ${params.matrix.current_head_synced_with_origin}`,
    `- Worktree clean: ${params.matrix.worktree_clean}`,
    "",
    "## Android",
    `- Selected serial: ${params.android.selected_serial ?? "missing"}`,
    `- Package installed: ${params.android.package_installed}`,
    `- uiautomator dump pass: ${params.matrix.android_uiautomator_dump_pass}`,
    `- AI routes targetable: ${params.matrix.android_ai_routes_targetable}`,
    `- Blank screen: ${params.matrix.android_blank_screen}`,
    `- Debug/runtime copy visible: ${params.matrix.android_debug_runtime_copy_visible}`,
    "",
    "## iOS",
    `- Host platform: ${params.ios.host_platform}`,
    `- Last iOS signed-off commit: ${params.ios.last_ios_signed_off_commit ?? "missing"}`,
    `- App source changed since last iOS signoff: ${params.matrix.app_source_changed_since_last_ios_signoff}`,
    `- Delivery proof current: ${params.matrix.ios_delivery_proof_current}`,
    `- Build signoff current: ${params.matrix.ios_build_signoff_current}`,
    `- Submit proof current: ${params.matrix.ios_submit_proof_current}`,
    "",
    "## Blockers",
    ...(blockers.length > 0 ? blockers.map((blocker) => `- ${blocker}`) : ["- none"]),
    "",
    "No Android/Web proof was used as iOS proof. No rebuild, OTA publish, DB write, provider config change, or production app logic change was performed by this verifier.",
  ].join("\n");
}

export function verifyNativeAiReleaseProofBlockers(): Record<string, unknown> {
  const preflight = writePreflight();
  const currentHead = requireStdout("git", ["rev-parse", "HEAD"]).trim();
  const android = runAndroidProof();
  const ios = runIosProof(currentHead);
  const qaArtifacts = {
    mandatoryEmulator: readJsonRecord(path.join(projectRoot, AI_MANDATORY_EMULATOR_RUNTIME_GATE_MATRIX_ARTIFACT)),
    hardening: readJsonRecord(path.join(projectRoot, AI_EMULATOR_GATE_HARDENING_MATRIX_ARTIFACT)),
    qa03: readJsonRecord(path.join(projectRoot, AI_QA03_DUAL_PLATFORM_RUNTIME_TARGETABILITY_MATRIX_ARTIFACT)),
    qa04: readJsonRecord(path.join(projectRoot, AI_QA04_FRESH_IOS_BUILD_SIGNOFF_MATRIX_ARTIFACT)),
  };
  const exactBlockers = [
    statusFromRecord(android) !== "GREEN_NATIVE_AI_RELEASE_PROOF_READY" ? statusFromRecord(android) : null,
    ...(Array.isArray(ios.exact_blockers) ? ios.exact_blockers.filter((value): value is string => typeof value === "string") : []),
    ...(statusFromRecord(qaArtifacts.hardening ?? {}) === "GREEN_AI_EMULATOR_GATE_HARDENED" ? [] : ["BLOCKED_AI_EMULATOR_GATE_HARDENING_RUNTIME"]),
  ].filter((value): value is string => Boolean(value));
  const finalStatus = firstNativeBlocker(android, ios, preflight);
  const inventory = {
    wave,
    generated_at: new Date().toISOString(),
    current_head: currentHead,
    ...preflight,
    qa_artifacts: {
      mandatory_emulator_status: statusFromRecord(qaArtifacts.mandatoryEmulator ?? {}),
      hardening_status: statusFromRecord(qaArtifacts.hardening ?? {}),
      qa03_status: statusFromRecord(qaArtifacts.qa03 ?? {}),
      qa04_status: statusFromRecord(qaArtifacts.qa04 ?? {}),
    },
    artifacts: {
      inventory: artifactRelative(inventoryPath),
      matrix: artifactRelative(matrixPath),
      android: artifactRelative(androidPath),
      ios: artifactRelative(iosPath),
      proof: artifactRelative(proofPath),
    },
  };
  const matrix = {
    wave,
    final_status: finalStatus,
    current_head_synced_with_origin: preflight.current_head_synced_with_origin === true,
    worktree_clean: preflight.worktree_clean === true,
    app_source_changed_since_last_ios_signoff: ios.app_source_changed_since_last_ios_signoff === true,
    android_adb_runtime_stable: statusFromRecord(android) === "GREEN_NATIVE_AI_RELEASE_PROOF_READY",
    android_uiautomator_dump_pass: android.uiautomator_dump_pass === true,
    android_ai_routes_targetable: android.android_ai_routes_targetable === true,
    android_blank_screen: android.android_blank_screen === true,
    android_debug_runtime_copy_visible: android.android_debug_runtime_copy_visible === true,
    ios_delivery_proof_current: ios.ios_delivery_proof_current === true,
    ios_build_signoff_current: ios.ios_build_signoff_current === true,
    ios_submit_proof_current: ios.ios_submit_proof_current === true,
    web_used_as_native_proof: false,
    android_used_as_ios_proof: false,
    blind_android_rebuild: false,
    blind_ios_build: false,
    blind_ota_publish: false,
    fake_green_claimed: false,
    exact_blockers: [...new Set(exactBlockers)],
  };
  writeJson(inventoryPath, inventory);
  writeJson(androidPath, android);
  writeJson(iosPath, ios);
  writeJson(matrixPath, matrix);
  writeText(proofPath, buildProofMarkdown({ matrix, android, ios, inventory }));
  return matrix;
}

if (require.main === module) {
  try {
    const matrix = verifyNativeAiReleaseProofBlockers();
    console.info(JSON.stringify(matrix, null, 2));
    if (matrix.final_status !== "GREEN_NATIVE_AI_RELEASE_PROOF_READY") process.exitCode = 1;
  } catch (error) {
    const reason = redactReleaseOutput(error instanceof Error ? error.stack ?? error.message : String(error));
    const matrix = {
      wave,
      final_status: "BLOCKED_RELEASE_GATES_RED",
      exact_reason: reason,
      fake_green_claimed: false,
    };
    writeJson(matrixPath, matrix);
    console.error(reason);
    process.exitCode = 1;
  }
}
