import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  buildConsumerRepairCanonicalDraftPayload,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairPdfStorageObject,
  listConsumerRepairApprovedHistory,
  sendConsumerRepairRequestToMarketplace,
  type ConsumerRepairDraftBundle,
  type ConsumerRepairRequestItem,
} from "../../src/lib/consumerRequests";
import { __resetConsumerRepairPdfStorageForTests } from "../../src/lib/consumerRequests/consumerRequestPdfStorage";
import { buildProjectExecutionDraftFromEstimate } from "../../src/lib/projectExecution";

type AuditTarget = "web" | "android-chrome";
type RowSurface = "model_draft" | "web_ui_draft" | "web_ui_history" | "pdf_model" | "approved_history" | "buyer_handoff";

type ExtractedBoqRow = {
  surface: RowSurface;
  title: string;
  section: string | null;
  line_type: string | null;
  quantity: number | null;
  unit: string | null;
  unit_label: string | null;
  unit_price: number | null;
  amount: number | null;
  currency: string | null;
  formula_id: string | null;
  calculation_trace: string | null;
  template_id: string | null;
  template_version: string | null;
  source: string | null;
  source_label: string | null;
  price_source: string | null;
  price_status: string | null;
  rate_key: string | null;
  material_key: string | null;
  catalog_item_id: string | null;
};

type ModelReadback = {
  draft_rows: ExtractedBoqRow[];
  history_rows: ExtractedBoqRow[];
  pdf_rows: ExtractedBoqRow[];
  buyer_rows: ExtractedBoqRow[];
  pdf_object_exists: boolean;
  pdf_storage_key: string | null;
  pdf_body_sample: string | null;
  draft_payload_fingerprint: string;
  pdf_payload_fingerprint: string;
  marketplace_payload_fingerprint: string;
  marketplace_status: string;
  work_key: string | null;
  structured_row_count: number;
};

type RuntimeExtraction = {
  url: string;
  current_url: string | null;
  draft_rows: ExtractedBoqRow[];
  history_rows: ExtractedBoqRow[];
  ui_text_sample: string[];
  screenshot: string | null;
  console_error_messages: string[];
  console_warn_messages: string[];
  page_error_messages: string[];
};

type AuditResult = {
  checked_at: string;
  final_status:
    | "STOP_AI_ESTIMATE_FAKE_AREA_MULTIPLIER_ROWS_VISIBLE_IN_WEB_UI"
    | "STOP_AI_ESTIMATE_EXTRACTION_AUDIT_FAILED"
    | "GREEN_AI_ESTIMATE_NO_FAKE_AREA_MULTIPLIER_FOUND";
  prompt: string;
  route: "/request";
  target: AuditTarget;
  base_url: string | null;
  web_server_started_by_verifier: boolean;
  draft_rows: ExtractedBoqRow[];
  history_rows: ExtractedBoqRow[];
  pdf_rows: ExtractedBoqRow[];
  buyer_rows: ExtractedBoqRow[];
  ui_text_sample: string[];
  detected_fake_patterns: string[];
  console_error_count: number;
  console_warn_count: number;
  page_error_count: number;
  web_extraction_runner_exists: boolean;
  web_draft_rows_extracted: boolean;
  web_history_rows_extracted: boolean;
  web_fake_area_multiplier_detected: boolean;
  android_chrome_extraction_runner_exists: boolean;
  android_chrome_draft_rows_extracted: boolean | null;
  android_chrome_history_rows_extracted: boolean | null;
  android_chrome_fake_area_multiplier_detected: boolean | null;
  model_readback: Omit<ModelReadback, "draft_rows" | "history_rows" | "pdf_rows" | "buyer_rows">;
  artifact_json: string;
  artifact_md: string;
  screenshot: string | null;
  error: string | null;
};

type WebServerHandle = {
  baseUrl: string;
  port: number;
  started: boolean;
  stop: () => void;
};

