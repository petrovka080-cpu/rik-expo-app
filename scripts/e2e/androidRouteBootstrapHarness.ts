import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

export const ANDROID_ROUTE_BOOTSTRAP_WAVE =
  "S_ANDROID_B2C_REQUEST_EMBEDDED_AI_ROUTE_BOOTSTRAP_PROOF_UNBLOCK_POINT_OF_NO_RETURN";
export const ANDROID_ROUTE_BOOTSTRAP_GREEN = "GREEN_ANDROID_B2C_REQUEST_EMBEDDED_AI_ROUTE_BOOTSTRAP_READY";
export const ANDROID_ROUTE_BOOTSTRAP_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_ANDROID_B2C_REQUEST_EMBEDDED_AI_ROUTE_BOOTSTRAP",
);

export type AndroidRouteBootstrapStatus =
  | typeof ANDROID_ROUTE_BOOTSTRAP_GREEN
  | "BLOCKED_ANDROID_EMULATOR_NOT_DETECTED"
  | "BLOCKED_ANDROID_APP_ROOT_NOT_READY"
  | "BLOCKED_ANDROID_ROUTE_OPEN_FAILED"
  | "BLOCKED_ANDROID_PROMPT_SUBMIT_FAILED"
  | "BLOCKED_ANDROID_OUTPUT_CAPTURE_FAILED";

export type AndroidRouteBootstrapCase = {
  id: string;
  entrypoint: "request" | "embedded_ai";
  routeRequested: "/request" | "/ai?context=foreman";
  prompt: string;
};

export type AndroidRouteProof = {
  platform: "android";
  emulator_id: string | null;
  app_package: string;
  build_hash_or_version: string;
  route_requested: string;
  route_loaded: boolean;
  screen_identity_text: string;
  prompt: string;
  prompt_submitted: boolean;
  response_visible: boolean;
  intent_if_available: string;
  workKey_if_available: string;
  templateId_if_available: string;
  calculate_global_estimate_called_if_available: string;
  classification_if_available: string;
  screenshot_path: string | null;
  ui_dump_path: string | null;
  runtime_trace_id_if_available: string;
  error_if_any: string | null;
};

export type RouteOpenAttempt = {
  id: string;
  route_requested: string;
  uri: string;
  opened: boolean;
  ready_marker_found: boolean;
  screenshot_path: string | null;
  ui_dump_path: string | null;
  visible_text_sample: string;
  error_if_any: string | null;
};

export type CapturedScreen = {
  id: string;
  screenshot_path: string | null;
  ui_dump_path: string | null;
  xml: string;
  visibleText: string;
  error: string | null;
};

type StartedMetro = {
  started: boolean;
  port: number;
  stdoutPath: string;
  stderrPath: string;
  process: ChildProcess | null;
};

const APP_PACKAGE = "com.azisbek_dzhantaev.rikexpoapp";
export const ROUTE_PROOF_APP_ROOT_READY = "ROUTE_PROOF_APP_ROOT_READY";
export const ROUTE_PROOF_REQUEST_ROUTE_READY = "ROUTE_PROOF_REQUEST_ROUTE_READY";
export const ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY = "ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY";

const EXACT_ANDROID_ROUTE_PROMPTS = {
  requestLaminate100sqm:
    "\u0425\u043e\u0447\u0443 \u0443\u043b\u043e\u0436\u0438\u0442\u044c \u043b\u0430\u043c\u0438\u043d\u0430\u0442 \u043d\u0430 100 \u043a\u0432 \u043c",
  requestHydroTurbine100kw:
    "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0443 \u0442\u0443\u0440\u0431\u0438\u043d\u044b \u043d\u0430 \u0433\u044d\u0441 \u043c\u043e\u0449\u043d\u043e\u0441\u0442\u044c\u044e 100 \u043a\u0432\u0442",
  embeddedAiWindows:
    "\u0434\u0430\u0439 \u043c\u043d\u0435 \u0441\u043c\u0435\u0442\u0443 \u043d\u0430 \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0438 \u043e\u043a\u043e\u043d",
  embeddedAiBrick74sqm:
    "\u0434\u0430\u0439 \u0441\u043c\u0435\u0442\u0443 \u043d\u0430 \u043a\u043b\u0430\u0434\u043a\u0443 \u043a\u0438\u0440\u043f\u0438\u0447\u0430 74 \u043a\u0432 \u043c\u0435\u0442\u0440\u043e\u0432",
};

