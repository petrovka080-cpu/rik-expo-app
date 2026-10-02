import { createHash } from "node:crypto";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page, type Response } from "playwright";

import {
  NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
} from "../../src/lib/estimate/v4/domainFactory/professionalPhysicalNormApplicabilityV1";
import {
  STRIP_FOUNDATION_PROFESSIONAL_GOLD_INPUT_R2,
} from "../../src/lib/estimate/v4/stripFoundationProfessionalCompositionR2";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.s27-15.strip-foundation-full-web-acceptance.v1";
const ORIGIN = process.env.S2715_WEB_ORIGIN ?? "http://127.0.0.1:8101";
const BACKEND = process.env.S2715_BACKEND_ORIGIN ?? "http://127.0.0.1:8765";
const RELEASE_ID = "4cbbd414-48d6-5e1b-ae35-0db75e568eb1";
const SEARCH_RELEASE_ID = "43203007-2129-5862-a063-0f27d7b64a7b";
const CATALOG_ID = "canonical-work:expanded:strip_foundation";
const PROMPT = "Устройство монолитного железобетонного ленточного фундамента 150 метров";
const AUTH_STORAGE_KEY = "sb-127-auth-token";
const OUTPUT_ROOT = resolve(
  ".release-runtime/r568/s27-15/acceptance/web-strip-foundation-150-full",
);

const FULL_PARAMETERS = Object.freeze({
  ...STRIP_FOUNDATION_PROFESSIONAL_GOLD_INPUT_R2,
  total_axis_length_m: 150,
  strip_width_m: 0.8,
  strip_height_m: 2,
  concrete_order_allowance_percent: 8,
  product_profile_id: NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
  plan_volume_calculation_reference: "Приёмочная фикстура S27.15: КЖ, 150 м × 0,8 м × 2,0 м",
  mix_design_or_project_specification_reference: "Приёмочная фикстура S27.15: спецификация бетонной смеси 01",
  mixture_designation: "B25 W6 F150 P4",
  placement_location: "Лента по осям 1–12",
  contingency_selection_justification:
    "8% выбраны только для этой приёмочной фикстуры по схеме заказа; это не универсальная норма",
  delivery_schedule_and_truck_capacity: "Поставка миксерами по согласованному графику приёмочной фикстуры",
  producer_order_confirmation: "Подтверждение РБУ для приёмочной фикстуры S27.15",
  estimator_approval_reference: "Проверка сметчика для приёмочной фикстуры S27.15",
  preparation_thickness_m: 0.1,
  reinforcement_mass_t: 28.8,
  binding_wire_mass_kg: 345.6,
  formwork_transport_mass_t: 45,
  concrete_delivery_distance_km: 25,
  reinforcement_delivery_distance_km: 30,
  formwork_delivery_distance_km: 18,
  excavation_volume_m3: 540,
  foundation_bedding_volume_m3: 36,
  bedding_delivery_distance_km: 20,
  waterproofing_area_m2: 600,
  backfill_volume_m3: 210,
  mechanical_coupler_designation: "Резьбовая муфта Ø20 по ведомости КЖ-15",
  mechanical_coupler_quantity_piece: 144,
  lifting_equipment_designation: "Автокран 25 т по ППРк-01",
  lifting_machine_h: 24,
  construction_joint_waterstop_specification: "Гидрошпонка ПВХ 240 мм по узлу КЖ-17",
  construction_joint_waterstop_length_m: 60,
  construction_joint_installation_worker_h: 24,
  horizontal_cutoff_waterproofing_designation:
    "Битумно-полимерная рулонная отсечка 4 мм по узлу КЖ-21",
  horizontal_cutoff_waterproofing_area_m2: 120,
  formwork_tie_consumables_designation: "Трубка ПВХ, конусы и заглушки стяжек Ø22",
  formwork_tie_consumables_quantity_piece: 600,
  excavation_support_designation: "Инвентарное щитовое крепление траншеи по ППР-ЗР-01",
  excavation_support_area_m2: 900,
  excavation_dewatering_equipment_designation: "Дренажный насос 20 м³/ч по ППР-ВО-01",
  excavation_dewatering_machine_h: 40,
  site_cleanup_worker_h: 36,
  non_soil_waste_mass_t: 3.5,
  non_soil_waste_packaging_designation:
    "Мешок полипропиленовый 55 л для строительных отходов",
  non_soil_waste_packaging_quantity_piece: 70,
});

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S2715_FOUNDATION_WEB:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function progress(stage: string, details: Json = {}): void {
  process.stdout.write(`${JSON.stringify({ progress: "S2715_FOUNDATION_WEB", stage, ...details })}\n`);
}