const projectRoot = process.cwd();
const target: AuditTarget = process.env.ESTIMATE_SMOKE_TARGET === "android-chrome" ? "android-chrome" : "web";
const promptText = "\u041a\u0430\u043f\u0438\u0442\u0430\u043b\u044c\u043d\u044b\u0439 \u0440\u0435\u043c\u043e\u043d\u0442 \u043a\u0432\u0430\u0440\u0442\u0438\u0440\u044b 54 \u043a\u0432 \u043c\u0435\u0442\u0440\u0430";
const inputAreaSqm = 54;
const userId = "ai-estimate-real-boq-audit-user";
const artifactBaseName = target === "android-chrome"
  ? "ai-estimate-real-boq-extraction-audit-android-chrome"
  : "ai-estimate-real-boq-extraction-audit";
const artifactJsonPath = path.join(projectRoot, "artifacts", `${artifactBaseName}.json`);
const artifactMdPath = path.join(projectRoot, "artifacts", `${artifactBaseName}.md`);
const screenshotPath = path.join(projectRoot, "artifacts", `${artifactBaseName}.png`);
const serverStdoutPath = path.join(projectRoot, "artifacts", `${artifactBaseName}.stdout.log`);
const serverStderrPath = path.join(projectRoot, "artifacts", `${artifactBaseName}.stderr.log`);

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

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = normalizeText(value).replace(/\s/g, "").replace(",", ".");
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

async function poll<T>(
  label: string,
  fn: () => Promise<T | null> | T | null,
  timeoutMs = 180_000,
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

async function findFreePort(startAt = target === "android-chrome" ? 18217 : 18197): Promise<number> {
  const envPort = Number(process.env.AI_ESTIMATE_AUDIT_WEB_PORT);
  if (Number.isInteger(envPort) && envPort > 0) return envPort;
  for (let port = startAt; port < startAt + 60; port += 1) {
    const free = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => {
        server.close(() => resolve(true));
      });
      server.listen(port, "0.0.0.0");
    });
    if (free) return port;
  }
  throw new Error("No free local web port for AI estimate audit");
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
  const envBaseUrl = String(process.env.AI_ESTIMATE_AUDIT_WEB_URL ?? "").trim().replace(/\/$/, "");
  if (envBaseUrl) {
    const parsedPort = Number(new URL(envBaseUrl).port || "80");
    await poll("ai-estimate-audit-env-web-ready", async () => (await isServerReady(envBaseUrl)) ? true : null, 60_000, 1_000);
    return { baseUrl: envBaseUrl, port: parsedPort, started: false, stop: () => undefined };
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
      EXPO_NO_TELEMETRY: "1",
      BROWSER: "none",
      CI: process.env.CI ?? "1",
    },
  });
  child.stdout?.on("data", (chunk) => fs.appendFileSync(serverStdoutPath, String(chunk)));
  child.stderr?.on("data", (chunk) => fs.appendFileSync(serverStderrPath, String(chunk)));
  await poll("ai-estimate-audit-web-ready", async () => {
    if (child.exitCode != null) {
      const stderr = fs.existsSync(serverStderrPath) ? fs.readFileSync(serverStderrPath, "utf8").slice(-4000) : "";
      throw new Error(`expo web exited early (${child.exitCode}): ${stderr}`);
    }
    return (await isServerReady(baseUrl)) ? true : null;
  });
  return {
    baseUrl,
    port,
    started: true,
    stop: () => stopProcessTree(child),
  };
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
  if (onlineDevices.length < 1) throw new Error("No online Android emulator/device for android-chrome AI estimate audit");
  runAdb(["reverse", `tcp:${port}`, `tcp:${port}`]);
  runAdb(["forward", "--remove", "tcp:9222"], true);
  runAdb(["shell", "am", "force-stop", "com.android.chrome"], true);
  runAdb([
    "shell",
    "am",
    "start",
    "-n",
    "com.android.chrome/com.google.android.apps.chrome.Main",
    "-d",
    "about:blank",
  ]);
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

