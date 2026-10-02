import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page, type Response } from "playwright";

import { loadOfficeMarketLiveEnv } from "../../e2e/officeMarketLiveHarnessContracts";

type Json = Record<string, any>;

const LIVE_ENV = loadOfficeMarketLiveEnv();
const ORDINARY_CREDENTIAL_MODE = process.env.S279_V15_ORDINARY_CREDENTIAL_MODE === "1";
const V15_NON_ERP_CONFIRMED = process.env.S279_V15_NON_ERP_CONFIRMED === "1";

const ORIGIN = String(process.env.S278_WEB_ORIGIN ?? "http://127.0.0.1:8081").replace(/\/$/u, "");
const BACKEND = String(process.env.S278_WEB_BACKEND ?? "http://127.0.0.1:8765").replace(/\/$/u, "");
const currentRelease = JSON.parse(readFileSync(resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
), "utf8")) as Json;
const RELEASE_ID = String(process.env.S278_DEFINITION_RELEASE_ID
  ?? currentRelease.definitionReleaseId ?? "");
const SEARCH_RELEASE_ID = String(process.env.S278_SEARCH_RELEASE_ID
  ?? currentRelease.searchReleaseId ?? "");
const STANDARD_CATALOG_ID =
  "canonical-work:base:special_repair_interior_fireproof_inject_standard";
const SMALL_AREA_CATALOG_ID =
  "canonical-work:base:special_repair_interior_fireproof_inject_small_area";
const PROMPT = [
  "Герметизация трещин бетонного основания перед восстановлением огнезащиты",
  "площадь зоны ремонта 12 м²",
].join(". ");
const SHORT_INPUT = Object.freeze({
  repair_zone_area_m2: 12,
  defect_length_m: 30,
  defect_mean_opening_mm: 0.4,
  defect_mean_depth_mm: 180,
  component_thickness_mm: 180,
  ambient_air_temperature_c: 20,
  substrate_temperature_c: 20,
  injection_material_temperature_c: 20,
  concrete_compressive_strength_n_mm2: 30,
  planned_injection_pressure_bar: 5,
});
const PROFILE_VALUES = Object.freeze({
  material_volume_factor: 1,
  packer_spacing_thickness_ratio: 0.5,
  mix_ratio_a_volume_part: 1,
  mix_ratio_b_volume_part: 1,
  component_a_density_kg_l: 1,
  component_b_density_kg_l: 1.07,
  injection_ac20_dosage_percent: 0,
  injection_pass_count: 2,
  workfront_count: 1,
  curing_check_count: 1,
  qa_protocol_document_count: 1,
  waste_disposal_service_count: 1,
});
const OUTPUT_ROOT = resolve(process.env.S278_WEB_OUTPUT_ROOT
  ?? ".release-runtime/r568/s27-9/p6/f09-engineering-completion-v1/web-acceptance-v5");
const OUTPUT = resolve(OUTPUT_ROOT, "acceptance.json");
const FAILURE = resolve(OUTPUT_ROOT, "failure.json");
const BACKEND_RECEIPT = resolve(process.env.S278_BACKEND_RECEIPT
  ?? ".release-runtime/r568/runtime/whole-app-developer-current/backend.json");
const METRO_RECEIPT = resolve(process.env.S278_METRO_RECEIPT
  ?? ".release-runtime/r568/runtime/whole-app-developer-current/metro.json");
