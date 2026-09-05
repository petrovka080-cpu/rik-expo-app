import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { buildEstimatePresentationViewModel } from "../../src/lib/ai/estimatePresentation";
import {
  buildAndroidDeepLinkLaunchArgs,
  buildAndroidRouteDeepLink,
} from "./androidDeepLinkLaunchContract";
import { ensureAndroidApi34DeviceReady } from "./ensureAndroidApi34DeviceReady";
import { verifyProofLineage } from "../release/proofLineageVerifier";
import {
  OFFICIAL_ROUTE_TO_SCREEN_ACK_CASES,
  collectRouteToScreenLifecycleEvidence,
  isWarmAndroidActivityDelivery,
  type RouteToScreenLifecycleEvidence,
} from "../release/android/routeToScreenAck";
import {
  ANDROID_AUTH_EMAIL_FIELD_ID,
  ANDROID_AUTH_PASSWORD_FIELD_ID,
  ANDROID_AUTH_SUBMIT_ID,
  ANDROID_REQUEST_ROUTE_SCREEN_MARKER_ID,
  androidXmlHasResourceId,
  createAndroidHarness,
  isAndroidAppRootSurfaceXml,
  isAndroidAuthLoginScreenXml,
  isAndroidRequestRouteSurfaceXml,
} from "../_shared/androidHarness";
import { resolveExplicitAiRoleAuthEnv } from "./resolveExplicitAiRoleAuthEnv";
import {
  collectExplicitE2eSecrets,
  redactE2eSecrets,
} from "./redactE2eSecrets";
import {
  type RuntimeTestUser,
} from "../_shared/testUserDiscipline";
import {
  runR4A6AndroidAcceptedUiRuntime,
  type R4A6AndroidAcceptedJourneyResult,
} from "./r4A6AndroidAcceptedUiRuntime";

const DEFAULT_ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG",
);
const ARTIFACT_DIR = path.resolve(
  process.cwd(),
  String(process.env.R4_A8_ANDROID_ARTIFACT_DIR ?? "").trim() || DEFAULT_ARTIFACT_DIR,
);
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "android_api34", "screenshots");
const UI_DUMP_DIR = path.join(ARTIFACT_DIR, "android_api34", "ui_dumps");
const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const APK_PATH = path.resolve(process.cwd(), "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const ANDROID_DEV_PORT = Number(process.env.LIVE_ANDROID_DEV_PORT ?? "8100");
const LOCAL_PROVIDER_PORT = 54321;
const CANONICAL_BACKEND_PORT = 8765;
const APK_INSTALL_TIMEOUT_MS = Number(process.env.LIVE_ANDROID_APK_INSTALL_TIMEOUT_MS ?? "300000");
const CASE_UI_POLL_MS = 8_000;
const CASE_UI_MAX_POLLS = 3;
const PROMPT_PROBE_POLL_MS = 4_000;
const ROUTE_TO_SCREEN_LIFECYCLE_TIMEOUT_MS = 35_000;
const METRO_LOG_PATH = path.join(ARTIFACT_DIR, "android_api34_metro.log");
const UI_DUMP_DEVICE_PATH = "/sdcard/live_boq_pdf_catalog_window.xml";
const ANDROID_BUNDLE_PATH =
  "/node_modules/expo-router/entry.bundle?platform=android&dev=true&minify=false&transform.routerRoot=app";
const LOCAL_PROVIDER_CREDENTIALS = path.resolve(
  ".release-runtime/r551/runtime/local-developer/credentials.json",
);

type AndroidCase = {
  caseId: string;
  route: "/request" | "/ai";
  context: "request" | "foreman";
  prompt: string;
  expectedWorkKeys: string[];
  requiredTokens: string[];
  uiContract: {
    requiredTestIds: string[];
    representativeTokens: string[];
  };
  forbiddenTokens: string[];
};

type AndroidCaseResult = {
  caseId: string;
  route: string;
  prompt: string;
  runtimeTraceId: string | null;
  workKey: string | null;
  backendRows: string[];
  backendPassed: boolean;
  launchPassed: boolean;
  promptLaunchId: string;
  estimateLaunchId: string;
  promptWarmDelivery: boolean;
  estimateWarmDelivery: boolean;
  promptLifecycle: RouteToScreenLifecycleEvidence;
  estimateLifecycle: RouteToScreenLifecycleEvidence;
  promptProbeVisible: boolean;
  promptProbeDiagnostics: {
    ok: boolean;
    elapsedMs: number;
    textLength: number;
    exactPromptVisible: boolean;
    inputTestIdVisible: boolean;
    routeReadyVisible: boolean;
  }[];
  promptProbeScreenshotPath: string | null;
  promptProbeUiDumpPath: string | null;
  dumpsysIntentReceived: boolean;
  dumpsysIntentSample: string;
  uiRowsVisible: boolean;
  pdfActionVisible: boolean;
  uiContract: AndroidCase["uiContract"];
  missingTestIds: string[];
  missingRepresentativeTokens: string[];
  screenshotPath: string | null;
  uiDumpPath: string | null;
  failures: string[];
};

type AndroidAuthEvidence = {
  authSessionRequired: boolean;
  credentialsPresent: boolean;
  credentialSource: string;
  roleAuthSource: string;
  roleMode: string;
  rolesResolved: readonly string[];
  missingSecretKeys: readonly string[];
  loginAttempted: boolean;
  loginCompleted: boolean;
  blockedStatus: string | null;
  error: string | null;
};

type AndroidProofPrincipalEvidence = {
  source: "local_developer_seeded_principal";
  loadAttempted: boolean;
  loaded: boolean;
  role: "consumer";
  persistentSeed: true;
  cleanupRequired: false;
  serviceRoleExposedToApp: false;
};

const CASE_VALIDATION: Record<
  string,
  Pick<AndroidCase, "expectedWorkKeys" | "requiredTokens" | "forbiddenTokens">
> = {
  android_request_electrical_cable_outlets_switches: {
    expectedWorkKeys: ["electrical_area_installation", "socket_installation"],
    requiredTokens: ["кабель", "розет", "выключател", "провер"],
    forbiddenTokens: ["кирпич", "кладоч", "masonry wall"],
  },
  android_request_roof_waterproofing: {
    expectedWorkKeys: ["roof_waterproofing"],
    requiredTokens: ["кров", "праймер", "гидроизоля", "примыкан"],
    forbiddenTokens: ["ванн", "сануз", "душев"],
  },
  android_foreman_paving_stone: {
    expectedWorkKeys: [
      "dynamic_paving_landscaping_estimate",
      "paving_stone_laying",
    ],
    requiredTokens: ["брусчат", "геотекст", "щеб", "уклад"],
    forbiddenTokens: ["кирпич", "кладоч"],
  },
  android_foreman_house_electrical: {
    expectedWorkKeys: ["electrical_area_installation", "socket_installation"],
    requiredTokens: ["кабель", "щит", "розет", "провер"],
    forbiddenTokens: ["кирпич", "кладоч", "masonry wall"],
  },
};

const CASES: AndroidCase[] = OFFICIAL_ROUTE_TO_SCREEN_ACK_CASES.map(
  (testCase) => ({
    ...testCase,
    ...CASE_VALIDATION[testCase.caseId]!,
    uiContract: {
      requiredTestIds: [...testCase.requiredTestIds],
      representativeTokens: [...testCase.representativeTokens],
    },
  }),
);
const ACCEPTED_JOURNEY_CASE_COUNT = 1;

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function currentHead(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
    }).trim();
  } catch {
    return null;
  }
}