export const ANDROID_ROUTE_BOOTSTRAP_CASES: AndroidRouteBootstrapCase[] = [
  {
    id: "request_laminate_100sqm",
    entrypoint: "request",
    routeRequested: "/request",
    prompt: EXACT_ANDROID_ROUTE_PROMPTS.requestLaminate100sqm,
  },
  {
    id: "request_hydro_turbine_100kw",
    entrypoint: "request",
    routeRequested: "/request",
    prompt: EXACT_ANDROID_ROUTE_PROMPTS.requestHydroTurbine100kw,
  },
  {
    id: "embedded_ai_windows",
    entrypoint: "embedded_ai",
    routeRequested: "/ai?context=foreman",
    prompt: EXACT_ANDROID_ROUTE_PROMPTS.embeddedAiWindows,
  },
  {
    id: "embedded_ai_brick_74sqm",
    entrypoint: "embedded_ai",
    routeRequested: "/ai?context=foreman",
    prompt: EXACT_ANDROID_ROUTE_PROMPTS.embeddedAiBrick74sqm,
  },
];

export function ensureWaveDir(): void {
  fs.mkdirSync(path.join(ANDROID_ROUTE_BOOTSTRAP_DIR, "screenshots"), { recursive: true });
  fs.mkdirSync(path.join(ANDROID_ROUTE_BOOTSTRAP_DIR, "ui"), { recursive: true });
}

export function resetWaveDir(): void {
  fs.rmSync(ANDROID_ROUTE_BOOTSTRAP_DIR, { recursive: true, force: true });
  ensureWaveDir();
}

