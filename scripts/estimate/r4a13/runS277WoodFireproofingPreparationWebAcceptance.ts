import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page, type Response } from "playwright";

import {
  WOOD_FIREPROOFING_SURFACE_PREPARATION_PRELIMINARY_PROFILE,
  WOOD_FIREPROOFING_SURFACE_PREPARATION_SHORT_INPUT,
  WOOD_FIREPROOFING_SURFACE_PREPARATION_VARIANTS,
} from "../../../src/lib/estimate/v4/woodFireproofingSurfacePreparationVariantsR1";

type Json = Record<string, any>;

const ORIGIN = String(process.env.S277_WEB_ORIGIN ?? "http://127.0.0.1:8082").replace(/\/$/u, "");
const BACKEND = String(process.env.S277_WEB_BACKEND ?? "http://127.0.0.1:8766").replace(/\/$/u, "");
const RELEASE_ID = String(process.env.S277_DEFINITION_RELEASE_ID
  ?? "d6d87b81-395b-5025-8ce1-85093a45fbba");
const SEARCH_RELEASE_ID = String(process.env.S277_SEARCH_RELEASE_ID
  ?? "35529e04-8447-537c-9308-2a60efaa9a8e");
const STANDARD_CATALOG_ID = WOOD_FIREPROOFING_SURFACE_PREPARATION_VARIANTS.standard.catalogId;
const PROMPT = `${WOOD_FIREPROOFING_SURFACE_PREPARATION_VARIANTS.standard.canonicalNameRu}. Площадь 100 м2`;
const OUTPUT_ROOT = resolve(process.env.S277_WEB_OUTPUT_ROOT
  ?? ".release-runtime/r568/s27-7/f09-fire-current-lineage/wood-fireproofing-surface-preparation-web-acceptance-v1");
const OUTPUT = resolve(OUTPUT_ROOT, "acceptance.json");
const FAILURE = resolve(OUTPUT_ROOT, "failure.json");
const BACKEND_RECEIPT = resolve(process.env.S277_BACKEND_RECEIPT
  ?? ".release-runtime/r568/s27-7/runtime/local-developer-prepare/backend.json");
const METRO_RECEIPT = resolve(process.env.S277_METRO_RECEIPT
  ?? ".release-runtime/r568/s27-7/runtime/local-developer-prepare/metro.json");
const AUTH_STORAGE_KEY = "sb-127-auth-token";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S277_PREPARE_WEB:${code}`);
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, "")) as Json;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function progress(stage: string, details: Json = {}): void {
  const payload = { capturedAt: new Date().toISOString(), stage, ...details };
  writeJson(resolve(OUTPUT_ROOT, "progress.json"), payload);
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

async function responseJson(response: Response): Promise<Json> {
  return response.json().catch(() => ({})) as Promise<Json>;
}

async function api(authorization: string, route: string, init: RequestInit = {}): Promise<Json> {
  const response = await fetch(`${BACKEND}/canonical-estimate/${route.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      Authorization: authorization,
      ...(init.body == null ? {} : { "Content-Type": "application/json" }),
      ...init.headers,
    },
    signal: AbortSignal.timeout(180_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok,
    `API_${response.status}:${route}:${String(body.error?.code ?? "UNKNOWN")}:${JSON.stringify(body).slice(0, 600)}`);
  return body;
}

async function waitForRevision(authorization: string, accepted: Json): Promise<Json> {
  const jobId = String(accepted.jobId ?? "");
  invariant(jobId, "JOB_ID_MISSING");
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await api(authorization, `jobs/${jobId}`);
    invariant(!["failed", "cancelled"].includes(String(job.status)),
      `JOB_${String(job.status)}:${String(job.errorCode ?? "UNKNOWN")}`);
    if (job.status === "succeeded" && job.resultRevisionId) {
      return api(authorization, `revisions/${job.resultRevisionId}`);
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`S277_PREPARE_WEB:JOB_TIMEOUT:${jobId}`);
}

async function revisionRows(authorization: string, revisionId: string): Promise<Json[]> {
  const body = await api(authorization, `revisions/${revisionId}/rows?limit=100`);
  return Array.isArray(body.rows) ? body.rows as Json[] : [];
}

function quantity(rows: Json[], rowId: string): number {
  const row = rows.find((entry) => entry.rowId === rowId);
  invariant(row, `ROW_MISSING:${rowId}`);
  return Number(row.quantity);
}

