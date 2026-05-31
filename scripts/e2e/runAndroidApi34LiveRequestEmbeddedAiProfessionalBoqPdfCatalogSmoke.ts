import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { buildEstimatePresentationViewModel } from "../../src/lib/ai/estimatePresentation";
import { ensureAndroidApi34DeviceReady } from "./ensureAndroidApi34DeviceReady";

const ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG",
);
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "android_api34", "screenshots");
const UI_DUMP_DIR = path.join(ARTIFACT_DIR, "android_api34", "ui_dumps");
const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const APK_PATH = path.resolve(process.cwd(), "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const ANDROID_DEV_PORT = Number(process.env.LIVE_ANDROID_DEV_PORT ?? "8081");
const METRO_LOG_PATH = path.join(ARTIFACT_DIR, "android_api34_metro.log");

type AndroidCase = {
  caseId: string;
  route: "/request" | "/ai";
  context: "request" | "foreman";
  prompt: string;
  expectedWorkKeys: string[];
  requiredTokens: string[];
  uiTokens?: string[];
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
  uiRowsVisible: boolean;
  pdfActionVisible: boolean;
  screenshotPath: string | null;
  uiDumpPath: string | null;
  failures: string[];
};

const CASES: AndroidCase[] = [
  {
    caseId: "android_request_electrical_cable_outlets_switches",
    route: "/request",
    context: "request",
    prompt: "смета на прокладку электрокабеля с розетками 10 шт и выключателями 10 шт площадь квартиры 100 кв м",
    expectedWorkKeys: ["electrical_area_installation", "socket_installation"],
    requiredTokens: ["кабель", "розет", "выключател", "провер"],
    forbiddenTokens: ["кирпич", "кладоч", "masonry wall"],
  },
  {
    caseId: "android_request_roof_waterproofing",
    route: "/request",
    context: "request",
    prompt: "гидроизоляция крыши 100 кв м",
    expectedWorkKeys: ["roof_waterproofing"],
    requiredTokens: ["кров", "праймер", "гидроизоля", "примыкан"],
    forbiddenTokens: ["ванн", "сануз", "душев"],
  },
  {
    caseId: "android_foreman_paving_stone",
    route: "/ai",
    context: "foreman",
    prompt: "смета на укладку брусчатки на 587 кв м",
    expectedWorkKeys: ["dynamic_paving_landscaping_estimate", "paving_stone_laying"],
    requiredTokens: ["брусчат", "геотекст", "щеб", "уклад"],
    uiTokens: ["брусчат", "сделать pdf"],
    forbiddenTokens: ["кирпич", "кладоч"],
  },
  {
    caseId: "android_foreman_house_electrical",
    route: "/ai",
    context: "foreman",
    prompt: "смета на электромонтаж дома 180 кв м",
    expectedWorkKeys: ["electrical_area_installation", "socket_installation"],
    requiredTokens: ["кабель", "щит", "розет", "провер"],
    forbiddenTokens: ["кирпич", "кладоч", "masonry wall"],
  },
];

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function currentHead(): string | null {
  const headPath = path.join(process.cwd(), ".git", "HEAD");
  if (!fs.existsSync(headPath)) return null;
  const head = fs.readFileSync(headPath, "utf8").trim();
  if (!head.startsWith("ref: ")) return head;
  const refPath = path.join(process.cwd(), ".git", head.slice("ref: ".length));
  return fs.existsSync(refPath) ? fs.readFileSync(refPath, "utf8").trim() : null;
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
  try {
    const response = await fetch(statusUrl);
    const statusText = await response.text().catch(() => "");
    if (response.ok && statusText.includes("packager-status:running")) return { reachable: true, started: false };
  } catch {
    // Start below.
  }

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const log = fs.openSync(METRO_LOG_PATH, "a");
  const child = spawn(
    process.platform === "win32" ? "cmd.exe" : "npx",
    process.platform === "win32"
      ? ["/c", "npx", "expo", "start", "--port", String(ANDROID_DEV_PORT), "--non-interactive"]
      : ["expo", "start", "--port", String(ANDROID_DEV_PORT), "--non-interactive"],
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
      if (response.ok) return { reachable: true, started: true };
    } catch {
      await wait(1500);
    }
  }
  return { reachable: false, started: true };
}