function parseMode(argv: string[]): "refresh" | "verify" {
  const modeArg = argv.find((value) => value.startsWith("--mode="));
  const mode = modeArg?.slice("--mode=".length) ?? "refresh";
  if (mode !== "refresh" && mode !== "verify") {
    throw new Error("--mode must be refresh or verify");
  }
  return mode;
}

function shouldSkipInstall(argv: string[]): boolean {
  return argv.includes("--skip-install") || process.env.ANDROID_API34_SKIP_INSTALL === "true";
}

function validateCanonicalAndroidRuntimeEnv(): string[] {
  const required = [
    "EXPO_PUBLIC_CANONICAL_ESTIMATE_DEFINITION_RELEASE_ID",
    "EXPO_PUBLIC_CANONICAL_ESTIMATE_SEARCH_RELEASE_ID",
    "EXPO_PUBLIC_CANONICAL_ESTIMATE_CAPABILITY_ID",
    "EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH",
    "EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH",
    "EXPO_PUBLIC_RELEASE_JS_BUNDLE_FINGERPRINT",
    "EXPO_PUBLIC_BUILD_COMMIT",
  ] as const;
  const failures = required
    .filter((key) => !String(process.env[key] ?? "").trim())
    .map((key) => `ANDROID_CANONICAL_RUNTIME_ENV_MISSING:${key}`);
  if (process.env.EXPO_PUBLIC_LOCAL_DEVELOPER_REVIEW !== "1") {
    failures.push("ANDROID_CANONICAL_RUNTIME_ENV_NOT_LOCAL_DEVELOPER");
  }
  if (
    process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL !==
    `http://127.0.0.1:${CANONICAL_BACKEND_PORT}`
  ) {
    failures.push("ANDROID_CANONICAL_RUNTIME_URL_NOT_EXACT_LOOPBACK");
  }
  if (
    process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_ALLOW_INSECURE_LOOPBACK !==
    "true"
  ) {
    failures.push("ANDROID_CANONICAL_RUNTIME_LOOPBACK_NOT_ALLOWED");
  }
  if (
    String(process.env.EXPO_PUBLIC_BUILD_COMMIT ?? "").trim() !==
    currentHead()
  ) {
    failures.push("ANDROID_CANONICAL_RUNTIME_HEAD_MISMATCH");
  }
  try {
    const provider = new URL(
      String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim(),
    );
    if (
      provider.protocol !== "http:" ||
      !["127.0.0.1", "localhost", "::1"].includes(provider.hostname) ||
      provider.port !== "54321"
    ) {
      failures.push("ANDROID_LOCAL_PROVIDER_URL_NOT_EXACT_LOOPBACK");
    }
  } catch {
    failures.push("ANDROID_LOCAL_PROVIDER_URL_NOT_EXACT_LOOPBACK");
  }
  if (
    !/^sb_publishable_[A-Za-z0-9_-]+$/u.test(
      String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim(),
    )
  ) {
    failures.push("ANDROID_LOCAL_PROVIDER_PUBLIC_KEY_RED");
  }
  return failures;
}

function readJsonObject(name: string): Record<string, unknown> {
  const filePath = path.join(ARTIFACT_DIR, name);
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`ANDROID_API34_LIVE_BOQ_ARTIFACT_INVALID:${name}`);
  }
  return parsed as Record<string, unknown>;
}

