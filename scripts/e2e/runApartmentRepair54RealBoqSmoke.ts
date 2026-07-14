import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
  listConsumerRepairApprovedHistory,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import { buildProjectExecutionDraftFromEstimate } from "../../src/lib/projectExecution";

type SmokeTarget = "web" | "android-chrome";
type SmokeStatus =
  | "GREEN_APARTMENT_REPAIR_54_REAL_BOQ_SMOKE"
  | "STOP_APARTMENT_REPAIR_54_REAL_BOQ_SMOKE_FAILED";

type WebServerHandle = {
  baseUrl: string;
  port: number;
  started: boolean;
  stop: () => void;
};

type SmokeCheck = {
  name: string;
  passed: boolean;
  details?: unknown;
};

type SmokeResult = {
  checked_at: string;
  final_status: SmokeStatus;
  target: SmokeTarget;
  prompt: string;
  base_url: string | null;
  checks: SmokeCheck[];
  row_count: number;
  ui_row_count: number | null;
  screenshot: string | null;
  artifact_json: string;
  artifact_md: string;
  error: string | null;
};

const projectRoot = process.cwd();
const target: SmokeTarget = process.env.ESTIMATE_SMOKE_TARGET === "android-chrome" ? "android-chrome" : "web";
const promptText = "Капитальный ремонт квартиры 54 кв метра";
const artifactStem = target === "android-chrome"
  ? "apartment-repair-54-real-boq-smoke-android-chrome"
  : "apartment-repair-54-real-boq-smoke";
const artifactJsonPath = path.join(projectRoot, "artifacts", `${artifactStem}.json`);
const artifactMdPath = path.join(projectRoot, "artifacts", `${artifactStem}.md`);
const screenshotPath = path.join(projectRoot, "artifacts", `${artifactStem}.png`);
const serverStdoutPath = path.join(projectRoot, "artifacts", `${artifactStem}.stdout.log`);
const serverStderrPath = path.join(projectRoot, "artifacts", `${artifactStem}.stderr.log`);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function writeText(fullPath: string, value: string) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, value, "utf8");
}

function writeJson(fullPath: string, value: unknown) {
  writeText(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function rowCode(row: { sourceParameters?: Record<string, unknown> | null; id?: string; rowId?: string }): string {
  return String(row.sourceParameters?.rowCode ?? row.id ?? row.rowId ?? "");
}

function addCheck(checks: SmokeCheck[], name: string, passed: boolean, details?: unknown) {
  checks.push({ name, passed, details });
}

async function poll<T>(
  label: string,
  fn: () => Promise<T | null> | T | null,
  timeoutMs = 120_000,
  delayMs = 1_000,
): Promise<T> {
  const started = Date.now();
  let lastError: unknown = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const value = await fn();
      if (value != null) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(delayMs);
  }
  if (lastError) throw lastError;
  throw new Error(`poll timeout: ${label}`);
}

function stopProcessTree(child: ChildProcess) {
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

async function findFreePort(startAt = target === "android-chrome" ? 18297 : 18277): Promise<number> {
  const envPort = Number(process.env.APARTMENT_REPAIR_54_SMOKE_WEB_PORT);
  if (Number.isInteger(envPort) && envPort > 0) return envPort;
  for (let port = startAt; port < startAt + 80; port += 1) {
    const free = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => server.close(() => resolve(true)));
      server.listen(port, "0.0.0.0");
    });
    if (free) return port;
  }
  throw new Error("No free local web port for apartment repair 54 smoke");
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
  const envBaseUrl = String(process.env.APARTMENT_REPAIR_54_SMOKE_WEB_URL ?? "").trim().replace(/\/$/, "");
  if (envBaseUrl) {
    await poll("apartment-repair-54-smoke-env-web-ready", async () => (await isServerReady(envBaseUrl)) ? true : null, 60_000, 1_000);
    return { baseUrl: envBaseUrl, port: Number(new URL(envBaseUrl).port || "80"), started: false, stop: () => undefined };
  }

  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  writeText(serverStdoutPath, "");
  writeText(serverStderrPath, "");
  const command = process.platform === "win32" ? "cmd.exe" : "npx";
  const args = process.platform === "win32"
    ? ["/c", "npx", "expo", "start", "--web", "--port", String(port)]
    : ["expo", "start", "--web", "--port", String(port)];
  const child = spawn(command, args, {
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
  await poll("apartment-repair-54-smoke-web-ready", async () => {
    if (child.exitCode != null) {
      const stderr = fs.existsSync(serverStderrPath) ? fs.readFileSync(serverStderrPath, "utf8").slice(-4000) : "";
      throw new Error(`expo web exited early (${child.exitCode}): ${stderr}`);
    }
    return (await isServerReady(baseUrl)) ? true : null;
  }, 180_000, 1_000);
  return { baseUrl, port, started: true, stop: () => stopProcessTree(child) };
}

function runAdb(args: string[], optional = false): string {
  try {
    return execFileSync("adb", args, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", optional ? "ignore" : "pipe"],
      windowsHide: true,
    });
  } catch (error) {
    if (optional) return "";
    throw error;
  }
}

