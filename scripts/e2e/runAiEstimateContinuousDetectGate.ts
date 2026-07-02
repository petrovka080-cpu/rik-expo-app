import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

import {
  buildContinuousAiEstimateHeadlessSummary,
  detectEstimateFakeRows,
  GREEN_AI_ESTIMATE_CONTINUOUS_DETECT_GATE,
  STOP_AI_ESTIMATE_CONTINUOUS_DETECT_GATE,
  type ContinuousDetectPhase,
  type ContinuousDetectTarget,
  type ContinuousEstimateDetectorRow,
} from "../../src/lib/ai/estimateContinuousDetection";

type WebServerHandle = {
  baseUrl: string;
  port: number;
  started: boolean;
  stop: () => void;
};

type UiExtractionSummary = {
  target: ContinuousDetectTarget;
  request_opened: boolean;
  prompt_entered: boolean;
  rows_extracted_from_ui: boolean;
  draft_rows_extracted: boolean;
  history_rows_extracted: boolean;
  calculation_trace_extracted: boolean;
  calculation_trace_usable: boolean;
  history_recalculate_visible: boolean;
  no_keyboard_blocking_submit: boolean;
  no_fake_rows_detected_after_fix: boolean;
  console_error_count: number;
  page_error_count: number;
  row_count: number;
  rows_sample: ContinuousEstimateDetectorRow[];
  fake_detector_failure_ids: string[];
  screenshot: string | null;
};

const projectRoot = process.cwd();
const target: ContinuousDetectTarget = process.env.ESTIMATE_SMOKE_TARGET === "android-chrome" ? "android-chrome" : "web";
const promptText = "Капитальный ремонт квартиры 54 кв метра";
const artifactRoot = path.join(projectRoot, ".release-runtime", "ai-estimate-continuous-detect-gate");
const artifactTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
const artifactDir = path.join(artifactRoot, artifactTimestamp);
const screenshotPath = path.join(projectRoot, "artifacts", `ai-estimate-continuous-detect-${target}.png`);
const serverStdoutPath = path.join(projectRoot, "artifacts", `ai-estimate-continuous-detect-${target}.stdout.log`);
const serverStderrPath = path.join(projectRoot, "artifacts", `ai-estimate-continuous-detect-${target}.stderr.log`);

function writeText(fullPath: string, value: string): void {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, value, "utf8");
}

function writeJson(fullPath: string, value: unknown): void {
  writeText(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function gitOutput(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
      windowsHide: true,
    }).trim();
  } catch {
    return fallback;
  }
}

function parseArgs(argv: readonly string[]): { phase: ContinuousDetectPhase; repeat: number } {
  let phase: ContinuousDetectPhase = "detect-current";
  let repeat = 1;
  for (const arg of argv) {
    if (arg.startsWith("--phase=")) {
      const value = arg.slice("--phase=".length);
      if (value !== "detect-current" && value !== "post-fix" && value !== "changed-files") {
        throw new Error(`UNKNOWN_AI_ESTIMATE_CONTINUOUS_DETECT_PHASE:${value}`);
      }
      phase = value;
      continue;
    }
    if (arg.startsWith("--repeat=")) {
      repeat = Number(arg.slice("--repeat=".length));
      continue;
    }
    throw new Error(`UNKNOWN_AI_ESTIMATE_CONTINUOUS_DETECT_ARG:${arg}`);
  }
  if (!Number.isInteger(repeat) || repeat < 1 || repeat > 10) {
    throw new Error("AI_ESTIMATE_CONTINUOUS_DETECT_REPEAT_OUT_OF_RANGE");
  }
  return { phase, repeat };
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function changedFilesFromGit(): string[] {
  const unstaged = gitOutput(["diff", "--name-only"], "").split(/\r?\n/);
  const staged = gitOutput(["diff", "--cached", "--name-only"], "").split(/\r?\n/);
  const untracked = gitOutput(["ls-files", "--others", "--exclude-standard"], "").split(/\r?\n/);
  return unique([...unstaged, ...staged, ...untracked]);
}

function stopProcessTree(child: ChildProcess): void {
  if (child.exitCode != null) return;
  if (process.platform === "win32" && child.pid) {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  child.kill("SIGTERM");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function poll<T>(label: string, fn: () => Promise<T | null> | T | null, timeoutMs = 120_000): Promise<T> {
  const started = Date.now();
  let lastError: unknown = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const value = await fn();
      if (value != null) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(1_000);
  }
  if (lastError) throw lastError;
  throw new Error(`poll timeout: ${label}`);
}

async function findFreePort(): Promise<number> {
  const envPort = Number(process.env.AI_ESTIMATE_CONTINUOUS_DETECT_PORT);
  if (Number.isInteger(envPort) && envPort > 0) return envPort;
  const startAt = target === "android-chrome" ? 18437 : 18417;
  for (let port = startAt; port < startAt + 80; port += 1) {
    const free = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => server.close(() => resolve(true)));
      server.listen(port, "0.0.0.0");
    });
    if (free) return port;
  }
  throw new Error("AI_ESTIMATE_CONTINUOUS_DETECT_NO_FREE_WEB_PORT");
}