export function writeWaveJson(name: string, value: unknown): void {
  ensureWaveDir();
  fs.writeFileSync(path.join(ANDROID_ROUTE_BOOTSTRAP_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeWaveText(name: string, value: string): void {
  ensureWaveDir();
  fs.writeFileSync(path.join(ANDROID_ROUTE_BOOTSTRAP_DIR, name), value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

export function runAdb(args: string[], timeoutMs = 10_000, encoding: BufferEncoding | "buffer" = "utf8"): string | Buffer {
  return execFileSync("adb", args, {
    cwd: process.cwd(),
    encoding: encoding === "buffer" ? undefined : encoding,
    stdio: "pipe",
    timeout: timeoutMs,
  }) as string | Buffer;
}

export function detectEmulators(): string[] {
  try {
    return String(runAdb(["devices", "-l"], 8_000))
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^emulator-\d+\s+device\b/.test(line));
  } catch {
    return [];
  }
}

export function getBuildHashOrVersion(): string {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
      timeout: 5000,
    }).trim();
  } catch {
    return "not_available";
  }
}

export function quoteAndroidShell(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

export function buildDevClientUri(port: number, host: "127.0.0.1" | "10.0.2.2" = "127.0.0.1"): string {
  return `exp+rik-expo-app://expo-development-client/?url=${encodeURIComponent(`http://${host}:${port}`)}`;
}

export function buildRouteUri(testCase: AndroidRouteBootstrapCase): string {
  const query = new URLSearchParams();
  query.set("prompt", testCase.prompt);
  if (testCase.entrypoint === "request") {
    query.set("autoPrepare", "1");
    return `rik:///request?${query.toString()}`;
  }
  query.set("context", "foreman");
  query.set("autoSend", "1");
  return `rik:///ai?${query.toString()}`;
}

export function openDeepLink(uri: string, appPackage = APP_PACKAGE): void {
  runAdb(
    [
      "shell",
      `am start -a android.intent.action.VIEW -d ${quoteAndroidShell(uri)} ${quoteAndroidShell(appPackage)}`,
    ],
    12_000,
  );
}

export async function isMetroReachable(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/status`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function ensureMetro(port: number): Promise<StartedMetro> {
  ensureWaveDir();
  const stdoutPath = path.join(ANDROID_ROUTE_BOOTSTRAP_DIR, "metro.stdout.log");
  const stderrPath = path.join(ANDROID_ROUTE_BOOTSTRAP_DIR, "metro.stderr.log");
  if (await isMetroReachable(port)) {
    return { started: false, port, stdoutPath, stderrPath, process: null };
  }

  fs.writeFileSync(stdoutPath, "", "utf8");
  fs.writeFileSync(stderrPath, "", "utf8");
  const child = spawn(
    process.execPath,
    [
      path.join(process.cwd(), "node_modules", "expo", "bin", "cli"),
      "start",
      "--dev-client",
      "--host",
      "localhost",
      "--port",
      String(port),
      "--clear",
    ],
    {
      cwd: process.cwd(),
      env: { ...process.env, BROWSER: "none", CI: "1", EXPO_NO_TELEMETRY: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  child.stdout.on("data", (chunk) => fs.appendFileSync(stdoutPath, chunk));
  child.stderr.on("data", (chunk) => fs.appendFileSync(stderrPath, chunk));

  const startedAt = Date.now();
  while (Date.now() - startedAt < 120_000) {
    if (await isMetroReachable(port)) {
      return { started: true, port, stdoutPath, stderrPath, process: child };
    }
    await sleep(1000);
  }
  return { started: true, port, stdoutPath, stderrPath, process: child };
}

export function stopMetro(metro: StartedMetro): void {
  if (!metro.process?.pid) return;
  spawnSync("taskkill", ["/PID", String(metro.process.pid), "/T", "/F"], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 15_000,
  });
}

export function setupAndroidRuntime(port: number, appPackage = APP_PACKAGE, options: { clearAppState?: boolean } = {}): void {
  try {
    runAdb(["reverse", `tcp:${port}`, `tcp:${port}`], 8000);
  } catch {
    // The proof will fail at route/root evidence if reverse setup mattered.
  }
  try {
    runAdb(["shell", "input", "keyevent", "KEYCODE_WAKEUP"], 5000);
  } catch {
    // Best effort only.
  }
  try {
    runAdb(["shell", "wm", "dismiss-keyguard"], 5000);
  } catch {
    // Best effort only.
  }
  try {
    runAdb(["shell", "am", "broadcast", "-a", "android.intent.action.CLOSE_SYSTEM_DIALOGS"], 5000);
  } catch {
    // Best effort only.
  }
  try {
    runAdb(["shell", "am", "force-stop", appPackage], 8000);
  } catch {
    // Best effort only.
  }
  if (options.clearAppState) {
    try {
      runAdb(["shell", "pm", "clear", appPackage], 12_000);
    } catch {
      // Best effort only; route proof evidence decides the final status.
    }
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#10;/g, "\n")
    .replace(/&#13;/g, "\r")
    .replace(/&#39;/g, "'");
}

export function visibleTextFromXml(xml: string): string {
  const values: string[] = [];
  const attrRegex = /\b(?:text|content-desc|hint)="([^"]*)"/g;
  let match: RegExpExecArray | null = null;
  while ((match = attrRegex.exec(xml))) {
    const decoded = decodeXmlEntities(match[1]).trim();
    if (decoded) values.push(decoded);
  }
  return values.join(" ").replace(/\s+/g, " ").trim();
}

function parseBoundsCenter(bounds: string): { x: number; y: number } | null {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  const left = Number(match[1]);
  const top = Number(match[2]);
  const right = Number(match[3]);
  const bottom = Number(match[4]);
  return { x: Math.round((left + right) / 2), y: Math.round((top + bottom) / 2) };
}

export function tapFirstText(xml: string, matcher: RegExp): boolean {
  const nodeRegex = /<node\b([^>]*?)\/?>/g;
  let match: RegExpExecArray | null = null;
  while ((match = nodeRegex.exec(xml))) {
    const attrs = match[1] ?? "";
    const pick = (name: string) => {
      const attrMatch = attrs.match(new RegExp(`${name}="([^"]*)"`, "i"));
      return decodeXmlEntities(attrMatch?.[1] ?? "");
    };
    const label = `${pick("text")} ${pick("content-desc")}`.trim();
    if (!matcher.test(label)) continue;
    const center = parseBoundsCenter(pick("bounds"));
    if (!center) continue;
    try {
      runAdb(["shell", "input", "tap", String(center.x), String(center.y)], 5000);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function dismissBlockingAndroidSurface(screen: CapturedScreen): boolean {
  if (/This is the developer menu|Continue/i.test(screen.visibleText)) {
    return tapFirstText(screen.xml, /^Continue$/i);
  }
  if (/isn't responding|Close app|Wait|keeps stopping|has stopped/i.test(screen.visibleText)) {
    return (
      tapFirstText(screen.xml, /^Wait$/i) ||
      tapFirstText(screen.xml, /^Close app$/i) ||
      tapFirstText(screen.xml, /^OK$/i)
    );
  }
  if (/Allow|While using the app|Only this time/i.test(screen.visibleText)) {
    return tapFirstText(screen.xml, /^(Allow|While using the app|Only this time)$/i);
  }
  return false;
}

export function captureScreen(id: string): CapturedScreen {
  return captureScreenInDir(id, ANDROID_ROUTE_BOOTSTRAP_DIR);
}

export function captureScreenInDir(id: string, artifactDir: string): CapturedScreen {
  fs.mkdirSync(path.join(artifactDir, "screenshots"), { recursive: true });
  fs.mkdirSync(path.join(artifactDir, "ui"), { recursive: true });
  const xmlDevicePath = `/sdcard/${id.replace(/[\\/]/g, "_")}.xml`;
  const xmlPath = path.join(artifactDir, "ui", `${id}.xml`);
  const screenshotPath = path.join(artifactDir, "screenshots", `${id}.png`);
  let xml = "";
  const errors: string[] = [];

  try {
    runAdb(["shell", "uiautomator", "dump", xmlDevicePath], 8000);
    runAdb(["pull", xmlDevicePath, xmlPath], 8000);
    xml = fs.readFileSync(xmlPath, "utf8");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  try {
    const png = runAdb(["exec-out", "screencap", "-p"], 8000, "buffer") as Buffer;
    fs.writeFileSync(screenshotPath, png);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  return {
    id,
    screenshot_path: fs.existsSync(screenshotPath) ? path.relative(process.cwd(), screenshotPath).replace(/\\/g, "/") : null,
    ui_dump_path: xml ? path.relative(process.cwd(), xmlPath).replace(/\\/g, "/") : null,
    xml,
    visibleText: visibleTextFromXml(xml),
    error: errors.length > 0 ? errors.join(" | ") : null,
  };
}

export function hasPlaceholderText(value: unknown): boolean {
  if (typeof value === "string") {
    return /\bplaceholder\b|fake screenshot|fake xml|captured from code analysis|not a real file/i.test(value);
  }
  if (Array.isArray(value)) return value.some(hasPlaceholderText);
  if (value && typeof value === "object") return Object.values(value).some(hasPlaceholderText);
  return false;
}

export function fileIsReal(relativePath: string | null, minBytes: number): boolean {
  if (!relativePath) return false;
  const fullPath = path.resolve(process.cwd(), relativePath);
  return fs.existsSync(fullPath) && fs.statSync(fullPath).size >= minBytes;
}

export function isBlankOrSystemSurface(screen: CapturedScreen): boolean {
  if (
    screen.visibleText.includes(ROUTE_PROOF_APP_ROOT_READY) ||
    screen.visibleText.includes(ROUTE_PROOF_REQUEST_ROUTE_READY) ||
    screen.visibleText.includes(ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY)
  ) {
    return false;
  }
  const xml = screen.xml;
  const text = screen.visibleText;
  if (!xml || !xml.includes("<node")) return true;
  if (/isn't responding|Close app|Wait|keeps stopping/i.test(text)) return true;
  if (/Development Build|DEVELOPMENT SERVERS|There was a problem loading/i.test(text)) return true;
  if (!text && /ComposeView|android\.view\.View/.test(xml)) return true;
  return false;
}

export function appRootReady(screen: CapturedScreen): boolean {
  if (screen.visibleText.includes(ROUTE_PROOF_APP_ROOT_READY)) return true;
  if (isBlankOrSystemSurface(screen)) return false;
  return /Смета|Заявка|Офис|Профиль|AI|Напишите|Ремонт дома/i.test(screen.visibleText);
}

export function requestRouteReady(screen: CapturedScreen): boolean {
  if (screen.visibleText.includes(ROUTE_PROOF_REQUEST_ROUTE_READY)) return true;
  return /Смета|Ремонт дома|Описание проблемы|Черновик заявки|Сделать PDF/i.test(screen.visibleText);
}

export function embeddedAiRouteReady(screen: CapturedScreen): boolean {
  if (screen.visibleText.includes(ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY)) return true;
  return /AI|ассистент|Напишите|foreman|прораб|Смета/i.test(screen.visibleText);
}

export function responseVisible(screen: CapturedScreen): boolean {
  return /Итого|Позиции|Черновик|Наименование|Материалы|Работы|смет/i.test(screen.visibleText);
}

export function gitChangedFiles(): string[] {
  const tracked = execFileSync("git", ["diff", "--name-only"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return Array.from(new Set([...tracked, ...untracked])).sort();
}

export function isAllowedRouteMarkerPath(raw: string): boolean {
  const file = raw.replace(/\\/g, "/");
  return (
    file === "src/lib/testing/routeReadyMarkers.tsx" ||
    file === "app/_layout.tsx" ||
    file === "app/(tabs)/request/index.tsx" ||
    file === "app/(tabs)/ai.tsx"
  );
}

export function productLogicChanged(files = gitChangedFiles()): boolean {
  return files.some(
    (file) =>
      !isAllowedRouteMarkerPath(file) &&
      /^(src\/features|app\/\(tabs\)|app\/request|app\/ai|app\/_layout|src\/lib\/navigation)\//.test(
        file.replace(/\\/g, "/"),
      ),
  );
}

export function forbiddenEstimateEngineChanged(files = gitChangedFiles()): boolean {
  return files.some((raw) => {
    const file = raw.replace(/\\/g, "/");
    return (
      /^src\/lib\/ai\/globalEstimate\//.test(file) ||
      /^src\/lib\/ai\/ratebook\//.test(file) ||
      /^src\/lib\/ai\/builtInAi\//.test(file) ||
      /^src\/lib\/pdf\//.test(file) ||
      /^src\/lib\/estimatePdf\//.test(file)
    );
  });
}

export function templateRatebookChanged(files = gitChangedFiles()): boolean {
  return files.some((raw) => {
    const file = raw.replace(/\\/g, "/");
    return /^src\/lib\/ai\/ratebook\//.test(file) || /template|ratebook/i.test(file) && /^src\/lib\/ai\//.test(file);
  });
}

export function pdfRendererChanged(files = gitChangedFiles()): boolean {
  return files.some((raw) => /^src\/lib\/(?:pdf|estimatePdf)\//.test(raw.replace(/\\/g, "/")));
}

export function readLogcatTail(): string {
  try {
    const raw = String(runAdb(["logcat", "-d", "-t", "500"], 8000));
    return raw
      .split(/\r?\n/)
      .filter((line) => /rikexpoapp|ReactNativeJS|Expo|ActivityTaskManager|lowmemory|ANR|Exception|Error/i.test(line))
      .slice(-120)
      .join("\n");
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export function androidProofBase(caseItem: AndroidRouteBootstrapCase, appPackage = APP_PACKAGE): AndroidRouteProof {
  return {
    platform: "android",
    emulator_id: null,
    app_package: appPackage,
    build_hash_or_version: getBuildHashOrVersion(),
    route_requested: caseItem.routeRequested,
    route_loaded: false,
    screen_identity_text: "",
    prompt: caseItem.prompt,
    prompt_submitted: false,
    response_visible: false,
    intent_if_available: "not_available_from_android_ui",
    workKey_if_available: "not_available_from_android_ui",
    templateId_if_available: "not_available_from_android_ui",
    calculate_global_estimate_called_if_available: "not_available_from_android_ui",
    classification_if_available: "not_available_from_android_ui",
    screenshot_path: null,
    ui_dump_path: null,
    runtime_trace_id_if_available: "not_available_from_android_ui",
    error_if_any: null,
  };
}