async function ensureAndroidChromeReady(port: number) {
  const devices = runAdb(["devices"]);
  const onlineDevices = devices.split(/\r?\n/).slice(1).filter((line) => /\bdevice\b/.test(line));
  if (onlineDevices.length < 1) throw new Error("No online Android emulator/device for apartment repair 54 android-chrome smoke");
  runAdb(["reverse", `tcp:${port}`, `tcp:${port}`]);
  runAdb(["forward", "--remove", "tcp:9222"], true);
  runAdb(["shell", "am", "force-stop", "com.android.chrome"], true);
  runAdb(["shell", "am", "start", "-n", "com.android.chrome/com.google.android.apps.chrome.Main", "-d", "about:blank"]);
  runAdb(["forward", "tcp:9222", "localabstract:chrome_devtools_remote"]);
  await poll("android-chrome-devtools-ready", async () => {
    try {
      const response = await fetch("http://127.0.0.1:9222/json/version");
      return response.ok ? true : null;
    } catch {
      return null;
    }
  }, 60_000, 1_000);
}

function runModelChecks(): { checks: SmokeCheck[]; rowCount: number } {
  const checks: SmokeCheck[] = [];
  __resetConsumerRepairRequestStoreForTests();
  const aiDraft = buildConsumerRepairAiDraft(promptText);
  const rows = aiDraft.structuredEstimatePayload?.rows ?? [];
  addCheck(checks, "work_key_apartment_capital_renovation", aiDraft.structuredEstimatePayload?.workKey === "apartment_capital_renovation", aiDraft.structuredEstimatePayload?.workKey);
  addCheck(checks, "expanded_row_count_at_least_100", rows.length >= 100, rows.length);
  addCheck(checks, "all_rows_have_formula_template_trace", rows.every((row) =>
    row.formulaId && row.quantityFormula && row.calculationTrace && row.templateId && row.templateVersion && row.sourceParameters
  ));

  const rowsWithInputAreaQuantity = rows.filter((row) => row.quantity === 54);
  const unrelatedAreaRows = rowsWithInputAreaQuantity.filter((row) => !/screed_labor|floor_protection|final_cleaning/.test(rowCode(row)));
  addCheck(checks, "no_fake_area_multiplier_rows", rowsWithInputAreaQuantity.length <= 5 && unrelatedAreaRows.length === 0, {
    rowsWithInputAreaQuantity: rowsWithInputAreaQuantity.length,
    unrelatedAreaRows: unrelatedAreaRows.map((row) => rowCode(row)),
  });

  const electricalRows = rows.filter((row) => /electrical|cable|socket|conduit|panel/.test(rowCode(row)));
  const plumbingRows = rows.filter((row) => /plumbing|pipe|fitting|valve|sanitary/.test(rowCode(row)));
  addCheck(checks, "electrical_not_m2", electricalRows.length > 0 && electricalRows.every((row) => row.unit !== "sq_m"), electricalRows.map((row) => [rowCode(row), row.quantity, row.unit]));
  addCheck(checks, "plumbing_not_m2", plumbingRows.length > 0 && plumbingRows.every((row) => row.unit !== "sq_m"), plumbingRows.map((row) => [rowCode(row), row.quantity, row.unit]));

  const baseboardLabor = rows.find((row) => rowCode(row) === "apartment_baseboard_install_labor");
  addCheck(checks, "baseboard_linear_m_formula", Boolean(baseboardLabor && baseboardLabor.unit === "linear_m" && Math.abs(baseboardLabor.quantity - Math.sqrt(54) * 4) < 0.02), baseboardLabor);

  const deliveryRows = rows.filter((row) => row.sectionType === "delivery");
  addCheck(checks, "delivery_not_m2_or_area", deliveryRows.length > 0 && deliveryRows.every((row) => row.unit !== "sq_m" && row.quantity <= 2), deliveryRows.map((row) => [rowCode(row), row.quantity, row.unit]));

  const repeatedTotals = new Map<number, number>();
  for (const row of rows) {
    if (row.total != null) repeatedTotals.set(row.total, (repeatedTotals.get(row.total) ?? 0) + 1);
  }
  addCheck(checks, "no_repeated_total_clusters", [...repeatedTotals.values()].every((count) => count < 8));

  const bundle = createConsumerRepairRequestDraft({
    consumerUserId: "apartment-repair-54-smoke-user",
    problemText: promptText,
    repairType: "apartment_capital_renovation",
    city: "Бишкек",
    addressText: "Бишкек, smoke address 54",
    contactPhone: "+996700000000",
    aiDraft,
  });
  const vm = buildRequestEstimateViewModel(bundle);
  const approved = approveConsumerRepairRequestDraft({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
    generatedAt: "2026-07-02T00:00:00.000Z",
  });
  const history = listConsumerRepairApprovedHistory(bundle.draft.consumerUserId, { limit: 5 });
  const pdfViewModel = buildConsumerRepairStructuredEstimatePdfViewModel({
    draft: approved.draft,
    items: approved.items,
    media: approved.media,
    generatedAt: "2026-07-02T00:00:00.000Z",
  });
  const payload = approved.structuredEstimatePayload;
  const buyerDraft = payload ? buildProjectExecutionDraftFromEstimate(payload, {
    source: "request_estimate",
    sourceRequestId: approved.draft.id,
    countryCode: "KG",
    cityOrRegion: "Bishkek",
    generatedAt: "2026-07-02T00:00:00.000Z",
  }) : null;

  addCheck(checks, "request_sections_extended", Boolean(vm && ["Материалы", "Работы", "Оборудование", "Услуги / логистика"].every((title) =>
    vm.sections.some((section) => section.title === title)
  )), vm?.sections.map((section) => section.title));
  addCheck(checks, "request_items_keep_trace", approved.items.every((item) => item.formulaId && item.quantityFormula && item.calculationTrace && item.sourceParameters));
  addCheck(checks, "history_keeps_trace", Boolean(history.items[0]?.items.every((item) => item.calculationTrace && item.sourceParameters)));
  addCheck(checks, "pdf_view_model_keeps_formula_trace", Boolean(pdfViewModel?.sections.flatMap((section) => section.rows).some((row) =>
    row.sourceLabels.some((label) => label.includes("formula:") && label.includes("trace:"))
  )));
  addCheck(checks, "buyer_procurement_keeps_trace", Boolean(buyerDraft?.procurementItems.length && buyerDraft.procurementItems.every((item) =>
    item.formulaId && item.quantityFormula && item.calculationTrace && item.sourceParameters
  )), buyerDraft?.procurementItems.length);

  return { checks, rowCount: rows.length };
}

