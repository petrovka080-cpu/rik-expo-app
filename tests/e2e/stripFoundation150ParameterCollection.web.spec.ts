import fs from "node:fs";
import path from "node:path";

import { expect, test, type Locator, type Page, type Response } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const BACKEND_ORIGIN = process.env.LIVE_CANONICAL_BACKEND_ORIGIN ?? "http://127.0.0.1:8765";
const MASTER_SHA256 = process.env.S277_MASTER_SHA256
  ?? "949F702266D471E62E29E1635EAF40A7B2DFFEE415C4220190533608A349C347";
const LOCAL_DEVELOPER_AUTH_STORAGE_KEY = "sb-127-auth-token";
const PROMPT = "Устройство монолитного железобетонного ленточного фундамента 150 метров";
const EVIDENCE_ROOT = path.resolve(process.env.S277_FOUNDATION_EVIDENCE_ROOT
  ?? ".release-runtime/r568/s27-4/delivery-first/acceptance/web-foundation-150");
type Json = Record<string, any>;

type CanonicalRowEditor = {
  rowId: string;
  row: Locator;
  quantity: Locator;
  unitPrice: Locator;
};

async function enterConsumer(page: Page): Promise<void> {
  const requestUrl = new URL("/request", BASE_URL).toString();
  const loginUrl = new URL("/auth/login", BASE_URL);
  loginUrl.searchParams.set("returnTo", "/request");
  await page.goto(loginUrl.toString(), {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await expect(page.getByTestId("local-developer-review-banner")).toBeVisible({ timeout: 120_000 });
  const explicitConsumerLogin = page.getByTestId("auth.login.local-consumer");
  await expect(explicitConsumerLogin).toBeVisible({ timeout: 60_000 });
  await explicitConsumerLogin.click();
  await page.waitForURL(requestUrl, { timeout: 60_000 });
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const input = page.getByTestId("consumer-repair-problem-input");
    if (await input.isVisible().catch(() => false) && await input.isEditable().catch(() => false)) {
      const deleteDraft = page.getByTestId("consumer-repair-delete-draft");
      if (await deleteDraft.isVisible().catch(() => false)) {
        await deleteDraft.click();
        await page.getByTestId("consumer-repair-delete-confirm").click();
        await expect(deleteDraft).toHaveCount(0, { timeout: 60_000 });
        await expect(input).toHaveValue("");
      }
      return;
    }
    const login = page.getByTestId("auth.login.local-consumer")
      .or(page.getByTestId("protected-identity-local-consumer-login"))
      .first();
    if (await login.isVisible().catch(() => false) && await login.isEnabled().catch(() => false)) {
      await login.click({ timeout: 2_000 }).catch(() => undefined);
    }
    await page.waitForTimeout(250);
  }
  const input = page.getByTestId("consumer-repair-problem-input");
  throw new Error(`I15_CONSUMER_ROUTE_NOT_READY:${JSON.stringify({
    url: page.url(),
    authenticatedMarker: await page.getByLabel("ROUTE_PROOF_AUTHENTICATED_SESSION_READY").count(),
    requestRouteMarker: await page.getByLabel("ROUTE_PROOF_REQUEST_ROUTE_READY").count(),
    inputCount: await input.count(),
    inputVisible: await input.isVisible().catch(() => false),
    inputEditable: await input.isEditable().catch(() => false),
  })}`);
}

async function fillNumber(page: Page, parameterId: string, value: string): Promise<void> {
  const card = page.getByTestId(`editable-param-chip-${parameterId}`);
  if (!await card.isVisible().catch(() => false)) {
    const toggle = page.getByTestId("request-estimate-parameters-toggle");
    if (await toggle.isVisible().catch(() => false)) await toggle.click();
  }
  await expect(card).toBeVisible({ timeout: 60_000 });
  await card.getByTestId("editable-param-popover-input").fill(value);
}

async function choose(page: Page, parameterId: string, value: string): Promise<void> {
  const option = page.getByTestId(`editable-param-option-${parameterId}-${value}`);
  await expect(option).toBeVisible({ timeout: 60_000 });
  await option.click();
}

async function dismissMeaningfulPreview(page: Page, waitForAppearance = false): Promise<void> {
  const preview = page.getByTestId("consumer-estimate-meaningful-preview");
  if (waitForAppearance) {
    await preview.waitFor({ state: "visible", timeout: 120_000 }).catch(() => undefined);
  }
  if (!await preview.isVisible().catch(() => false)) return;
  const open = page.getByTestId("consumer-estimate-open-full-estimate");
  await expect(open).toBeEnabled({ timeout: 120_000 });
  await open.click();
  await expect(preview).toHaveCount(0, { timeout: 60_000 });
}

async function openParameterPanel(page: Page): Promise<void> {
  await dismissMeaningfulPreview(page);
  const panel = page.getByTestId("request-estimate-parameter-panel");
  if (await panel.isVisible().catch(() => false)) return;
  const resolveIncomplete = page.getByTestId("request-estimate-resolve-incomplete");
  if (await resolveIncomplete.isVisible().catch(() => false)) {
    await resolveIncomplete.click();
  } else {
    await page.getByTestId("request-estimate-parameters-toggle").click();
  }
  await expect(panel).toBeVisible({ timeout: 120_000 });
}

async function expandPositions(page: Page): Promise<void> {
  const count = page.getByTestId("request-estimate-items-total-count");
  const toggle = page.getByTestId("request-estimate-positions-toggle");
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (await count.isVisible().catch(() => false)) return;
    if (await toggle.isVisible().catch(() => false) && await toggle.isEnabled().catch(() => false)) {
      await toggle.click().catch(() => undefined);
    }
    await page.waitForTimeout(250);
  }
  throw new Error("I15_POSITIONS_PANEL_NOT_READY");
}

