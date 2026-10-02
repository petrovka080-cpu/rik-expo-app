import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page, type Response } from "playwright";

type Json = Record<string, any>;

const ORIGIN = process.env.S2716_WEB_ORIGIN ?? "http://127.0.0.1:8081";
const BACKEND_ORIGIN = process.env.S2716_BACKEND_ORIGIN ?? "http://127.0.0.1:8765";
const API_ROOT = `${BACKEND_ORIGIN}/canonical-estimate`;
const COMPACTION_CATALOG_ID =
  "canonical-work:base:paving_roads_landscape_interior_asphalt_compact_large_area";
const COMPACTION_PROMPT = "уплотнение асфальтового покрытия 5000 м²";
const RELEASE_ID = "5800af1e-fe52-58e4-8484-e8a28542f761";
const SEARCH_RELEASE_ID = "3d76d2ef-ef83-5082-a8ea-c6928e56fcee";
const BACKEND_RECEIPT = resolve(".release-runtime/r568/s27-16/acceptance/roads-backend/acceptance.json");
const OUTPUT_ROOT = resolve(".release-runtime/r568/s27-16/acceptance/roads-web");
const OUTPUT = resolve(OUTPUT_ROOT, "acceptance.json");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S27_16_ROADS_WEB:${code}`);
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
  throw new Error("S27_16_ROADS_WEB:POLL_TIMEOUT");
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

async function openRevision(page: Page, revisionId: string, marker: string): Promise<void> {
  await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(revisionId)}&${marker}`,
    { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.getByTestId("request-estimate-summary-card").waitFor({ state: "visible", timeout: 180_000 });
  await openFullEstimateIfPreviewed(page);
}