function deepLinkFor(testCase: AndroidCase): string {
  const url = new URL(`rik://${testCase.route.replace(/^\//, "")}`);
  url.searchParams.set("prompt", testCase.prompt);
  if (testCase.context === "foreman") url.searchParams.set("context", "foreman");
  url.searchParams.set(testCase.route === "/request" ? "autoPrepare" : "autoSend", "1");
  return url.toString();
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function launchDeepLink(adbPath: string, deviceId: string, uri: string): { ok: boolean; output: string } {
  const command = [
    "am",
    "start",
    "-W",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    shellQuote(uri),
    PACKAGE_NAME,
  ].join(" ");
  return runText(adbPath, ["-s", deviceId, "shell", command], 20_000);
}

function launchDevClientBundle(adbPath: string, deviceId: string): { ok: boolean; output: string } {
  runText(adbPath, ["-s", deviceId, "reverse", `tcp:${ANDROID_DEV_PORT}`, `tcp:${ANDROID_DEV_PORT}`], 10_000);
  const url = `exp+rik-expo-app://expo-development-client/?url=${encodeURIComponent(`http://10.0.2.2:${ANDROID_DEV_PORT}`)}`;
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

function dumpUiText(adbPath: string, deviceId: string): { ok: boolean; text: string; rawXml: string } {
  const dump = runText(adbPath, ["-s", deviceId, "shell", "uiautomator", "dump", "/sdcard/live_boq_pdf_catalog_bootstrap.xml"], 15_000);
  if (!dump.ok) return { ok: false, text: dump.output, rawXml: "" };
  const xml = runText(adbPath, ["-s", deviceId, "exec-out", "cat", "/sdcard/live_boq_pdf_catalog_bootstrap.xml"], 15_000);
  if (!xml.ok) return { ok: false, text: xml.output, rawXml: "" };
  const values = Array.from(xml.output.matchAll(/\b(?:text|content-desc|resource-id)="([^"]*)"/g))
    .map((match) => decodeXml(match[1] ?? "").trim())
    .filter(Boolean);
  return { ok: true, text: values.join("\n"), rawXml: xml.output };
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

async function waitForDevClientBundle(adbPath: string, deviceId: string): Promise<{ ok: boolean; launch: { ok: boolean; output: string }; text: string }> {
  runText(adbPath, ["-s", deviceId, "shell", "am", "force-stop", PACKAGE_NAME], 10_000);
  await wait(1_000);
  const launch = launchDevClientBundle(adbPath, deviceId);
  let lastText = "";
  for (let attempt = 0; attempt < 45; attempt += 1) {
    await wait(1_500);
    const dumped = dumpUiText(adbPath, deviceId);
    if (!dumped.ok) continue;
    lastText = dumped.text;
    if (lastText.includes("Development Build") && lastText.includes("DEVELOPMENT SERVERS")) {
      tapDevServerIfVisible(adbPath, deviceId);
      continue;
    }
    if (lastText.includes("There was a problem loading the project") || lastText.includes("SocketTimeoutException")) {
      continue;
    }
    if (
      lastText.includes("ROUTE_PROOF_APP_ROOT_READY") ||
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

async function waitForCaseUi(adbPath: string, deviceId: string, testCase: AndroidCase): Promise<string> {
  let lastText = "";
  const visibleTokens = testCase.uiTokens ?? testCase.requiredTokens;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await wait(1_500);
    const dumped = dumpUiText(adbPath, deviceId);
    if (!dumped.ok) continue;
    lastText = dumped.text;
    if (textContainsAll(lastText, visibleTokens) || (lastText.includes("Сделать PDF") && lastText.includes("Источник"))) {
      return lastText;
    }
  }
  return lastText;
}

async function collectUiTextAcrossScrolls(adbPath: string, deviceId: string): Promise<string> {
  const snapshots: string[] = [];
  const capture = (): void => {
    const dumped = dumpUiText(adbPath, deviceId);
    if (dumped.ok && dumped.text.trim()) snapshots.push(dumped.text);
  };
  capture();
  for (let index = 0; index < 3; index += 1) {
    runText(adbPath, ["-s", deviceId, "shell", "input", "swipe", "540", "700", "540", "2050", "450"], 10_000);
    await wait(700);
    capture();
  }
  for (let index = 0; index < 7; index += 1) {
    runText(adbPath, ["-s", deviceId, "shell", "input", "swipe", "540", "2050", "540", "520", "450"], 10_000);
    await wait(700);
    capture();
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
  runText(adbPath, ["-s", deviceId, "shell", "uiautomator", "dump", "/sdcard/live_boq_pdf_catalog.xml"], 15_000);
  const result = runText(adbPath, ["-s", deviceId, "exec-out", "cat", "/sdcard/live_boq_pdf_catalog.xml"], 15_000);
  if (!result.ok || !result.output.trim()) return { path: null, text: result.output };
  fs.mkdirSync(UI_DUMP_DIR, { recursive: true });
  const filePath = path.join(UI_DUMP_DIR, `${caseId}.xml`);
  fs.writeFileSync(filePath, result.output, "utf8");
  return { path: path.relative(process.cwd(), filePath).replace(/\\/g, "/"), text: result.output };
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
  const uri = deepLinkFor(testCase);
  const launch = launchDeepLink(adbPath, deviceId, uri);
  const initialUiText = await waitForCaseUi(adbPath, deviceId, testCase);
  const scrolledUiText = await collectUiTextAcrossScrolls(adbPath, deviceId);
  const screenshotPath = captureScreenshot(adbPath, deviceId, testCase.caseId);
  const uiDump = captureUiDump(adbPath, deviceId, testCase.caseId);
  const uiEvidenceText = [initialUiText, scrolledUiText, uiDump.text].join("\n");
  const uiRowsVisible = textContainsAll(uiEvidenceText, testCase.uiTokens ?? testCase.requiredTokens);
  const uiForbiddenFound = textContainsAny(uiEvidenceText, testCase.forbiddenTokens);
  const failures = [
    ...backend.failures,
    ...(launch.ok ? [] : [`launch_failed:${launch.output.slice(0, 300)}`]),
    ...(uiRowsVisible ? [] : ["ui_required_rows_missing"]),
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
    uiRowsVisible,
    pdfActionVisible: backend.pdfActionVisible,
    screenshotPath,
    uiDumpPath: uiDump.path,
    failures,
  };
}

async function main(): Promise<void> {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(UI_DUMP_DIR, { recursive: true });

  const device = await ensureAndroidApi34DeviceReady({ artifactDir: ARTIFACT_DIR, bootTimeoutMs: 240_000, allowCreateAvd: false });
  const failures: string[] = [];
  if (device.final_status !== "GREEN_ANDROID_API34_DEVICE_READY" || !device.adb_path || !device.device_id) {
    failures.push(device.final_status);
  }

  const metro = failures.length === 0 ? await ensureMetro() : { reachable: false, started: false };
  if (failures.length === 0 && !metro.reachable) failures.push("ANDROID_METRO_NOT_REACHABLE");

  let installOutput: string | null = null;
  let devClientReady: { ok: boolean; launch: { ok: boolean; output: string }; text: string } | null = null;
  if (failures.length === 0 && device.adb_path && device.device_id) {
    if (!fs.existsSync(APK_PATH)) {
      failures.push(`ANDROID_APK_MISSING:${APK_PATH}`);
    } else {
      const install = runText(device.adb_path, ["-s", device.device_id, "install", "-r", APK_PATH], 120_000);
      installOutput = install.output.slice(0, 1000);
      if (!install.ok) failures.push(`ANDROID_APK_INSTALL_FAILED:${installOutput}`);
    }
  }

  if (failures.length === 0 && device.adb_path && device.device_id) {
    devClientReady = await waitForDevClientBundle(device.adb_path, device.device_id);
    if (!devClientReady.ok) failures.push(`ANDROID_DEV_CLIENT_BUNDLE_NOT_READY:${devClientReady.text.slice(0, 300)}`);
  }

  const cases: AndroidCaseResult[] = [];
  if (failures.length === 0 && device.adb_path && device.device_id) {
    for (const testCase of CASES) {
      const result = await runAndroidCase(device.adb_path, device.device_id, testCase);
      cases.push(result);
      failures.push(...result.failures.map((failure) => `${testCase.caseId}:${failure}`));
    }
  }

  const passed = failures.length === 0;
  const screenshotPaths = cases.flatMap((item) => (item.screenshotPath ? [{ caseId: item.caseId, path: item.screenshotPath }] : []));
  const uiDumpPaths = cases.flatMap((item) => (item.uiDumpPath ? [{ caseId: item.caseId, path: item.uiDumpPath }] : []));
  writeJson("android_api34_results.json", {
    wave: "S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_TABLE_CATALOG_FIX_POINT_OF_NO_RETURN",
    final_status: passed ? "GREEN_ANDROID_API34_LIVE_BOQ_PDF_CATALOG_READY" : "BLOCKED_ANDROID_API34_LIVE_BOQ_PDF_CATALOG",
    android_api34_tested: passed,
    android_api34_smoke_passed: passed,
    api36_rejected: device.final_status !== "BLOCKED_ANDROID_API36_NOT_ALLOWED_FOR_ACCEPTANCE",
    head: currentHead(),
    device_id: device.device_id,
    android_sdk: device.android_sdk,
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
    metro,
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