async function canonicalRowEditor(page: Page, rowId: string): Promise<CanonicalRowEditor> {
  const row = page.locator(`[id$="|${rowId}"]`);
  await expect(row).toBeVisible({ timeout: 120_000 });
  const quantity = row.locator('[data-testid^="consumer-repair-item-quantity-input-"]');
  const unitPrice = row.locator('[data-testid^="consumer-repair-item-unit-price-input-"]');
  await expect(quantity).toBeVisible();
  await expect(unitPrice).toBeVisible();
  return { rowId, row, quantity, unitPrice };
}

async function ensureParameterChoiceVisible(
  page: Page,
  parameterId: string,
  choice: string,
): Promise<Locator> {
  await openParameterPanel(page);
  const option = page.getByTestId(`editable-param-option-${parameterId}-${choice}`);
  if (!await option.isVisible().catch(() => false)) {
    const filledToggle = page.getByTestId("request-estimate-filled-parameters-toggle");
    if (await filledToggle.isVisible().catch(() => false)) await filledToggle.click();
  }
  await expect(option).toBeVisible({ timeout: 60_000 });
  return option;
}

function expectManualOverrides(revision: Json, expected: Record<string, Json>): void {
  const overrides = revision.amendmentContract?.rowOverrides ?? {};
  for (const [rowId, fields] of Object.entries(expected)) {
    expect(overrides[rowId], `manual override ${rowId}`).toMatchObject(fields);
  }
}

async function browserAuthorization(page: Page): Promise<string> {
  await expect.poll(() => page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return false;
    try {
      const session = JSON.parse(raw) as Json;
      return session?.user?.app_metadata?.role === "consumer"
        && typeof session?.access_token === "string"
        && session.access_token.length > 20;
    } catch {
      return false;
    }
  }, LOCAL_DEVELOPER_AUTH_STORAGE_KEY), { timeout: 30_000 }).toBe(true);
  const accessToken = await page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    try {
      const session = JSON.parse(raw) as Json;
      return session?.user?.app_metadata?.role === "consumer"
        ? String(session?.access_token ?? "")
        : null;
    } catch {
      return null;
    }
  }, LOCAL_DEVELOPER_AUTH_STORAGE_KEY);
  if (!accessToken) throw new Error("I15_BROWSER_AUTHORIZATION_MISSING");
  return `Bearer ${accessToken}`;
}