function stringField(record: Record<string, unknown>, field: string): string | null {
  const value = record[field];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function boolField(record: Record<string, unknown>, field: string): boolean {
  return record[field] === true;
}

function numberField(record: Record<string, unknown>, field: string): number | null {
  const value = record[field];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

type AndroidViewport = {
  width: number;
  height: number;
};

const androidViewportByDevice = new Map<string, AndroidViewport>();

function verifyExistingAndroidEvidenceReadOnly(): void {
  const currentHeadSha = currentHead();
  if (!currentHeadSha) {
    throw new Error("ANDROID_API34_LIVE_BOQ_CURRENT_HEAD_MISSING");
  }
  const artifact = readJsonObject("android_api34_results.json");
  const sourceCodeHead = stringField(artifact, "source_code_head") ?? stringField(artifact, "head");
  if (!sourceCodeHead) {
    throw new Error("ANDROID_API34_LIVE_BOQ_LINEAGE_MISSING");
  }

  const lineage = verifyProofLineage({
    wave: "S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG",
    sourceCodeHead,
    currentHead: currentHeadSha,
    artifactPaths: ["artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/"],
    allowArtifactOnlySupersession: artifact.artifact_only_supersession_allowed !== false,
  });
  if (!lineage.valid) {
    throw new Error(`ANDROID_API34_LIVE_BOQ_LINEAGE_STALE:${lineage.reason ?? "unknown"}`);
  }
  if (
    artifact.final_status !== "GREEN_ANDROID_API34_LIVE_BOQ_PDF_CATALOG_READY" ||
    !boolField(artifact, "android_api34_tested") ||
    !boolField(artifact, "android_api34_smoke_passed") ||
    !boolField(artifact, "api36_rejected") ||
    numberField(artifact, "actual_api") !== 34 ||
    artifact.fake_green_claimed !== false
  ) {
    throw new Error("ANDROID_API34_LIVE_BOQ_EXISTING_EVIDENCE_NOT_GREEN");
  }
  const routeToScreenAck = artifact.route_to_screen_ack;
  if (
    !routeToScreenAck ||
    typeof routeToScreenAck !== "object" ||
    Array.isArray(routeToScreenAck) ||
    (routeToScreenAck as Record<string, unknown>).status !==
      "GREEN_ANDROID_ROUTE_TO_SCREEN_ACK" ||
    (routeToScreenAck as Record<string, unknown>).expected_cases !==
      ACCEPTED_JOURNEY_CASE_COUNT ||
    (routeToScreenAck as Record<string, unknown>).passed_cases !== ACCEPTED_JOURNEY_CASE_COUNT ||
    !artifact.accepted_journey ||
    typeof artifact.accepted_journey !== "object" ||
    (artifact.accepted_journey as Record<string, unknown>).status !== "GREEN"
  ) {
    throw new Error("ANDROID_API34_ROUTE_TO_SCREEN_ACK_EVIDENCE_NOT_GREEN");
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function resolveAndroidViewport(adbPath: string, deviceId: string): AndroidViewport {
  const cached = androidViewportByDevice.get(deviceId);
  if (cached) return cached;

  const result = runText(adbPath, ["-s", deviceId, "shell", "wm", "size"], 10_000);
  const match = result.output.match(/Override size:\s*(\d+)x(\d+)/i) ?? result.output.match(/Physical size:\s*(\d+)x(\d+)/i);
  const width = Number(match?.[1] ?? 0);
  const height = Number(match?.[2] ?? 0);
  const viewport =
    result.ok && Number.isFinite(width) && Number.isFinite(height) && width >= 200 && height >= 400
      ? { width, height }
      : { width: 1080, height: 2400 };
  androidViewportByDevice.set(deviceId, viewport);
  return viewport;
}

function viewportSwipeArgs(adbPath: string, deviceId: string, direction: "up" | "down", durationMs: number): string[] {
  const viewport = resolveAndroidViewport(adbPath, deviceId);
  const x = clamp(Math.round(viewport.width * 0.5), 1, viewport.width - 1);
  const top = clamp(Math.round(viewport.height * 0.32), 1, viewport.height - 1);
  // Stay above sticky estimate actions and the bottom tab bar so the ScrollView,
  // rather than an overlaying button, owns the gesture.
  const bottom = clamp(Math.round(viewport.height * 0.58), 1, viewport.height - 1);
  const [startY, endY] = direction === "up" ? [bottom, top] : [top, bottom];
  return [String(x), String(startY), String(x), String(endY), String(durationMs)];
}

function runText(command: string, args: string[], timeout = 15_000): { ok: boolean; output: string } {
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

function runBuffer(command: string, args: string[], timeout = 15_000): { ok: boolean; output: Buffer | null; error: string | null } {
  try {
    const output = execFileSync(command, args, {
      cwd: process.cwd(),
      encoding: "buffer",
      stdio: ["ignore", "pipe", "pipe"],
      timeout,
    });
    return { ok: true, output, error: null };
  } catch (error) {
    return { ok: false, output: null, error: error instanceof Error ? error.message : String(error) };
  }
}

function installApkOnDevice(adbPath: string, deviceId: string): { ok: boolean; output: string } {
  const streamed = runText(adbPath, ["-s", deviceId, "install", "-r", APK_PATH], APK_INSTALL_TIMEOUT_MS);
  if (streamed.ok) return streamed;

  const remoteApkPath = "/data/local/tmp/rikexpoapp-debug.apk";
  const pushed = runText(adbPath, ["-s", deviceId, "push", APK_PATH, remoteApkPath], APK_INSTALL_TIMEOUT_MS);
  if (!pushed.ok) {
    return {
      ok: false,
      output: [streamed.output, `ADB_PUSH_INSTALL_FALLBACK_FAILED:${pushed.output}`].join("\n"),
    };
  }

  const installed = runText(adbPath, ["-s", deviceId, "shell", "pm", "install", "-r", remoteApkPath], APK_INSTALL_TIMEOUT_MS);
  runText(adbPath, ["-s", deviceId, "shell", "rm", "-f", remoteApkPath], 10_000);
  return {
    ok: installed.ok,
    output: [
      streamed.output,
      `ADB_PUSH_INSTALL_FALLBACK_USED:${pushed.output}`,
      `PM_INSTALL_OUTPUT:${installed.output}`,
    ].join("\n"),
  };
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/\s+/g, " ");
}

function textContainsAll(text: string, tokens: readonly string[]): boolean {
  const haystack = normalize(text);
  return tokens.every((token) => haystack.includes(normalize(token)));
}

function textContainsAny(text: string, tokens: readonly string[]): boolean {
  const haystack = normalize(text);
  return tokens.some((token) => haystack.includes(normalize(token)));
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureMetro(): Promise<{ reachable: boolean; started: boolean }> {
  const statusUrl = `http://127.0.0.1:${ANDROID_DEV_PORT}/status`;
  const bundleUrl = `http://127.0.0.1:${ANDROID_DEV_PORT}${ANDROID_BUNDLE_PATH}`;
  const bundleReady = async (): Promise<boolean> => {
    try {
      const response = await fetch(bundleUrl);
      if (!response.ok) return false;
      const contentType = response.headers.get("content-type") ?? "";
      const sample = await response.text();
      return contentType.includes("javascript") && sample.includes("__BUNDLE_START_TIME__");
    } catch {
      return false;
    }
  };

  try {
    const response = await fetch(statusUrl);
    const statusText = await response.text().catch(() => "");
    if (response.ok && statusText.includes("packager-status:running") && await bundleReady()) {
      return { reachable: true, started: false };
    }
  } catch {
    // Start below.
  }

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const log = fs.openSync(METRO_LOG_PATH, "a");
  const child = spawn(
    process.platform === "win32" ? "cmd.exe" : "npx",
    process.platform === "win32"
      ? ["/c", "npx", "expo", "start", "--dev-client", "--port", String(ANDROID_DEV_PORT), "--clear", "--non-interactive"]
      : ["expo", "start", "--dev-client", "--port", String(ANDROID_DEV_PORT), "--clear", "--non-interactive"],
    {
      cwd: process.cwd(),
      detached: true,
      stdio: ["ignore", log, log],
      windowsHide: true,
    },
  );
  child.unref();

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(statusUrl);
      if (response.ok && await bundleReady()) return { reachable: true, started: true };
    } catch {
      await wait(1500);
    }
  }
  return { reachable: false, started: true };
}

function deepLinkFor(testCase: AndroidCase, launchId: string): string {
  return buildAndroidRouteDeepLink({
    route: testCase.route,
    prompt: testCase.prompt,
    context: testCase.context === "foreman" ? "foreman" : undefined,
    launchId,
    automaticParam: testCase.route === "/request" ? "autoPrepare" : "autoSend",
  });
}

function launchDeepLink(adbPath: string, deviceId: string, uri: string): { ok: boolean; output: string } {
  return runText(adbPath, buildAndroidDeepLinkLaunchArgs(deviceId, uri, PACKAGE_NAME), 20_000);
}

function readRouteToScreenLifecycle(
  adbPath: string,
  deviceId: string,
  launchId: string,
): RouteToScreenLifecycleEvidence {
  const logcat = runText(
    adbPath,
    ["-s", deviceId, "logcat", "-d", "-v", "time", "ReactNativeJS:I", "*:S"],
    20_000,
  );
  return collectRouteToScreenLifecycleEvidence(
    logcat.ok ? logcat.output : "",
    launchId,
  );
}

async function waitForRouteToScreenLifecycle(
  adbPath: string,
  deviceId: string,
  launchId: string,
): Promise<RouteToScreenLifecycleEvidence> {
  const deadline = Date.now() + ROUTE_TO_SCREEN_LIFECYCLE_TIMEOUT_MS;
  let evidence = readRouteToScreenLifecycle(adbPath, deviceId, launchId);
  while (!evidence.acknowledged && Date.now() < deadline) {
    await wait(1_500);
    evidence = readRouteToScreenLifecycle(adbPath, deviceId, launchId);
  }
  return evidence;
}

function launchDevClientBundle(adbPath: string, deviceId: string): { ok: boolean; output: string } {
  runText(adbPath, ["-s", deviceId, "reverse", `tcp:${ANDROID_DEV_PORT}`, `tcp:${ANDROID_DEV_PORT}`], 10_000);
  const url = `exp+rik-expo-app://expo-development-client/?url=${encodeURIComponent(`http://127.0.0.1:${ANDROID_DEV_PORT}`)}`;
  return launchDeepLink(adbPath, deviceId, url);
}

function decodeXml(value: string): string {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function dumpUiSnapshotFromDevice(adbPath: string, deviceId: string): { ok: boolean; rawOutput: string; error: string | null } {
  const dump = runText(
    adbPath,
    ["-s", deviceId, "shell", "timeout", "12", "uiautomator", "dump", UI_DUMP_DEVICE_PATH],
    16_000,
  );
  const cat = dump.ok ? runText(adbPath, ["-s", deviceId, "exec-out", "cat", UI_DUMP_DEVICE_PATH], 20_000) : null;
  runText(adbPath, ["-s", deviceId, "shell", "rm", "-f", UI_DUMP_DEVICE_PATH], 5_000);
  if (cat?.ok && cat.output.trim()) {
    return { ok: true, rawOutput: cat.output, error: null };
  }

  const activity = runText(adbPath, ["-s", deviceId, "shell", "dumpsys", "activity", "top"], 20_000);
  if (activity.ok && activity.output.trim()) {
    return { ok: true, rawOutput: activity.output, error: null };
  }
  return { ok: false, rawOutput: cat?.output ?? "", error: cat?.output || dump.output || activity.output };
}

function extractUiText(rawOutput: string): string {
  const xmlValues = Array.from(rawOutput.matchAll(/\b(?:text|content-desc|resource-id)="([^"]*)"/g))
    .map((match) => decodeXml(match[1] ?? "").trim())
    .filter(Boolean);
  return xmlValues.length > 0 ? xmlValues.join("\n") : rawOutput;
}

function dumpUiText(adbPath: string, deviceId: string): { ok: boolean; text: string; rawXml: string } {
  const snapshot = dumpUiSnapshotFromDevice(adbPath, deviceId);
  if (!snapshot.ok) return { ok: false, text: snapshot.error ?? "", rawXml: snapshot.rawOutput };
  return { ok: true, text: extractUiText(snapshot.rawOutput), rawXml: snapshot.rawOutput };
}

function isAndroidAuthenticatedRequestEstimateXml(xml: string): boolean {
  return (
    isAndroidRequestRouteSurfaceXml(xml) &&
    androidXmlHasResourceId(xml, ANDROID_REQUEST_ROUTE_SCREEN_MARKER_ID) &&
    !xml.includes("protected-identity-state-") &&
    !xml.includes("protected-identity-login")
  );
}

function parseBoundsCenter(bounds: string): { x: number; y: number } | null {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  return {
    x: Math.round((Number(match[1]) + Number(match[3])) / 2),
    y: Math.round((Number(match[2]) + Number(match[4])) / 2),
  };
}

function tapDevServerIfVisible(adbPath: string, deviceId: string): boolean {
  const dumped = dumpUiText(adbPath, deviceId);
  if (!dumped.ok) return false;
  const targetText = Array.from(dumped.rawXml.matchAll(/<node\b([^>]*?)\/?>/g))
    .map((match) => match[1] ?? "")
    .find((attrs) => attrs.includes(`http://10.0.2.2:${ANDROID_DEV_PORT}`) || attrs.includes(`http://127.0.0.1:${ANDROID_DEV_PORT}`));
  if (!targetText) return false;
  const bounds = targetText.match(/bounds="([^"]*)"/)?.[1] ?? "";
  const center = parseBoundsCenter(bounds);
  if (!center) return false;
  return runText(adbPath, ["-s", deviceId, "shell", "input", "tap", String(center.x), String(center.y)], 10_000).ok;
}

function tapNodeMatchingText(adbPath: string, deviceId: string, matcher: RegExp): boolean {
  const dumped = dumpUiText(adbPath, deviceId);
  if (!dumped.ok) return false;
  const target = Array.from(dumped.rawXml.matchAll(/<node\b([^>]*?)\/?>/g))
    .map((match) => match[1] ?? "")
    .find((attrs) => matcher.test(decodeXml(attrs)));
  if (!target) return false;
  const bounds = target.match(/bounds="([^"]*)"/)?.[1] ?? "";
  const center = parseBoundsCenter(bounds);
  if (!center) return false;
  return runText(adbPath, ["-s", deviceId, "shell", "input", "tap", String(center.x), String(center.y)], 10_000).ok;
}

function tapRecentProjectIfVisible(adbPath: string, deviceId: string): boolean {
  const dumped = dumpUiText(adbPath, deviceId);
  if (!dumped.ok || !dumped.text.includes("RECENTLY OPENED")) return false;
  const target = Array.from(dumped.rawXml.matchAll(/<node\b([^>]*?)\/?>/g))
    .map((match) => match[1] ?? "")
    .filter((attrs) => decodeXml(attrs).includes("rik-expo-app"))
    .pop();
  if (!target) return false;
  const bounds = target.match(/bounds="([^"]*)"/)?.[1] ?? "";
  const center = parseBoundsCenter(bounds);
  if (!center) return false;
  return runText(adbPath, ["-s", deviceId, "shell", "input", "tap", String(center.x), String(center.y)], 10_000).ok;
}

function tapAndroidAnrWaitIfVisible(adbPath: string, deviceId: string, text: string): boolean {
  if (!/isn't responding|is not responding|Application Not Responding/i.test(text)) return false;
  return tapNodeMatchingText(adbPath, deviceId, /\bWait\b|android:id\/aerr_wait/i);
}

function closeDevMenuIfVisible(adbPath: string, deviceId: string, text: string): boolean {
  if (text.includes("Reload") && text.includes("Go home") && text.includes("TOOLS")) {
    return runText(adbPath, ["-s", deviceId, "shell", "input", "keyevent", "4"], 10_000).ok;
  }
  return false;
}

async function waitForDevClientBundle(adbPath: string, deviceId: string): Promise<{ ok: boolean; launch: { ok: boolean; output: string }; text: string }> {
  runText(adbPath, ["-s", deviceId, "shell", "am", "force-stop", PACKAGE_NAME], 10_000);
  await wait(1_000);
  const launch = launchDevClientBundle(adbPath, deviceId);
  let lastText = "";
  for (let attempt = 0; attempt < 120; attempt += 1) {
    await wait(1_500);
    const dumped = dumpUiText(adbPath, deviceId);
    if (!dumped.ok) continue;
    lastText = dumped.text;
    const proofVisible =
      lastText.includes("request-estimate-top-proof") ||
      lastText.includes("ai-estimate-action-proof") ||
      (lastText.includes("PDF") && lastText.includes("Источник"));
    if (proofVisible) {
      return { ok: true, launch, text: lastText };
    }
    if (tapAndroidAnrWaitIfVisible(adbPath, deviceId, lastText)) {
      await wait(5_000);
      continue;
    }
    if (lastText.includes("Development Build") && lastText.includes("DEVELOPMENT SERVERS")) {
      if (tapDevServerIfVisible(adbPath, deviceId) || tapRecentProjectIfVisible(adbPath, deviceId)) {
        await wait(3_000);
      }
      continue;
    }
    if (lastText.includes("There was a problem loading the project") || lastText.includes("SocketTimeoutException")) {
      tapNodeMatchingText(adbPath, deviceId, /Reload/i);
      await wait(2_000);
      continue;
    }
    if (lastText.includes("This is the developer menu") || lastText.includes("Continue")) {
      tapNodeMatchingText(adbPath, deviceId, /Continue/i);
      continue;
    }
    if (closeDevMenuIfVisible(adbPath, deviceId, lastText)) {
      continue;
    }
    if (
      lastText.includes("ROUTE_PROOF_APP_ROOT_READY") ||
      lastText.includes("auth.login.screen") ||
      lastText.includes("com.facebook.react.views") ||
      lastText.includes("ai.assistant") ||
      lastText.includes("Маркет") ||
      lastText.includes("Заявка") ||
      lastText.includes("Смета") ||
      lastText.includes("Войти")
    ) {
      return { ok: true, launch, text: lastText };
    }
  }
  return { ok: false, launch, text: lastText };
}

async function ensureAndroidAuthSession(
  adbPath: string,
  deviceId: string,
  proofUser?: RuntimeTestUser,
): Promise<AndroidAuthEvidence> {
  const evidence: AndroidAuthEvidence = {
    authSessionRequired: false,
    credentialsPresent: false,
    credentialSource: "not_checked",
    roleAuthSource: "not_checked",
    roleMode: "not_checked",
    rolesResolved: [],
    missingSecretKeys: [],
    loginAttempted: false,
    loginCompleted: false,
    blockedStatus: null,
    error: null,
  };
  const harness = createAndroidHarness({
    projectRoot: process.cwd(),
    devClientPort: ANDROID_DEV_PORT,
    devClientStdoutPath: path.join(
      "artifacts",
      "S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG",
      "android_auth_dev_client.stdout.log",
    ),
    devClientStderrPath: path.join(
      "artifacts",
      "S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG",
      "android_auth_dev_client.stderr.log",
    ),
  });
  harness.startAndroidRouteSafe(PACKAGE_NAME, "rik:///request");
  let current = dumpUiText(adbPath, deviceId);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (
      current.ok &&
      (isAndroidAuthenticatedRequestEstimateXml(current.rawXml) ||
        isAndroidAuthLoginScreenXml(current.rawXml) ||
        current.text.includes("protected-identity-state-"))
    ) {
      break;
    }
    await wait(1_000);
    current = dumpUiText(adbPath, deviceId);
  }
  if (current.ok && isAndroidAuthenticatedRequestEstimateXml(current.rawXml)) {
    evidence.loginCompleted = true;
    return evidence;
  }
  evidence.authSessionRequired = true;

  const resolution = resolveExplicitAiRoleAuthEnv(process.env, process.cwd());
  evidence.roleAuthSource = proofUser
    ? "local_developer_seeded_principal"
    : resolution.source;
  evidence.roleMode = proofUser ? "local_developer" : resolution.roleMode;
  evidence.rolesResolved = proofUser ? ["consumer"] : resolution.rolesResolved;
  evidence.missingSecretKeys = proofUser ? [] : resolution.missingKeys;
  const explicitForemanEmail = String(process.env.E2E_FOREMAN_EMAIL ?? "").trim();
  const explicitForemanPassword = String(process.env.E2E_FOREMAN_PASSWORD ?? "").trim();
  const useExplicitForeman = Boolean(explicitForemanEmail && explicitForemanPassword);
  const email =
    proofUser?.email ||
    (useExplicitForeman ? explicitForemanEmail : "") ||
    resolution.env?.E2E_FOREMAN_EMAIL ||
    resolution.env?.E2E_CONTROL_EMAIL ||
    resolution.env?.E2E_DIRECTOR_EMAIL ||
    "";
  const password =
    proofUser?.password ||
    (useExplicitForeman ? explicitForemanPassword : "") ||
    resolution.env?.E2E_FOREMAN_PASSWORD ||
    resolution.env?.E2E_CONTROL_PASSWORD ||
    resolution.env?.E2E_DIRECTOR_PASSWORD ||
    "";
  evidence.credentialsPresent = Boolean(email && password);
  evidence.credentialSource = proofUser
    ? "local_developer_seeded_consumer"
    : useExplicitForeman
      ? "explicit_foreman_env"
      : resolution.source;
  if (!email || !password) {
    evidence.blockedStatus =
      resolution.blockedStatus ?? "BLOCKED_ANDROID_API34_AUTH_SESSION_REQUIRED";
    return evidence;
  }

  const secrets = [
    ...collectExplicitE2eSecrets({
      ...process.env,
      ...resolution.env,
    }),
    email,
    password,
  ];
  evidence.loginAttempted = true;
  try {
    // waitForDevClientBundle already established a stable app surface. Starting
    // the development-client URL a second time here races its React instance
    // with the protected deep link on API 34, so authenticate through the
    // currently visible native controls without another bootstrap launch.
    if (current.text.includes("protected-identity-state-")) {
      const signOutNode = harness.parseAndroidNodes(current.rawXml).find(
        (node) => node.resourceId === "protected-identity-sign-out",
      );
      if (!signOutNode || !harness.tapAndroidBounds(signOutNode.bounds)) {
        throw new Error("Android invalid protected identity could not sign out");
      }
      for (let attempt = 0; attempt < 12; attempt += 1) {
        await wait(1_000);
        current = dumpUiText(adbPath, deviceId);
        if (current.ok && isAndroidAuthLoginScreenXml(current.rawXml)) break;
      }
    }
    if (!current.ok || !isAndroidAuthLoginScreenXml(current.rawXml)) {
      throw new Error("Android auth login screen disappeared before UI login");
    }
    let nodes = harness.parseAndroidNodes(current.rawXml);
    const emailNode = nodes.find(
      (node) => node.resourceId === ANDROID_AUTH_EMAIL_FIELD_ID,
    );
    if (!emailNode) {
      throw new Error(`Android auth field ${ANDROID_AUTH_EMAIL_FIELD_ID} was not found`);
    }
    await harness.replaceAndroidFieldText(emailNode, email);

    current = dumpUiText(adbPath, deviceId);
    nodes = harness.parseAndroidNodes(current.rawXml);
    const passwordNode = nodes.find(
      (node) => node.resourceId === ANDROID_AUTH_PASSWORD_FIELD_ID,
    );
    if (!passwordNode) {
      throw new Error(`Android auth field ${ANDROID_AUTH_PASSWORD_FIELD_ID} was not found`);
    }
    await harness.replaceAndroidFieldText(passwordNode, password);
    harness.pressAndroidKey(4);
    await wait(700);

    current = dumpUiText(adbPath, deviceId);
    nodes = harness.parseAndroidNodes(current.rawXml);
    const submitNode = nodes.find(
      (node) => node.resourceId === ANDROID_AUTH_SUBMIT_ID && node.enabled,
    );
    if (!submitNode || !harness.tapAndroidBounds(submitNode.bounds)) {
      throw new Error(`Android auth control ${ANDROID_AUTH_SUBMIT_ID} was not found`);
    }

    const deadline = Date.now() + 60_000;
    let protectedRouteRequested = false;
    while (Date.now() < deadline) {
      await wait(1_500);
      current = dumpUiText(adbPath, deviceId);
      if (!current.ok) continue;
      if (isAndroidAuthenticatedRequestEstimateXml(current.rawXml)) {
        evidence.loginCompleted = true;
        break;
      }
      if (
        !protectedRouteRequested &&
        isAndroidAppRootSurfaceXml(current.rawXml)
      ) {
        harness.startAndroidRouteSafe(PACKAGE_NAME, "rik:///request");
        protectedRouteRequested = true;
      }
    }
    if (!evidence.loginCompleted) {
      evidence.blockedStatus = "BLOCKED_ANDROID_API34_AUTH_SESSION_REQUIRED";
    }
  } catch (error) {
    evidence.blockedStatus = "BLOCKED_ANDROID_API34_AUTH_SESSION_REQUIRED";
    evidence.error = redactE2eSecrets(
      error instanceof Error ? error.message : String(error),
      secrets,
    ).slice(0, 1000);
  }
  return evidence;
}

function loadAndroidProofPrincipal(): RuntimeTestUser {
  const credentials = JSON.parse(
    fs.readFileSync(LOCAL_PROVIDER_CREDENTIALS, "utf8"),
  ) as Record<string, any>;
  if (credentials.environment !== "local_developer") {
    throw new Error("ANDROID_API34_PROOF_PRINCIPAL_ENVIRONMENT_RED");
  }
  if (
    String(credentials.provider_url ?? "") !==
      String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "") ||
    String(credentials.publishable_key ?? "") !==
      String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "")
  ) {
    throw new Error("ANDROID_API34_PROOF_PRINCIPAL_PROVIDER_DRIFT");
  }
  const consumers = Array.isArray(credentials.principals)
    ? credentials.principals.filter(
        (principal: Record<string, unknown>) => principal.role === "consumer",
      )
    : [];
  if (consumers.length !== 1) {
    throw new Error("ANDROID_API34_PROOF_CONSUMER_CARDINALITY_RED");
  }
  const consumer = consumers[0] as Record<string, unknown>;
  const user: RuntimeTestUser = {
    id: String(consumer.user_id ?? "").trim(),
    email: String(consumer.email ?? "").trim(),
    password: String(consumer.password ?? ""),
    role: "consumer",
    displayLabel: "Local Developer Consumer",
  };
  if (!user.id || !user.email || !user.password) {
    throw new Error("ANDROID_API34_PROOF_CONSUMER_CREDENTIALS_RED");
  }
  return user;
}

