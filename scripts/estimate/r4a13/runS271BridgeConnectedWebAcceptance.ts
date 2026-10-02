import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page, type Response } from "playwright";

type Json = Record<string, any>;

const ORIGIN = process.env.S2716_WEB_ORIGIN ?? "http://127.0.0.1:8081";
const BACKEND_ORIGIN = process.env.S2716_BACKEND_ORIGIN ?? "http://127.0.0.1:8765";
const API_ROOT = `${BACKEND_ORIGIN}/canonical-estimate`;
const CATALOG_ID = "canonical-work:expanded:bridge_asphalt";
const PROMPT = "устройство асфальтобетонного покрытия моста 150 метров длина и 32 метра ширина";
const EXPECTED_RELEASE_ID = "5800af1e-fe52-58e4-8484-e8a28542f761";
const EXPECTED_SEARCH_RELEASE_ID = "3d76d2ef-ef83-5082-a8ea-c6928e56fcee";
const EXPECTED_ROW_COUNT = 174;
const BACKEND_RECEIPT = resolve(".release-runtime/r568/s27-16/acceptance/bridge-backend/acceptance.json");
const OUTPUT_ROOT = resolve(".release-runtime/r568/s27-16/acceptance/bridge-web");
const OUTPUT = resolve(OUTPUT_ROOT, "acceptance.json");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S27_16_BRIDGE_WEB:${code}`);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function poll<T>(read: () => Promise<T | null>, timeoutMs = 180_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const value = await read();
      if (value != null) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error("S27_16_BRIDGE_WEB:POLL_TIMEOUT");
}

async function api(authorization: string, path: string): Promise<Json> {
  const response = await fetch(`${API_ROOT}/${path.replace(/^\/+/, "")}`, {
    headers: { accept: "application/json", authorization },
    signal: AbortSignal.timeout(180_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok, `API_${response.status}:${path}:${JSON.stringify(body).slice(0, 800)}`);
  return body;
}

async function waitJob(authorization: string, jobId: string): Promise<Json> {
  return poll(async () => {
    const job = await api(authorization, `jobs/${jobId}`);
    invariant(!["failed", "cancelled"].includes(String(job.status)),
      `JOB_${String(job.status)}:${JSON.stringify(job.error ?? {}).slice(0, 800)}`);
    return job.status === "succeeded" ? job : null;
  });
}

async function allRows(authorization: string, revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const body = await api(authorization, `revisions/${revisionId}/rows?${query}`);
    rows.push(...(Array.isArray(body.rows) ? body.rows : []));
    cursor = String(body.nextCursor ?? "");
  } while (cursor);
  return rows;
}

async function signIn(page: Page): Promise<void> {
  const login = new URL("/auth/login", ORIGIN);
  login.searchParams.set("returnTo", "/request");
  await page.goto(login.toString(), { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
  await page.getByTestId("auth.login.local-consumer").click();
  await page.waitForURL(new URL("/request", ORIGIN).toString(), { timeout: 60_000 });
}

async function openPanel(page: Page, panelTestId: string, toggleTestId: string): Promise<void> {
  if (await page.getByTestId(panelTestId).isVisible().catch(() => false)) return;
  const toggle = page.getByTestId(toggleTestId);
  await toggle.waitFor({ state: "visible", timeout: 60_000 });
  await toggle.click();
  await page.getByTestId(panelTestId).waitFor({ state: "visible", timeout: 60_000 });
}

async function openFullEstimateIfPreviewed(page: Page): Promise<void> {
  const preview = page.getByTestId("consumer-estimate-meaningful-preview");
  if (!await preview.isVisible().catch(() => false)) return;
  const open = page.getByTestId("consumer-estimate-open-full-estimate");
  await open.waitFor({ state: "visible", timeout: 60_000 });
  await poll(async () => await open.isEnabled().catch(() => false) ? true : null, 60_000);
  await open.click();
  await preview.waitFor({ state: "hidden", timeout: 60_000 });
}

async function main(): Promise<void> {
  const runId = randomUUID();
  const backendReceipt = JSON.parse(readFileSync(BACKEND_RECEIPT, "utf8")) as Json;
  invariant(backendReceipt.status === "GREEN_S27_16_BRIDGE_BACKEND", "BACKEND_RECEIPT_RED");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  const page = await context.newPage();
  let authorization = "";
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(`${BACKEND_ORIGIN}/`)) return;
    const header = request.headers().authorization ?? "";
    if (header.startsWith("Bearer ")) authorization = header;
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 1_000));
  });
  page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 1_000)));
  try {
    await signIn(page);

    let matchingSearch: Json | null = null;
    page.on("response", (response: Response) => {
      const url = new URL(response.url());
      if (url.origin !== BACKEND_ORIGIN
        || !url.pathname.endsWith("/search/catalog")
        || response.status() !== 200) return;
      void response.json().then((body: Json) => {
        if (Array.isArray(body.items) && body.items.some((item: Json) => item.catalogId === CATALOG_ID)) {
          matchingSearch = body;
        }
      }).catch(() => undefined);
    });
    const prompt = page.getByTestId("consumer-repair-problem-input");
    await prompt.fill(PROMPT);
    const search = await poll(async () => matchingSearch, 120_000);
    const selectedIndex = search.items.findIndex((item: Json) => item.catalogId === CATALOG_ID);
    invariant(selectedIndex >= 0, "CATALOG_RESULT_MISSING");
    await page.getByTestId(`consumer-repair-work-suggestion-${selectedIndex + 1}`).click();
    await poll(async () => authorization.startsWith("Bearer ") ? true : null, 30_000);
    const runtimeCatalog = await api(authorization, `catalog/${encodeURIComponent(CATALOG_ID)}`);
    const runtimeGeometrySchema = (runtimeCatalog.item?.parameterSchema ?? [])
      .filter((parameter: Json) => ["area_m2", "bridge_length_m", "bridge_width_m"].includes(String(parameter.parameterId)))
      .map((parameter: Json) => ({
        parameterId: parameter.parameterId,
        valueType: parameter.valueType,
        unitId: parameter.unitId,
        visibilityRole: parameter.visibilityRole,
        valueSourceRole: parameter.valueSourceRole,
        guideKind: parameter.guide?.guideKind ?? null,
        formulaConsumers: parameter.formulaConsumers ?? [],
      }));

    const compileResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/jobs/compile") && response.request().method() === "POST",
    { timeout: 180_000 });
    await page.getByTestId("consumer-repair-prepare-draft").click();
    const compileResponse = await compileResponsePromise;
    const compileRequest = compileResponse.request().postDataJSON() as Json;
    const compileAccepted = await compileResponse.json() as Json;
    invariant(compileResponse.status() === 202, `COMPILE_HTTP_${compileResponse.status()}`);
    invariant(Number(compileRequest?.parameters?.bridge_length_m) === 150,
      `COMPILE_LENGTH:${JSON.stringify({ parameters: compileRequest?.parameters ?? {}, runtimeGeometrySchema })}`);
    invariant(Number(compileRequest?.parameters?.bridge_width_m) === 32,
      `COMPILE_WIDTH:${JSON.stringify(compileRequest?.parameters ?? {})}`);
    invariant(Number(compileRequest?.parameters?.area_m2) === 4_800,
      `COMPILE_AREA:${JSON.stringify(compileRequest?.parameters ?? {})}`);
    const compiledJob = await waitJob(authorization, String(compileAccepted.jobId));
    const initialRevisionId = String(compiledJob.resultRevisionId ?? "");
    invariant(/^[0-9a-f-]{36}$/iu.test(initialRevisionId), "INITIAL_REVISION_ID");
    const initialRevision = await api(authorization, `revisions/${initialRevisionId}`);
    const initialRows = await allRows(authorization, initialRevisionId);
    invariant(initialRevision.releaseId === EXPECTED_RELEASE_ID
      && initialRevision.searchReleaseId === EXPECTED_SEARCH_RELEASE_ID,
    `RELEASE_${String(initialRevision.releaseId)}:${String(initialRevision.searchReleaseId)}`);
    invariant(initialRows.length === EXPECTED_ROW_COUNT,
      `ROW_COUNT_${initialRows.length}_EXPECTED_${EXPECTED_ROW_COUNT}`);
    invariant(Number(initialRevision.parameters?.area_m2) === 4_800
      && Number(initialRevision.parameters?.bridge_length_m) === 150
      && Number(initialRevision.parameters?.bridge_width_m) === 32,
    `REVISION_GEOMETRY:${JSON.stringify(initialRevision.parameters ?? {})}`);
    invariant(initialRows.every((row) => Number.isFinite(Number(row.quantity)) && Number(row.quantity) > 0),
      "UNRESOLVED_OR_NONPOSITIVE_QUANTITY");
    invariant(initialRows.every((row) => typeof row.titleRu === "string" && /[А-Яа-яЁё]/u.test(row.titleRu)),
      "NON_HUMAN_ROW_TITLE");

    await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(initialRevisionId)}&s271Open=${runId}`,
      { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.getByTestId("request-estimate-summary-card").waitFor({ state: "visible", timeout: 180_000 });
    await openFullEstimateIfPreviewed(page);
    await openPanel(page, "request-estimate-parameter-panel", "request-estimate-parameters-toggle");
    const wearingEditor = page.getByTestId("editable-param-inline-editor-wearing_layer_thickness_mm");
    await wearingEditor.waitFor({ state: "visible", timeout: 60_000 });
    const wearingGuide = wearingEditor.getByTestId("editable-param-inline-guide-wearing_layer_thickness_mm");
    invariant(await wearingGuide.isVisible(), "INLINE_GREY_GUIDE_MISSING");
    const wearingInput = wearingEditor.getByTestId("editable-param-popover-input");
    await wearingInput.fill("55");
    const recalculateResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/jobs/recalculate") && response.request().method() === "POST",
    { timeout: 180_000 });
    await page.getByTestId("editable-param-batch-apply").click();
    const recalculateResponse = await recalculateResponsePromise;
    const recalculateAccepted = await recalculateResponse.json() as Json;
    invariant(recalculateResponse.status() === 202, `RECALCULATE_HTTP_${recalculateResponse.status()}`);
    const recalculatedJob = await waitJob(authorization, String(recalculateAccepted.jobId));
    const recalculatedRevisionId = String(recalculatedJob.resultRevisionId ?? "");
    invariant(recalculatedRevisionId !== initialRevisionId && /^[0-9a-f-]{36}$/iu.test(recalculatedRevisionId),
      "RECALCULATED_REVISION_ID");
    await page.getByTestId("request-estimate-parameter-apply-success")
      .waitFor({ state: "visible", timeout: 180_000 });
    const applyStatus = (await page.getByTestId("request-estimate-parameter-apply-success").innerText()).trim();
    invariant(applyStatus.includes("Применено и рассчитано"), `APPLY_STATUS:${applyStatus}`);
    const recalculatedRevision = await api(authorization, `revisions/${recalculatedRevisionId}`);
    const recalculatedRows = await allRows(authorization, recalculatedRevisionId);
    invariant(recalculatedRevision.parentRevisionId === initialRevisionId, "PARENT_REVISION_MISMATCH");
    invariant(Number(recalculatedRevision.parameters?.wearing_layer_thickness_mm) === 55,
      "EDITED_PARAMETER_NOT_SAVED");
    invariant(recalculatedRows.length === EXPECTED_ROW_COUNT
      && recalculatedRows.every((row) => Number.isFinite(Number(row.quantity)) && Number(row.quantity) > 0),
    "RECALCULATED_ROWS_INCOMPLETE");

    await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(recalculatedRevisionId)}&s271Reopen=${runId}`,
      { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.getByTestId("request-estimate-summary-card").waitFor({ state: "visible", timeout: 180_000 });
    await openFullEstimateIfPreviewed(page);
    await openPanel(page, "request-estimate-parameter-panel", "request-estimate-parameters-toggle");
    const reopenedWearing = page.getByTestId("editable-param-inline-editor-wearing_layer_thickness_mm")
      .getByTestId("editable-param-popover-input");
    invariant(await reopenedWearing.inputValue() === "55", `REOPENED_PARAMETER_${await reopenedWearing.inputValue()}`);
    await openPanel(page, "request-estimate-positions-panel", "request-estimate-positions-toggle");
    const visibleQuantityEditors = await page.locator('[data-testid^="consumer-repair-item-quantity-input-"]').count();
    const visiblePriceEditors = await page.locator('[data-testid^="consumer-repair-item-unit-price-input-"]').count();
    invariant(visibleQuantityEditors > 0 && visiblePriceEditors > 0, "ROW_EDITORS_MISSING");

    const pricedRevisionId = String(backendReceipt.revisions?.pricedRevisionId ?? "");
    await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(pricedRevisionId)}&s2716Priced=${runId}`,
      { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.getByTestId("request-estimate-summary-card").waitFor({ state: "visible", timeout: 180_000 });
    await openFullEstimateIfPreviewed(page);
    await openPanel(page, "request-estimate-positions-panel", "request-estimate-positions-toggle");
    const pricedCount = await page.getByTestId("request-estimate-items-total-count").innerText();
    invariant(pricedCount.includes(String(EXPECTED_ROW_COUNT)), `PRICED_ROW_COUNT:${pricedCount}`);
    const binderPrice = page.locator('[id$="|bridge:binder:asphalt:material:hot-dense-fine-mix"]')
      .locator('[data-testid^="consumer-repair-item-unit-price-input-"]');
    invariant(Number(await binderPrice.inputValue()) === 5_000, "PRICED_COLD_REOPEN_RED");
    invariant(await page.getByTestId("estimate-revision-timeline").isVisible(), "HISTORY_RED");

    await page.getByTestId("consumer-estimate-open-procurement").click();
    const procurement = page.getByTestId("consumer-estimate-procurement-list");
    await procurement.waitFor({ state: "visible", timeout: 60_000 });
    const procurementText = await procurement.innerText();
    invariant(procurementText.includes("ТЕХНОЭЛАСТМОСТ Б")
      && procurementText.includes("Праймер битумно-полимерный")
      && procurementText.includes("Смесь асфальтобетонная горячая")
      && procurementText.includes("Сетка сварная арматурная"),
    "PROCUREMENT_MATERIALS_RED");
    const procurementScreenshot = resolve(OUTPUT_ROOT, "02-bridge-procurement.png");
    await page.screenshot({ path: procurementScreenshot, fullPage: true });

    const pdfResponsePromise = page.waitForResponse((response) =>
      response.url().startsWith(`${API_ROOT}/artifact-files/`) && response.status() === 200,
    { timeout: 180_000 });
    await page.getByTestId("request-estimate-progressive-actions")
      .getByTestId("consumer-estimate-make-pdf")
      .click();
    await page.waitForURL(/\/pdf-viewer\?sessionId=/u, { timeout: 180_000 });
    const pdfResponse = await pdfResponsePromise;
    invariant(String(pdfResponse.headers()["content-type"]).includes("application/pdf"),
      "PDF_CONTENT_TYPE_RED");
    await page.getByTestId("pdf-viewer-web-iframe").waitFor({ state: "visible", timeout: 120_000 });
    const pdfScreenshot = resolve(OUTPUT_ROOT, "03-bridge-pdf.png");
    await page.screenshot({ path: pdfScreenshot, fullPage: true });

    await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(recalculatedRevisionId)}&s2716Final=${runId}`,
      { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.getByTestId("request-estimate-summary-card").waitFor({ state: "visible", timeout: 180_000 });
    await openFullEstimateIfPreviewed(page);
    await openPanel(page, "request-estimate-positions-panel", "request-estimate-positions-toggle");
    const estimateScreenshot = resolve(OUTPUT_ROOT, "01-bridge-174-rows.png");
    await page.screenshot({ path: estimateScreenshot, fullPage: true });

    const categoryCounts = Object.fromEntries([...new Set(recalculatedRows.map((row) => String(row.category)))].map(
      (category) => [category, recalculatedRows.filter((row) => String(row.category) === category).length],
    ));
    const autoPricedRows = recalculatedRows.filter((row) => row.unitPrice != null);
    invariant(pageErrors.length === 0, `PAGE_ERRORS:${pageErrors.join("|")}`);
    const evidence = {
      schemaVersion: "rik-expo-app.s27-16.bridge-web-acceptance.v1.receipt.v1",
      status: "GREEN_S27_16_BRIDGE_WEB",
      capturedAt: new Date().toISOString(),
      runId,
      catalogId: CATALOG_ID,
      releaseId: recalculatedRevision.releaseId,
      searchReleaseId: recalculatedRevision.searchReleaseId,
      initialRevisionId,
      recalculatedRevisionId,
      parentRevisionId: recalculatedRevision.parentRevisionId,
      geometry: { bridgeLengthM: 150, bridgeWidthM: 32, areaM2: 4_800 },
      rowCount: recalculatedRows.length,
      categoryCounts,
      allQuantitiesCalculated: true,
      autoPricedRowCount: autoPricedRows.length,
      unknownPriceRowCount: recalculatedRows.length - autoPricedRows.length,
      rowQuantityEditorCount: visibleQuantityEditors,
      rowPriceEditorCount: visiblePriceEditors,
      inlineNormGuideVisible: true,
      applyStatus,
      reopenedEditedParameter: { wearing_layer_thickness_mm: 55 },
      pricedRevisionId,
      restoredBinderUnitPrice: 5_000,
      history: "GREEN",
      procurement: "GREEN",
      pdf: "GREEN",
      screenshots: { estimateScreenshot, procurementScreenshot, pdfScreenshot },
      sampleRows: recalculatedRows.slice(0, 12).map((row) => ({
        rowId: row.rowId,
        titleRu: row.titleRu,
        category: row.category,
        quantity: row.quantity,
        unitId: row.unitId,
        unitPrice: row.unitPrice,
      })),
      consoleErrors,
      pageErrors,
      productionAccessed: false,
      activationPerformed: false,
      deployPerformed: false,
    };
    const sealed = { ...evidence, sha256: sha256(JSON.stringify(evidence)) };
    atomicJson(OUTPUT, sealed);
    process.stdout.write(`${JSON.stringify(sealed, null, 2)}\n`);
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