const AFFECTED_ONLY = process.env.S278_AFFECTED_ONLY === "1";
const HISTORICAL_ACCEPTANCE = resolve(process.env.S278_HISTORICAL_WEB_ACCEPTANCE
  ?? ".release-runtime/r568/s27-8/f09-fire-current-lineage/fireproof-zone-injection-repair-web-acceptance-v3/acceptance.json");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S278_INJECT_WEB:${code}`);
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

async function api(
  authorization: string,
  route: string,
  init: RequestInit = {},
): Promise<Json> {
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
  throw new Error(`S278_INJECT_WEB:JOB_TIMEOUT:${jobId}`);
}

async function revisionRows(authorization: string, revisionId: string): Promise<Json[]> {
  const body = await api(authorization, `revisions/${revisionId}/rows?limit=100`);
  return Array.isArray(body.rows) ? body.rows as Json[] : [];
}

async function browserAuthorization(page: Page): Promise<string> {
  let token = "";
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline && token.length <= 20) {
    token = await page.evaluate((requireConsumerRole) => {
      for (const key of Object.keys(window.localStorage)) {
        if (!key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        try {
          const session = JSON.parse(raw) as Json;
          const role = String(session?.user?.app_metadata?.role ?? "").trim().toLowerCase();
          if (requireConsumerRole && role !== "consumer") continue;
          const candidate = String(session?.access_token ?? "");
          if (candidate.length > 20) return candidate;
        } catch {
          // Ignore unrelated or stale storage entries and continue to the exact auth item.
        }
      }
      return "";
    }, !ORDINARY_CREDENTIAL_MODE);
    if (token.length <= 20) await page.waitForTimeout(100);
  }
  invariant(token.length > 20, "CONSUMER_AUTHORIZATION_MISSING");
  return `Bearer ${token}`;
}

async function enterConsumer(page: Page): Promise<string> {
  const login = new URL("/auth/login", ORIGIN);
  login.searchParams.set("returnTo", "/request");
  await page.goto(login.toString(), { waitUntil: "domcontentloaded", timeout: 180_000 });
  if (ORDINARY_CREDENTIAL_MODE) {
    const email = String(process.env.E2E_CONSUMER_EMAIL ?? "").trim();
    const password = String(process.env.E2E_CONSUMER_PASSWORD ?? "");
    invariant(email && password, "ORDINARY_CONSUMER_CREDENTIALS_MISSING");
    await page.getByTestId("auth.login.email").fill(email);
    await page.getByTestId("auth.login.password").fill(password);
    await page.getByTestId("auth.login.submit").click();
  } else {
    await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
    const consumer = page.getByTestId("auth.login.local-consumer");
    await consumer.waitFor({ state: "visible", timeout: 60_000 });
    await consumer.click();
  }
  await page.waitForURL(new URL("/request", ORIGIN).toString(), { timeout: 60_000 });
  await page.getByTestId("consumer-repair-problem-input").waitFor({ state: "visible", timeout: 60_000 });
  return browserAuthorization(page);
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

async function fillNumber(page: Page, parameterId: string, value: number): Promise<void> {
  await openParameterPanel(page);
  const card = page.getByTestId(`editable-param-chip-${parameterId}`);
  if (!await card.isVisible().catch(() => false)) {
    const filled = page.getByTestId("request-estimate-filled-parameters-toggle");
    if (await filled.isVisible().catch(() => false)) await filled.click();
  }
  await card.waitFor({ state: "visible", timeout: 60_000 });
  await card.getByTestId("editable-param-popover-input").fill(String(value));
}

async function ensureFilledParameterVisible(page: Page, parameterId: string): Promise<void> {
  const card = page.getByTestId(`editable-param-chip-${parameterId}`);
  if (await card.isVisible().catch(() => false)) return;
  const toggle = page.getByTestId("request-estimate-filled-parameters-toggle");
  if (await toggle.isVisible().catch(() => false)) await toggle.click();
  await card.waitFor({ state: "visible", timeout: 60_000 });
}

async function ensurePositionsVisible(page: Page): Promise<void> {
  const preview = page.getByTestId("consumer-estimate-meaningful-preview");
  if (await preview.isVisible().catch(() => false)) {
    const open = page.getByTestId("consumer-estimate-open-full-estimate");
    await open.waitFor({ state: "visible", timeout: 120_000 });
    await open.click();
    await preview.waitFor({ state: "hidden", timeout: 60_000 });
  }
  const count = page.getByTestId("request-estimate-items-total-count");
  if (await count.isVisible().catch(() => false)) return;
  const toggle = page.getByTestId("request-estimate-positions-toggle");
  await toggle.waitFor({ state: "visible", timeout: 120_000 });
  await toggle.click();
  await count.waitFor({ state: "visible", timeout: 120_000 });
}

function quantity(rows: Json[], rowId: string): number {
  const row = rows.find((entry) => entry.rowId === rowId);
  invariant(row, `ROW_MISSING:${rowId}`);
  return Number(row.quantity);
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const backendReceipt = readJson(BACKEND_RECEIPT);
  const metroReceipt = readJson(METRO_RECEIPT);
  invariant([
    "GREEN_R568_LOCAL_DEVELOPER_CANONICAL_BACKEND_EXACT",
    "READY_R568_WHOLE_APP_BACKEND_AWAITING_AUTHENTICATED_REQUEST",
  ].includes(String(backendReceipt.status)),
    "BACKEND_RECEIPT_RED");
  invariant(backendReceipt.compatibility_tuple?.definitionReleaseId === RELEASE_ID
    && backendReceipt.compatibility_tuple?.searchReleaseId === SEARCH_RELEASE_ID,
  "BACKEND_RELEASE_DRIFT");
  invariant(metroReceipt.definition_release_id === RELEASE_ID
    && metroReceipt.search_release_id === SEARCH_RELEASE_ID
    && metroReceipt.source_tree_hash === backendReceipt.compatibility_tuple?.sourceTree,
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
      response.url().startsWith(`${BACKEND}/search/catalog?`)
        && response.status() === 200,
    { timeout: 120_000 });
    const [searchResponse] = await Promise.all([searchPromise, input.fill(PROMPT)]);
    const search = await responseJson(searchResponse);
    invariant(search.searchIndexReleaseId === SEARCH_RELEASE_ID, "SEARCH_RELEASE_DRIFT");
    const items = Array.isArray(search.items) ? search.items as Json[] : [];
    const selectedIndex = items.findIndex((item) => item.catalogId === STANDARD_CATALOG_ID);
    const smallAreaIndex = items.findIndex((item) => item.catalogId === SMALL_AREA_CATALOG_ID);
    invariant(selectedIndex >= 0 && smallAreaIndex >= 0, "INJECTION_IDENTITIES_NOT_SEARCHABLE");
    invariant(items[selectedIndex].estimateReady === true && items[smallAreaIndex].estimateReady === true,
      "INJECTION_IDENTITIES_NOT_ESTIMATE_READY");
    await page.getByTestId(`consumer-repair-work-suggestion-${selectedIndex + 1}`).click();
    progress("SEARCH_SELECTED", { selectedIndex, smallAreaIndex });

    const prepare = page.getByTestId("consumer-repair-prepare-draft");
    await prepare.waitFor({ state: "visible", timeout: 60_000 });
    invariant(await prepare.isEnabled(), "PREPARE_DISABLED");
    await prepare.click();
    await page.getByTestId("consumer-estimate-parameter-collection")
      .or(page.getByTestId("request-estimate-parameter-panel"))
      .or(page.getByTestId("request-estimate-resolve-incomplete"))
      .first().waitFor({ state: "visible", timeout: 120_000 });
    await openParameterPanel(page);
    for (const [parameterId, value] of Object.entries(SHORT_INPUT)) {
      await fillNumber(page, parameterId, value);
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
    invariant(initialRows.length === 41 && Number(initialRevision.rowCount) === 41,
      `INITIAL_ROW_COUNT_${initialRows.length}`);
    invariant((initialRevision.preliminaryNeeds ?? []).length === 0, "INITIAL_PRELIMINARY_NEEDS_RED");
    invariant(initialRows.every((row) => Number.isFinite(Number(row.quantity)) && Number(row.quantity) > 0),
      "INITIAL_QUANTITY_RED");
    invariant(quantity(initialRows, "f09:fireproof_zone_injection_material_volume") === 2.16,
      "INITIAL_MATERIAL_VOLUME_RED");
    invariant(quantity(initialRows, "f09:fireproof_zone_injection_component_a_required") === 1.08,
      "INITIAL_COMPONENT_A_RED");
    invariant(quantity(initialRows, "f09:fireproof_zone_injection_component_b_required") === 1.1556,
      "INITIAL_COMPONENT_B_RED");
    invariant(quantity(initialRows, "f09:fireproof_zone_injection_201_ce_kit") === 1,
      "INITIAL_WHOLE_KIT_RED");
    invariant(quantity(initialRows, "f09:fireproof_zone_injection_component_a_remainder") === 8.92
      && quantity(initialRows, "f09:fireproof_zone_injection_component_b_remainder") === 9.4444,
    "INITIAL_PACKAGE_REMAINDER_RED");
    invariant(quantity(initialRows, "f09:fireproof_zone_injection_reaction_time") === 135
      && quantity(initialRows, "f09:fireproof_zone_injection_max_pressure") === 100
      && quantity(initialRows, "f09:fireproof_zone_injection_planned_pressure") === 5,
    "INITIAL_ENGINEERING_CONTROL_RED");
    invariant(quantity(initialRows, "f09:fireproof_zone_injection_packers") === 335,
      "INITIAL_PACKERS_RED");
    invariant(quantity(initialRows, "f09:fireproof_zone_injection_passes") === 670,
      "INITIAL_PASSES_RED");
    progress("FIRST_ESTIMATE_GREEN", { revisionId: initialRevision.revisionId, rows: initialRows.length });

    const parameterSessionSnapshot = await api(
      authorization,
      `revisions/${initialRevision.revisionId}/parameter-session`,
    );
    const profileSchemaEvidence = (parameterSessionSnapshot.catalog?.parameterSchema ?? [])
      .filter((parameter: Json) => Object.prototype.hasOwnProperty.call(PROFILE_VALUES, parameter.parameterId))
      .map((parameter: Json) => ({
        parameterId: parameter.parameterId,
        runtimeProfileClassification: parameter.runtimeProfileClassification ?? null,
        valueSourceRole: parameter.valueSourceRole ?? null,
      }));
    progress("PROFILE_SCHEMA_READ", { profileSchemaEvidence });

    const preview = page.getByTestId("consumer-estimate-meaningful-preview");
    await preview.waitFor({ state: "visible", timeout: 120_000 }).catch(() => undefined);
    await openParameterPanel(page);
    await ensureFilledParameterVisible(page, "material_volume_factor");
    const guideEvidence: Json[] = [];
    for (const [parameterId, value] of Object.entries(PROFILE_VALUES)) {
      const card = page.getByTestId(`editable-param-chip-${parameterId}`);
      await card.waitFor({ state: "visible", timeout: 60_000 });
      const actual = await card.getByTestId("editable-param-popover-input").inputValue();
      invariant(Number(actual) === Number(value), `PROFILE_VALUE_${parameterId}_${actual}`);
      const guide = card.getByTestId(`editable-param-inline-guide-${parameterId}`);
      await guide.waitFor({ state: "visible", timeout: 60_000 });
      const guideText = (await guide.innerText()).trim();
      invariant(/^(?:норма|принято)\s/iu.test(guideText), `PROFILE_GUIDE_${parameterId}:${guideText}`);
      guideEvidence.push({ parameterId, value: actual, guide: guideText });
    }

    await fillNumber(page, "defect_mean_opening_mm", 0.5);
    await fillNumber(page, "workfront_count", 2);
    const recalculateCountBefore = backendRequests.filter((entry) =>
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
    const recalculateCountAfter = backendRequests.filter((entry) =>
      entry.method === "POST" && entry.path.endsWith("/jobs/recalculate")).length;
    invariant(recalculateCountAfter - recalculateCountBefore === 1, "BATCH_APPLY_NOT_SINGLE_RECALCULATION");
    invariant(editedRevision.parentRevisionId === initialRevision.revisionId,
      "EDITED_PARENT_REVISION_RED");
    invariant(Number(editedRevision.parameters.defect_mean_opening_mm) === 0.5
      && Number(editedRevision.parameters.workfront_count) === 2,
    "EDITED_PARAMETERS_RED");
    invariant(editedRows.length === 41 && (editedRevision.preliminaryNeeds ?? []).length === 0,
      "EDITED_COMPOSITION_RED");
    invariant(quantity(editedRows, "f09:fireproof_zone_injection_material_volume") === 2.7,
      "EDITED_MATERIAL_VOLUME_RED");
    for (const rowId of [
      "f09:fireproof_zone_injection_pump",
      "f09:fireproof_zone_injection_oil_free_compressed_air",
      "f09:fireproof_zone_injection_impact_drill",
    ]) invariant(quantity(editedRows, rowId) === 2, `EDITED_WORKFRONT_${rowId}`);
    await page.getByText("Изменения сохранены. Зависимые позиции пересчитаны.", { exact: true })
      .waitFor({ state: "visible", timeout: 120_000 });
    progress("BATCH_APPLY_GREEN", { revisionId: editedRevision.revisionId });

    await ensurePositionsVisible(page);
    const editableRows = page.locator('[id^="canonical-estimate-row-identity|"]');
    invariant(await editableRows.count() >= 2, "ROW_EDITOR_COUNT_RED");
    const stagedRowEdits: Json[] = [];
    const rowRecalculationsBefore = backendRequests.filter((entry) =>
      entry.method === "POST" && entry.path.endsWith("/jobs/recalculate")).length;
    for (let index = 0; index < 2; index += 1) {
      const row = editableRows.nth(index);
      const nativeIdentity = String(await row.getAttribute("id") ?? "");
      const rowId = nativeIdentity.split("|").slice(7).join("|");
      invariant(rowId, `ROW_IDENTITY_RED:${index}`);
      const quantityInput = row.locator('[data-testid^="consumer-repair-item-quantity-input-"]');
      const priceInput = row.locator('[data-testid^="consumer-repair-item-unit-price-input-"]');
      await quantityInput.waitFor({ state: "visible", timeout: 60_000 });
      await priceInput.waitFor({ state: "visible", timeout: 60_000 });
      const originalQuantity = Number((await quantityInput.inputValue()).replace(",", "."));
      invariant(Number.isFinite(originalQuantity) && originalQuantity > 0,
        `ROW_QUANTITY_RED:${rowId}`);
      const quantity = Number((originalQuantity + index + 1).toFixed(6));
      const unitPrice = 101.25 + index * 101.25;
      await quantityInput.fill(String(quantity));
      await quantityInput.blur();
      await priceInput.fill(String(unitPrice));
      await priceInput.blur();
      stagedRowEdits.push({ rowId, originalQuantity, quantity, unitPrice });
    }
    await page.getByTestId("request-estimate-row-batch-bar")
      .waitFor({ state: "visible", timeout: 60_000 });
    const recalculationsAfterTyping = backendRequests.filter((entry) =>
      entry.method === "POST" && entry.path.endsWith("/jobs/recalculate")).length;
    invariant(recalculationsAfterTyping === rowRecalculationsBefore,
      "ROW_RECALCULATED_DURING_TYPING");
    const rowApplyPromise = page.waitForResponse((response) =>
      response.url().endsWith("/jobs/recalculate") && response.request().method() === "POST",
    { timeout: 120_000 });
    const [rowApplyResponse] = await Promise.all([
      rowApplyPromise,
      page.getByTestId("request-estimate-row-batch-apply").click(),
    ]);
    invariant(rowApplyResponse.status() === 202,
      `ROW_APPLY_HTTP_${rowApplyResponse.status()}`);
    const rowEditedRevision = await waitForRevision(
      authorization,
      await responseJson(rowApplyResponse),
    );
    const rowEditedRows = await revisionRows(authorization, String(rowEditedRevision.revisionId));
    const rowRecalculationsAfterApply = backendRequests.filter((entry) =>
      entry.method === "POST" && entry.path.endsWith("/jobs/recalculate")).length;
    invariant(rowRecalculationsAfterApply - rowRecalculationsBefore === 1,
      "ROW_BATCH_APPLY_NOT_SINGLE_RECALCULATION");
    invariant(rowEditedRevision.parentRevisionId === editedRevision.revisionId,
      "ROW_EDITED_PARENT_REVISION_RED");
    invariant(rowEditedRows.length === 41, "ROW_EDITED_COMPOSITION_RED");
    for (const expected of stagedRowEdits) {
      const actual = rowEditedRows.find((row) => row.rowId === expected.rowId);
      invariant(actual && Number(actual.quantity) === expected.quantity
        && Number(actual.unitPrice) === expected.unitPrice,
      `ROW_OVERRIDE_NOT_PERSISTED:${expected.rowId}`);
    }
    await page.getByText("Изменения в 2 поз. сохранены. Смета пересчитана один раз.", { exact: true })
      .waitFor({ state: "visible", timeout: 120_000 });
    progress("ROW_BATCH_APPLY_GREEN", {
      revisionId: rowEditedRevision.revisionId,
      parentRevisionId: rowEditedRevision.parentRevisionId,
      editedRowCount: stagedRowEdits.length,
    });

    const draftUrl = page.url();
    await page.reload({ waitUntil: "domcontentloaded", timeout: 180_000 });
    if (!ORDINARY_CREDENTIAL_MODE) {
      await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
    }
    await openParameterPanel(page);
    await ensureFilledParameterVisible(page, "workfront_count");
    const reopenedOpening = await page.getByTestId("editable-param-chip-defect_mean_opening_mm")
      .getByTestId("editable-param-popover-input").inputValue();
    const reopenedWorkfront = await page.getByTestId("editable-param-chip-workfront_count")
      .getByTestId("editable-param-popover-input").inputValue();
    invariant(reopenedOpening === "0.5", `COLD_REOPEN_OPENING_RED:${reopenedOpening}`);
    invariant(reopenedWorkfront === "2", `COLD_REOPEN_WORKFRONT_RED:${reopenedWorkfront}`);
    await ensurePositionsVisible(page);
    const totalText = await page.getByTestId("request-estimate-items-total-count").innerText();
    invariant(totalText.includes("41"), `COLD_REOPEN_ROW_COUNT:${totalText}`);

    const pdfResponsePromise = page.waitForResponse((response) =>
      response.url().startsWith(`${BACKEND}/canonical-estimate/artifact-files/`)
        && response.status() === 200,
    { timeout: 180_000 });
    await page.getByTestId("request-estimate-progressive-actions")
      .getByTestId("consumer-estimate-make-pdf").click();
    await page.waitForURL(/\/pdf-viewer\?sessionId=/u, { timeout: 180_000 });
    const pdfResponse = await pdfResponsePromise;
    invariant(String(pdfResponse.headers()["content-type"] ?? "").includes("application/pdf"),
      "PDF_CONTENT_TYPE_RED");
    await page.goBack({ waitUntil: "domcontentloaded", timeout: 120_000 });
    invariant(page.url() === draftUrl, "PDF_RETURN_DRAFT_RED");

    const addressInput = page.getByTestId("consumer-repair-address-input").last();
    const phoneInput = page.getByTestId("consumer-repair-phone-input").last();
    const addressBeforeApproval = await addressInput.count() > 0
      ? await addressInput.inputValue() : "";
    const phoneBeforeApproval = await phoneInput.count() > 0
      ? await phoneInput.inputValue() : "";
    invariant(addressBeforeApproval.trim() === "", "PERSONAL_APPROVAL_ADDRESS_NOT_EMPTY");
    invariant(phoneBeforeApproval.trim() === "", "PERSONAL_APPROVAL_PHONE_NOT_EMPTY");

    const approve = page.getByTestId("consumer-repair-approve").last();
    await approve.waitFor({ state: "visible", timeout: 120_000 });
    const approvalWaitStartedAt = Date.now();
    while (!await approve.isEnabled() && Date.now() - approvalWaitStartedAt < 120_000) {
      await page.waitForTimeout(250);
    }
    const approvalControl = await approve.evaluate((element) => ({
      ariaDisabled: element.getAttribute("aria-disabled"),
      ariaLabel: element.getAttribute("aria-label"),
      disabled: "disabled" in element ? Boolean((element as HTMLButtonElement).disabled) : null,
      text: element.textContent?.trim() ?? "",
    }));
    const approvalWaitMs = Date.now() - approvalWaitStartedAt;
    const approvalEnabledWithoutContact = await approve.isEnabled();
    progress("PERSONAL_APPROVAL_CONTACT_FREE_READINESS", {
      approvalEnabledWithoutContact,
      approvalWaitMs,
      approvalControl,
    });
    invariant(approvalEnabledWithoutContact,
      `APPROVE_DID_NOT_ENABLE_WITHOUT_ADDRESS_AND_PHONE:${JSON.stringify(approvalControl)}`);
    await approve.click();
    await page.getByTestId("consumer-repair-history-button").waitFor({ state: "visible", timeout: 240_000 });
    await page.getByTestId("consumer-repair-history-button").click();
    await page.getByTestId(`consumer-repair-history-revision-${rowEditedRevision.revisionId}`)
      .waitFor({ state: "visible", timeout: 120_000 });

    let smallRevision: Json | null = null;
    let smallRows: Json[] = [];
    if (!AFFECTED_ONLY) {
      const currentAuthorization = authorization;
      const smallCompile = await api(currentAuthorization, "jobs/compile", {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: `s278-inject-small-${randomUUID()}`,
          catalogId: SMALL_AREA_CATALOG_ID,
          parameters: SHORT_INPUT,
          currencyCode: "KGS",
          sourceRequestText:
            "Герметизация трещин бетонного основания перед восстановлением огнезащиты малой площади",
          primaryMeasureParameterId: "repair_zone_area_m2",
        }),
      });
      smallRevision = await waitForRevision(currentAuthorization, smallCompile);
      smallRows = await revisionRows(currentAuthorization, String(smallRevision.revisionId));
      invariant(smallRevision.releaseId === RELEASE_ID
        && smallRevision.catalogId === SMALL_AREA_CATALOG_ID
        && smallRows.length === 41
        && (smallRevision.preliminaryNeeds ?? []).length === 0,
      "SMALL_AREA_ORDINARY_COMPILE_RED");
      invariant(quantity(smallRows, "f09:fireproof_zone_injection_packers") === 335,
        "SMALL_AREA_QUANTITY_RED");
    }

    const screenshot = resolve(OUTPUT_ROOT, "approved-history.png");
    await page.screenshot({ path: screenshot, fullPage: true });
    invariant(pageErrors.length === 0, `PAGE_ERRORS:${pageErrors.join("|")}`);
    const receipt = {
      schemaVersion: ORDINARY_CREDENTIAL_MODE
        ? "rik-expo-app.s27-9.v15-owner-web-user-cycle.v1"
        : AFFECTED_ONLY
        ? "rik-expo-app.s27-9.fireproof-injection-affected-actions-web-acceptance.v1"
        : "rik-expo-app.s27-8.fireproof-injection-web-acceptance.v3",
      generatedAt: new Date().toISOString(),
      status: ORDINARY_CREDENTIAL_MODE
        ? V15_NON_ERP_CONFIRMED
          ? "GREEN_S279_V15_ORDINARY_CONSUMER_WEB"
          : "GREEN_S279_DEVELOPER_OWNER_WEB_USER_CYCLE"
        : AFFECTED_ONLY
        ? "GREEN_S279_F09_CURRENT_AFFECTED_ACTIONS_WEB"
        : "GREEN_S278_F09_SUBSTRATE_CRACK_SEALING_BEFORE_FIREPROOF_RESTORATION_WEB",
      actor: {
        ordinaryCredentialMode: ORDINARY_CREDENTIAL_MODE,
        nonErpConfirmed: V15_NON_ERP_CONFIRMED,
        developerOwnerAccount: ORDINARY_CREDENTIAL_MODE && !V15_NON_ERP_CONFIRMED,
        allRoleAccessExpected: ORDINARY_CREDENTIAL_MODE && !V15_NON_ERP_CONFIRMED,
        v15OrdinaryConsumerEvidence: V15_NON_ERP_CONFIRMED
          ? "SATISFIED"
          : "SEPARATE_NON_ERP_ACCEPTANCE_PENDING",
        guardedEnvFilesLoaded: LIVE_ENV.loadedFiles,
        credentialsPrinted: false,
        tokensPrinted: false,
      },
      scope: {
        affectedOnly: AFFECTED_ONLY,
        verified: [
          "first_calculation",
          "41_row_applicable_composition_from_46_definition_rows",
          "automatic_quantities",
          "grey_inline_norms",
          "two_parameter_edits",
          "one_parameter_batch_apply",
          "two_row_quantity_and_price_edits",
          "one_row_batch_apply",
          "save_reopen",
          "pdf",
          "approve",
          "history",
        ],
        preservedHistorical: AFFECTED_ONLY ? ["small_area_profile"] : [],
        historicalAcceptancePath: AFFECTED_ONLY ? HISTORICAL_ACCEPTANCE.replaceAll("\\", "/") : null,
        historicalAcceptanceSha256: AFFECTED_ONLY ? sha256File(HISTORICAL_ACCEPTANCE) : null,
      },
      runtime: {
        origin: ORIGIN,
        backend: BACKEND,
        definitionReleaseId: RELEASE_ID,
        searchReleaseId: SEARCH_RELEASE_ID,
        sourceTree: backendReceipt.compatibility_tuple.sourceTree,
        productSourceHash: backendReceipt.compatibility_tuple.frontendProductSourceHash,
        jsBundleFingerprint: backendReceipt.compatibility_tuple.frontendJsBundleFingerprint,
        backendPid: backendReceipt.backend_pid,
        metroPid: metroReceipt.pid,
        capabilityId: backendReceipt.compatibility_tuple.capabilityId,
        backendReceiptSha256: sha256File(BACKEND_RECEIPT),
        metroReceiptSha256: sha256File(METRO_RECEIPT),
      },
      search: {
        query: PROMPT,
        standardCatalogId: STANDARD_CATALOG_ID,
        smallAreaCatalogId: SMALL_AREA_CATALOG_ID,
        bothSearchableAndEstimateReady: true,
      },
      initial: {
        revisionId: initialRevision.revisionId,
        rowCount: initialRows.length,
        preliminaryNeedCount: 0,
        shortInput: SHORT_INPUT,
        materialVolumeL: quantity(initialRows, "f09:fireproof_zone_injection_material_volume"),
        componentAKg: quantity(initialRows, "f09:fireproof_zone_injection_component_a_required"),
        componentBKg: quantity(initialRows, "f09:fireproof_zone_injection_component_b_required"),
        purchasedKitCount: quantity(initialRows, "f09:fireproof_zone_injection_201_ce_kit"),
        componentARemainderKg: quantity(initialRows, "f09:fireproof_zone_injection_component_a_remainder"),
        componentBRemainderKg: quantity(initialRows, "f09:fireproof_zone_injection_component_b_remainder"),
        reactionTimeMin: quantity(initialRows, "f09:fireproof_zone_injection_reaction_time"),
        maximumPressureBar: quantity(initialRows, "f09:fireproof_zone_injection_max_pressure"),
        plannedPressureBar: quantity(initialRows, "f09:fireproof_zone_injection_planned_pressure"),
        packerCount: quantity(initialRows, "f09:fireproof_zone_injection_packers"),
        passCount: quantity(initialRows, "f09:fireproof_zone_injection_passes"),
      },
      profileGuides: guideEvidence,
      edited: {
        revisionId: editedRevision.revisionId,
        parentRevisionId: editedRevision.parentRevisionId,
        defectMeanOpeningMm: editedRevision.parameters.defect_mean_opening_mm,
        workfrontCount: editedRevision.parameters.workfront_count,
        materialVolumeL: quantity(editedRows, "f09:fireproof_zone_injection_material_volume"),
        oneApplyOneRecalculation: true,
        coldReopen: true,
      },
      rowBatchEdited: {
        revisionId: rowEditedRevision.revisionId,
        parentRevisionId: rowEditedRevision.parentRevisionId,
        stagedRowEdits,
        recalculationsDuringTyping: 0,
        oneApplyOneRecalculation: true,
        persistedAfterColdReopen: true,
      },
      smallArea: {
        revisionId: smallRevision?.revisionId ?? null,
        rowCount: smallRows.length,
        preliminaryNeedCount: smallRevision == null ? null : 0,
        ordinaryAuthenticatedBackendCompile: smallRevision != null,
        preservedFromCompatibleHistoricalEvidence: AFFECTED_ONLY,
      },
      pdf: {
        contentType: pdfResponse.headers()["content-type"],
        exactEditedRevision: true,
        revisionId: rowEditedRevision.revisionId,
      },
      approval: {
        allowedWithNullPrices: true,
        withoutAddressAndPhone: true,
        addressBeforeApproval,
        phoneBeforeApproval,
        readinessWaitMs: approvalWaitMs,
        control: approvalControl,
        historyContainsExactRevision: true,
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
      smallAreaRevisionId: smallRevision?.revisionId ?? null,
      output: OUTPUT,
      outputSha256: sha256File(OUTPUT),
    })}\n`);
  } catch (error) {
    const screenshot = resolve(OUTPUT_ROOT, "failure.png");
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => undefined);
    writeJson(FAILURE, {
      capturedAt: new Date().toISOString(),
      status: "RED_S278_F09_SUBSTRATE_CRACK_SEALING_BEFORE_FIREPROOF_RESTORATION_WEB",
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