async function json(response: Response): Promise<Json> {
  return response.json().catch(() => ({})) as Promise<Json>;
}

async function api(
  authorization: string,
  route: string,
  init: RequestInit = {},
): Promise<Json> {
  const response = await fetch(
    `${BACKEND}/canonical-estimate/${route.replace(/^\/+/, "")}`,
    {
      ...init,
      headers: {
        Authorization: authorization,
        ...(init.body == null ? {} : { "Content-Type": "application/json" }),
        ...init.headers,
      },
      signal: AbortSignal.timeout(180_000),
    },
  );
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok, `API_${response.status}:${route}:${JSON.stringify(body).slice(0, 2_000)}`);
  return body;
}

async function waitForRevision(authorization: string, jobId: string): Promise<Json> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await api(authorization, `jobs/${jobId}`);
    if (job.status === "succeeded" && job.resultRevisionId) {
      return api(authorization, `revisions/${job.resultRevisionId}`);
    }
    invariant(!["failed", "cancelled"].includes(String(job.status)),
      `JOB_${job.status}:${job.errorCode ?? "UNKNOWN"}`);
    await new Promise((accept) => setTimeout(accept, 100));
  }
  throw new Error(`S2715_FOUNDATION_WEB:JOB_TIMEOUT:${jobId}`);
}

async function allRows(authorization: string, revisionId: string): Promise<Json[]> {
  const payload = await api(authorization, `revisions/${revisionId}/rows?limit=200`);
  return Array.isArray(payload.rows) ? payload.rows as Json[] : [];
}

async function browserAuthorization(page: Page): Promise<string> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const authorization = await page.evaluate((storageKey) => {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return "";
      try {
        const session = JSON.parse(raw) as Json;
        return session?.user?.app_metadata?.role === "consumer"
          ? `Bearer ${String(session?.access_token ?? "")}`
          : "";
      } catch {
        return "";
      }
    }, AUTH_STORAGE_KEY);
    if (authorization.length > 27) return authorization;
    await page.waitForTimeout(100);
  }
  throw new Error("S2715_FOUNDATION_WEB:CONSUMER_AUTHORIZATION_MISSING");
}

async function loginConsumer(page: Page): Promise<string> {
  const login = new URL("/auth/login", ORIGIN);
  login.searchParams.set("returnTo", "/request");
  await page.goto(login.toString(), { waitUntil: "domcontentloaded", timeout: 180_000 });
  try {
    await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 120_000 });
  } catch (error) {
    const screenshot = resolve(OUTPUT_ROOT, "LOGIN_ROUTE_BLOCKED.png");
    await page.screenshot({ path: screenshot, fullPage: true });
    throw new Error(`${String(error)}:URL=${page.url()}:UI=${
      (await page.locator("body").innerText()).replace(/\s+/gu, " ").slice(0, 8_000)
    }:SCREENSHOT=${screenshot}`);
  }
  const loginButton = page.getByTestId("auth.login.local-consumer");
  await loginButton.waitFor({ state: "visible", timeout: 60_000 });
  await loginButton.click();
  await page.waitForURL(new URL("/request", ORIGIN).toString(), { timeout: 60_000 });
  return browserAuthorization(page);
}

async function dismissPreview(page: Page): Promise<void> {
  const preview = page.getByTestId("consumer-estimate-meaningful-preview");
  await preview.waitFor({ state: "visible", timeout: 120_000 }).catch(() => undefined);
  if (!await preview.isVisible().catch(() => false)) return;
  const open = page.getByTestId("consumer-estimate-open-full-estimate");
  await open.waitFor({ state: "visible", timeout: 60_000 });
  await open.click();
  await preview.waitFor({ state: "detached", timeout: 60_000 });
}

async function expandPositions(page: Page): Promise<void> {
  const count = page.getByTestId("request-estimate-items-total-count");
  if (await count.isVisible().catch(() => false)) return;
  const toggle = page.getByTestId("request-estimate-positions-toggle");
  await toggle.waitFor({ state: "visible", timeout: 60_000 });
  await toggle.click();
  await count.waitFor({ state: "visible", timeout: 60_000 });
}

async function openRevision(page: Page, revisionId: string): Promise<void> {
  const url = new URL("/request", ORIGIN);
  url.searchParams.set("canonicalRevisionId", revisionId);
  await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
  await dismissPreview(page);
  await expandPositions(page);
}