async function enterConsumer(page: Page): Promise<string> {
  const login = new URL("/auth/login", ORIGIN);
  login.searchParams.set("returnTo", "/request");
  await page.goto(login.toString(), { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
  const consumer = page.getByTestId("auth.login.local-consumer");
  await consumer.waitFor({ state: "visible", timeout: 60_000 });
  await consumer.click();
  await page.waitForURL(new URL("/request", ORIGIN).toString(), { timeout: 60_000 });
  await page.getByTestId("consumer-repair-problem-input").waitFor({ state: "visible", timeout: 60_000 });
  let token = "";
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline && token.length <= 20) {
    token = await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return "";
      try {
        const session = JSON.parse(raw) as Json;
        return session?.user?.app_metadata?.role === "consumer"
          ? String(session?.access_token ?? "") : "";
      } catch {
        return "";
      }
    }, AUTH_STORAGE_KEY);
    if (token.length <= 20) await page.waitForTimeout(100);
  }
  invariant(token.length > 20, "CONSUMER_AUTHORIZATION_MISSING");
  return `Bearer ${token}`;
}

async function openParameterPanel(page: Page): Promise<void> {
  const preview = page.getByTestId("consumer-estimate-meaningful-preview");
  if (await preview.isVisible().catch(() => false)) {
    const open = page.getByTestId("consumer-estimate-open-full-estimate");
    await open.waitFor({ state: "visible", timeout: 120_000 });
    await open.click();
    await preview.waitFor({ state: "hidden", timeout: 60_000 });
  }
  const panel = page.getByTestId("request-estimate-parameter-panel");
  if (await panel.isVisible().catch(() => false)) return;
  const resolveIncomplete = page.getByTestId("request-estimate-resolve-incomplete");
  if (await resolveIncomplete.isVisible().catch(() => false)) await resolveIncomplete.click();
  else await page.getByTestId("request-estimate-parameters-toggle").click();
  await panel.waitFor({ state: "visible", timeout: 120_000 });
}

async function revealCard(page: Page, parameterId: string): Promise<ReturnType<Page["getByTestId"]>> {
  await openParameterPanel(page);
  const card = page.getByTestId(`editable-param-chip-${parameterId}`);
  if (!await card.isVisible().catch(() => false)) {
    const filled = page.getByTestId("request-estimate-filled-parameters-toggle");
    if (await filled.isVisible().catch(() => false)) await filled.click();
  }
  await card.waitFor({ state: "visible", timeout: 60_000 });
  return card;
}