function dynamicString(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function rowFromItem(item: ConsumerRepairRequestItem, surface: RowSurface): ExtractedBoqRow {
  const dynamic = item as unknown as Record<string, unknown>;
  return {
    surface,
    title: normalizeText(item.titleRu),
    section: normalizeText(item.category) || null,
    line_type: item.itemType,
    quantity: item.quantity ?? null,
    unit: item.unit ?? null,
    unit_label: item.unitLabel ?? null,
    unit_price: item.unitPrice ?? null,
    amount: item.totalPrice ?? null,
    currency: item.currency ?? null,
    formula_id: dynamicString(dynamic, ["formulaId", "formula_id", "calculationFormulaId", "quantityFormula"]),
    calculation_trace: dynamicString(dynamic, ["calculationTrace", "calculation_trace", "trace", "quantityTrace"]),
    template_id: dynamicString(dynamic, ["templateId", "template_id", "estimateTemplateId"]),
    template_version: dynamicString(dynamic, ["templateVersion", "template_version", "estimateTemplateVersion"]),
    source: item.source ?? null,
    source_label: item.sourceLabel ?? null,
    price_source: item.priceSource ?? null,
    price_status: item.priceStatus ?? null,
    rate_key: item.rateKey ?? null,
    material_key: item.materialKey ?? null,
    catalog_item_id: item.catalogItemId ?? item.selectedCatalogItemId ?? null,
  };
}

function rowsFromBundle(bundle: ConsumerRepairDraftBundle, surface: RowSurface): ExtractedBoqRow[] {
  return bundle.items.map((item) => rowFromItem(item, surface));
}

function rowsFromCanonicalPayload(
  rows: ReturnType<typeof buildConsumerRepairCanonicalDraftPayload>["items"],
  surface: RowSurface,
): ExtractedBoqRow[] {
  return rows.map((item) => ({
    surface,
    title: normalizeText(item.titleRu),
    section: normalizeText(item.category) || null,
    line_type: item.itemType,
    quantity: item.quantity ?? null,
    unit: item.unit ?? null,
    unit_label: item.unitLabel ?? null,
    unit_price: item.unitPrice ?? null,
    amount: item.totalPrice ?? null,
    currency: item.currency ?? null,
    formula_id: item.formulaId ?? null,
    calculation_trace: item.calculationTrace ?? null,
    template_id: item.templateId ?? null,
    template_version: item.templateVersion ?? null,
    source: item.source ?? null,
    source_label: item.sourceLabel ?? null,
    price_source: item.priceSource ?? null,
    price_status: item.priceStatus ?? null,
    rate_key: item.rateKey ?? null,
    material_key: item.materialKey ?? null,
    catalog_item_id: item.catalogItemId ?? item.selectedCatalogItemId ?? null,
  }));
}

function buildBuyerRows(bundle: ConsumerRepairDraftBundle): ExtractedBoqRow[] {
  if (!bundle.structuredEstimatePayload) return [];
  const project = buildProjectExecutionDraftFromEstimate(bundle.structuredEstimatePayload, {
    source: "request_estimate",
    generatedAt: new Date().toISOString(),
    sourceRequestId: bundle.draft.id,
  });
  return project.procurementItems.map((item) => ({
    surface: "buyer_handoff",
    title: normalizeText(item.materialVisibleName),
    section: "procurement",
    line_type: "material",
    quantity: item.quantity ?? null,
    unit: item.unit ?? null,
    unit_label: item.unit ?? null,
    unit_price: null,
    amount: null,
    currency: null,
    formula_id: item.formulaId ?? null,
    calculation_trace: item.calculationTrace ?? null,
    template_id: item.templateId ?? null,
    template_version: item.templateVersion ?? null,
    source: "project_execution_derived_handoff",
    source_label: item.notes ?? null,
    price_source: item.priceStatus,
    price_status: item.priceStatus,
    rate_key: null,
    material_key: null,
    catalog_item_id: item.catalogItemId ?? null,
  }));
}

function buildModelReadback(): ModelReadback {
  __resetConsumerRepairRequestStoreForTests();
  __resetConsumerRepairPdfStorageForTests();

  const aiDraft = buildConsumerRepairAiDraft(promptText);
  let bundle = createConsumerRepairRequestDraft({
    consumerUserId: userId,
    problemText: promptText,
    repairType: "repair",
    city: "Bishkek",
    addressText: "Audit street 54",
    contactPhone: "+996700000000",
    aiDraft,
  });
  const draftPayload = buildConsumerRepairCanonicalDraftPayload(bundle, "draft_save");
  bundle = generateConsumerRepairRequestPdfForDraft({
    requestDraftId: bundle.draft.id,
    userId,
    generatedAt: "2026-07-02T00:00:00.000Z",
  });
  const latestPdf = bundle.pdfs.find((pdf) => pdf.pdfStatus === "generated") ?? null;
  const pdfObject = latestPdf ? getConsumerRepairPdfStorageObject({
    storageBucket: latestPdf.storageBucket,
    storageKey: latestPdf.storageKey,
  }) : null;
  const pdfPayload = buildConsumerRepairCanonicalDraftPayload(bundle, "pdf_generation");
  bundle = approveConsumerRepairRequestDraft({
    requestDraftId: bundle.draft.id,
    userId,
    generatedAt: "2026-07-02T00:01:00.000Z",
  });
  bundle = attachConsumerRepairMedia({
    requestDraftId: bundle.draft.id,
    mediaKind: "photo",
  });
  bundle = sendConsumerRepairRequestToMarketplace({
    requestDraftId: bundle.draft.id,
    userId,
    idempotencyKey: "ai-estimate-real-boq-audit",
  });
  const marketplacePayload = buildConsumerRepairCanonicalDraftPayload(bundle, "marketplace_send");
  const history = listConsumerRepairApprovedHistory(userId, { limit: 5 });
  const historyRows = history.items.flatMap((item) => rowsFromBundle(item, "approved_history"));

  return {
    draft_rows: rowsFromCanonicalPayload(draftPayload.items, "model_draft"),
    history_rows: historyRows,
    pdf_rows: rowsFromCanonicalPayload(pdfPayload.items, "pdf_model"),
    buyer_rows: buildBuyerRows(bundle),
    pdf_object_exists: Boolean(pdfObject),
    pdf_storage_key: latestPdf?.storageKey ?? null,
    pdf_body_sample: pdfObject?.body.slice(0, 2000) ?? null,
    draft_payload_fingerprint: draftPayload.parityFingerprint,
    pdf_payload_fingerprint: pdfPayload.parityFingerprint,
    marketplace_payload_fingerprint: marketplacePayload.parityFingerprint,
    marketplace_status: bundle.marketplaceLink.status,
    work_key: bundle.structuredEstimatePayload?.workKey ?? null,
    structured_row_count: bundle.structuredEstimatePayload?.rows.length ?? 0,
  };
}

async function extractDraftRowsFromUi(page: Page): Promise<ExtractedBoqRow[]> {
  return page.evaluate(() => {
    const normalizeText = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
    const numberOrNull = (value: unknown): number | null => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      const text = normalizeText(value).replace(/\s/g, "").replace(",", ".");
      const match = text.match(/-?\d+(?:\.\d+)?/);
      if (!match) return null;
      const parsed = Number(match[0]);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const byTestId = (testId: string) =>
      document.querySelector(`[data-testid="${testId.replace(/"/g, '\\"')}"]`);
    const textByTestId = (testId: string) => normalizeText((byTestId(testId) as HTMLElement | null)?.innerText);
    const inputValueByTestId = (testId: string) => {
      const element = byTestId(testId) as HTMLInputElement | HTMLTextAreaElement | null;
      return normalizeText(element?.value ?? (element as HTMLElement | null)?.innerText);
    };
    const rows = Array.from(document.querySelectorAll("[data-testid^='consumer-repair-item-']"))
      .filter((element) => {
        const testId = element.getAttribute("data-testid") ?? "";
        return /^consumer-repair-item-(?!quantity-input-|unit-price-input-|unit-|total-|price-status-).+/.test(testId);
      });
    return rows.map((element) => {
      const testId = element.getAttribute("data-testid") ?? "";
      const itemId = testId.replace(/^consumer-repair-item-/, "");
      const sectionElement = element.closest("[data-testid^='request-estimate-section-']");
      const section = sectionElement?.getAttribute("data-testid")?.replace(/^request-estimate-section-/, "") ?? null;
      const lines = normalizeText((element as HTMLElement).innerText).split(/\s{2,}|\n/).map(normalizeText).filter(Boolean);
      const title = lines[0] ?? "";
      const quantityText = inputValueByTestId(`consumer-repair-item-quantity-input-${itemId}`);
      const unitText = textByTestId(`consumer-repair-item-unit-${itemId}`);
      const unitPriceText = inputValueByTestId(`consumer-repair-item-unit-price-input-${itemId}`);
      const totalText = textByTestId(`consumer-repair-item-total-${itemId}`);
      const statusText = textByTestId(`consumer-repair-item-price-status-${itemId}`);
      return {
        surface: "web_ui_draft" as const,
        title,
        section,
        line_type: section,
        quantity: numberOrNull(quantityText),
        unit: unitText || null,
        unit_label: unitText || null,
        unit_price: numberOrNull(unitPriceText),
        amount: numberOrNull(totalText),
        currency: null,
        formula_id: null,
        calculation_trace: null,
        template_id: null,
        template_version: null,
        source: "web_ui",
        source_label: statusText || null,
        price_source: null,
        price_status: statusText || null,
        rate_key: null,
        material_key: null,
        catalog_item_id: null,
      };
    });
  });
}

async function extractHistoryRowsFromUi(page: Page): Promise<ExtractedBoqRow[]> {
  const historyButton = page.locator('[data-testid="consumer-repair-history-button"]');
  await historyButton.waitFor({ state: "visible", timeout: 45_000 });
  await historyButton.click();
  await page.locator('[data-testid="consumer-repair-history-modal"]').waitFor({ state: "visible", timeout: 30_000 });
  await page.locator('[data-testid="consumer-repair-history-main"]').first().click();
  await page.locator('[data-testid="consumer-repair-history-readonly-snapshot"]').waitFor({ state: "visible", timeout: 30_000 });
  return page.evaluate(() => {
    const normalizeText = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
    const numberOrNull = (value: unknown): number | null => {
      const text = normalizeText(value).replace(/\s/g, "").replace(",", ".");
      const match = text.match(/-?\d+(?:\.\d+)?/);
      if (!match) return null;
      const parsed = Number(match[0]);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const rows = Array.from(document.querySelectorAll('[data-testid="consumer-repair-history-readonly-item"]'));
    return rows.map((element) => {
      const text = normalizeText((element as HTMLElement).innerText);
      const parts = text.split(/\s+В·\s+|\s+·\s+/).map(normalizeText).filter(Boolean);
      return {
        surface: "web_ui_history" as const,
        title: parts[0] ?? text,
        section: null,
        line_type: null,
        quantity: numberOrNull(parts[1] ?? ""),
        unit: parts[2] ?? null,
        unit_label: parts[2] ?? null,
        unit_price: null,
        amount: numberOrNull(parts[3] ?? ""),
        currency: null,
        formula_id: null,
        calculation_trace: null,
        template_id: null,
        template_version: null,
        source: "web_ui_history",
        source_label: null,
        price_source: null,
        price_status: null,
        rate_key: null,
        material_key: null,
        catalog_item_id: null,
      };
    });
  });
}

async function extractUiTextSample(page: Page): Promise<string[]> {
  const text = await page.evaluate(() => document.body.innerText || "");
  return text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 80);
}

async function runRuntimeExtraction(server: WebServerHandle): Promise<RuntimeExtraction> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  const consoleErrorMessages: string[] = [];
  const consoleWarnMessages: string[] = [];
  const pageErrorMessages: string[] = [];
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

  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error") consoleErrorMessages.push(text);
    if (message.type() === "warning") consoleWarnMessages.push(text);
  });
  page.on("pageerror", (error) => pageErrorMessages.push(error.message));

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.locator('[data-testid="consumer-repair-draft"]').waitFor({ state: "visible", timeout: 90_000 });
    await page.locator('[data-testid="consumer-repair-address-input"]').fill("Audit street 54");
    await page.locator('[data-testid="consumer-repair-phone-input"]').fill("+996700000000");
    const draftRows = await extractDraftRowsFromUi(page);
    await page.locator('[data-testid="consumer-repair-approve"]').click();
    await poll("web-ui-history-count-after-approve", async () => {
      const countText = await page.locator('[data-testid="consumer-repair-history-approved-count"]').textContent({ timeout: 2_000 }).catch(() => null);
      return numberOrNull(countText) && Number(numberOrNull(countText)) > 0 ? true : null;
    }, 45_000, 500);
    const historyRows = await extractHistoryRowsFromUi(page);
    const uiTextSample = await extractUiTextSample(page);
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
    return {
      url,
      current_url: page.url(),
      draft_rows: draftRows,
      history_rows: historyRows,
      ui_text_sample: uiTextSample,
      screenshot: fs.existsSync(screenshotPath) ? screenshotPath : null,
      console_error_messages: consoleErrorMessages,
      console_warn_messages: consoleWarnMessages,
      page_error_messages: pageErrorMessages,
    };
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
}