async function runUiSmoke(server: WebServerHandle): Promise<{ checks: SmokeCheck[]; uiRowCount: number; screenshot: string | null }> {
  const checks: SmokeCheck[] = [];
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
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
  await page.addInitScript("globalThis.__name = (target) => target;");
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.locator('[data-testid="consumer-repair-draft"]').waitFor({ state: "visible", timeout: 90_000 });
    const uiRowCount = await page.locator("[data-testid^='consumer-repair-item-']").evaluateAll((nodes) =>
      nodes.filter((node) => /^consumer-repair-item-(?!quantity-input-|unit-price-input-|unit-|total-|price-status-)/.test(node.getAttribute("data-testid") ?? "")).length,
    );
    const traceToggleCount = await page.locator("[data-testid^='consumer-repair-item-calculation-toggle-']").count();
    addCheck(checks, "ui_draft_rows_expanded", uiRowCount >= 90, uiRowCount);
    addCheck(checks, "ui_trace_toggles_visible", traceToggleCount >= 90, traceToggleCount);
    const firstTraceToggle = page.locator("[data-testid^='consumer-repair-item-calculation-toggle-']").first();
    await firstTraceToggle.click();
    const traceText = normalizeText(await page.locator("[data-testid^='consumer-repair-item-calculation-trace-']").first().textContent({ timeout: 10_000 }));
    addCheck(checks, "ui_trace_contains_formula_template_source", /formula_id:|formula:/.test(traceText) && /template_id:|template_version:/.test(traceText) && /source_parameters:/.test(traceText), traceText.slice(0, 500));
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
    return { checks, uiRowCount, screenshot: fs.existsSync(screenshotPath) ? screenshotPath : null };
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
}