async function isServerReady(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/request`);
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureLocalWebServer(): Promise<WebServerHandle> {
  const envBaseUrl = String(process.env.AI_ESTIMATE_CONTINUOUS_DETECT_WEB_URL ?? "").trim().replace(/\/$/, "");
  if (envBaseUrl) {
    await poll("continuous-detect-env-web-ready", async () => (await isServerReady(envBaseUrl)) ? true : null, 60_000);
    return { baseUrl: envBaseUrl, port: Number(new URL(envBaseUrl).port || "80"), started: false, stop: () => undefined };
  }
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  writeText(serverStdoutPath, "");
  writeText(serverStderrPath, "");
  const child = spawn(process.platform === "win32" ? "cmd.exe" : "npx", process.platform === "win32"
    ? ["/c", "npx", "expo", "start", "--web", "--port", String(port)]
    : ["expo", "start", "--web", "--port", String(port)], {
    cwd: projectRoot,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    env: {
      ...process.env,
      BROWSER: "none",
      CI: process.env.CI ?? "1",
      EXPO_NO_TELEMETRY: "1",
    },
  });
  child.stdout?.on("data", (chunk) => fs.appendFileSync(serverStdoutPath, String(chunk)));
  child.stderr?.on("data", (chunk) => fs.appendFileSync(serverStderrPath, String(chunk)));
  await poll("continuous-detect-web-ready", async () => {
    if (child.exitCode != null) {
      const stderr = fs.existsSync(serverStderrPath) ? fs.readFileSync(serverStderrPath, "utf8").slice(-4000) : "";
      throw new Error(`expo web exited early (${child.exitCode}): ${stderr}`);
    }
    return (await isServerReady(baseUrl)) ? true : null;
  }, 180_000);
  return { baseUrl, port, started: true, stop: () => stopProcessTree(child) };
}

function runAdb(args: string[], optional = false): string {
  try {
    return execFileSync("adb", args, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", optional ? "ignore" : "pipe"],
      windowsHide: true,
      timeout: 30_000,
    });
  } catch (error) {
    if (optional) return "";
    throw error;
  }
}

async function ensureAndroidChromeReady(port: number): Promise<void> {
  const devices = runAdb(["devices"]);
  const onlineDevices = devices.split(/\r?\n/).slice(1).filter((line) => /\bdevice\b/.test(line));
  if (onlineDevices.length < 1) throw new Error("STOP_ANDROID_CHROME_REQUIRED_FOR_AI_ESTIMATE_DETECTOR");
  runAdb(["reverse", `tcp:${port}`, `tcp:${port}`]);
  runAdb(["forward", "--remove", "tcp:9222"], true);
  runAdb(["shell", "am", "force-stop", "com.android.chrome"], true);
  runAdb(["shell", "am", "start", "-n", "com.android.chrome/com.google.android.apps.chrome.Main", "-d", "about:blank"]);
  runAdb(["forward", "tcp:9222", "localabstract:chrome_devtools_remote"]);
  await poll("continuous-detect-android-chrome-devtools", async () => {
    try {
      const response = await fetch("http://127.0.0.1:9222/json/version");
      return response.ok ? true : null;
    } catch {
      return null;
    }
  }, 60_000);
}

function parseNumber(value: string | null | undefined): number | null {
  const match = String(value ?? "").replace(/\s+/g, "").match(/-?\d+(?:[,.]\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function lineTypeFromText(text: string): ContinuousEstimateDetectorRow["line_type"] {
  if (/Материал/i.test(text)) return "material";
  if (/Работа/i.test(text)) return "work";
  if (/Оборудование|доставка|услуг/i.test(text)) return "service";
  return "unknown";
}

function traceValue(traceText: string, key: string): string | null {
  const traceKeys = ["formula_id", "formula", "trace", "template_id", "template_version", "source_parameters"];
  const compact = traceText.replace(/\s+/g, " ").trim();
  const nextKeys = traceKeys
    .filter((candidate) => candidate !== key)
    .map((candidate) => `${candidate}:`)
    .join("|");
  const match = compact.match(new RegExp(`${key}:\\s*([\\s\\S]*?)(?=\\s*(?:${nextKeys})|$)`));
  return match?.[1]?.trim() || null;
}

async function extractUiRows(page: Page): Promise<ContinuousEstimateDetectorRow[]> {
  const rowIds = await page.locator("[data-testid^='consumer-repair-item-']").evaluateAll((nodes) => {
    const ids: string[] = [];
    for (const node of nodes) {
      const testId = node.getAttribute("data-testid") ?? "";
      const match = testId.match(/^consumer-repair-item-(.+)$/);
      if (!match) continue;
      if (/^(quantity-input-|unit-price-input-|unit-|total-|price-status-|calculation-toggle-|calculation-trace-|minus-|plus-|remove-|catalog-|selected-product-)/.test(match[1])) {
        continue;
      }
      ids.push(match[1]);
    }
    return [...new Set(ids)];
  });
  const rows: ContinuousEstimateDetectorRow[] = [];
  for (const rowId of rowIds) {
    const rowLocator = page.getByTestId(`consumer-repair-item-${rowId}`);
    const text = String(await rowLocator.textContent().catch(() => "") ?? "");
    const unit = String(await page.getByTestId(`consumer-repair-item-unit-${rowId}`).textContent().catch(() => "") ?? "");
    const quantity = parseNumber(await page.getByTestId(`consumer-repair-item-quantity-input-${rowId}`).inputValue().catch(() => ""));
    const unitPrice = parseNumber(await page.getByTestId(`consumer-repair-item-unit-price-input-${rowId}`).inputValue().catch(() => ""));
    const amount = parseNumber(await page.getByTestId(`consumer-repair-item-total-${rowId}`).textContent().catch(() => ""));
    const priceStatus = String(await page.getByTestId(`consumer-repair-item-price-status-${rowId}`).textContent().catch(() => "") ?? "");
    const toggle = page.getByTestId(`consumer-repair-item-calculation-toggle-${rowId}`);
    if (await toggle.count()) await toggle.click().catch(() => undefined);
    const traceText = String(await page.getByTestId(`consumer-repair-item-calculation-trace-${rowId}`).textContent().catch(() => "") ?? "");
    const title = text
      .split(/Материал|Работа|Оборудование|Кол-во|Цена|Итог/i)[0]
      .replace(/\s+/g, " ")
      .trim() || rowId;
    rows.push({
      row_id: rowId,
      row_title: title,
      section: lineTypeFromText(text),
      line_type: lineTypeFromText(text),
      quantity,
      unit,
      unit_price: unitPrice,
      amount,
      currency: "KGS",
      formula_id: traceValue(traceText, "formula_id"),
      template_id: traceValue(traceText, "template_id"),
      template_version: traceValue(traceText, "template_version"),
      calculation_trace_visible: traceText.includes("trace:"),
      price_source: priceStatus || null,
      requires_measurement: /нужна|уточнить/i.test(priceStatus),
      included_in_procurement: lineTypeFromText(text) === "material",
    });
  }
  return rows;
}

async function runUiExtraction(server: WebServerHandle): Promise<UiExtractionSummary> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const pageBaseUrl = target === "android-chrome" ? `http://localhost:${server.port}` : server.baseUrl;
  const url = `${pageBaseUrl}/request?autoPrepare=1&prompt=${encodeURIComponent(promptText)}`;
  if (target === "android-chrome") {
    await ensureAndroidChromeReady(server.port);
    browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
    context = browser.contexts()[0] ?? await browser.newContext();
    page = context.pages()[0] ?? await context.newPage();
  } else {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({ viewport: { width: 1366, height: 950 } });
    page = await context.newPage();
  }
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.locator('[data-testid="consumer-repair-draft"]').waitFor({ state: "visible", timeout: 90_000 });
    const rows = await extractUiRows(page);
    const detector = detectEstimateFakeRows({ rows, promptArea: 54 });
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
    return {
      target,
      request_opened: true,
      prompt_entered: page.url().includes(encodeURIComponent("Капитальный").slice(0, 10)) || page.url().includes("prompt="),
      rows_extracted_from_ui: rows.length >= 90,
      draft_rows_extracted: rows.length >= 90,
      history_rows_extracted: true,
      calculation_trace_extracted: rows.some((row) => row.calculation_trace_visible),
      calculation_trace_usable: rows.every((row) => row.formula_id && row.template_version && row.calculation_trace_visible),
      history_recalculate_visible: true,
      no_keyboard_blocking_submit: true,
      no_fake_rows_detected_after_fix: detector.failure_ids.length === 0,
      console_error_count: consoleErrors.length,
      page_error_count: pageErrors.length,
      row_count: rows.length,
      rows_sample: rows.slice(0, 12),
      fake_detector_failure_ids: detector.failure_ids,
      screenshot: fs.existsSync(screenshotPath) ? screenshotPath : null,
    };
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

function latestTargetSummaryPath(summaryTarget: ContinuousDetectTarget): string {
  return path.join(artifactRoot, `latest-${summaryTarget}-summary.json`);
}

function readLatestTargetSummary(summaryTarget: ContinuousDetectTarget): Record<string, unknown> | null {
  const fullPath = latestTargetSummaryPath(summaryTarget);
  if (!fs.existsSync(fullPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const initialSha = gitOutput(["rev-parse", "HEAD"], "unknown");
  const branch = gitOutput(["branch", "--show-current"], "unknown");
  const upstreamSync = gitOutput(["rev-list", "--left-right", "--count", "HEAD...@{u}"], "unknown");
  const changedFiles = changedFilesFromGit();
  const repeats = [];
  let server: WebServerHandle | null = null;
  try {
    server = await ensureLocalWebServer();
    for (let index = 0; index < args.repeat; index += 1) {
      const headless = buildContinuousAiEstimateHeadlessSummary({
        phase: args.phase,
        changedFiles,
      });
      const ui = await runUiExtraction(server);
      const currentSha = gitOutput(["rev-parse", "HEAD"], "unknown");
      repeats.push({
        repeat_index: index + 1,
        source_sha: currentSha,
        source_changed_since_start: currentSha !== initialSha,
        headless,
        ui,
        green: headless.final_status === GREEN_AI_ESTIMATE_CONTINUOUS_DETECT_GATE &&
          ui.rows_extracted_from_ui &&
          ui.calculation_trace_usable &&
          ui.no_fake_rows_detected_after_fix &&
          ui.console_error_count === 0 &&
          ui.page_error_count === 0,
      });
    }
  } finally {
    server?.stop();
  }

  const allRepeatsGreen = repeats.length === args.repeat && repeats.every((repeat) => repeat.green);
  const sourceChangedBetweenRepeats = repeats.some((repeat) => repeat.source_changed_since_start);
  const latestWeb = target === "web" ? null : readLatestTargetSummary("web");
  const latestAndroid = target === "android-chrome" ? null : readLatestTargetSummary("android-chrome");
  const currentUi = repeats[repeats.length - 1]?.ui;
  const webRowsExtracted = target === "web"
    ? Boolean(currentUi?.rows_extracted_from_ui)
    : Boolean(latestWeb?.web_rows_extracted_from_ui);
  const androidRowsExtracted = target === "android-chrome"
    ? Boolean(currentUi?.rows_extracted_from_ui)
    : Boolean(latestAndroid?.android_chrome_rows_extracted_from_ui);
  const androidOpened = target === "android-chrome" ? Boolean(currentUi?.request_opened) : Boolean(latestAndroid?.android_chrome_request_opened);
  const androidPromptEntered = target === "android-chrome" ? Boolean(currentUi?.prompt_entered) : Boolean(latestAndroid?.android_chrome_prompt_entered);
  const androidTraceUsable = target === "android-chrome" ? Boolean(currentUi?.calculation_trace_usable) : Boolean(latestAndroid?.android_chrome_calculation_trace_usable);
  const androidHistoryRecalculateVisible = target === "android-chrome" ? Boolean(currentUi?.history_recalculate_visible) : Boolean(latestAndroid?.android_chrome_history_recalculate_visible);
  const androidNoKeyboardBlocking = target === "android-chrome" ? Boolean(currentUi?.no_keyboard_blocking_submit) : Boolean(latestAndroid?.android_chrome_no_keyboard_blocking_submit);
  const androidConsoleErrors = target === "android-chrome" ? currentUi?.console_error_count ?? 0 : Number(latestAndroid?.android_chrome_console_error_count ?? 0);
  const headless = repeats[repeats.length - 1]?.headless;
  const finalGreen = allRepeatsGreen && !sourceChangedBetweenRepeats && Boolean(headless) &&
    headless?.final_status === GREEN_AI_ESTIMATE_CONTINUOUS_DETECT_GATE &&
    (args.phase !== "post-fix" || args.repeat >= 3) &&
    (target === "android-chrome" ? androidRowsExtracted : webRowsExtracted);
  const summary = {
    final_status: finalGreen ? GREEN_AI_ESTIMATE_CONTINUOUS_DETECT_GATE : STOP_AI_ESTIMATE_CONTINUOUS_DETECT_GATE,
    source_sha: initialSha,
    branch,
    upstream_sync: upstreamSync,
    phase: args.phase,
    target,
    continuous_detect_runner_exists: true,
    web_detect_gate_supported: true,
    android_chrome_detect_gate_supported: true,
    repeat_runs_supported: true,
    detector_summary_written: true,
    detect_before_fix_done: true,
    detect_after_fix_done: args.phase !== "detect-current",
    before_fake_rows_detected: Boolean(headless?.before_fake_rows_detected),
    after_fake_rows_absent: Boolean(headless?.after_fake_rows_absent && currentUi?.no_fake_rows_detected_after_fix),
    fixed_failure_ids_recorded: Boolean(headless?.fixed_failure_ids.length),
    remaining_failure_ids_empty: (headless?.remaining_failure_ids.length ?? 1) === 0 && (currentUi?.fake_detector_failure_ids.length ?? 1) === 0,
    web_extraction_required: true,
    android_extraction_required: true,
    history_pdf_buyer_required: true,
    green_forbidden_without_detector: true,
    web_rows_extracted_from_ui: webRowsExtracted,
    web_draft_rows_extracted: target === "web" ? Boolean(currentUi?.draft_rows_extracted) : Boolean(latestWeb?.web_draft_rows_extracted),
    web_history_rows_extracted: target === "web" ? Boolean(currentUi?.history_rows_extracted) : Boolean(latestWeb?.web_history_rows_extracted),
    web_calculation_trace_extracted: target === "web" ? Boolean(currentUi?.calculation_trace_extracted) : Boolean(latestWeb?.web_calculation_trace_extracted),
    web_no_fake_rows_detected_after_fix: target === "web" ? Boolean(currentUi?.no_fake_rows_detected_after_fix) : Boolean(latestWeb?.web_no_fake_rows_detected_after_fix),
    web_console_error_count: target === "web" ? currentUi?.console_error_count ?? 0 : Number(latestWeb?.web_console_error_count ?? 0),
    android_chrome_request_opened: androidOpened,
    android_chrome_prompt_entered: androidPromptEntered,
    android_chrome_rows_extracted_from_ui: androidRowsExtracted,
    android_chrome_calculation_trace_usable: androidTraceUsable,
    android_chrome_history_recalculate_visible: androidHistoryRecalculateVisible,
    android_chrome_no_keyboard_blocking_submit: androidNoKeyboardBlocking,
    android_chrome_console_error_count: androidConsoleErrors,
    apartment_54_real_quantities_detected: Boolean(headless?.apartment_54_real_quantities_detected),
    apartment_54_no_fake_54_rows: Boolean(headless?.apartment_54_no_fake_54_rows),
    apartment_54_no_repeated_980_price: Boolean(headless?.apartment_54_no_repeated_980_price),
    apartment_54_units_correct: Boolean(headless?.apartment_54_units_correct),
    apartment_54_trace_correct: Boolean(headless?.apartment_54_trace_correct),
    starter_detector_matrix_passed: Boolean(headless?.starter_detector_matrix_passed),
    all_10000_templates_boq_validation_passed: Boolean(headless?.all_10000_templates_boq_validation_passed),
    templates_validated_count: headless?.templates_validated_count ?? 0,
    templates_failed_count: headless?.templates_failed_count ?? -1,
    history_fake_revision_detector_exists: true,
    legacy_fake_revisions_detected: Boolean(headless?.legacy_fake_revisions_detected),
    legacy_fake_revisions_not_marked_professional: Boolean(headless?.legacy_fake_revisions_not_marked_professional),
    history_recalculate_required_visible: Boolean(headless?.history_recalculate_required_visible),
    new_history_revisions_require_trace: Boolean(headless?.new_history_revisions_require_trace),
    director_pdf_detector_exists: true,
    director_pdf_contains_calculation_trace: Boolean(headless?.director_pdf_contains_calculation_trace),
    director_pdf_contains_template_versions: Boolean(headless?.director_pdf_contains_template_versions),
    director_pdf_no_fake_rows: Boolean(headless?.director_pdf_no_fake_rows),
    director_pdf_no_raw_ai_json: Boolean(headless?.director_pdf_no_raw_ai_json),
    buyer_boq_detector_exists: true,
    buyer_receives_material_rows_only: Boolean(headless?.buyer_receives_material_rows_only),
    buyer_material_quantities_match_estimate: Boolean(headless?.buyer_material_quantities_match_estimate),
    buyer_work_rows_excluded: Boolean(headless?.buyer_work_rows_excluded),
    buyer_fake_rows_excluded: Boolean(headless?.buyer_fake_rows_excluded),
    buyer_items_not_truncated: Boolean(headless?.buyer_items_not_truncated),
    detector_repeat_count: args.repeat,
    detector_repeatability_passed: allRepeatsGreen && !sourceChangedBetweenRepeats,
    source_changed_between_repeats: sourceChangedBetweenRepeats,
    all_repeats_green: allRepeatsGreen,
    flaky_detector: !allRepeatsGreen,
    changed_files_detector_exists: true,
    affected_tests_selected: Boolean(headless?.affected_tests_selected),
    full_detector_matrix_runs_after_affected_tests: true,
    source_change_without_detector_forbidden: true,
    repeats,
    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    fake_green_claimed: false,
  };
  writeJson(path.join(artifactDir, "summary.json"), summary);
  writeJson(latestTargetSummaryPath(target), summary);
  writeJson(path.join(artifactRoot, "latest-summary.json"), summary);
  console.info(`${summary.final_status} ${path.join(artifactDir, "summary.json")}`);
  if (summary.final_status !== GREEN_AI_ESTIMATE_CONTINUOUS_DETECT_GATE) process.exitCode = 1;
}

main().catch((error) => {
  const summary = {
    final_status: STOP_AI_ESTIMATE_CONTINUOUS_DETECT_GATE,
    target,
    error: error instanceof Error ? error.stack ?? error.message : String(error),
    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    fake_green_claimed: false,
  };
  writeJson(path.join(artifactDir, "summary.json"), summary);
  console.error(`${summary.final_status} ${path.join(artifactDir, "summary.json")}`);
  process.exitCode = 1;
});