function titleLooksUnrelatedToArea(title: string): boolean {
  return /электр|розет|выключ|кабел|сантех|унитаз|смесител|доставка|подъем|подъём|плинтус|двер|светиль|автомат|электрощит|щиток|электро.?щит|радиатор|вывоз/i.test(title);
}

function isM2Unit(unit: string | null): boolean {
  return /^(sq_m|m2|sqm|м2|м²|кв\.?\s?м)$/i.test(normalizeText(unit).replace(/\s+/g, ""));
}

function detectFakePatterns(rows: ExtractedBoqRow[]): string[] {
  const detected = new Set<string>();
  if (rows.length < 1) detected.add("rows_missing");
  const rowsBySurface = new Map<RowSurface, ExtractedBoqRow[]>();
  for (const row of rows) rowsBySurface.set(row.surface, [...(rowsBySurface.get(row.surface) ?? []), row]);

  for (const [surface, surfaceRows] of rowsBySurface) {
    const pricedRows = surfaceRows.filter((row) => row.quantity != null && row.amount != null);
    const areaRows = surfaceRows.filter((row) => row.quantity === inputAreaSqm);
    if (areaRows.length >= Math.max(12, Math.floor(surfaceRows.length * 0.25))) {
      detected.add(`many_rows_quantity_equal_input_area:${surface}:${areaRows.length}`);
    }
    const unrelatedAreaRows = areaRows.filter((row) => titleLooksUnrelatedToArea(row.title));
    if (unrelatedAreaRows.length >= 4) {
      detected.add(`many_unrelated_rows_quantity_equal_input_area:${surface}:${unrelatedAreaRows.length}`);
    }
    const m2Rows = surfaceRows.filter((row) => isM2Unit(row.unit) || isM2Unit(row.unit_label));
    if (m2Rows.length >= Math.max(5, Math.floor(surfaceRows.length * 0.6))) {
      detected.add(`many_rows_unit_m2:${surface}:${m2Rows.length}`);
    }
    if (surfaceRows.some((row) => /доставка|подъем|подъём|вывоз/i.test(row.title) && (isM2Unit(row.unit) || row.quantity === inputAreaSqm))) {
      detected.add(`delivery_or_logistics_uses_area_quantity_or_m2_unit:${surface}`);
    }
    if (surfaceRows.some((row) => /плинтус|порог/i.test(row.title) && isM2Unit(row.unit))) {
      detected.add(`linear_components_use_m2_unit:${surface}`);
    }
    if (surfaceRows.some((row) => /электр|розет|выключ|кабел|автомат|электрощит|щиток|электро.?щит/i.test(row.title) && (isM2Unit(row.unit) || row.quantity === inputAreaSqm))) {
      detected.add(`electrical_rows_use_area_quantity_or_m2_unit:${surface}`);
    }
    if (surfaceRows.some((row) => /сантех|унитаз|смесител|раковин|ванн/i.test(row.title) && (isM2Unit(row.unit) || row.quantity === inputAreaSqm))) {
      detected.add(`plumbing_rows_use_area_quantity_or_m2_unit:${surface}`);
    }

    const unitPriceGroups = new Map<number, ExtractedBoqRow[]>();
    const amountGroups = new Map<number, ExtractedBoqRow[]>();
    for (const row of pricedRows) {
      if (row.unit_price != null) {
        const key = round2(row.unit_price);
        unitPriceGroups.set(key, [...(unitPriceGroups.get(key) ?? []), row]);
      }
      if (row.amount != null) {
        const key = round2(row.amount);
        amountGroups.set(key, [...(amountGroups.get(key) ?? []), row]);
      }
    }
    for (const [price, grouped] of unitPriceGroups) {
      if (grouped.length >= 8 && grouped.some((row) => titleLooksUnrelatedToArea(row.title))) {
        detected.add(`same_price_repeated_for_unrelated_rows:${surface}:${price}:${grouped.length}`);
      }
    }
    for (const [amount, grouped] of amountGroups) {
      if (grouped.length >= 8 && grouped.some((row) => titleLooksUnrelatedToArea(row.title))) {
        detected.add(`same_total_repeated_for_unrelated_rows:${surface}:${amount}:${grouped.length}`);
      }
    }
  }

  const calculatedRows = rows.filter((row) =>
    row.surface !== "web_ui_draft" &&
    row.surface !== "web_ui_history" &&
    row.quantity != null &&
    row.unit_price != null,
  );
  if (calculatedRows.length > 0 && calculatedRows.some((row) => !row.formula_id && !row.calculation_trace)) {
    detected.add("calculated_row_without_formula_trace");
  }
  if (calculatedRows.length > 0 && calculatedRows.some((row) => !row.template_id && !row.source_label && !row.source)) {
    detected.add("calculated_row_without_template_source");
  }

  return [...detected].sort();
}