function markdownSummary(result: SmokeResult): string {
  return [
    "# Apartment Repair 54 Real BOQ Smoke",
    "",
    `- status: ${result.final_status}`,
    `- target: ${result.target}`,
    `- prompt: ${result.prompt}`,
    `- row_count: ${result.row_count}`,
    `- ui_row_count: ${result.ui_row_count ?? "n/a"}`,
    `- base_url: ${result.base_url ?? "n/a"}`,
    `- screenshot: ${result.screenshot ?? "n/a"}`,
    `- error: ${result.error ?? "none"}`,
    "",
    "## Checks",
    "",
    ...result.checks.map((check) => `- ${check.passed ? "PASS" : "FAIL"} ${check.name}${check.details == null ? "" : `: ${JSON.stringify(check.details).slice(0, 500)}`}`),
    "",
  ].join("\n");
}

async function main() {
  let server: WebServerHandle | null = null;
  let rowCount = 0;
  let uiRowCount: number | null = null;
  let screenshot: string | null = null;
  const checks: SmokeCheck[] = [];
  let error: string | null = null;
  try {
    const model = runModelChecks();
    rowCount = model.rowCount;
    checks.push(...model.checks);
    server = await ensureLocalWebServer();
    const ui = await runUiSmoke(server);
    uiRowCount = ui.uiRowCount;
    screenshot = ui.screenshot;
    checks.push(...ui.checks);
  } catch (caught) {
    error = caught instanceof Error ? caught.stack ?? caught.message : String(caught);
    addCheck(checks, "smoke_runtime_exception", false, error);
  } finally {
    server?.stop();
  }

  const passed = checks.length > 0 && checks.every((check) => check.passed);
  const result: SmokeResult = {
    checked_at: new Date().toISOString(),
    final_status: passed ? "GREEN_APARTMENT_REPAIR_54_REAL_BOQ_SMOKE" : "STOP_APARTMENT_REPAIR_54_REAL_BOQ_SMOKE_FAILED",
    target,
    prompt: promptText,
    base_url: server?.baseUrl ?? null,
    checks,
    row_count: rowCount,
    ui_row_count: uiRowCount,
    screenshot,
    artifact_json: artifactJsonPath,
    artifact_md: artifactMdPath,
    error,
  };
  writeJson(artifactJsonPath, result);
  writeText(artifactMdPath, markdownSummary(result));
  console.log(`${result.final_status} ${artifactJsonPath}`);
  if (!passed) process.exitCode = 1;
}

main().catch((error) => {
  const result: SmokeResult = {
    checked_at: new Date().toISOString(),
    final_status: "STOP_APARTMENT_REPAIR_54_REAL_BOQ_SMOKE_FAILED",
    target,
    prompt: promptText,
    base_url: null,
    checks: [{ name: "uncaught", passed: false, details: error instanceof Error ? error.stack ?? error.message : String(error) }],
    row_count: 0,
    ui_row_count: null,
    screenshot: null,
    artifact_json: artifactJsonPath,
    artifact_md: artifactMdPath,
    error: error instanceof Error ? error.stack ?? error.message : String(error),
  };
  writeJson(artifactJsonPath, result);
  writeText(artifactMdPath, markdownSummary(result));
  console.error(`${result.final_status} ${artifactJsonPath}`);
  process.exitCode = 1;
});