async function waitForCaseUi(adbPath: string, deviceId: string, testCase: AndroidCase): Promise<string> {
  let lastText = "";
  const visibleTokens = [
    ...testCase.uiContract.requiredTestIds,
    ...testCase.uiContract.representativeTokens,
  ];
  // The exact lifecycle ACK is the readiness barrier. UI polling below proves
  // the semantic payload; it is not a timer-based substitute for readiness.
  for (let attempt = 0; attempt < CASE_UI_MAX_POLLS; attempt += 1) {
    const dumped = dumpUiText(adbPath, deviceId);
    if (!dumped.ok) {
      if (attempt + 1 < CASE_UI_MAX_POLLS) await wait(CASE_UI_POLL_MS);
      continue;
    }
    lastText = dumped.text;
    if (textContainsAll(lastText, visibleTokens)) {
      return lastText;
    }
    if (attempt + 1 < CASE_UI_MAX_POLLS) await wait(CASE_UI_POLL_MS);
  }
  return lastText;
}

async function collectUiTextAcrossScrolls(
  adbPath: string,
  deviceId: string,
  visibleTokens: string[],
): Promise<string> {
  const snapshots: string[] = [];
  const capture = (): boolean => {
    const dumped = dumpUiText(adbPath, deviceId);
    if (dumped.ok && dumped.text.trim()) snapshots.push(dumped.text);
    return textContainsAll(snapshots.join("\n"), visibleTokens);
  };
  if (capture()) return snapshots.join("\n");
  for (let index = 0; index < 3; index += 1) {
    runText(adbPath, ["-s", deviceId, "shell", "input", "swipe", ...viewportSwipeArgs(adbPath, deviceId, "down", 450)], 10_000);
    await wait(700);
    if (capture()) return snapshots.join("\n");
  }
  for (let index = 0; index < 7; index += 1) {
    runText(adbPath, ["-s", deviceId, "shell", "input", "swipe", ...viewportSwipeArgs(adbPath, deviceId, "up", 450)], 10_000);
    await wait(700);
    if (capture()) return snapshots.join("\n");
  }
  return snapshots.join("\n");
}