function markdownSummary(result: AuditResult): string {
  return [
    `# AI estimate real BOQ extraction audit`,
    ``,
    `- status: ${result.final_status}`,
    `- target: ${result.target}`,
    `- prompt: ${result.prompt}`,
    `- base_url: ${result.base_url ?? "n/a"}`,
    `- draft_rows: ${result.draft_rows.length}`,
    `- history_rows: ${result.history_rows.length}`,
    `- pdf_rows: ${result.pdf_rows.length}`,
    `- buyer_rows: ${result.buyer_rows.length}`,
    `- detected_fake_patterns: ${result.detected_fake_patterns.join(", ") || "none"}`,
    `- console_error_count: ${result.console_error_count}`,
    `- console_warn_count: ${result.console_warn_count}`,
    `- page_error_count: ${result.page_error_count}`,
    `- screenshot: ${result.screenshot ?? "n/a"}`,
    ``,
    `## First Draft Rows`,
    ``,
    ...result.draft_rows.slice(0, 20).map((row) =>
      `- [${row.surface}] ${row.title} | qty=${row.quantity ?? "?"} ${row.unit ?? row.unit_label ?? ""} | unit_price=${row.unit_price ?? "?"} | amount=${row.amount ?? "?"} | formula=${row.formula_id ?? "missing"} | trace=${row.calculation_trace ?? "missing"}`,
    ),
    ``,
  ].join("\n");
}

