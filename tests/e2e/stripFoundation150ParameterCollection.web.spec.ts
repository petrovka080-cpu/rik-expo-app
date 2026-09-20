import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page, type Response } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const BACKEND_ORIGIN = "http://127.0.0.1:8765";
const MASTER_SHA256 = "4F7EC5DA9C9262291AF11544433D96EF5466BA1ACF07288A327A3EC8FA2374C8";
const PROMPT = "Устройство монолитного железобетонного ленточного фундамента 150 метров";
const EVIDENCE_ROOT = path.resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a13-6-i15-foundation-150/02_WEB",
);
const CREDENTIALS = path.resolve(
  ".release-runtime/r551/runtime/local-developer/credentials.json",
);

type Json = Record<string, any>;

async function enterConsumer(page: Page): Promise<void> {
  await page.goto(new URL("/request", BASE_URL).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await expect(page.getByTestId("local-developer-review-banner")).toBeVisible({ timeout: 120_000 });
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const input = page.getByTestId("consumer-repair-problem-input");
    if (await input.isVisible().catch(() => false) && await input.isEditable().catch(() => false)) return;
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

async function consumerAuthorization(): Promise<string> {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS, "utf8")) as Json;
  const consumer = (credentials.principals as Json[]).find((entry) => entry.role === "consumer");
  if (!consumer?.email || !consumer?.password || !credentials.publishable_key) {
    throw new Error("I15_CONSUMER_CREDENTIALS_MISSING");
  }
  const response = await fetch(`${credentials.provider_url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: consumer.email, password: consumer.password }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json() as Json;
  if (!response.ok || !body.access_token) throw new Error(`I15_CONSUMER_LOGIN_${response.status}`);
  return `Bearer ${body.access_token}`;
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
        && registrationNotFoundRetries < 20
      ) {
        registrationNotFoundRetries += 1;
        await new Promise((resolve) => setTimeout(resolve, 100));
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
  const authorization = await consumerAuthorization();
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
  mark("CONSUMER_OPENED");
  await page.getByTestId("consumer-repair-problem-input").fill(PROMPT);
  await page.getByTestId("consumer-repair-prepare-draft").click();
  await expect(page.getByTestId("consumer-estimate-parameter-collection")).toBeVisible({ timeout: 120_000 });
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
  await expect(page.getByTestId("consumer-estimate-parameter-collection")).toBeVisible({ timeout: 120_000 });
  const restoredFilledToggle = page.getByTestId("request-estimate-filled-parameters-toggle");
  if (await restoredFilledToggle.isVisible().catch(() => false)) await restoredFilledToggle.click();
  await expect(page.getByTestId("editable-param-chip-total_axis_length_m")
    .getByTestId("editable-param-popover-input")).toHaveValue("150");
  mark("PARAMETER_COLLECTION_COLD_RELOAD_GREEN", { draftId });

  await fillNumber(page, "strip_width_m", "0.6");
  await fillNumber(page, "strip_height_m", "1.2");
  await expect(page.getByTestId("editable-param-batch-apply"))
    .toContainText("Применить и сформировать смету");
  await page.getByTestId("editable-param-batch-apply").click();

  await expect(page.getByTestId("request-estimate-missing-param-preparation_thickness_m"))
    .toBeVisible({ timeout: 120_000 });
  mark("SECOND_PARAMETER_STAGE_OPENED");
  await fillNumber(page, "preparation_thickness_m", "0.1");
  await fillNumber(page, "reinforcement_mass_t", "9");
  await fillNumber(page, "binding_wire_mass_kg", "108");
  await fillNumber(page, "formwork_transport_mass_t", "20");
  await choose(page, "groundworks_included", "false");
  await choose(page, "foundation_bedding_included", "false");
  await choose(page, "waterproofing_included", "false");
  await choose(page, "backfill_included", "false");

  const compilePromise = page.waitForResponse((response) =>
    response.url().endsWith("/jobs/compile") && response.request().method() === "POST", {
    timeout: 120_000,
  });
  const [compileResponse] = await Promise.all([
    compilePromise,
    page.getByTestId("editable-param-batch-apply").click(),
  ]);
  expect(compileResponse.status()).toBe(202);
  const initialRevision = await waitForRevision(authorization, await responseJson(compileResponse));
  expect(Number(initialRevision.parameters.total_axis_length_m)).toBe(150);
  expect(initialRevision.parameters.groundworks_included).toBe(false);
  await expect(page.getByTestId("request-estimate-items-total-count"))
    .toContainText("15", { timeout: 180_000 });
  await expect(page.getByTestId("request-estimate-parameter-status"))
    .toContainText("Обязательные параметры заполнены", { timeout: 120_000 });
  await expect(page.getByTestId("consumer-estimate-parameter-collection")).toHaveCount(0);
  expect(page.url()).toBe(draftUrl);
  mark("INITIAL_COMPILE_GREEN", { initialRevisionId: initialRevision.revisionId });

  await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page).toHaveURL(draftUrl);
  await expect(page.getByTestId("request-estimate-items-total-count"))
    .toContainText("15", { timeout: 180_000 });
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
  expect(editedRevision.parentRevisionId).toBe(initialRevision.revisionId);
  expect(Number(editedRevision.parameters.strip_width_m)).toBe(0.7);
  const editedRows = await rows(authorization, editedRevision.revisionId);
  expect(editedRows).toHaveLength(15);
  expect(Number(editedRows.find((row) => row.rowId === "main_concrete")?.quantity)).toBe(126);
  await expect(page.locator(`[id^="canonical-estimate-row-identity|"]`).first())
    .toBeVisible({ timeout: 180_000 });
  mark("EDIT_RECALCULATION_GREEN", { editedRevisionId: editedRevision.revisionId });

  await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page).toHaveURL(draftUrl);
  await expect(page.getByTestId("request-estimate-items-total-count"))
    .toContainText("15", { timeout: 180_000 });
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
  await expect(page.getByTestId("request-estimate-row-count"))
    .toContainText("15", { timeout: 180_000 });
  await expect(page.getByTestId("estimate-revision-timeline"))
    .toHaveAttribute("aria-label", /2-revisions--1-diffs/u);
  await expect(page.getByTestId("estimate-revision-diff-param-strip_width_m"))
    .toContainText(/0\.6.*0\.7/u);
  await expect(page.getByTestId("estimate-revision-diff-row-main_concrete"))
    .toContainText(/108.*126/u);
  await expect(page.getByTestId("estimate-current-revision-artifacts"))
    .toContainText(/PDF.*закупк.*актуальн/iu);
  mark("PDF_RETURN_GREEN");

  const approve = page.getByTestId("consumer-repair-approve").last();
  await expect(approve).toBeDisabled();
  await expect(approve).toContainText(/без цены 15/iu);
  mark("REVISION_HISTORY_GREEN_UNVERIFIED_PRICES_NOT_FABRICATED");

  await page.screenshot({ path: path.join(EVIDENCE_ROOT, "foundation-150-revision-history.png"), fullPage: true });
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
    approval: "CORRECTLY_BLOCKED_15_UNVERIFIED_PRICES",
    backendResponses,
  }, null, 2)}\n`, "utf8");
});