async function main(): Promise<void> {
  const runId = randomUUID();
  const backend = JSON.parse(readFileSync(BACKEND_RECEIPT, "utf8")) as Json;
  invariant(backend.status === "GREEN_S27_16_ROADS_BACKEND", "BACKEND_RECEIPT_RED");
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
      if (url.origin !== BACKEND_ORIGIN || !url.pathname.endsWith("/search/catalog")
        || response.status() !== 200) return;
      void response.json().then((body: Json) => {
        if (Array.isArray(body.items)
          && body.items.some((item: Json) => item.catalogId === COMPACTION_CATALOG_ID)) matchingSearch = body;
      }).catch(() => undefined);
    });

    const prompt = page.getByTestId("consumer-repair-problem-input");
    await prompt.fill(COMPACTION_PROMPT);
    const search = await poll(async () => matchingSearch, 120_000);
    const selectedIndex = search.items.findIndex((item: Json) => item.catalogId === COMPACTION_CATALOG_ID);
    invariant(selectedIndex === 0 && search.items[0]?.estimateReady === true, `CATALOG_RESULT_${selectedIndex}`);
    await page.getByTestId(`consumer-repair-work-suggestion-${selectedIndex + 1}`).click();
    await poll(async () => authorization.startsWith("Bearer ") ? true : null, 30_000);

    const compileResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/jobs/compile") && response.request().method() === "POST",
    { timeout: 180_000 });
    await page.getByTestId("consumer-repair-prepare-draft").click();
    const compileResponse = await compileResponsePromise;
    const compileRequest = compileResponse.request().postDataJSON() as Json;
    const compileAccepted = await compileResponse.json() as Json;
    invariant(compileResponse.status() === 202
      && compileRequest.catalogId === COMPACTION_CATALOG_ID
      && Number(compileRequest.parameters?.area_m2) === 5_000,
    `COMPILE_REQUEST:${JSON.stringify(compileRequest).slice(0, 2_000)}`);
    const compileJob = await waitJob(authorization, String(compileAccepted.jobId));
    const initialRevisionId = String(compileJob.resultRevisionId ?? "");
    const initialRevision = await api(authorization, `revisions/${initialRevisionId}`);
    const initialRows = await allRows(authorization, initialRevisionId);
    invariant(initialRevision.releaseId === RELEASE_ID && initialRevision.searchReleaseId === SEARCH_RELEASE_ID,
      "RELEASE_PAIR_RED");
    invariant(initialRows.length === 49 && (initialRevision.preliminaryNeeds ?? []).length === 0
      && initialRows.every((row) => Number(row.quantity) > 0),
    `FIRST_ESTIMATE_RED:${initialRows.length}:${initialRevision.preliminaryNeeds?.length}`);

    await openRevision(page, initialRevisionId, `s2716RoadInitial=${runId}`);
    await openPanel(page, "request-estimate-parameter-panel", "request-estimate-parameters-toggle");
    const areaEditor = page.getByTestId("editable-param-inline-editor-area_m2");
    await areaEditor.waitFor({ state: "visible", timeout: 60_000 });
    const areaGuide = areaEditor.getByTestId("editable-param-inline-guide-area_m2");
    invariant(await areaGuide.isVisible(), "INLINE_GREY_GUIDE_MISSING");
    const areaInput = areaEditor.getByTestId("editable-param-popover-input");
    await areaInput.fill("6000");
    const recalculateResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/jobs/recalculate") && response.request().method() === "POST",
    { timeout: 180_000 });
    await page.getByTestId("editable-param-batch-apply").click();
    const recalculateResponse = await recalculateResponsePromise;
    const recalculateAccepted = await recalculateResponse.json() as Json;
    invariant(recalculateResponse.status() === 202, `RECALCULATE_HTTP_${recalculateResponse.status()}`);
    const recalculatedJob = await waitJob(authorization, String(recalculateAccepted.jobId));
    const recalculatedRevisionId = String(recalculatedJob.resultRevisionId ?? "");
    await page.getByTestId("request-estimate-parameter-apply-success")
      .waitFor({ state: "visible", timeout: 180_000 });
    const applyStatus = (await page.getByTestId("request-estimate-parameter-apply-success").innerText()).trim();
    invariant(applyStatus.includes("Применено и рассчитано"), `APPLY_STATUS:${applyStatus}`);
    const recalculatedRevision = await api(authorization, `revisions/${recalculatedRevisionId}`);
    const recalculatedRows = await allRows(authorization, recalculatedRevisionId);
    const breakdown = recalculatedRows.find((row) =>
      row.rowId === "rc09:asphalt_compaction_breakdown_roller");
    invariant(recalculatedRevision.parentRevisionId === initialRevisionId
      && Number(recalculatedRevision.parameters?.area_m2) === 6_000
      && recalculatedRows.length === 49
      && Math.abs(Number(breakdown?.quantity) - 4.166666667) < 0.000001,
    "EDIT_OR_RECALCULATION_RED");

    await openRevision(page, recalculatedRevisionId, `s2716RoadReopen=${runId}`);
    await openPanel(page, "request-estimate-parameter-panel", "request-estimate-parameters-toggle");
    const reopenedArea = page.getByTestId("editable-param-inline-editor-area_m2")
      .getByTestId("editable-param-popover-input");
    invariant(await reopenedArea.inputValue() === "6000", `REOPENED_AREA_${await reopenedArea.inputValue()}`);
    await openPanel(page, "request-estimate-positions-panel", "request-estimate-positions-toggle");
    const visibleQuantityEditors = await page.locator('[data-testid^="consumer-repair-item-quantity-input-"]').count();
    const visiblePriceEditors = await page.locator('[data-testid^="consumer-repair-item-unit-price-input-"]').count();
    invariant(visibleQuantityEditors > 0 && visiblePriceEditors > 0, "ROW_EDITORS_MISSING");
    const estimateScreenshot = resolve(OUTPUT_ROOT, "01-compaction-49-rows.png");
    await page.screenshot({ path: estimateScreenshot, fullPage: true });

    const pricedRevisionId = String(backend.standaloneCompaction?.pricedRevisionId ?? "");
    await openRevision(page, pricedRevisionId, `s2716RoadPriced=${runId}`);
    await openPanel(page, "request-estimate-positions-panel", "request-estimate-positions-toggle");
    const pricedCount = await page.getByTestId("request-estimate-items-total-count").innerText();
    invariant(pricedCount.includes("49"), `PRICED_ROW_COUNT:${pricedCount}`);
    const pricedInput = page.locator('[id$="|rc09:asphalt_compaction_breakdown_roller"]')
      .locator('[data-testid^="consumer-repair-item-unit-price-input-"]');
    invariant(Number(await pricedInput.inputValue()) === 5_000, "PRICED_COLD_REOPEN_RED");
    invariant(await page.getByTestId("estimate-revision-timeline").isVisible(), "HISTORY_RED");

    await page.getByTestId("consumer-estimate-open-procurement").click();
    const procurement = page.getByTestId("consumer-estimate-procurement-list");
    await procurement.waitFor({ state: "visible", timeout: 60_000 });
    const procurementText = await procurement.innerText();
    invariant(procurementText.includes("7 позиций")
      && procurementText.includes("Dynapac CC2200 VI")
      && procurementText.includes("Dynapac CP1200")
      && procurementText.includes("Доставка на объект и возврат"),
    "PROCUREMENT_CONTENT_RED");
    const procurementScreenshot = resolve(OUTPUT_ROOT, "02-compaction-procurement-7.png");
    await page.screenshot({ path: procurementScreenshot, fullPage: true });

    const pdfResponsePromise = page.waitForResponse((response) =>
      response.url().startsWith(`${API_ROOT}/artifact-files/`) && response.status() === 200,
    { timeout: 180_000 });
    await page.getByTestId("request-estimate-progressive-actions")
      .getByTestId("consumer-estimate-make-pdf").click();
    await page.waitForURL(/\/pdf-viewer\?sessionId=/u, { timeout: 180_000 });
    const pdfResponse = await pdfResponsePromise;
    invariant(String(pdfResponse.headers()["content-type"]).includes("application/pdf"), "PDF_CONTENT_TYPE_RED");
    await page.getByTestId("pdf-viewer-web-iframe").waitFor({ state: "visible", timeout: 120_000 });
    const pdfScreenshot = resolve(OUTPUT_ROOT, "03-compaction-pdf.png");
    await page.screenshot({ path: pdfScreenshot, fullPage: true });

    const installRevisionId = String(backend.asphaltInstall?.revisionId ?? "");
    await openRevision(page, installRevisionId, `s2716AsphaltInstall=${runId}`);
    await openPanel(page, "request-estimate-positions-panel", "request-estimate-positions-toggle");
    const installCount = await page.getByTestId("request-estimate-items-total-count").innerText();
    invariant(installCount.includes("56"), `INSTALL_ROW_COUNT:${installCount}`);
    await page.getByTestId("consumer-estimate-open-procurement").click();
    const installProcurement = page.getByTestId("consumer-estimate-procurement-list");
    await installProcurement.waitFor({ state: "visible", timeout: 60_000 });
    const installProcurementText = await installProcurement.innerText();
    invariant(installProcurementText.includes("5 позиций")
      && installProcurementText.includes("Смесь асфальтобетонная горячая")
      && installProcurementText.includes("Битум нефтяной дорожный")
      && installProcurementText.includes("Керосин технический"),
    "INSTALL_PROCUREMENT_CONTENT_RED");
    const installScreenshot = resolve(OUTPUT_ROOT, "04-asphalt-install-56-rows-procurement-5.png");
    await page.screenshot({ path: installScreenshot, fullPage: true });

    invariant(pageErrors.length === 0, `PAGE_ERRORS:${pageErrors.join("|")}`);
    const evidence = {
      schemaVersion: "rik-expo-app.s27-16.roads-web-acceptance.v1.receipt.v1",
      status: "GREEN_S27_16_ROADS_WEB",
      capturedAt: new Date().toISOString(),
      runId,
      definitionReleaseId: RELEASE_ID,
      searchReleaseId: SEARCH_RELEASE_ID,
      compaction: {
        catalogId: COMPACTION_CATALOG_ID,
        ordinarySearchPrompt: COMPACTION_PROMPT,
        searchIndex: selectedIndex,
        initialRevisionId,
        recalculatedRevisionId,
        pricedRevisionId,
        rowCount: recalculatedRows.length,
        originalAreaM2: 5_000,
        reopenedAreaM2: 6_000,
        breakdownRollerMachineH: breakdown?.quantity,
        restoredBreakdownRollerUnitPrice: 5_000,
        procurementRowCount: 7,
        history: "GREEN",
        pdf: "GREEN",
      },
      asphaltInstall: {
        revisionId: installRevisionId,
        rowCount: 56,
        procurementRowCount: 5,
      },
      inlineNormGuideVisible: true,
      applyStatus,
      rowQuantityEditorCount: visibleQuantityEditors,
      rowPriceEditorCount: visiblePriceEditors,
      screenshots: { estimateScreenshot, procurementScreenshot, pdfScreenshot, installScreenshot },
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

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