async function showFilledParameter(page: Page, parameterId: string): Promise<void> {
  const chip = page.getByTestId(`editable-param-chip-${parameterId}`);
  if (await chip.isVisible().catch(() => false)) return;
  const panel = page.getByTestId("request-estimate-parameter-panel");
  if (!await panel.isVisible().catch(() => false)) {
    await page.getByTestId("request-estimate-parameters-toggle").click();
    await panel.waitFor({ state: "visible", timeout: 60_000 });
  }
  const filled = page.getByTestId("request-estimate-filled-parameters-toggle");
  if (await filled.isVisible().catch(() => false)) await filled.click();
  await chip.waitFor({ state: "visible", timeout: 60_000 });
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1_000 } });
  const page = await context.newPage();
  const backendRequests: Json[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("response", (response) => {
    if (!response.url().startsWith(BACKEND)) return;
    backendRequests.push({
      method: response.request().method(),
      path: new URL(response.url()).pathname,
      status: response.status(),
    });
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 2_000));
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    let authorization = await loginConsumer(page);
    const runtime = await api(authorization, "runtime-manifest");
    invariant(runtime.compatibilityTuple?.definitionReleaseId === RELEASE_ID
      && runtime.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID,
    "RUNTIME_RELEASE_PAIR_RED");
    progress("RUNTIME_AND_LOGIN_GREEN");

    const draftInput = page.getByTestId("consumer-repair-problem-input");
    const deleteDraft = page.getByTestId("consumer-repair-delete-draft");
    if (await deleteDraft.isVisible().catch(() => false)) {
      await deleteDraft.click();
      await page.getByTestId("consumer-repair-delete-confirm").click();
      await deleteDraft.waitFor({ state: "detached", timeout: 60_000 });
    }
    await draftInput.fill(PROMPT);
    const compilePromise = page.waitForResponse((response) =>
      response.url().endsWith("/jobs/compile") && response.request().method() === "POST",
    { timeout: 120_000 });
    await page.getByTestId("consumer-repair-prepare-draft").click();
    const compileResponse = await compilePromise;
    const compileAccepted = await json(compileResponse);
    invariant(compileResponse.status() === 202, `COMPILE_HTTP_${compileResponse.status()}`);
    const rootRevision = await waitForRevision(authorization, String(compileAccepted.jobId ?? ""));
    invariant(rootRevision.catalogId === CATALOG_ID && rootRevision.releaseId === RELEASE_ID,
      `ORDINARY_SEARCH_ROUTING_RED:${rootRevision.catalogId}:${rootRevision.releaseId}`);
    invariant(Number(rootRevision.parameters?.total_axis_length_m) === 150,
      "PROMPT_GEOMETRY_NOT_RECOGNIZED");
    progress("ORDINARY_SEARCH_AND_PRELIMINARY_REVISION_GREEN", {
      rootRevisionId: rootRevision.revisionId,
      preliminaryNeedCount: rootRevision.preliminaryNeeds?.length ?? 0,
    });

    const fullAccepted = await api(authorization, "jobs/recalculate", {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: `s2715-foundation-full-${Date.now()}`,
        catalogId: CATALOG_ID,
        parentRevisionId: rootRevision.revisionId,
        sourceRequestText: rootRevision.sourceRequestText,
        primaryMeasureParameterId: rootRevision.primaryMeasureParameterId,
        parameters: FULL_PARAMETERS,
        currencyCode: rootRevision.currencyCode,
        rowOverrides: rootRevision.amendmentContract?.rowOverrides ?? {},
        customRows: rootRevision.amendmentContract?.customRows ?? [],
      }),
    });
    const fullRevision = await waitForRevision(authorization, String(fullAccepted.jobId ?? ""));
    const fullRows = await allRows(authorization, fullRevision.revisionId);
    const quantity = (rowId: string) => Number(fullRows.find((row) => row.rowId === rowId)?.quantity);
    invariant(fullRevision.parentRevisionId === rootRevision.revisionId, "FULL_REVISION_LINEAGE_RED");
    invariant((fullRevision.preliminaryNeeds ?? []).length === 0, "FULL_PRELIMINARY_NEEDS_RED");
    invariant(fullRows.length === 63 && Number(fullRevision.rowCount) === 63,
      `FULL_ROW_COUNT_${fullRows.length}`);
    invariant(quantity("concrete_placement") === 240 && quantity("main_concrete") === 259.2,
      "FULL_QUANTITY_CHAIN_RED");
    const requiredRows = [
      "work:foundation:axis-setting-out-control",
      "excavation_work",
      "bedding_sand",
      "preparation_concrete",
      "formwork_system",
      "material:formwork:release-agent",
      "reinforcement",
      "material:reinforcement:spacer-chairs",
      "main_concrete",
      "concrete_placement",
      "service:concrete:acceptance-control",
      "curing_membrane",
      "bituminous_waterproofing",
      "material:waterproofing:system-primer",
      "backfill_work",
      "service:foundation:as-built-survey",
      "work:foundation:site-cleanup",
      "delivery:foundation:construction-waste-haul",
    ];
    invariant(requiredRows.every((rowId) => fullRows.some((row) => row.rowId === rowId)),
      "FULL_REQUIRED_TECHNOLOGY_ROW_MISSING");
    invariant(fullRows.every((row) => Number(row.quantity) > 0), "FULL_NON_POSITIVE_QUANTITY");
    const pricedRows = fullRows.filter((row) => row.unitPrice != null);
    const unpricedRows = fullRows.filter((row) => row.unitPrice == null);
    invariant(pricedRows.length > 0 && unpricedRows.length > 0, "HONEST_PARTIAL_PRICE_STATE_RED");
    progress("FULL_63_ROW_REVISION_GREEN", {
      fullRevisionId: fullRevision.revisionId,
      pricedRowCount: pricedRows.length,
      unpricedRowCount: unpricedRows.length,
    });

    await openRevision(page, fullRevision.revisionId);
    const countLabel = await page.getByTestId("request-estimate-items-total-count").innerText();
    invariant(countLabel.includes("63"), `WEB_FULL_ROW_COUNT_LABEL_RED:${countLabel}`);
    const visibleTitles = await page.locator('[data-testid^="consumer-repair-item-title-"]').allInnerTexts();
    invariant(visibleTitles.length === 63, `WEB_VISIBLE_ROW_DENOMINATOR_${visibleTitles.length}`);
    invariant(visibleTitles.some((title) => title.includes("класс по рабочей документации"))
      && visibleTitles.some((title) => title.includes("проектной раскладке"))
      && visibleTitles.some((title) => ["B25", "W6", "F150", "P4"].every(
        (specification) => title.includes(specification),
      )),
    "WEB_USER_FACING_NAMES_RED");
    const fullScreenshot = resolve(OUTPUT_ROOT, "01-full-foundation-63-rows.png");
    await page.screenshot({ path: fullScreenshot, fullPage: true });

    await showFilledParameter(page, "strip_width_m");
    const widthInput = page.getByTestId("editable-param-chip-strip_width_m")
      .getByTestId("editable-param-popover-input");
    await widthInput.fill("0.85");
    const editPromise = page.waitForResponse((response) =>
      response.url().endsWith("/jobs/recalculate") && response.request().method() === "POST",
    { timeout: 120_000 });
    await page.getByTestId("editable-param-batch-apply").click();
    const editResponse = await editPromise;
    authorization = await browserAuthorization(page);
    const editedRevision = await waitForRevision(authorization, String((await json(editResponse)).jobId ?? ""));
    const editedRows = await allRows(authorization, editedRevision.revisionId);
    invariant(editedRevision.parentRevisionId === fullRevision.revisionId, "PARAMETER_EDIT_LINEAGE_RED");
    invariant(Number(editedRevision.parameters?.strip_width_m) === 0.85, "PARAMETER_EDIT_VALUE_RED");
    invariant(Number(editedRows.find((row) => row.rowId === "main_concrete")?.quantity) === 275.4,
      "PARAMETER_EDIT_FORMULA_RED");
    invariant(editedRows.length === 63, "PARAMETER_EDIT_ROW_LOSS");
    progress("WEB_PARAMETER_EDIT_APPLY_GREEN", { editedRevisionId: editedRevision.revisionId });

    await openRevision(page, editedRevision.revisionId);
    const bindingWire = page.locator('[id$="|binding_wire"]');
    await bindingWire.waitFor({ state: "visible", timeout: 60_000 });
    const unitPrice = bindingWire.locator('[data-testid^="consumer-repair-item-unit-price-input-"]');
    await unitPrice.fill("123.45");
    await unitPrice.press("Tab");
    const rowApplyPromise = page.waitForResponse((response) =>
      response.url().endsWith("/jobs/recalculate") && response.request().method() === "POST",
    { timeout: 120_000 });
    await page.getByTestId("request-estimate-row-batch-apply").click();
    const rowApplyResponse = await rowApplyPromise;
    authorization = await browserAuthorization(page);
    const pricedRevision = await waitForRevision(
      authorization,
      String((await json(rowApplyResponse)).jobId ?? ""),
    );
    const finalRows = await allRows(authorization, pricedRevision.revisionId);
    const finalBindingWire = finalRows.find((row) => row.rowId === "binding_wire");
    invariant(pricedRevision.parentRevisionId === editedRevision.revisionId, "ROW_APPLY_LINEAGE_RED");
    invariant(Number(finalBindingWire?.unitPrice) === 123.45, "ROW_APPLY_PRICE_RED");
    invariant(finalRows.length === 63, "ROW_APPLY_ROW_LOSS");
    progress("WEB_ROW_PRICE_ONE_APPLY_GREEN", { pricedRevisionId: pricedRevision.revisionId });

    await openRevision(page, pricedRevision.revisionId);
    const restoredPrice = page.locator('[id$="|binding_wire"]')
      .locator('[data-testid^="consumer-repair-item-unit-price-input-"]');
    invariant(await restoredPrice.inputValue() === "123.45", "COLD_REOPEN_PRICE_RED");
    const timeline = page.getByTestId("estimate-revision-timeline");
    invariant(await timeline.isVisible().catch(() => false), "REVISION_TIMELINE_MISSING");

    await page.getByTestId("consumer-estimate-open-procurement").click();
    await page.getByTestId("consumer-estimate-procurement-list")
      .waitFor({ state: "visible", timeout: 60_000 });
    const procurementText = await page.getByTestId("consumer-estimate-procurement-list").innerText();
    invariant(/бетон|арматур|опалуб/iu.test(procurementText), "PROCUREMENT_COMPOSITION_RED");

    const pdfResponsePromise = page.waitForResponse((response) =>
      response.url().startsWith(`${BACKEND}/canonical-estimate/artifact-files/`)
        && response.status() === 200,
    { timeout: 180_000 });
    await page.getByTestId("request-estimate-progressive-actions")
      .getByTestId("consumer-estimate-make-pdf")
      .click();
    await page.waitForURL(/\/pdf-viewer\?sessionId=/u, { timeout: 180_000 });
    const pdfResponse = await pdfResponsePromise;
    invariant(String(pdfResponse.headers()["content-type"]).includes("application/pdf"),
      "PDF_CONTENT_TYPE_RED");
    await page.getByTestId("pdf-viewer-web-iframe")
      .waitFor({ state: "visible", timeout: 120_000 });
    const pdfScreenshot = resolve(OUTPUT_ROOT, "02-full-foundation-pdf.png");
    await page.screenshot({ path: pdfScreenshot, fullPage: true });
    progress("PROCUREMENT_PDF_HISTORY_GREEN");

    const receipt = {
      schemaVersion: `${CONTRACT}.receipt.v1`,
      capturedAt: new Date().toISOString(),
      status: "GREEN_S27_15_FULL_FOUNDATION_WEB_CREATE_EDIT_SAVE_REOPEN_PROCUREMENT_PDF",
      runtime: {
        definitionReleaseId: RELEASE_ID,
        searchReleaseId: SEARCH_RELEASE_ID,
        origin: ORIGIN,
        backend: BACKEND,
      },
      ordinarySearch: { prompt: PROMPT, catalogId: rootRevision.catalogId },
      revisions: {
        rootRevisionId: rootRevision.revisionId,
        fullRevisionId: fullRevision.revisionId,
        editedRevisionId: editedRevision.revisionId,
        pricedRevisionId: pricedRevision.revisionId,
      },
      fullComposition: {
        rowCount: fullRows.length,
        requiredRows,
        concreteNetM3: quantity("concrete_placement"),
        concreteOrderM3: quantity("main_concrete"),
        selectedAllowancePercent: FULL_PARAMETERS.concrete_order_allowance_percent,
        pricedRowCount: pricedRows.length,
        unpricedRowCount: unpricedRows.length,
      },
      editAndPersistence: {
        widthBeforeM: 0.8,
        widthAfterM: editedRevision.parameters.strip_width_m,
        editedConcreteOrderM3: editedRows.find((row) => row.rowId === "main_concrete")?.quantity,
        manualBindingWireUnitPrice: finalBindingWire?.unitPrice,
        rowsPreservedAfterEdits: finalRows.length,
        coldReopen: "GREEN",
        history: "GREEN",
      },
      procurement: "GREEN",
      pdf: "GREEN",
      screenshots: { fullScreenshot, pdfScreenshot },
      backendRequests,
      consoleErrors,
      pageErrors,
      productionAccessed: false,
      activationPerformed: false,
      deployPerformed: false,
    };
    const sealed = { ...receipt, receiptSha256: sha256(JSON.stringify(receipt)) };
    atomicJson(resolve(OUTPUT_ROOT, "acceptance.json"), sealed);
    process.stdout.write(`${JSON.stringify(sealed, null, 2)}\n`);
  } finally {
    await context.close();
    await browser.close();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