async function main() {
  let server: WebServerHandle | null = null;
  const checkedAt = new Date().toISOString();
  let result: AuditResult | null = null;

  try {
    const modelReadback = buildModelReadback();
    server = await ensureLocalWebServer();
    const runtime = await runRuntimeExtraction(server);
    const allRows = [
      ...modelReadback.draft_rows,
      ...runtime.draft_rows,
      ...runtime.history_rows,
      ...modelReadback.history_rows,
      ...modelReadback.pdf_rows,
      ...modelReadback.buyer_rows,
    ];
    const detectedFakePatterns = detectFakePatterns(allRows);
    const fakeDetected = detectedFakePatterns.length > 0 && !(
      detectedFakePatterns.length === 1 && detectedFakePatterns[0] === "calculated_row_without_formula_trace"
    );
    const draftRows = [...modelReadback.draft_rows, ...runtime.draft_rows];
    const historyRows = [...runtime.history_rows, ...modelReadback.history_rows];
    result = {
      checked_at: checkedAt,
      final_status: fakeDetected
        ? "STOP_AI_ESTIMATE_FAKE_AREA_MULTIPLIER_ROWS_VISIBLE_IN_WEB_UI"
        : "GREEN_AI_ESTIMATE_NO_FAKE_AREA_MULTIPLIER_FOUND",
      prompt: promptText,
      route: "/request",
      target,
      base_url: server.baseUrl,
      web_server_started_by_verifier: server.started,
      draft_rows: draftRows,
      history_rows: historyRows,
      pdf_rows: modelReadback.pdf_rows,
      buyer_rows: modelReadback.buyer_rows,
      ui_text_sample: runtime.ui_text_sample,
      detected_fake_patterns: detectedFakePatterns,
      console_error_count: runtime.console_error_messages.length,
      console_warn_count: runtime.console_warn_messages.length,
      page_error_count: runtime.page_error_messages.length,
      web_extraction_runner_exists: true,
      web_draft_rows_extracted: runtime.draft_rows.length > 0,
      web_history_rows_extracted: runtime.history_rows.length > 0,
      web_fake_area_multiplier_detected: fakeDetected,
      android_chrome_extraction_runner_exists: true,
      android_chrome_draft_rows_extracted: target === "android-chrome" ? runtime.draft_rows.length > 0 : null,
      android_chrome_history_rows_extracted: target === "android-chrome" ? runtime.history_rows.length > 0 : null,
      android_chrome_fake_area_multiplier_detected: target === "android-chrome" ? fakeDetected : null,
      model_readback: {
        pdf_object_exists: modelReadback.pdf_object_exists,
        pdf_storage_key: modelReadback.pdf_storage_key,
        pdf_body_sample: modelReadback.pdf_body_sample,
        draft_payload_fingerprint: modelReadback.draft_payload_fingerprint,
        pdf_payload_fingerprint: modelReadback.pdf_payload_fingerprint,
        marketplace_payload_fingerprint: modelReadback.marketplace_payload_fingerprint,
        marketplace_status: modelReadback.marketplace_status,
        work_key: modelReadback.work_key,
        structured_row_count: modelReadback.structured_row_count,
      },
      artifact_json: artifactJsonPath,
      artifact_md: artifactMdPath,
      screenshot: runtime.screenshot,
      error: null,
    };

    if (!result.web_draft_rows_extracted || !result.web_history_rows_extracted) {
      result.final_status = "STOP_AI_ESTIMATE_EXTRACTION_AUDIT_FAILED";
      result.error = "Runtime extraction did not read draft/history rows from /request.";
    }
  } catch (error) {
    result = {
      checked_at: checkedAt,
      final_status: "STOP_AI_ESTIMATE_EXTRACTION_AUDIT_FAILED",
      prompt: promptText,
      route: "/request",
      target,
      base_url: server?.baseUrl ?? null,
      web_server_started_by_verifier: server?.started ?? false,
      draft_rows: [],
      history_rows: [],
      pdf_rows: [],
      buyer_rows: [],
      ui_text_sample: [],
      detected_fake_patterns: [],
      console_error_count: 0,
      console_warn_count: 0,
      page_error_count: 0,
      web_extraction_runner_exists: true,
      web_draft_rows_extracted: false,
      web_history_rows_extracted: false,
      web_fake_area_multiplier_detected: false,
      android_chrome_extraction_runner_exists: true,
      android_chrome_draft_rows_extracted: target === "android-chrome" ? false : null,
      android_chrome_history_rows_extracted: target === "android-chrome" ? false : null,
      android_chrome_fake_area_multiplier_detected: target === "android-chrome" ? false : null,
      model_readback: {
        pdf_object_exists: false,
        pdf_storage_key: null,
        pdf_body_sample: null,
        draft_payload_fingerprint: "",
        pdf_payload_fingerprint: "",
        marketplace_payload_fingerprint: "",
        marketplace_status: "unknown",
        work_key: null,
        structured_row_count: 0,
      },
      artifact_json: artifactJsonPath,
      artifact_md: artifactMdPath,
      screenshot: fs.existsSync(screenshotPath) ? screenshotPath : null,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    };
  } finally {
    server?.stop();
  }

  writeJson(artifactJsonPath, result);
  writeText(artifactMdPath, markdownSummary(result));
  if (result.final_status !== "GREEN_AI_ESTIMATE_NO_FAKE_AREA_MULTIPLIER_FOUND") {
    process.exitCode = 1;
  }
  console.log(`${result.final_status} ${artifactJsonPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