async function api(authorization: string, route: string): Promise<Json> {
  const response = await fetch(`${BACKEND_ORIGIN}/canonical-estimate/${route.replace(/^\/+/, "")}`, {
    headers: { Authorization: authorization },
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  if (!response.ok) throw new Error(`I15_API_${response.status}:${route}:${JSON.stringify(body)}`);
  return body;
}

async function waitForRevision(authorization: string, accepted: Json): Promise<Json> {
  const jobId = String(accepted.jobId ?? "");
  const deadline = Date.now() + 180_000;
  let registrationNotFoundRetries = 0;
  while (Date.now() < deadline) {
    const job = await api(authorization, `jobs/${jobId}`).catch(async (error: unknown) => {
      if (
        error instanceof Error
        && error.message.startsWith("I15_API_404:jobs/")
        && registrationNotFoundRetries < 200
      ) {
        registrationNotFoundRetries += 1;
        await new Promise((resolve) => setTimeout(resolve, 250));
        return null;
      }
      throw error;
    });
    if (!job) continue;
    if (job.status === "succeeded" && job.resultRevisionId) {
      return api(authorization, `revisions/${job.resultRevisionId}`);
    }
    if (["failed", "cancelled"].includes(String(job.status))) {
      throw new Error(`I15_JOB_${job.status}:${job.errorCode ?? "UNKNOWN"}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`I15_JOB_TIMEOUT:${jobId}`);
}

async function rows(authorization: string, revisionId: string): Promise<Json[]> {
  const result = await api(authorization, `revisions/${revisionId}/rows?limit=200`);
  return Array.isArray(result.rows) ? result.rows : [];
}

async function responseJson(response: Response): Promise<Json> {
  return response.json().catch(() => ({})) as Promise<Json>;
}

function mark(stage: string, details: Json = {}): void {
  fs.mkdirSync(EVIDENCE_ROOT, { recursive: true });
  fs.writeFileSync(path.join(EVIDENCE_ROOT, "progress.json"), `${JSON.stringify({
    capturedAt: new Date().toISOString(),
    stage,
    ...details,
  }, null, 2)}\n`, "utf8");
}

test.beforeAll(async () => {
  await ensureLiveWebApp();
  fs.mkdirSync(EVIDENCE_ROOT, { recursive: true });
});

test("missing parameters stay editable on one screen and resume the same durable estimate", async ({ page }) => {
  test.setTimeout(600_000);
  const backendResponses: Json[] = [];
  page.on("response", (response) => {
    if (!response.url().startsWith(`${BACKEND_ORIGIN}/`)) return;
    backendResponses.push({
      method: response.request().method(),
      path: new URL(response.url()).pathname,
      status: response.status(),
    });
  });

  mark("OPENING_CONSUMER");
  await enterConsumer(page);
  let authorization = await browserAuthorization(page);
  mark("CONSUMER_OPENED");
  await page.getByTestId("consumer-repair-problem-input").fill(PROMPT);
  await page.getByTestId("consumer-repair-prepare-draft").click();
  const resolveIncomplete = page.getByTestId("request-estimate-resolve-incomplete");
  await expect(page.getByTestId("request-estimate-parameter-panel").or(resolveIncomplete).first())
    .toBeVisible({ timeout: 120_000 });
  await openParameterPanel(page);
  await expect(page.getByTestId("request-estimate-missing-param-strip_width_m")).toBeVisible();
  await expect(page.getByTestId("request-estimate-missing-param-strip_height_m")).toBeVisible();
  await expect(page.getByTestId("consumer-repair-prepare-draft")).toHaveCount(0);
  for (const deferredParameterId of [
    "product_profile_id",
    "plan_volume_calculation_reference",
    "mix_design_or_project_specification_reference",
    "producer_order_confirmation",
    "estimator_approval_reference",
    "reinforcement_product_profile_id",
    "bar_bending_schedule_reference",
    "structural_drawing_and_revision_reference",
    "reinforcement_estimator_approval_reference",
  ]) {
    await expect(page.getByTestId(`editable-param-chip-${deferredParameterId}`)).toHaveCount(0);
  }

  const draftUrl = page.url();
  const draftId = new URL(draftUrl).searchParams.get("draftId");
  expect(draftId).toBeTruthy();
  const initialFilledToggle = page.getByTestId("request-estimate-filled-parameters-toggle");
  if (await initialFilledToggle.isVisible().catch(() => false)) await initialFilledToggle.click();
  await expect(page.getByTestId("editable-param-chip-total_axis_length_m")
    .getByTestId("editable-param-popover-input")).toHaveValue("150");
  mark("INITIAL_PARAMETER_COLLECTION_GREEN", { draftId, draftUrl });

  await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page).toHaveURL(draftUrl);
  authorization = await browserAuthorization(page);
  await openParameterPanel(page);
  const restoredFilledToggle = page.getByTestId("request-estimate-filled-parameters-toggle");
  if (await restoredFilledToggle.isVisible().catch(() => false)) await restoredFilledToggle.click();
  await expect(page.getByTestId("editable-param-chip-total_axis_length_m")
    .getByTestId("editable-param-popover-input")).toHaveValue("150");
  mark("PARAMETER_COLLECTION_COLD_RELOAD_GREEN", { draftId });

  await fillNumber(page, "strip_width_m", "0.6");
  await fillNumber(page, "strip_height_m", "1.2");
  await expect(page.getByTestId("editable-param-batch-apply"))
    .toContainText("Применить");
  const firstStageResponse = page.waitForResponse((response) =>
    response.url().endsWith("/jobs/recalculate") && response.request().method() === "POST", {
    timeout: 120_000,
  });
  await Promise.all([
    firstStageResponse,
    page.getByTestId("editable-param-batch-apply").click(),
  ]);
  await dismissMeaningfulPreview(page, true);
  await openParameterPanel(page);

  await expect(page.getByTestId("request-estimate-missing-param-preparation_thickness_m"))
    .toBeVisible({ timeout: 120_000 });
  mark("SECOND_PARAMETER_STAGE_OPENED");
  await fillNumber(page, "preparation_thickness_m", "0.1");
  await fillNumber(page, "reinforcement_mass_t", "9");
  await fillNumber(page, "binding_wire_mass_kg", "108");
  await choose(page, "groundworks_included", "false");
  await choose(page, "foundation_bedding_included", "false");
  await choose(page, "waterproofing_included", "false");
  await choose(page, "backfill_included", "false");

  const compilePromise = page.waitForResponse((response) =>
    response.url().endsWith("/jobs/recalculate") && response.request().method() === "POST", {
    timeout: 120_000,
  });
  const [compileResponse] = await Promise.all([
    compilePromise,
    page.getByTestId("editable-param-batch-apply").click(),
  ]);
  expect(compileResponse.status()).toBe(202);
  let initialRevision = await waitForRevision(authorization, await responseJson(compileResponse));
  await dismissMeaningfulPreview(page, true);
  await openParameterPanel(page);
  const formworkTransport = page.getByTestId("editable-param-chip-formwork_transport_mass_t");
  if (await formworkTransport.isVisible().catch(() => false)) {
    await fillNumber(page, "formwork_transport_mass_t", "20");
    const finalInputResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/jobs/recalculate") && response.request().method() === "POST", {
      timeout: 120_000,
    });
    const [finalInputResponse] = await Promise.all([
      finalInputResponsePromise,
      page.getByTestId("editable-param-batch-apply").click(),
    ]);
    expect(finalInputResponse.status()).toBe(202);
    initialRevision = await waitForRevision(authorization, await responseJson(finalInputResponse));
    await dismissMeaningfulPreview(page, true);
  }
  expect(Number(initialRevision.parameters.total_axis_length_m)).toBe(150);
  expect(initialRevision.parameters.groundworks_included).toBe(false);
  const expectedRowCount = Number(initialRevision.rowCount);
  expect(expectedRowCount).toBeGreaterThan(0);
  await expandPositions(page);
  await expect(page.getByTestId("request-estimate-items-total-count"))
    .toContainText(String(expectedRowCount), { timeout: 180_000 });
  await expect(page.getByTestId("request-estimate-parameter-status"))
    .toContainText("Обязательные параметры заполнены", { timeout: 120_000 });
  await expect(page.getByTestId("request-estimate-visible-missing-parameters")).toHaveCount(0);
  expect(page.url()).toBe(draftUrl);
  mark("INITIAL_COMPILE_GREEN", { initialRevisionId: initialRevision.revisionId });

  await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page).toHaveURL(draftUrl);
  authorization = await browserAuthorization(page);
  await dismissMeaningfulPreview(page);
  await expandPositions(page);
  await expect(page.getByTestId("request-estimate-items-total-count"))
    .toContainText(String(expectedRowCount), { timeout: 180_000 });
  await expect(page.getByText(PROMPT, { exact: true })).toBeVisible();
  mark("COMPILED_DRAFT_COLD_RELOAD_GREEN");

  await fillNumber(page, "strip_width_m", "0.7");
  const recalculatePromise = page.waitForResponse((response) =>
    response.url().endsWith("/jobs/recalculate") && response.request().method() === "POST", {
    timeout: 120_000,
  });
  const [recalculateResponse] = await Promise.all([
    recalculatePromise,
    page.getByTestId("editable-param-batch-apply").click(),
  ]);
  expect(recalculateResponse.status()).toBe(202);
  const editedRevision = await waitForRevision(authorization, await responseJson(recalculateResponse));
  await dismissMeaningfulPreview(page, true);
  expect(editedRevision.parentRevisionId).toBe(initialRevision.revisionId);
  expect(Number(editedRevision.parameters.strip_width_m)).toBe(0.7);
  const editedRows = await rows(authorization, editedRevision.revisionId);
  expect(editedRows).toHaveLength(expectedRowCount);
  expect(Number(editedRows.find((row) => row.rowId === "main_concrete")?.quantity)).toBe(126);
  await expect(page.locator(`[id^="canonical-estimate-row-identity|"]`).first())
    .toBeVisible({ timeout: 180_000 });
  mark("EDIT_RECALCULATION_GREEN", { editedRevisionId: editedRevision.revisionId });

  await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page).toHaveURL(draftUrl);
  authorization = await browserAuthorization(page);
  await dismissMeaningfulPreview(page);
  await expandPositions(page);
  await expect(page.getByTestId("request-estimate-items-total-count"))
    .toContainText(String(expectedRowCount), { timeout: 180_000 });
  await page.getByTestId("request-estimate-parameters-toggle").click();
  await expect(page.getByTestId("editable-param-chip-strip_width_m")
    .getByTestId("editable-param-popover-input")).toHaveValue("0.7");
  mark("EDITED_DRAFT_COLD_RELOAD_GREEN");

  await page.getByTestId("consumer-estimate-open-procurement").click();
  await expect(page.getByTestId("consumer-estimate-procurement-list"))
    .toBeVisible({ timeout: 120_000 });
  mark("PROCUREMENT_GREEN");

  const pdfFilePromise = page.waitForResponse((response) =>
    response.url().startsWith(`${BACKEND_ORIGIN}/canonical-estimate/artifact-files/`)
      && response.status() === 200, { timeout: 180_000 });
  await page.getByTestId("request-estimate-progressive-actions")
    .getByTestId("consumer-estimate-make-pdf")
    .click();
  await page.waitForURL(/\/pdf-viewer\?sessionId=/u, { timeout: 180_000 });
  const pdfFileResponse = await pdfFilePromise;
  expect(pdfFileResponse.headers()["content-type"]).toContain("application/pdf");
  await expect(page.getByTestId("pdf-viewer-web-iframe"))
    .toHaveAttribute("aria-busy", "false", { timeout: 120_000 });
  await page.goBack({ waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page).toHaveURL(draftUrl);
  await expandPositions(page);
  await expect(page.getByTestId("request-estimate-row-count"))
    .toContainText(String(expectedRowCount), { timeout: 180_000 });
  await expect(page.getByTestId("estimate-revision-timeline"))
    .toHaveAttribute("aria-label", /[3-9][0-9]*-revisions--[2-9][0-9]*-diffs/u);
  await expect(page.getByTestId("estimate-revision-diff-param-strip_width_m"))
    .toContainText(/0\.6.*0\.7/u);
  await expect(page.getByTestId("estimate-revision-diff-row-main_concrete"))
    .toContainText(/108.*126/u);
  await expect(page.getByTestId("estimate-current-revision-artifacts"))
    .toContainText(/PDF.*закупк.*актуальн/iu);
  mark("PDF_RETURN_GREEN");

  const approve = page.getByTestId("consumer-repair-approve").last();
  await expect(approve).toBeEnabled();
  await expect(approve).toContainText(/подтвердить смету/iu);
  expect(editedRows.some((row) => row.unitPrice == null)).toBe(true);
  mark("REVISION_HISTORY_GREEN_UNPRICED_APPROVAL_ALLOWED_WITHOUT_FABRICATED_TOTAL");

  const manualEdits = {
    concrete_placement: { quantity: 130.5, unitPrice: 1800.25 },
    surface_finish: { quantity: 151.25, unitPrice: 220.5 },
    curing_work: { quantity: 152.75, unitPrice: 330.75 },
  } as const;
  const recalculateCount = () => backendResponses.filter((entry) =>
    entry.method === "POST" && entry.path.endsWith("/jobs/recalculate")
  ).length;
  const recalculateBeforeBatch = recalculateCount();
  const inputScrollDeltas: number[] = [];
  for (const [rowId, values] of Object.entries(manualEdits)) {
    const editor = await canonicalRowEditor(page, rowId);
    await editor.quantity.scrollIntoViewIfNeeded();
    const quantityScrollBefore = await page.evaluate(() => window.scrollY);
    await editor.quantity.fill(String(values.quantity));
    await expect(editor.quantity).toBeFocused();
    inputScrollDeltas.push(Math.abs((await page.evaluate(() => window.scrollY)) - quantityScrollBefore));
    await editor.quantity.press("Tab");
    await editor.unitPrice.fill(String(values.unitPrice));
    await expect(editor.unitPrice).toBeFocused();
    const priceScrollBefore = await page.evaluate(() => window.scrollY);
    await editor.unitPrice.press("Tab");
    inputScrollDeltas.push(Math.abs((await page.evaluate(() => window.scrollY)) - priceScrollBefore));
  }
  expect(Math.max(...inputScrollDeltas)).toBeLessThan(200);
  await expect(page.getByTestId("request-estimate-row-batch-bar")).toContainText("3");
  await expect(page.getByTestId("consumer-repair-approve").last())
    .toContainText("\u041f\u0440\u0438\u043c\u0435\u043d\u0438\u0442\u044c \u0438 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c");
  await page.waitForTimeout(750);
  expect(recalculateCount()).toBe(recalculateBeforeBatch);

  const batchApplyResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/jobs/recalculate") && response.request().method() === "POST", {
    timeout: 120_000,
  });
  const [batchApplyResponse] = await Promise.all([
    batchApplyResponsePromise,
    page.getByTestId("request-estimate-row-batch-apply").click(),
  ]);
  expect(batchApplyResponse.status()).toBe(202);
  const batchRevision = await waitForRevision(authorization, await responseJson(batchApplyResponse));
  await dismissMeaningfulPreview(page, true);
  expect(recalculateCount()).toBe(recalculateBeforeBatch + 1);
  expect(batchRevision.parentRevisionId).toBe(editedRevision.revisionId);
  expectManualOverrides(batchRevision, manualEdits);
  const batchRows = await rows(authorization, batchRevision.revisionId);
  for (const [rowId, values] of Object.entries(manualEdits)) {
    const row = batchRows.find((candidate) => candidate.rowId === rowId);
    expect(Number(row?.quantity), `${rowId} quantity after one Apply`).toBe(values.quantity);
    expect(Number(row?.unitPrice), `${rowId} price after one Apply`).toBe(values.unitPrice);
  }
  mark("THREE_ROW_BATCH_ONE_RECALC_GREEN", {
    sourceRevisionId: editedRevision.revisionId,
    batchRevisionId: batchRevision.revisionId,
    inputScrollDeltas,
  });

  await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page).toHaveURL(draftUrl);
  authorization = await browserAuthorization(page);
  await dismissMeaningfulPreview(page);
  await expandPositions(page);
  for (const [rowId, values] of Object.entries(manualEdits)) {
    const editor = await canonicalRowEditor(page, rowId);
    await expect(editor.quantity).toHaveValue(String(values.quantity));
    await expect(editor.unitPrice).toHaveValue(String(values.unitPrice));
  }
  mark("BATCH_VALUES_RESTORED_AFTER_REOPEN_GREEN");

  const placementOption = await ensureParameterChoiceVisible(page, "scope_variant", "placement_only");
  await placementOption.click();
  const placementResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/jobs/recalculate") && response.request().method() === "POST", {
    timeout: 120_000,
  });
  const [placementResponse] = await Promise.all([
    placementResponsePromise,
    page.getByTestId("editable-param-batch-apply").click(),
  ]);
  const placementRevision = await waitForRevision(authorization, await responseJson(placementResponse));
  await dismissMeaningfulPreview(page, true);
  expect(placementRevision.parentRevisionId).toBe(batchRevision.revisionId);
  expect(placementRevision.parameters.scope_variant).toBe("placement_only");
  expect(String(placementRevision.displayTitleRu)).toContain("\u0422\u043e\u043b\u044c\u043a\u043e \u0443\u043a\u043b\u0430\u0434\u043a\u0430");
  expect(Number(placementRevision.rowCount)).toBeLessThan(Number(batchRevision.rowCount));
  expectManualOverrides(placementRevision, manualEdits);
  const placementRows = await rows(authorization, placementRevision.revisionId);
  for (const [rowId, values] of Object.entries(manualEdits)) {
    const row = placementRows.find((candidate) => candidate.rowId === rowId);
    expect(Number(row?.quantity), `${rowId} quantity in placement scope`).toBe(values.quantity);
    expect(Number(row?.unitPrice), `${rowId} price in placement scope`).toBe(values.unitPrice);
  }

  const fullOption = await ensureParameterChoiceVisible(page, "scope_variant", "full_reinforced_structure");
  await fullOption.click();
  const fullResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/jobs/recalculate") && response.request().method() === "POST", {
    timeout: 120_000,
  });
  const [fullResponse] = await Promise.all([
    fullResponsePromise,
    page.getByTestId("editable-param-batch-apply").click(),
  ]);
  const restoredFullRevision = await waitForRevision(authorization, await responseJson(fullResponse));
  await dismissMeaningfulPreview(page, true);
  expect(restoredFullRevision.parentRevisionId).toBe(placementRevision.revisionId);
  expect(restoredFullRevision.parameters.scope_variant).toBe("full_reinforced_structure");
  expect(String(restoredFullRevision.displayTitleRu)).toContain("\u041f\u043e\u043b\u043d\u043e\u0435 \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u043e");
  expect(Number(restoredFullRevision.rowCount)).toBe(Number(batchRevision.rowCount));
  expectManualOverrides(restoredFullRevision, manualEdits);
  const restoredFullRows = await rows(authorization, restoredFullRevision.revisionId);
  for (const [rowId, values] of Object.entries(manualEdits)) {
    const row = restoredFullRows.find((candidate) => candidate.rowId === rowId);
    expect(Number(row?.quantity), `${rowId} quantity after restoring full scope`).toBe(values.quantity);
    expect(Number(row?.unitPrice), `${rowId} price after restoring full scope`).toBe(values.unitPrice);
  }
  mark("SCOPE_SWITCH_BOTH_DIRECTIONS_PRESERVES_MANUAL_VALUES_GREEN", {
    placementRevisionId: placementRevision.revisionId,
    restoredFullRevisionId: restoredFullRevision.revisionId,
    placementTitleRu: placementRevision.displayTitleRu,
    restoredFullTitleRu: restoredFullRevision.displayTitleRu,
  });

  await expandPositions(page);
  const finalEditor = await canonicalRowEditor(page, "curing_work");
  await finalEditor.unitPrice.fill("444.55");
  await finalEditor.unitPrice.press("Tab");
  await expect(page.getByTestId("request-estimate-row-batch-bar")).toContainText("1");
  const applyAndApprove = page.getByTestId("consumer-repair-approve").last();
  await expect(applyAndApprove).toBeEnabled();
  await expect(applyAndApprove)
    .toContainText("\u041f\u0440\u0438\u043c\u0435\u043d\u0438\u0442\u044c \u0438 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c");
  const recalculateBeforeApproval = recalculateCount();
  const approvalRecalculatePromise = page.waitForResponse((response) =>
    response.url().endsWith("/jobs/recalculate") && response.request().method() === "POST", {
    timeout: 120_000,
  });
  const [approvalRecalculateResponse] = await Promise.all([
    approvalRecalculatePromise,
    applyAndApprove.click(),
  ]);
  const approvedRevision = await waitForRevision(
    authorization,
    await responseJson(approvalRecalculateResponse),
  );
  expect(recalculateCount()).toBe(recalculateBeforeApproval + 1);
  expect(approvedRevision.parentRevisionId).toBe(restoredFullRevision.revisionId);
  expectManualOverrides(approvedRevision, {
    ...manualEdits,
    curing_work: { ...manualEdits.curing_work, unitPrice: 444.55 },
  });
  const approvedRows = await rows(authorization, approvedRevision.revisionId);
  expect(approvedRows.some((row) => row.unitPrice == null)).toBe(true);
  await expect(page).toHaveURL(new URL("/request", BASE_URL).toString());
  await expect(page.getByTestId("consumer-repair-problem-input")).toBeVisible({ timeout: 240_000 });
  await expect(page.getByTestId("consumer-repair-problem-input")).toHaveValue("");
  await expect(page.getByTestId("consumer-repair-new")).toHaveCount(0);
  await expect(page.getByTestId("consumer-repair-history-approved-count")).toContainText("1");
  await page.getByTestId("consumer-repair-history-button").click();
  await expect(page.getByTestId(`consumer-repair-history-revision-${approvedRevision.revisionId}`))
    .toBeVisible({ timeout: 60_000 });
  mark("APPLY_AND_APPROVE_EXACT_CHILD_REVISION_GREEN", {
    approvedRevisionId: approvedRevision.revisionId,
    approvedParentRevisionId: approvedRevision.parentRevisionId,
  });

  await page.screenshot({ path: path.join(EVIDENCE_ROOT, "foundation-150-s27-4-approved-history.png"), fullPage: true });
  fs.writeFileSync(path.join(EVIDENCE_ROOT, "acceptance.json"), `${JSON.stringify({
    capturedAt: new Date().toISOString(),
    masterSha256: MASTER_SHA256,
    prompt: PROMPT,
    draftId,
    draftUrl,
    initialRevisionId: initialRevision.revisionId,
    editedRevisionId: editedRevision.revisionId,
    parentRevisionId: editedRevision.parentRevisionId,
    recognizedLengthM: initialRevision.parameters.total_axis_length_m,
    editedWidthM: editedRevision.parameters.strip_width_m,
    editedConcreteQuantityM3: editedRows.find((row) => row.rowId === "main_concrete")?.quantity,
    rowCount: editedRows.length,
    firstScreenParameterPolicy: "CALCULATION_INPUTS_ONLY",
    deferredDocumentOnlyParameters: [
      "product_profile_id",
      "plan_volume_calculation_reference",
      "mix_design_or_project_specification_reference",
      "producer_order_confirmation",
      "estimator_approval_reference",
      "reinforcement_product_profile_id",
      "bar_bending_schedule_reference",
      "structural_drawing_and_revision_reference",
      "reinforcement_estimator_approval_reference",
    ],
    coldReload: "GREEN",
    procurement: "GREEN",
    pdfAndReturn: "GREEN",
    revisionHistory: "GREEN_2_REVISIONS_1_DIFF",
    approval: "AVAILABLE_WITH_UNVERIFIED_PRICES",
    batchEditing: {
      stagedRowCount: Object.keys(manualEdits).length,
      recalculateCount: 1,
      inputScrollDeltas,
      sourceRevisionId: editedRevision.revisionId,
      resultRevisionId: batchRevision.revisionId,
      restoredAfterReload: true,
    },
    scopeSwitch: {
      placementRevisionId: placementRevision.revisionId,
      placementTitleRu: placementRevision.displayTitleRu,
      placementRowCount: placementRevision.rowCount,
      restoredFullRevisionId: restoredFullRevision.revisionId,
      restoredFullTitleRu: restoredFullRevision.displayTitleRu,
      restoredFullRowCount: restoredFullRevision.rowCount,
      manualValuesPreserved: true,
    },
    applyAndApprove: {
      recalculateCount: 1,
      approvedRevisionId: approvedRevision.revisionId,
      approvedParentRevisionId: approvedRevision.parentRevisionId,
      historyBindsExactRevision: true,
      unverifiedPricesRemainAllowed: approvedRows.some((row) => row.unitPrice == null),
    },
    backendResponses,
  }, null, 2)}\n`, "utf8");
});