function captureScreenshot(adbPath: string, deviceId: string, caseId: string): string | null {
  const result = runBuffer(adbPath, ["-s", deviceId, "exec-out", "screencap", "-p"], 15_000);
  if (!result.ok || !result.output || result.output.length === 0) return null;
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const filePath = path.join(SCREENSHOT_DIR, `${caseId}.png`);
  fs.writeFileSync(filePath, result.output);
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function captureUiDump(adbPath: string, deviceId: string, caseId: string): { path: string | null; text: string } {
  const result = dumpUiSnapshotFromDevice(adbPath, deviceId);
  if (!result.ok || !result.rawOutput.trim()) return { path: null, text: result.error ?? result.rawOutput };
  fs.mkdirSync(UI_DUMP_DIR, { recursive: true });
  const filePath = path.join(UI_DUMP_DIR, `${caseId}.xml`);
  fs.writeFileSync(filePath, result.rawOutput, "utf8");
  return { path: path.relative(process.cwd(), filePath).replace(/\\/g, "/"), text: result.rawOutput };
}

function validateBackend(testCase: AndroidCase): {
  runtimeTraceId: string | null;
  workKey: string | null;
  rows: string[];
  pdfActionVisible: boolean;
  failures: string[];
} {
  const answer = answerBuiltInAi({
    text: testCase.prompt,
    route: testCase.route === "/ai" ? "/ai?context=foreman" : "/request",
    screenContext: testCase.context,
    role: testCase.context === "foreman" ? "foreman" : "consumer",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  const estimate = answer.toolResult.estimate ?? null;
  if (!estimate) {
    return {
      runtimeTraceId: answer.runtimeTrace.traceId,
      workKey: null,
      rows: [],
      pdfActionVisible: false,
      failures: ["backend_estimate_missing"],
    };
  }
  const viewModel = buildEstimatePresentationViewModel(estimate);
  const rows = viewModel.rows.map((row) => row.name);
  const rowText = rows.join("\n");
  const failures = [
    ...(testCase.expectedWorkKeys.includes(estimate.work.workKey) ? [] : [`workKey=${estimate.work.workKey}`]),
    ...(textContainsAll(rowText, testCase.requiredTokens) ? [] : ["backend_required_rows_missing"]),
    ...(textContainsAny(rowText, testCase.forbiddenTokens) ? ["backend_forbidden_rows_found"] : []),
  ];
  return {
    runtimeTraceId: answer.runtimeTrace.traceId,
    workKey: estimate.work.workKey,
    rows,
    pdfActionVisible: viewModel.actions.some((action) => action.id === "make_estimate_pdf" && action.visible),
    failures,
  };
}

async function runAndroidCase(adbPath: string, deviceId: string, testCase: AndroidCase): Promise<AndroidCaseResult> {
  const backend = validateBackend(testCase);
  const caseRunId = `android-official:${Date.now().toString(36)}:${testCase.caseId}`;
  const promptLaunchId = `${caseRunId}:prompt`;
  const estimateLaunchId = `${caseRunId}:estimate`;
  const uri = deepLinkFor(testCase, estimateLaunchId);
  const probeUrl = new URL(deepLinkFor(testCase, promptLaunchId));
  probeUrl.searchParams.delete(testCase.route === "/request" ? "autoPrepare" : "autoSend");
  const probeLaunch = launchDeepLink(adbPath, deviceId, probeUrl.toString());
  const promptLifecycle = await waitForRouteToScreenLifecycle(
    adbPath,
    deviceId,
    promptLaunchId,
  );
  let promptProbeVisible = false;
  const promptProbeDiagnostics: AndroidCaseResult["promptProbeDiagnostics"] = [];
  const promptProbeStartedAt = Date.now();
  const promptProbeDeadline = Date.now() + 30_000;
  while (Date.now() < promptProbeDeadline && !promptProbeVisible) {
    const probeDump = dumpUiText(adbPath, deviceId);
    promptProbeVisible = probeDump.ok && probeDump.text.includes(testCase.prompt);
    promptProbeDiagnostics.push({
      ok: probeDump.ok,
      elapsedMs: Date.now() - promptProbeStartedAt,
      textLength: probeDump.text.length,
      exactPromptVisible: promptProbeVisible,
      inputTestIdVisible: probeDump.text.includes(
        testCase.route === "/request"
          ? "consumer-repair-problem-input"
          : "ai-assistant-input",
      ),
      routeReadyVisible: probeDump.text.includes(
        testCase.route === "/request"
          ? "ROUTE_PROOF_REQUEST_ROUTE_READY"
          : "ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY",
      ),
    });
    if (!promptProbeVisible) await wait(PROMPT_PROBE_POLL_MS);
  }
  const failedPromptProbeArtifactId = `${testCase.caseId}_prompt_probe`;
  const promptProbeScreenshotPath = promptProbeVisible
    ? null
    : captureScreenshot(adbPath, deviceId, failedPromptProbeArtifactId);
  const promptProbeUiDumpPath = promptProbeVisible
    ? null
    : captureUiDump(adbPath, deviceId, failedPromptProbeArtifactId).path;
  const launch = launchDeepLink(adbPath, deviceId, uri);
  const estimateLifecycle = await waitForRouteToScreenLifecycle(
    adbPath,
    deviceId,
    estimateLaunchId,
  );
  const dumpsys = runText(adbPath, ["-s", deviceId, "shell", "dumpsys", "activity"], 20_000);
  const dumpsysIntentReceived =
    dumpsys.ok &&
    dumpsys.output.includes(uri);
  const initialUiText = await waitForCaseUi(adbPath, deviceId, testCase);
  const scrolledUiText = await collectUiTextAcrossScrolls(
    adbPath,
    deviceId,
    [
      ...testCase.uiContract.requiredTestIds,
      ...testCase.uiContract.representativeTokens,
    ],
  );
  const screenshotPath = captureScreenshot(adbPath, deviceId, testCase.caseId);
  const uiDump = captureUiDump(adbPath, deviceId, testCase.caseId);
  const uiEvidenceText = [initialUiText, scrolledUiText, uiDump.text].join("\n");
  const missingTestIds = testCase.uiContract.requiredTestIds.filter((testId) => !uiEvidenceText.includes(testId));
  const missingRepresentativeTokens = testCase.uiContract.representativeTokens.filter((token) =>
    !uiEvidenceText.toLocaleLowerCase("ru-RU").includes(token.toLocaleLowerCase("ru-RU"))
  );
  const uiRowsVisible = missingTestIds.length === 0 && missingRepresentativeTokens.length === 0;
  const uiForbiddenFound = textContainsAny(uiEvidenceText, testCase.forbiddenTokens);
  const failures = [
    ...backend.failures,
    ...(probeLaunch.ok ? [] : [`prompt_probe_launch_failed:${probeLaunch.output.slice(0, 300)}`]),
    ...(isWarmAndroidActivityDelivery(probeLaunch.output) ? [] : ["prompt_launch_not_warm_delivery"]),
    ...(promptLifecycle.acknowledged ? [] : ["prompt_route_to_screen_lifecycle_red"]),
    ...(promptProbeVisible ? [] : ["app_visible_prompt_probe_missing"]),
    ...(launch.ok ? [] : [`launch_failed:${launch.output.slice(0, 300)}`]),
    ...(isWarmAndroidActivityDelivery(launch.output) ? [] : ["estimate_launch_not_warm_delivery"]),
    ...(estimateLifecycle.acknowledged ? [] : ["estimate_route_to_screen_lifecycle_red"]),
    ...(dumpsysIntentReceived ? [] : ["dumpsys_full_intent_missing"]),
    ...(missingTestIds.length === 0 ? [] : [`ui_semantic_contract_missing:${missingTestIds.join(",")}`]),
    ...(missingRepresentativeTokens.length === 0 ? [] : [`ui_representative_rows_missing:${missingRepresentativeTokens.join(",")}`]),
    ...(uiForbiddenFound ? ["ui_forbidden_rows_found"] : []),
    ...(screenshotPath ? [] : ["screenshot_missing"]),
    ...(uiDump.path ? [] : ["ui_dump_missing"]),
  ];
  return {
    caseId: testCase.caseId,
    route: testCase.route,
    prompt: testCase.prompt,
    runtimeTraceId: backend.runtimeTraceId,
    workKey: backend.workKey,
    backendRows: backend.rows,
    backendPassed: backend.failures.length === 0,
    launchPassed: launch.ok,
    promptLaunchId,
    estimateLaunchId,
    promptWarmDelivery: isWarmAndroidActivityDelivery(probeLaunch.output),
    estimateWarmDelivery: isWarmAndroidActivityDelivery(launch.output),
    promptLifecycle,
    estimateLifecycle,
    promptProbeVisible,
    promptProbeDiagnostics,
    promptProbeScreenshotPath,
    promptProbeUiDumpPath,
    dumpsysIntentReceived,
    dumpsysIntentSample: dumpsys.output
      .split(/\r?\n/)
      .filter((line) => line.includes("rik:///"))
      .slice(0, 3)
      .join("\n")
      .slice(0, 3000),
    uiRowsVisible,
    pdfActionVisible: backend.pdfActionVisible,
    uiContract: testCase.uiContract,
    missingTestIds,
    missingRepresentativeTokens,
    screenshotPath,
    uiDumpPath: uiDump.path,
    failures,
  };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const mode = parseMode(argv);
  const skipInstall = shouldSkipInstall(argv);
  if (mode === "verify") {
    verifyExistingAndroidEvidenceReadOnly();
    console.log("GREEN_ANDROID_API34_LIVE_BOQ_PDF_CATALOG_READY");
    return;
  }

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(UI_DUMP_DIR, { recursive: true });

  const device = await ensureAndroidApi34DeviceReady({ artifactDir: ARTIFACT_DIR, bootTimeoutMs: 240_000, allowCreateAvd: false });
  const failures = validateCanonicalAndroidRuntimeEnv();
  if (device.final_status !== "GREEN_ANDROID_API34_DEVICE_READY" || !device.adb_path || !device.device_id) {
    failures.push(device.final_status);
  }
  if (failures.length === 0 && device.adb_path && device.device_id) {
    for (const [port, failure] of [
      [LOCAL_PROVIDER_PORT, "ANDROID_LOCAL_PROVIDER_REVERSE_RED"],
      [CANONICAL_BACKEND_PORT, "ANDROID_CANONICAL_BACKEND_REVERSE_RED"],
    ] as const) {
      const reverse = runText(
        device.adb_path,
        ["-s", device.device_id, "reverse", `tcp:${port}`, `tcp:${port}`],
        10_000,
      );
      if (!reverse.ok) failures.push(failure);
    }
  }

  const metro = failures.length === 0 ? await ensureMetro() : { reachable: false, started: false };
  if (failures.length === 0 && !metro.reachable) failures.push("ANDROID_METRO_NOT_REACHABLE");

  let installOutput: string | null = null;
  let devClientReady: { ok: boolean; launch: { ok: boolean; output: string }; text: string } | null = null;
  let authEvidence: AndroidAuthEvidence = {
    authSessionRequired: false,
    credentialsPresent: false,
    credentialSource: "not_checked",
    roleAuthSource: "not_checked",
    roleMode: "not_checked",
    rolesResolved: [],
    missingSecretKeys: [],
    loginAttempted: false,
    loginCompleted: false,
    blockedStatus: null,
    error: null,
  };
  const principalEvidence: AndroidProofPrincipalEvidence = {
    source: "local_developer_seeded_principal",
    loadAttempted: false,
    loaded: false,
    role: "consumer",
    persistentSeed: true,
    cleanupRequired: false,
    serviceRoleExposedToApp: false,
  };
  let proofUser: RuntimeTestUser | null = null;
  let cleanStateApplied = false;
  if (failures.length === 0 && device.adb_path && device.device_id) {
    if (skipInstall) {
      installOutput = "INSTALL_SKIPPED_BY_RELEASE_PIPELINE_BUILD_IDENTITY";
    } else if (!fs.existsSync(APK_PATH)) {
      failures.push(`ANDROID_APK_MISSING:${APK_PATH}`);
    } else {
      const install = installApkOnDevice(device.adb_path, device.device_id);
      installOutput = install.output.slice(0, 1000);
      if (!install.ok) failures.push(`ANDROID_APK_INSTALL_FAILED:${installOutput}`);
    }
    if (failures.length === 0) {
      const clean = runText(
        device.adb_path,
        ["-s", device.device_id, "shell", "pm", "clear", PACKAGE_NAME],
        30_000,
      );
      cleanStateApplied = clean.ok && /Success/iu.test(clean.output);
      if (!cleanStateApplied) failures.push("ANDROID_R4_A6_CLEAN_STATE_RED");
    }
  }

  if (failures.length === 0 && device.adb_path && device.device_id) {
    devClientReady = await waitForDevClientBundle(device.adb_path, device.device_id);
    if (!devClientReady.ok) failures.push(`ANDROID_DEV_CLIENT_BUNDLE_NOT_READY:${devClientReady.text.slice(0, 300)}`);
  }

  const cases: AndroidCaseResult[] = [];
  let acceptedJourney: R4A6AndroidAcceptedJourneyResult | null = null;
  try {
    if (failures.length === 0 && devClientReady) {
      principalEvidence.loadAttempted = true;
      proofUser = loadAndroidProofPrincipal();
      principalEvidence.loaded = true;
      authEvidence = await ensureAndroidAuthSession(
        device.adb_path!,
        device.device_id!,
        proofUser,
      );
      if (!authEvidence.loginCompleted) {
        failures.push(
          authEvidence.blockedStatus ??
            "BLOCKED_ANDROID_API34_AUTH_SESSION_REQUIRED",
        );
      }
    }

    if (failures.length === 0 && device.adb_path && device.device_id) {
      runText(device.adb_path, ["-s", device.device_id, "logcat", "-c"], 20_000);
      acceptedJourney = await runR4A6AndroidAcceptedUiRuntime({
        adbPath: device.adb_path,
        deviceId: device.device_id,
        artifactDir: path.join(ARTIFACT_DIR, "android_api34", "r4_a6_accepted"),
        apkPath: APK_PATH,
      });
      failures.push(...acceptedJourney.failures);
    }
  } catch (error) {
    failures.push(
      `ANDROID_API34_PROOF_RUNTIME_RED:${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const routeToScreenAckPassed =
    acceptedJourney?.launchWarmDelivery &&
    acceptedJourney.promptLifecycle.acknowledged &&
    acceptedJourney.status === "GREEN"
      ? 1
      : 0;
  if (
    !acceptedJourney ||
    routeToScreenAckPassed !== ACCEPTED_JOURNEY_CASE_COUNT
  ) {
    failures.push(
      `r4_a6_route_to_screen_ack_incomplete:${routeToScreenAckPassed}/${ACCEPTED_JOURNEY_CASE_COUNT}`,
    );
  }
  const passed = failures.length === 0;
  const screenshotPaths = acceptedJourney
    ? Object.entries(acceptedJourney.evidence)
        .filter(([key, value]) => key.toLowerCase().includes("screenshot") && typeof value === "string")
        .map(([caseId, value]) => ({ caseId, path: value as string }))
    : [];
  const uiDumpPaths = acceptedJourney?.evidence.finalUiDump
    ? [{ caseId: "r4_a6_accepted_final", path: acceptedJourney.evidence.finalUiDump }]
    : [];
  writeJson("android_api34_results.json", {
    wave: "S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_TABLE_CATALOG_FIX_POINT_OF_NO_RETURN",
    final_status: passed ? "GREEN_ANDROID_API34_LIVE_BOQ_PDF_CATALOG_READY" : "BLOCKED_ANDROID_API34_LIVE_BOQ_PDF_CATALOG",
    android_api34_tested: passed,
    android_api34_smoke_passed: passed,
    api36_rejected: device.final_status !== "BLOCKED_ANDROID_API36_NOT_ALLOWED_FOR_ACCEPTANCE",
    head: currentHead(),
    source_code_head: currentHead(),
    artifact_commit_head: null,
    current_head_at_write_time: currentHead(),
    proof_mode: "refresh",
    install_skipped_by_release_pipeline: skipInstall,
    proof_valid_for_source_code_head: true,
    artifact_only_supersession_allowed: true,
    device_id: device.device_id,
    actual_api: device.android_sdk,
    android_sdk: device.android_sdk,
    android_dev_port: ANDROID_DEV_PORT,
    local_provider_port: LOCAL_PROVIDER_PORT,
    canonical_backend_port: CANONICAL_BACKEND_PORT,
    canonical_runtime_env: {
      local_developer: process.env.EXPO_PUBLIC_LOCAL_DEVELOPER_REVIEW === "1",
      exact_loopback:
        process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL ===
        `http://127.0.0.1:${CANONICAL_BACKEND_PORT}`,
      definition_release_id:
        process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_DEFINITION_RELEASE_ID ?? null,
      search_release_id:
        process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_SEARCH_RELEASE_ID ?? null,
      capability_id:
        process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_CAPABILITY_ID ?? null,
      build_commit: process.env.EXPO_PUBLIC_BUILD_COMMIT ?? null,
    },
    cpu_abi: device.cpu_abi,
    avd_name: device.avd_name,
    apk_path: APK_PATH,
    apk_exists: fs.existsSync(APK_PATH),
    install_output: installOutput,
    dev_client_ready: devClientReady ? {
      ok: devClientReady.ok,
      launch_ok: devClientReady.launch.ok,
      launch_output: devClientReady.launch.output.slice(0, 1000),
      text_sample: devClientReady.text.slice(0, 1000),
    } : null,
    auth: authEvidence,
    local_proof_principal: principalEvidence,
    clean_state_applied: cleanStateApplied,
    metro,
    accepted_journey: acceptedJourney,
    route_to_screen_ack: {
      status:
        routeToScreenAckPassed === ACCEPTED_JOURNEY_CASE_COUNT && acceptedJourney
          ? "GREEN_ANDROID_ROUTE_TO_SCREEN_ACK"
          : "RED_ANDROID_ROUTE_TO_SCREEN_ACK",
      expected_cases: ACCEPTED_JOURNEY_CASE_COUNT,
      passed_cases: routeToScreenAckPassed,
      lifecycle_stages: [
        "INTENT_RECEIVED",
        "URL_PARSED",
        "AUTH_RESOLVED",
        "INTENT_APPLIED",
        "DRAFT_SESSION_READY",
        "UI_READY",
        "INTENT_ACKNOWLEDGED",
      ],
      exact_order_required: true,
      exactly_once_required: true,
      warm_delivery_required: true,
      isolated_probe_substitution_allowed: false,
      exact_catalog_ui_selection_required: true,
    },
    legacy_route_contract_cases_not_replayed: CASES.length,
    cases,
    failures,
    fake_green_claimed: false,
  });
  writeJson("android_screenshots.json", {
    android_api34_tested: passed,
    screenshots: screenshotPaths,
    fake_green_claimed: false,
  });
  writeJson("android_ui_dumps.json", {
    android_api34_tested: passed,
    ui_dumps: uiDumpPaths,
    fake_green_claimed: false,
  });

  if (!passed) {
    throw new Error(`BLOCKED_ANDROID_API34_LIVE_BOQ_PDF_CATALOG:${failures.join("|")}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