async function fillValue(page: Page, parameterId: string, value: string | number): Promise<void> {
  const card = await revealCard(page, parameterId);
  const option = card.getByTestId(`editable-param-option-${parameterId}-${String(value)}`);
  if (await option.isVisible().catch(() => false)) await option.click();
  else await card.getByTestId("editable-param-popover-input").fill(String(value));
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const backendReceipt = readJson(BACKEND_RECEIPT);
  const metroReceipt = readJson(METRO_RECEIPT);
  invariant(backendReceipt.status === "GREEN_R568_LOCAL_DEVELOPER_CANONICAL_BACKEND_EXACT",
    "BACKEND_RECEIPT_RED");
  invariant(backendReceipt.compatibility_tuple?.definitionReleaseId === RELEASE_ID
    && backendReceipt.compatibility_tuple?.searchReleaseId === SEARCH_RELEASE_ID,
  "BACKEND_RELEASE_DRIFT");
  invariant(metroReceipt.definition_release_id === RELEASE_ID
    && metroReceipt.search_release_id === SEARCH_RELEASE_ID,
  "METRO_RELEASE_DRIFT");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const backendRequests: Json[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 1_000));
  });
  page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 1_000)));
  page.on("response", (response) => {
    if (!response.url().startsWith(`${BACKEND}/`)) return;
    backendRequests.push({
      method: response.request().method(),
      path: new URL(response.url()).pathname,
      status: response.status(),
    });
  });
  try {
    progress("ENTER_CONSUMER");
    const authorization = await enterConsumer(page);
    const runtime = await api(authorization, "runtime-manifest");
    invariant(runtime.compatibilityTuple?.definitionReleaseId === RELEASE_ID
      && runtime.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID,
    "RUNTIME_TUPLE_RED");

    const input = page.getByTestId("consumer-repair-problem-input");
    const searchPromise = page.waitForResponse((response) =>
      response.url().startsWith(`${BACKEND}/search/catalog?`) && response.status() === 200,
    { timeout: 120_000 });
    const [searchResponse] = await Promise.all([searchPromise, input.fill(PROMPT)]);
    const search = await responseJson(searchResponse);
    invariant(search.searchIndexReleaseId === SEARCH_RELEASE_ID, "SEARCH_RELEASE_DRIFT");
    const items = Array.isArray(search.items) ? search.items as Json[] : [];
    const selectedIndex = items.findIndex((item) => item.catalogId === STANDARD_CATALOG_ID);
    invariant(selectedIndex >= 0, "PREPARATION_IDENTITIES_NOT_SEARCHABLE");
    invariant(items[selectedIndex].estimateReady === true,
      "PREPARATION_IDENTITIES_NOT_ESTIMATE_READY");
    await page.getByTestId(`consumer-repair-work-suggestion-${selectedIndex + 1}`).click();
    progress("SEARCH_SELECTED", { selectedIndex });

    const prepare = page.getByTestId("consumer-repair-prepare-draft");
    await prepare.waitFor({ state: "visible", timeout: 60_000 });
    invariant(await prepare.isEnabled(), "PREPARE_DISABLED");
    await prepare.click();
    await page.getByTestId("consumer-estimate-parameter-collection")
      .or(page.getByTestId("request-estimate-parameter-panel"))
      .or(page.getByTestId("request-estimate-resolve-incomplete"))
      .first().waitFor({ state: "visible", timeout: 120_000 });
    for (const [parameterId, value] of Object.entries(
      WOOD_FIREPROOFING_SURFACE_PREPARATION_SHORT_INPUT,
    ).filter(([parameterId]) => parameterId !== "surface_condition_statement")) {
      await fillValue(page, parameterId, value);
    }

    const firstCompilePromise = page.waitForResponse((response) =>
      response.url().match(/\/jobs\/(?:compile|recalculate)$/u) != null
        && response.request().method() === "POST",
    { timeout: 120_000 });
    const [firstCompileResponse] = await Promise.all([
      firstCompilePromise,
      page.getByTestId("editable-param-batch-apply").click(),
    ]);
    invariant(firstCompileResponse.status() === 202,
      `FIRST_COMPILE_HTTP_${firstCompileResponse.status()}`);
    const initialRevision = await waitForRevision(authorization, await responseJson(firstCompileResponse));
    const initialRows = await revisionRows(authorization, String(initialRevision.revisionId));
    invariant(initialRevision.releaseId === RELEASE_ID
      && initialRevision.catalogId === STANDARD_CATALOG_ID,
    "INITIAL_REVISION_IDENTITY_RED");
    invariant(initialRows.length === 11 && Number(initialRevision.rowCount) === 11,
      `INITIAL_ROW_COUNT_${initialRows.length}`);
    invariant((initialRevision.preliminaryNeeds ?? []).length === 0, "INITIAL_PRELIMINARY_NEEDS_RED");
    invariant(quantity(initialRows, "f09:wood_fireproofing_preparation_labor") === 24,
      "INITIAL_LABOR_RED");
    invariant(quantity(initialRows, "f09:wood_fireproofing_preparation_abrasive") === 6,
      "INITIAL_ABRASIVE_RED");
    invariant(quantity(initialRows, "f09:wood_fireproofing_preparation_masking") === 120,
      "INITIAL_MASKING_RED");
    progress("FIRST_ESTIMATE_GREEN", { revisionId: initialRevision.revisionId, rows: initialRows.length });

    const parameterSession = await api(authorization,
      `revisions/${initialRevision.revisionId}/parameter-session`);
    const profileIds = Object.keys(WOOD_FIREPROOFING_SURFACE_PREPARATION_PRELIMINARY_PROFILE);
    const profileSchema = (parameterSession.catalog?.parameterSchema ?? [])
      .filter((parameter: Json) => profileIds.includes(String(parameter.parameterId)));
    invariant(profileSchema.length === profileIds.length, `PROFILE_SCHEMA_COUNT_${profileSchema.length}`);
    invariant(profileSchema.every((parameter: Json) =>
      parameter.runtimeProfileClassification === "ASSUMPTION"), "PROFILE_CLASSIFICATION_RED");

    await openParameterPanel(page);
    const numericProfileIds = [
      "labor_rate_man_hour_m2",
      "dust_extraction_rate_machine_hour_m2",
      "manual_tool_rate_machine_hour_m2",
      "removed_material_rate_kg_m2",
      "abrasive_rate_kg_m2",
      "masking_area_factor",
      "profile_measurement_area_per_count_m2",
      "readiness_protocol_document_count",
      "waste_container_capacity_kg",
      "waste_transport_capacity_kg",
    ];
    const guideEvidence: Json[] = [];
    for (const parameterId of numericProfileIds) {
      const card = await revealCard(page, parameterId);
      const actual = await card.getByTestId("editable-param-popover-input").inputValue();
      invariant(Number(actual) === Number(
        WOOD_FIREPROOFING_SURFACE_PREPARATION_PRELIMINARY_PROFILE[parameterId as keyof typeof WOOD_FIREPROOFING_SURFACE_PREPARATION_PRELIMINARY_PROFILE]),
      `PROFILE_VALUE_${parameterId}_${actual}`);
      const guide = card.getByTestId(`editable-param-inline-guide-${parameterId}`);
      await guide.waitFor({ state: "visible", timeout: 60_000 });
      const guideText = (await guide.innerText()).trim();
      invariant(guideText.length > 0, `PROFILE_GUIDE_${parameterId}`);
      guideEvidence.push({ parameterId, value: actual, guide: guideText });
    }

    await fillValue(page, "preparation_area_m2", 50);
    await fillValue(page, "labor_rate_man_hour_m2", 0.3);
    await fillValue(page, "abrasive_rate_kg_m2", 0.1);
    await fillValue(page, "masking_area_factor", 1.5);
    const recalculationCountBefore = backendRequests.filter((entry) =>
      entry.method === "POST" && entry.path.endsWith("/jobs/recalculate")).length;
    const recalculatePromise = page.waitForResponse((response) =>
      response.url().endsWith("/jobs/recalculate") && response.request().method() === "POST",
    { timeout: 120_000 });
    const [recalculateResponse] = await Promise.all([
      recalculatePromise,
      page.getByTestId("editable-param-batch-apply").click(),
    ]);
    invariant(recalculateResponse.status() === 202,
      `RECALCULATE_HTTP_${recalculateResponse.status()}`);
    const editedRevision = await waitForRevision(authorization, await responseJson(recalculateResponse));
    const editedRows = await revisionRows(authorization, String(editedRevision.revisionId));
    const recalculationCountAfter = backendRequests.filter((entry) =>
      entry.method === "POST" && entry.path.endsWith("/jobs/recalculate")).length;
    invariant(recalculationCountAfter - recalculationCountBefore === 1,
      "BATCH_APPLY_NOT_SINGLE_RECALCULATION");
    invariant(editedRevision.parentRevisionId === initialRevision.revisionId, "EDITED_PARENT_RED");
    invariant(editedRows.length === 11 && (editedRevision.preliminaryNeeds ?? []).length === 0,
      "EDITED_COMPOSITION_RED");
    invariant(quantity(editedRows, "f09:wood_fireproofing_preparation_labor") === 15,
      "EDITED_LABOR_RED");
    invariant(quantity(editedRows, "f09:wood_fireproofing_preparation_abrasive") === 5,
      "EDITED_ABRASIVE_RED");
    invariant(quantity(editedRows, "f09:wood_fireproofing_preparation_masking") === 75,
      "EDITED_MASKING_RED");
    invariant(quantity(editedRows, "f09:wood_fireproofing_preparation_waste_containers") === 5,
      "EDITED_WASTE_CONTAINER_RED");
    progress("BATCH_APPLY_GREEN", { revisionId: editedRevision.revisionId });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
    await openParameterPanel(page);
    const reopenedArea = await (await revealCard(page, "preparation_area_m2"))
      .getByTestId("editable-param-popover-input").inputValue();
    const reopenedLabor = await (await revealCard(page, "labor_rate_man_hour_m2"))
      .getByTestId("editable-param-popover-input").inputValue();
    invariant(reopenedArea === "50" && reopenedLabor === "0.3",
      `COLD_REOPEN_RED:${reopenedArea}:${reopenedLabor}`);

    const ordinaryAccepted = await api(authorization, "jobs/compile", {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: `s277-prepare-standard-${randomUUID()}`,
        catalogId: STANDARD_CATALOG_ID,
        parameters: WOOD_FIREPROOFING_SURFACE_PREPARATION_SHORT_INPUT,
        currencyCode: "KGS",
        sourceRequestText: WOOD_FIREPROOFING_SURFACE_PREPARATION_VARIANTS.standard.canonicalNameRu,
        primaryMeasureParameterId: "preparation_area_m2",
      }),
    });
    const ordinaryRevision = await waitForRevision(authorization, ordinaryAccepted);
    const ordinaryRows = await revisionRows(authorization, String(ordinaryRevision.revisionId));
    invariant(ordinaryRevision.releaseId === RELEASE_ID
      && ordinaryRevision.catalogId === STANDARD_CATALOG_ID
      && ordinaryRows.length === 11
      && (ordinaryRevision.preliminaryNeeds ?? []).length === 0,
    "STANDARD_ORDINARY_COMPILE_RED");

    const screenshot = resolve(OUTPUT_ROOT, "cold-reopen.png");
    await page.screenshot({ path: screenshot, fullPage: true });
    invariant(pageErrors.length === 0, `PAGE_ERRORS:${pageErrors.join("|")}`);
    const receipt = {
      schemaVersion: "rik-expo-app.s27-7.wood-fireproofing-surface-preparation-web-acceptance.v1",
      generatedAt: new Date().toISOString(),
      status: "GREEN_S277_F09_WOOD_FIREPROOFING_SURFACE_PREPARATION_ORDINARY_WEB",
      runtime: {
        origin: ORIGIN,
        backend: BACKEND,
        definitionReleaseId: RELEASE_ID,
        searchReleaseId: SEARCH_RELEASE_ID,
        sourceTree: backendReceipt.compatibility_tuple.sourceTree,
        backendPid: backendReceipt.backend_pid,
        metroPid: metroReceipt.pid,
        capabilityId: backendReceipt.compatibility_tuple.capabilityId,
        backendReceiptSha256: sha256File(BACKEND_RECEIPT),
        metroReceiptSha256: sha256File(METRO_RECEIPT),
      },
      search: {
        query: PROMPT,
        standardCatalogId: STANDARD_CATALOG_ID,
        standardSearchableAndEstimateReady: true,
      },
      initial: {
        revisionId: initialRevision.revisionId,
        rowCount: initialRows.length,
        preliminaryNeedCount: 0,
        input: WOOD_FIREPROOFING_SURFACE_PREPARATION_SHORT_INPUT,
      },
      profile: {
        classification: "ASSUMPTION",
        schemaCount: profileSchema.length,
        greyInlineGuides: guideEvidence,
      },
      edited: {
        revisionId: editedRevision.revisionId,
        parentRevisionId: editedRevision.parentRevisionId,
        oneApplyOneRecalculation: true,
        coldReopen: true,
        quantities: { labor: 15, abrasive: 5, masking: 75, wasteContainers: 5 },
      },
      ordinaryStandardCompile: {
        revisionId: ordinaryRevision.revisionId,
        rowCount: ordinaryRows.length,
        preliminaryNeedCount: 0,
        ordinaryAuthenticatedBackendCompile: true,
      },
      diagnostics: { backendRequests, consoleErrors, pageErrors },
      screenshot: screenshot.replaceAll("\\", "/"),
      productionAccessed: false,
      deployed: false,
      activatedProduction: false,
      ota: false,
    };
    writeJson(OUTPUT, receipt);
    process.stdout.write(`${JSON.stringify({
      status: receipt.status,
      initialRevisionId: initialRevision.revisionId,
      editedRevisionId: editedRevision.revisionId,
      ordinaryStandardRevisionId: ordinaryRevision.revisionId,
      output: OUTPUT,
      outputSha256: sha256File(OUTPUT),
    })}\n`);
  } catch (error) {
    const screenshot = resolve(OUTPUT_ROOT, "failure.png");
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => undefined);
    writeJson(FAILURE, {
      capturedAt: new Date().toISOString(),
      status: "RED_S277_F09_WOOD_FIREPROOFING_SURFACE_PREPARATION_ORDINARY_WEB",
      error: error instanceof Error ? error.stack ?? error.message : String(error),
      url: page.url(),
      bodyText: (await page.locator("body").innerText().catch(() => "")).slice(0, 8_000),
      consoleErrors,
      pageErrors,
      backendRequests,
      screenshot: screenshot.replaceAll("\\", "/"),
      productionAccessed: false,
    });
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
