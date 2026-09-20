import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page, type Response } from "playwright";
import { Client } from "pg";

import { canonicalApprovedBaselineRuntimeParameters } from "../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import {
  buildAllBatch003R56CanonicalSuccessorDefinitions,
} from "../estimate/r5/batch003R56SharedCoreProjection";
import { batch003R56FixtureValues } from "../estimate/r5/batch003R56Fixtures";
import { buildBatch001DrywallSuccessorR3 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadSuccessorR3";
import { batch001DrywallGoldFixtureValuesR3 } from "../estimate/batch001008R3/batch001DrywallGoldFixtureR3";

type Json = Record<string, any>;

const ORIGIN = "http://127.0.0.1:8081";
const BACKEND = "http://127.0.0.1:8765";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const RELEASE_ID = process.env.R4A13_DEFINITION_RELEASE_ID
  ?? "e70e42a5-8fa0-59cb-95f0-5b4e9aca45f9";
const SEARCH_RELEASE_ID = process.env.R4A13_SEARCH_RELEASE_ID
  ?? "8c987d97-ea3a-551a-bc2a-2a87aee86651";
const OUTPUT_ROOT = resolve(
  process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r4a13-4/platform-core-global/web-current",
);
const OUTPUT = resolve(OUTPUT_ROOT, "12_complete_editable_workflow.json");
const BACKEND_RUNTIME_RECEIPT_PATH = resolve(process.env.R4A13_BACKEND_RUNTIME_RECEIPT_PATH
  ?? ".release-runtime/r568/runtime/local-developer-current/backend.json");
const METRO_RUNTIME_RECEIPT_PATH = resolve(process.env.R4A13_METRO_RUNTIME_RECEIPT_PATH
  ?? ".release-runtime/r568/runtime/local-developer-current/metro.json");
const BUNDLE_PATH = "/index.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable";
const OLD_BAD_REVISION_ID = "3652c757-dac5-4f65-bbc6-bf179dd4eed3";
const PROTECTED_FILES = [
  "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_api34_results.json",
  "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_screenshots.json",
  "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_ui_dumps.json",
] as const;

const CASES = [
  {
    id: "W12_PREPARE_500_M2",
    catalogId: "canonical-work:base:drywall_ceiling_interior_drywall_ceiling_prepare_large_area",
    prompt: "подготовка потолка из гипсокартона на большой площади 500 кв метров",
    expectedCompositionCount: 27,
    fullExpectedRowCount: 15,
  },
  {
    id: "FRAME_FULL_50_BULKHEAD",
    catalogId: "canonical-work:base:drywall_ceiling_interior_bulkhead_frame_standard",
    prompt: "устройство каркаса потолочного короба из гипсокартона 50 кв метров",
    expectedCompositionCount: 16,
    fullExpectedRowCount: 16,
  },
  {
    id: "FLAT_FRAME_FULL_158",
    catalogId: "canonical-work:base:drywall_ceiling_interior_drywall_ceiling_frame_large_area",
    prompt: "устройство каркаса плоского потолка из гипсокартона на большой площади 158 кв метров",
    expectedCompositionCount: 31,
    fullExpectedRowCount: 15,
  },
  {
    id: "ASPHALT_DRAIN_PRELIMINARY",
    catalogId: "canonical-work:base:paving_roads_landscape_interior_asphalt_drain_large_area",
    prompt: "Устройство системы водоотвода асфальтированного покрытия",
    expectedCompositionCount: 11,
    fullExpectedRowCount: null,
  },
] as const;

const OLD_BAD_TITLES = new Set([
  "Ремонтный состав для локальных дефектов",
  "Совместимая грунтовка основания",
  "Подготовка основания плоского потолка",
  "Единая входящая доставка материалов по подтвержденной массе и маршруту",
  "Единый вывоз подтвержденной массы строительных отходов",
  "Оборудование доступа к рабочей зоне по проектному ППР",
]);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`R4A13_WEB_PROOF:${code}`);
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

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, "")) as Json;
}

async function json(response: Response): Promise<Json> {
  return response.json().catch(() => ({})) as Promise<Json>;
}

async function api(authorization: string, path: string): Promise<Json> {
  const response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    headers: { Authorization: authorization },
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.status === 200, `API_${response.status}:${path}:${String(body.error?.code ?? "")}`);
  return body;
}

async function apiPost(
  authorization: string,
  path: string,
  body: Json,
  expectedStatus = 202,
): Promise<Json> {
  const response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const responseBody = await response.json().catch(() => ({})) as Json;
  invariant(
    response.status === expectedStatus,
    `API_POST_${response.status}:${path}:${String(responseBody.error?.code ?? "")}`,
  );
  return responseBody;
}

function fullFixtureParameters(input: {
  catalogId: string;
  parameterSchema: Json[];
  rootParameters: Json;
}): Json {
  const sourceCatalogId = input.catalogId.replace(/^canonical-work:base:/u, "");
  let fixture: Readonly<Record<string, string | number | boolean>>;
  if (sourceCatalogId === "drywall_ceiling_interior_bulkhead_frame_standard") {
    const definition = buildBatch001DrywallSuccessorR3(sourceCatalogId);
    fixture = {
      ...batch001DrywallGoldFixtureValuesR3(definition),
      area_m2: 50,
      horizontal_face_area_m2: 30,
      vertical_face_length_m: 20,
      vertical_face_count: 2,
      bulkhead_drop_height_m: 0.5,
      end_face_area_m2: 0,
      return_face_area_m2: 0,
      opening_area_m2: 0,
      exact_system_route: "Проектный узел короба: ПП 60×27×0,6 мм и ПН 28×27×0,6 мм",
      delivery_included_by_supplier: false,
    };
  } else {
    const definition = buildAllBatch003R56CanonicalSuccessorDefinitions()
      .find((candidate) => candidate.catalogId === sourceCatalogId);
    invariant(definition, `FULL_FIXTURE_DEFINITION_MISSING:${sourceCatalogId}`);
    fixture = {
      ...batch003R56FixtureValues(definition),
      area_m2: sourceCatalogId.includes("prepare_large_area") ? 500 : 158,
      ...(sourceCatalogId.includes("prepare_large_area") ? {
        preparation_operation: "THIN_FINISH_PASTE",
        repair_requirement_state: "NOT_REQUIRED",
        primer_requirement_state: "NOT_REQUIRED_BY_SELECTED_SYSTEM",
        finish_product_reference: "Финишная шпаклёвка КНАУФ-Ротбанд Паста Профи",
        finish_paste_consumption_kg_m2: 0.48,
        finish_paste_order_reserve_percent: 5,
        finish_paste_package_kg: 18,
        finish_abrasive_product_reference: "Абразивный круг P240 для выбранной шлифовальной машины",
        finish_abrasive_productivity_m2_per_item: 50,
        elevated_work_requirement_state: "NOT_REQUIRED",
        fall_protection_requirement_state: "NOT_REQUIRED",
      } : {
        frame_quantity_basis: "P113_TYPICAL_PRELIMINARY",
        room_length_m: 15.8,
        room_width_m: 10,
        perimeter_sealing_required: true,
      }),
    };
  }
  const result: Json = { ...input.rootParameters };
  for (const parameter of input.parameterSchema) {
    const parameterId = String(parameter.parameterId ?? "");
    if (!parameterId) continue;
    const value = fixture[parameterId] ?? parameter.defaultValue;
    if (value != null) {
      result[parameterId] = parameter.valueType === "text"
        && typeof value === "string"
        && (/^PROJECT:/u.test(value) || /(?:REFERENCE|CERTIFICATE|PASSPORT)-\d+$/iu.test(value))
        ? `\u0412\u044b\u0431\u0440\u0430\u043d\u043e \u0434\u043b\u044f \u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\u043d\u043e\u0433\u043e \u043f\u0440\u043e\u0435\u043a\u0442\u0430: ${String(parameter.titleRu ?? parameterId)}`
        : value;
    }
  }
  return result;
}

function exactExampleAudit(caseId: typeof CASES[number]["id"], rows: Json[], parameters: Json): Json {
  const bySuffix = (suffix: string): Json | undefined => rows.find((row) =>
    String(row.rowId ?? "").endsWith(`:${suffix}`)
  );
  const quantity = (suffix: string, expected: number): Json => {
    const row = bySuffix(suffix);
    invariant(row != null && Math.abs(Number(row.quantity) - expected) < 0.000001,
      `${caseId}:EXACT_QUANTITY_${suffix}_${String(row?.quantity)}_EXPECTED_${expected}`);
    return row;
  };
  if (caseId === "W12_PREPARE_500_M2") {
    const paste = quantity("finish_paste", 252);
    const abrasive = quantity("finish_abrasive", 10);
    quantity("finish_paste_application", 500);
    quantity("finish_sanding", 500);
    quantity("post_sanding_dust_removal", 500);
    invariant(paste.titleRu === "Финишная шпаклёвка КНАУФ-Ротбанд Паста Профи",
      `${caseId}:EXACT_FINISH_PASTE_TITLE_DRIFT`);
    invariant(abrasive.titleRu === "Абразивный круг P240 для выбранной шлифовальной машины",
      `${caseId}:EXACT_ABRASIVE_TITLE_DRIFT`);
    invariant(!rows.some((row) => /:(?:primer|primer_application|joint_compound|joint_tape)$/u.test(String(row.rowId))),
      `${caseId}:UNSELECTED_PRIMER_OR_REPAIR_ROW_PRESENT`);
    const packageCount = Math.ceil(Number(paste.quantity) / Number(parameters.finish_paste_package_kg));
    invariant(packageCount === 14, `${caseId}:FINISH_PASTE_PACKAGE_COUNT_${packageCount}_EXPECTED_14`);
    return { kind: "THIN_FINISH_PASTE", pasteKg: 252, packageKg: 18, packageCount, abrasiveItems: 10 };
  }
  if (caseId === "FLAT_FRAME_FULL_158") {
    const expected: Readonly<Record<string, number>> = {
      p113_ceiling_profile: 458.2,
      p113_perimeter_track: 51.6,
      p113_profile_extensions: 32,
      p113_single_level_connectors: 269,
      p113_direct_hangers: 111,
      p113_hanger_anchors: 111,
      p113_ln9_screws: 222,
      p113_perimeter_fasteners: 104,
      p113_sealing_tape: 51.6,
    };
    for (const [suffix, expectedQuantity] of Object.entries(expected)) quantity(suffix, expectedQuantity);
    invariant(!rows.some((row) => String(row.rowId).includes(":material:")),
      `${caseId}:PROJECT_TAKEOFF_MATERIAL_BRANCH_PRESENT`);
    return { kind: "P113_TYPICAL_PRELIMINARY", areaM2: 158, roomLengthM: 15.8, roomWidthM: 10, expected };
  }
  if (caseId === "FRAME_FULL_50_BULKHEAD") {
    quantity("work:install_metal_frame", 50);
    const exactRoute = String(parameters.exact_system_route ?? "");
    const materials = rows.filter((row) => row.category === "material");
    invariant(exactRoute.length > 0 && materials.length > 0
      && materials.every((row) => String(row.titleRu).endsWith(` — ${exactRoute}`)),
    `${caseId}:PROJECT_SYSTEM_ROUTE_TITLE_DRIFT`);
    invariant(!rows.some((row) => /лист.*гипс|шпакл[её]в|обшив|окраск/iu.test(String(row.titleRu))),
      `${caseId}:CLADDING_SCOPE_POLLUTION`);
    return { kind: "BULKHEAD_DEVELOPED_GEOMETRY", horizontalFaceAreaM2: 30, developedWorkAreaM2: 50, exactRoute };
  }
  return { kind: "NOT_APPLICABLE" };
}

async function waitForJobRevision(authorization: string, jobId: string): Promise<string> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await api(authorization, `jobs/${jobId}`);
    if (job.status === "succeeded" && typeof job.resultRevisionId === "string") {
      return job.resultRevisionId;
    }
    invariant(!["failed", "cancelled"].includes(String(job.status)),
      `JOB_${String(job.status)}:${String(job.errorCode ?? "UNKNOWN")}`);
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`R4A13_WEB_PROOF:JOB_TIMEOUT:${jobId}`);
}

async function enterConsumer(page: Page): Promise<void> {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (await page.getByTestId("consumer-repair-problem-input").isVisible().catch(() => false)) return;
    const ownerLogin = page.getByTestId("local-developer-director-login");
    if (await ownerLogin.isVisible().catch(() => false)
      && await ownerLogin.isEnabled().catch(() => false)) {
      await ownerLogin.click({ timeout: 2_000 }).catch(() => undefined);
    } else {
      const login = page.getByTestId("auth.login.local-consumer")
        .or(page.getByTestId("protected-identity-local-consumer-login")).first();
      if (await login.isVisible().catch(() => false)
        && await login.isEnabled().catch(() => false)) {
        await login.click({ timeout: 2_000 }).catch(() => undefined);
      }
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`R4A13_WEB_PROOF:CONSUMER_ROUTE_NOT_READY:${(await page.locator("body").innerText()).slice(0, 2_000)}`);
}

async function openFullEstimateAfterMeaningfulPreview(
  page: Page,
  waitForPreview = false,
): Promise<void> {
  const preview = page.getByTestId("consumer-estimate-meaningful-preview");
  if (!await preview.isVisible().catch(() => false)) {
    if (!waitForPreview) return;
    const appeared = await preview.waitFor({ state: "visible", timeout: 120_000 })
      .then(() => true, () => false);
    if (!appeared) return;
  }
  const open = preview.getByTestId("consumer-estimate-open-full-estimate");
  await open.waitFor({ state: "visible", timeout: 120_000 });
  await page.waitForFunction(() => {
    const button = document.querySelector(
      '[data-testid="consumer-estimate-open-full-estimate"]',
    ) as HTMLButtonElement | null;
    return Boolean(button && !button.disabled && button.getAttribute("aria-disabled") !== "true");
  }, undefined, { timeout: 120_000 });
  await open.click();
  await preview.waitFor({ state: "hidden", timeout: 120_000 });
}

async function ensureEstimatePositionsVisible(page: Page): Promise<void> {
  await openFullEstimateAfterMeaningfulPreview(page);
  const total = page.getByTestId("request-estimate-items-total-count");
  if (await total.isVisible().catch(() => false)) return;
  const toggle = page.getByTestId("request-estimate-positions-toggle");
  await toggle.waitFor({ state: "visible", timeout: 60_000 });
  if (/Показать позиции/iu.test(await toggle.innerText())) await toggle.click();
  await total.waitFor({ state: "visible", timeout: 60_000 });
}

async function allRows(authorization: string, revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const body = await api(authorization, `revisions/${revisionId}/rows?${query.toString()}`);
    rows.push(...(Array.isArray(body.rows) ? body.rows : []));
    cursor = String(body.nextCursor ?? "");
  } while (cursor);
  return rows;
}

function catalogProjection(item: Json): Json {
  const schema = Array.isArray(item.parameterSchema) ? item.parameterSchema as Json[] : [];
  return {
    catalogId: item.catalogId,
    releaseId: item.releaseId,
    definitionVersion: item.definitionVersion,
    titleRu: item.titleRu,
    estimateReady: item.estimateReady,
    parameterCount: schema.length,
    nonNullDefaults: schema
      .filter((parameter) => parameter.defaultValue != null)
      .map((parameter) => ({ parameterId: parameter.parameterId, defaultValue: parameter.defaultValue })),
    preliminaryParameterIds: schema
      .filter((parameter) => parameter.preliminaryCompilationAllowed === true)
      .map((parameter) => parameter.parameterId),
  };
}

async function runCase(page: Page, spec: typeof CASES[number]): Promise<Json> {
  const currentScenarioPrompt = spec.id === "ASPHALT_DRAIN_PRELIMINARY"
    ? "\u041c\u043e\u043d\u0442\u0430\u0436 \u0432\u043e\u0434\u043e\u043e\u0442\u0432\u043e\u0434\u043d\u043e\u0433\u043e \u043b\u043e\u0442\u043a\u0430 \u0441 \u0440\u0435\u0448\u0451\u0442\u043a\u043e\u0439 \u0434\u043b\u0438\u043d\u043e\u0439 25 \u043c\u0435\u0442\u0440\u043e\u0432"
    : spec.prompt;
  const prompt = String(process.env.R4A13_PROMPT_OVERRIDE ?? currentScenarioPrompt).trim()
    || currentScenarioPrompt;
  const expectedCompositionCount = Number(
    process.env.R4A13_EXPECTED_COMPOSITION_COUNT ?? spec.expectedCompositionCount,
  );
  const fullExpectedRowCount = Number(
    process.env.R4A13_FULL_EXPECTED_ROW_COUNT ?? spec.fullExpectedRowCount ?? expectedCompositionCount,
  );
  invariant(Number.isSafeInteger(expectedCompositionCount) && expectedCompositionCount > 0,
    `${spec.id}:INVALID_EXPECTED_COMPOSITION_COUNT`);
  invariant(Number.isSafeInteger(fullExpectedRowCount) && fullExpectedRowCount > 0,
    `${spec.id}:INVALID_FULL_EXPECTED_ROW_COUNT`);
  let authorization = "";
  const backendRequests: Json[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(`${BACKEND}/`)) return;
    const header = request.headers().authorization ?? "";
    if (header.startsWith("Bearer ")) authorization = header;
  });
  page.on("response", (response) => {
    if (!response.url().startsWith(`${BACKEND}/`)) return;
    backendRequests.push({
      method: response.request().method(),
      path: new URL(response.url()).pathname,
      status: response.status(),
      requestId: response.headers()["x-request-id"] ?? null,
    });
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 1_000));
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    requestFailures.push(`${request.method()} ${new URL(request.url()).pathname} ${request.failure()?.errorText ?? ""}`);
  });

  await page.goto(`${ORIGIN}/request?r4a13=${spec.id}-${Date.now()}`, {
    waitUntil: "commit",
    timeout: 180_000,
  });
  process.stdout.write(`${JSON.stringify({ progress: spec.id, stage: "DOM_LOADED", url: page.url() })}\n`);
  await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
  await enterConsumer(page);
  process.stdout.write(`${JSON.stringify({ progress: spec.id, stage: "CONSUMER_READY" })}\n`);
  const input = page.getByTestId("consumer-repair-problem-input");
  const searchPromise = page.waitForResponse((response) =>
    response.url().startsWith(`${BACKEND}/search/catalog?`)
      && response.status() === 200,
  { timeout: 120_000 });
  const [searchResponse] = await Promise.all([searchPromise, input.fill(prompt)]);
  process.stdout.write(`${JSON.stringify({ progress: spec.id, stage: "SEARCH_READY" })}\n`);
  let search = await json(searchResponse);
  invariant(search.searchIndexReleaseId === SEARCH_RELEASE_ID, `${spec.id}:SEARCH_RELEASE_DRIFT`);
  const items = Array.isArray(search.items) ? [...search.items as Json[]] : [];
  let selectedIndex = items.findIndex((item) => String(item.catalogId) === spec.catalogId);
  let searchPageCount = 1;
  while (selectedIndex < 0 && search.nextCursor && searchPageCount < 20) {
    const nextPagePromise = page.waitForResponse((response) =>
      response.url().startsWith(`${BACKEND}/search/catalog?`)
        && response.url().includes("cursor=")
        && response.status() === 200,
    { timeout: 120_000 });
    const [nextPageResponse] = await Promise.all([
      nextPagePromise,
      page.getByTestId("consumer-repair-work-search-load-more").click(),
    ]);
    search = await json(nextPageResponse);
    invariant(search.searchIndexReleaseId === SEARCH_RELEASE_ID,
      `${spec.id}:SEARCH_RELEASE_PAGE_DRIFT`);
    const pageItems = Array.isArray(search.items) ? search.items as Json[] : [];
    for (const item of pageItems) {
      if (!items.some((candidate) => candidate.catalogId === item.catalogId)) items.push(item);
    }
    selectedIndex = items.findIndex((item) => String(item.catalogId) === spec.catalogId);
    searchPageCount += 1;
  }
  invariant(selectedIndex >= 0,
    `${spec.id}:EXPECTED_CATALOG_NOT_FOUND:${items.map((item) => String(item.catalogId)).join(",")}`);
  const selected = items[selectedIndex];
  const suggestion = page.getByTestId(`consumer-repair-work-suggestion-${selectedIndex + 1}`);
  const suggestionsList = page.getByTestId("consumer-repair-work-suggestions");
  for (let attempt = 0; attempt < 12 && await suggestion.count() === 0; attempt += 1) {
    await suggestionsList.evaluate((element, input) => {
      const list = element as HTMLElement;
      const targetOffset = Math.max(0, (input.selectedIndex * 58) - 120);
      list.scrollTop = input.attempt === 0
        ? targetOffset
        : Math.min(list.scrollHeight, targetOffset + (input.attempt * 164));
      list.dispatchEvent(new Event("scroll", { bubbles: true }));
    }, { selectedIndex, attempt });
    await page.waitForTimeout(150);
  }
  await suggestion.waitFor({ timeout: 120_000 });
  const selectedWorkText = (await suggestion.innerText()).trim();
  invariant(String(selected.catalogId) === spec.catalogId,
    `${spec.id}:SELECTED_CATALOG_DRIFT:${String(selected.catalogId)}`);
  await suggestion.click();
  invariant(authorization.startsWith("Bearer "), `${spec.id}:AUTHORIZATION_MISSING`);
  const historyBefore = await api(authorization, `revisions?catalogId=${encodeURIComponent(spec.catalogId)}&limit=100`);
  const historyBeforeRows = Array.isArray(historyBefore.revisions) ? historyBefore.revisions as Json[] : [];
  const configuredResumeRootRevisionId = String(
    process.env.R4A13_RESUME_ROOT_REVISION_ID ?? "",
  ).trim();
  const resumeRootRevisionId = String(process.env.R4A13_RESUME_ROOT_CASE_ID ?? "").trim() === spec.id
    ? configuredResumeRootRevisionId
    : "";
  let resultRevisionId: string;
  let revision: Json;
  if (resumeRootRevisionId) {
    resultRevisionId = resumeRootRevisionId;
    revision = await api(authorization, `revisions/${resultRevisionId}`);
    invariant(revision.releaseId === RELEASE_ID && revision.catalogId === spec.catalogId,
      `${spec.id}:RESUME_ROOT_IDENTITY_RED`);
    await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(resultRevisionId)}`, {
      waitUntil: "commit",
      timeout: 180_000,
    });
    await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
    await enterConsumer(page);
    process.stdout.write(`${JSON.stringify({
      progress: spec.id,
      stage: "COMPILE_RESUMED",
      revisionId: resultRevisionId,
    })}\n`);
  } else {
    const prepareButton = page.getByTestId("consumer-repair-prepare-draft");
    process.stdout.write(`${JSON.stringify({
      progress: spec.id,
      stage: "PREPARE_READY",
      visible: await prepareButton.isVisible().catch(() => false),
      enabled: await prepareButton.isEnabled().catch(() => false),
      label: await prepareButton.innerText().catch(() => ""),
    })}\n`);
    const compilePromise = page.waitForResponse((response) =>
      response.url().endsWith("/jobs/compile") && response.request().method() === "POST",
    { timeout: 15_000 });
    let compileResponse: Response;
    try {
      [compileResponse] = await Promise.all([
        compilePromise,
        prepareButton.click(),
      ]);
    } catch (error) {
      await page.screenshot({ path: resolve(OUTPUT_ROOT, `${spec.id}_COMPILE_BLOCKED.png`), fullPage: true });
      const body = (await page.locator("body").innerText()).replace(/\s+/gu, " ").slice(0, 4_000);
      throw new Error(`${String(error)}:UI=${body}:CONSOLE=${consoleErrors.join("|")}:PAGE=${pageErrors.join("|")}`);
    }
    const compileBody = await json(compileResponse);
    invariant(compileResponse.status() === 202,
      `${spec.id}:COMPILE_HTTP_${compileResponse.status()}:${String(compileBody.error?.code ?? "")}`);
    process.stdout.write(`${JSON.stringify({ progress: spec.id, stage: "COMPILE_ACCEPTED" })}\n`);
    resultRevisionId = await waitForJobRevision(authorization, String(compileBody.jobId ?? ""));
    revision = await api(authorization, `revisions/${resultRevisionId}`);
  }
  const identity = {
    revisionId: resultRevisionId,
    releaseId: String(revision.releaseId ?? ""),
    catalogId: String(revision.catalogId ?? ""),
  };
  process.stdout.write(`${JSON.stringify({ progress: spec.id, stage: "REVISION_VISIBLE", revisionId: identity.revisionId })}\n`);
  invariant(identity.releaseId === RELEASE_ID, `${spec.id}:DEFINITION_RELEASE_DRIFT`);
  invariant(identity.catalogId === spec.catalogId, `${spec.id}:CATALOG_ID_DRIFT`);
  const detailedCatalog = await api(authorization, `catalog/${encodeURIComponent(spec.catalogId)}`);
  const rows = await allRows(authorization, identity.revisionId);
  const preliminaryNeeds = Array.isArray(revision.preliminaryNeeds) ? revision.preliminaryNeeds as Json[] : [];
  invariant(rows.length > 0 || preliminaryNeeds.length > 0, `${spec.id}:EMPTY_PRELIMINARY_COMPOSITION`);
  invariant(preliminaryNeeds.length > 0, `${spec.id}:PRELIMINARY_NEEDS_MISSING`);
  invariant(rows.length + preliminaryNeeds.length === expectedCompositionCount,
    `${spec.id}:VISIBLE_COMPOSITION_DENOMINATOR_RED`);
  invariant(rows.every((row) => !OLD_BAD_TITLES.has(String(row.titleRu))), `${spec.id}:OLD_FAKE_ROW_SURVIVED`);
  const historyAfter = await api(authorization, `revisions?catalogId=${encodeURIComponent(spec.catalogId)}&limit=100`);
  const historyAfterRows = Array.isArray(historyAfter.revisions) ? historyAfter.revisions as Json[] : [];
  const expectedHistoryCount = resumeRootRevisionId
    ? historyBeforeRows.length
    : Math.min(100, historyBeforeRows.length + 1);
  invariant(historyAfterRows.length === expectedHistoryCount,
    `${spec.id}:HISTORY_DELTA_RED:${historyBeforeRows.length}:${historyAfterRows.length}`);
  invariant(historyAfterRows.some((entry) => entry.revisionId === identity.revisionId), `${spec.id}:HISTORY_REVISION_MISSING`);

  await openFullEstimateAfterMeaningfulPreview(page, true);
  const parameterStatus = page.getByTestId("request-estimate-parameter-status");
  try {
    await parameterStatus.waitFor({ state: "visible", timeout: 60_000 });
  } catch (error) {
    const diagnosticScreenshot = resolve(OUTPUT_ROOT, `${spec.id}_UI_PROJECTION_BLOCKED.png`);
    await page.screenshot({ path: diagnosticScreenshot, fullPage: true });
    throw new Error(`${String(error)}:UI=${(await page.locator("body").innerText()).replace(/\s+/gu, " ").slice(0, 8_000)}:CONSOLE=${consoleErrors.join("|")}:PAGE=${pageErrors.join("|")}`);
  }
  await ensureEstimatePositionsVisible(page);
  const missingSummaryText = (await parameterStatus.innerText()).trim();
  const visibleMissingParameterIds = [...new Set(preliminaryNeeds.flatMap((need) =>
    Array.isArray(need.missingParameterIds) ? need.missingParameterIds.map(String) : []))];
  const parameterPanelText = "";
  invariant(visibleMissingParameterIds.length > 0, `${spec.id}:MISSING_PARAMETER_SET_EMPTY`);
  invariant(!/[:\s]0(?:\s|$)/u.test(missingSummaryText), `${spec.id}:FALSE_ZERO_MISSING_STATUS`);
  const pageText = await page.locator("body").innerText();
  const visibleItemCount = await page.locator('[data-testid^="request-estimate-item-anchor-"]').count();
  const visibleTotalCountText = (await page.getByTestId("request-estimate-items-total-count").innerText()).trim();
  const categoryCountText = await page.getByTestId("request-estimate-category-filters").innerText();
  if (revision.parameters?.system_type === "linear_tray") {
    const drainageSchema = (Array.isArray(detailedCatalog.item?.parameterSchema)
      ? detailedCatalog.item.parameterSchema as Json[]
      : []).filter((parameter) => [
        "system_type", "route_length_m", "tray_nominal_size", "tray_load_class",
        "drain_pipe_nominal_size", "storm_pipe_nominal_size",
      ].includes(String(parameter.parameterId)));
    process.stdout.write(`${JSON.stringify({
      progress: spec.id,
      stage: "DRAINAGE_SCHEMA_VISIBLE_SET",
      parameters: drainageSchema.map((parameter) => ({
        parameterId: parameter.parameterId,
        visibilityRole: parameter.visibilityRole,
        requiredWhen: parameter.requiredWhen,
        formulaConsumers: parameter.formulaConsumers,
        resourceBranchConsumers: parameter.resourceBranchConsumers,
      })),
    })}\n`);
    const trayParameter = page.getByTestId("editable-param-chip-tray_nominal_size");
    const alreadyVisible = await trayParameter.isVisible().catch(() => false);
    if (!alreadyVisible) {
      await page.getByTestId("request-estimate-parameters-toggle").click();
      const showMoreParameters = page.getByTestId("request-estimate-show-more-parameters");
      await showMoreParameters.waitFor({ state: "visible", timeout: 10_000 }).catch(() => undefined);
      if (await showMoreParameters.isVisible().catch(() => false)) {
        await showMoreParameters.click();
      }
      try {
        await trayParameter.waitFor({ state: "visible", timeout: 10_000 });
      } catch (error) {
        const renderedParameterTestIds = await page.locator('[data-testid^="editable-param-"]')
          .evaluateAll((elements) => elements.map((element) => element.getAttribute("data-testid")));
        throw new Error(`${String(error)}:PARAMETERS=${JSON.stringify(renderedParameterTestIds)}:UI=${
          (await page.locator("body").innerText()).replace(/\s+/gu, " ").slice(0, 8_000)}`);
      }
    }
  }
  const visibleParameterCardIds = await page.locator('[data-testid^="editable-param-chip-"]').evaluateAll((elements) =>
    elements.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 1 && rect.height > 1 && style.display !== "none" && style.visibility !== "hidden"
        ? [String(element.getAttribute("data-testid") ?? "").replace(/^editable-param-chip-/u, "")]
        : [];
    }));
  invariant(visibleItemCount === expectedCompositionCount,
    `${spec.id}:VISIBLE_ITEM_COUNT_${visibleItemCount}_EXPECTED_${expectedCompositionCount}`);
  const unknownQuantityCopyVisible = /(?:нужно\s+)?уточн(?:ить|яется|ени)/iu.test(pageText);
  invariant(unknownQuantityCopyVisible,
    `${spec.id}:UNKNOWN_QUANTITY_COPY_MISSING`);
  invariant(preliminaryNeeds.every((need) => {
    if (need.quantity == null) return true;
    const inputParameterIds = Array.isArray(need.calculationTrace?.inputParameterIds)
      ? need.calculationTrace.inputParameterIds.map(String)
      : [];
    return inputParameterIds.length > 0
      && inputParameterIds.every((parameterId: string) => revision.parameters?.[parameterId] != null);
  }), `${spec.id}:UNSUPPORTED_PRELIMINARY_QUANTITY`);
  if (revision.parameters?.system_type === "linear_tray") {
    invariant(visibleParameterCardIds.some((parameterId) => parameterId.startsWith("tray_")),
      `${spec.id}:LINEAR_TRAY_PARAMETERS_MISSING`);
    invariant(visibleParameterCardIds.every((parameterId) =>
      !parameterId.startsWith("drain_") && !parameterId.startsWith("storm_")),
    `${spec.id}:INCOMPATIBLE_DRAINAGE_PARAMETER_VISIBLE`);
  }

  const screenshot = resolve(OUTPUT_ROOT, `${spec.id}.png`);
  mkdirSync(dirname(screenshot), { recursive: true });
  await page.screenshot({ path: screenshot, fullPage: true });

  let activeRevisionId = identity.revisionId;
  let refinement: Json = { attempted: false };
  let editLifecycle: Json = { attempted: false };
  let fullWorkflow: Json = { attempted: false };
  if (spec.id !== "ASPHALT_DRAIN_PRELIMINARY") {
    const catalogItem = (detailedCatalog.item ?? detailedCatalog) as Json;
    const parameterSchema = Array.isArray(catalogItem.parameterSchema)
      ? catalogItem.parameterSchema as Json[]
      : [];
    const parameters = fullFixtureParameters({
      catalogId: spec.catalogId,
      parameterSchema,
      rootParameters: revision.parameters ?? {},
    });
    const resumeFullRevisionId = String(process.env.R4A13_RESUME_FULL_CASE_ID ?? "").trim() === spec.id
      ? String(process.env.R4A13_RESUME_FULL_REVISION_ID ?? "").trim()
      : "";
    let fullRevisionId = resumeFullRevisionId;
    if (!fullRevisionId) {
      const fullAccepted = await apiPost(authorization, "jobs/recalculate", {
        idempotencyKey: `r4a13-full-fixture-${spec.id}-${Date.now()}`,
        catalogId: spec.catalogId,
        parentRevisionId: activeRevisionId,
        sourceRequestText: revision.sourceRequestText,
        primaryMeasureParameterId: revision.primaryMeasureParameterId,
        parameters,
        currencyCode: revision.currencyCode,
        rowOverrides: revision.amendmentContract?.rowOverrides ?? {},
        customRows: revision.amendmentContract?.customRows ?? [],
      });
      fullRevisionId = await waitForJobRevision(authorization, String(fullAccepted.jobId ?? ""));
    }
    const fullRevision = await api(authorization, `revisions/${fullRevisionId}`);
    const fullRows = await allRows(authorization, fullRevisionId);
    const fullNeeds = Array.isArray(fullRevision.preliminaryNeeds)
      ? fullRevision.preliminaryNeeds as Json[]
      : [];
    invariant(fullRevision.parentRevisionId === activeRevisionId, `${spec.id}:FULL_PARENT_DRIFT`);
    invariant(fullRows.length === fullExpectedRowCount,
      `${spec.id}:FULL_ROW_COUNT_${fullRows.length}_EXPECTED_${fullExpectedRowCount}`);
    invariant(fullNeeds.length === 0, `${spec.id}:FULL_PRELIMINARY_NEEDS_${fullNeeds.length}`);
    invariant(fullRows.every((row) => Number(row.quantity) > 0), `${spec.id}:FULL_NON_POSITIVE_QUANTITY`);
    const exactExample = exactExampleAudit(spec.id, fullRows, fullRevision.parameters ?? {});
    activeRevisionId = fullRevisionId;

    await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(fullRevisionId)}`, {
      waitUntil: "commit",
      timeout: 180_000,
    });
    await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
    await enterConsumer(page);
    try {
      await openFullEstimateAfterMeaningfulPreview(page, true);
      await page.getByTestId("request-estimate-items-total-count").waitFor({ state: "visible", timeout: 60_000 });
    } catch (error) {
      const diagnosticScreenshot = resolve(OUTPUT_ROOT, `${spec.id}_FULL_DEEPLINK_BLOCKED.png`);
      await page.screenshot({ path: diagnosticScreenshot, fullPage: true });
      throw new Error(`${String(error)}:FULL_DEEPLINK_UI=${(await page.locator("body").innerText()).replace(/\s+/gu, " ").slice(0, 8_000)}:BACKEND=${JSON.stringify(backendRequests.slice(-20))}:CONSOLE=${consoleErrors.join("|")}:PAGE=${pageErrors.join("|")}`);
    }
    await page.waitForFunction((expected) =>
      document.querySelectorAll('[data-testid^="request-estimate-item-anchor-"]').length === expected,
    fullExpectedRowCount, { timeout: 60_000 });
    const fullPageText = await page.locator("body").innerText();
    invariant(!fullPageText.includes("PROJECT:"), `${spec.id}:FULL_TECHNICAL_PROJECT_REFERENCE_VISIBLE`);
    const fullScreenshot = resolve(OUTPUT_ROOT, `${spec.id}_FULL_FIXTURE.png`);
    await page.screenshot({ path: fullScreenshot, fullPage: true });

    const rowOverrides = Object.fromEntries(fullRows.map((row, index) => [
      String(row.rowId),
      {
        unitPrice: 100 + index,
        provenance: {
          kind: "manual",
          reason: "r4a13_control_fixture_test_price_not_market_price",
        },
      },
    ]));
    const resumePricedRevisionId = String(process.env.R4A13_RESUME_PRICED_CASE_ID ?? "").trim() === spec.id
      ? String(process.env.R4A13_RESUME_PRICED_REVISION_ID ?? "").trim()
      : "";
    let pricedRevisionId = resumePricedRevisionId;
    if (!pricedRevisionId) {
      const pricedAccepted = await apiPost(authorization, "jobs/recalculate", {
        idempotencyKey: `r4a13-test-prices-${spec.id}-${Date.now()}`,
        catalogId: spec.catalogId,
        parentRevisionId: activeRevisionId,
        sourceRequestText: fullRevision.sourceRequestText,
        primaryMeasureParameterId: fullRevision.primaryMeasureParameterId,
        parameters: fullRevision.parameters,
        currencyCode: fullRevision.currencyCode,
        rowOverrides,
        customRows: fullRevision.amendmentContract?.customRows ?? [],
      });
      pricedRevisionId = await waitForJobRevision(authorization, String(pricedAccepted.jobId ?? ""));
    }
    const pricedRevision = await api(authorization, `revisions/${pricedRevisionId}`);
    const pricedRows = await allRows(authorization, pricedRevisionId);
    invariant(pricedRevision.parentRevisionId === activeRevisionId, `${spec.id}:PRICED_PARENT_DRIFT`);
    invariant(pricedRows.length === fullExpectedRowCount, `${spec.id}:PRICED_ROW_COUNT_DRIFT`);
    invariant(pricedRows.every((row) => Number(row.unitPrice) >= 100 && Number(row.amount) > 0),
      `${spec.id}:TEST_PRICE_OR_AMOUNT_MISSING`);
    invariant(Number(pricedRevision.totals?.amount) > 0
      && Number(pricedRevision.totals?.pricedRowCount) === pricedRows.length,
    `${spec.id}:PRICED_TOTALS_RED`);
    activeRevisionId = pricedRevisionId;

    await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(pricedRevisionId)}`, {
      waitUntil: "commit",
      timeout: 180_000,
    });
    await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
    await enterConsumer(page);
    try {
      await openFullEstimateAfterMeaningfulPreview(page, true);
      await page.getByTestId("request-estimate-items-total-count").waitFor({ state: "visible", timeout: 60_000 });
    } catch (error) {
      const diagnosticScreenshot = resolve(OUTPUT_ROOT, `${spec.id}_PRICED_DEEPLINK_BLOCKED.png`);
      await page.screenshot({ path: diagnosticScreenshot, fullPage: true });
      throw new Error(`${String(error)}:PRICED_DEEPLINK_UI=${(await page.locator("body").innerText()).replace(/\s+/gu, " ").slice(0, 8_000)}`);
    }
    await page.waitForFunction((expected) =>
      document.querySelectorAll('[data-testid^="request-estimate-item-anchor-"]').length === expected,
    fullExpectedRowCount, { timeout: 60_000 });
    const pricedPageText = await page.locator("body").innerText();
    invariant(!pricedPageText.includes("PROJECT:"), `${spec.id}:PRICED_TECHNICAL_PROJECT_REFERENCE_VISIBLE`);
    const pricedScreenshot = resolve(OUTPUT_ROOT, `${spec.id}_FULL_TEST_PRICES.png`);
    await page.screenshot({ path: pricedScreenshot, fullPage: true });
    fullWorkflow = {
      attempted: true,
      fixtureKind: "documented_control_fixture",
      priceKind: "test_only_not_market_price",
      rootRevisionId: identity.revisionId,
      fullRevisionId,
      pricedRevisionId,
      fullRevisionNumber: fullRevision.revisionNumber,
      pricedRevisionNumber: pricedRevision.revisionNumber,
      parameterCount: Object.keys(fullRevision.parameters ?? {}).length,
      rowCount: fullRows.length,
      preliminaryNeedCount: fullNeeds.length,
      exactExample,
      categoryCounts: fullRows.reduce((result: Json, row) => {
        const category = String(row.category);
        result[category] = Number(result[category] ?? 0) + 1;
        return result;
      }, {}),
      totals: pricedRevision.totals,
      fullScreenshot,
      pricedScreenshot,
    };
  }
  if (spec.id === "ASPHALT_DRAIN_PRELIMINARY") {
    const lengthParameterId = revision.parameters?.length_m != null ? "length_m" : "route_length_m";
    const resumeRefinedRevisionId = String(process.env.R4A13_RESUME_REFINED_CASE_ID ?? "").trim() === spec.id
      ? String(process.env.R4A13_RESUME_REFINED_REVISION_ID ?? "").trim()
      : "";
    let currentRouteLength = String(revision.parameters?.[lengthParameterId] ?? "");
    let refinedRouteLength = currentRouteLength === "25" ? "26" : "25";
    let childRevisionId = resumeRefinedRevisionId;
    if (!childRevisionId) {
      const parameterPanel = page.getByTestId("request-estimate-parameter-panel");
      if (!await parameterPanel.waitFor({ state: "visible", timeout: 10_000 })
        .then(() => true).catch(() => false)) {
        const toggle = page.getByTestId("request-estimate-parameters-toggle");
        const toggleText = await toggle.innerText();
        if (!toggleText.includes("\u0421\u043a\u0440\u044b\u0442\u044c")) await toggle.click();
      }
      await parameterPanel.waitFor({ state: "visible", timeout: 60_000 });
      const routeLengthChip = page.getByTestId(`editable-param-chip-${lengthParameterId}`);
      await routeLengthChip.waitFor({ state: "visible", timeout: 60_000 });
      const routeLengthInput = routeLengthChip.getByTestId("editable-param-popover-input");
      currentRouteLength = (await routeLengthInput.inputValue()).trim();
      refinedRouteLength = currentRouteLength === "25" ? "26" : "25";
      await routeLengthInput.fill(refinedRouteLength);
      await page.getByTestId("editable-param-batch-bar").waitFor({ state: "visible", timeout: 30_000 });
      const recalculateResponsePromise = page.waitForResponse((response) =>
        response.url().endsWith("/jobs/recalculate") && response.request().method() === "POST",
      { timeout: 60_000 });
      const [recalculateResponse] = await Promise.all([
        recalculateResponsePromise,
        page.getByTestId("editable-param-batch-apply").click(),
      ]);
      const recalculateBody = await json(recalculateResponse);
      invariant(recalculateResponse.status() === 202,
        `${spec.id}:REFINE_HTTP_${recalculateResponse.status()}:${String(recalculateBody.error?.code ?? "")}`);
      childRevisionId = await waitForJobRevision(authorization, String(recalculateBody.jobId ?? ""));
    }
    const childRevision = await api(authorization, `revisions/${childRevisionId}`);
    const childRows = await allRows(authorization, childRevisionId);
    const childNeeds = Array.isArray(childRevision.preliminaryNeeds) ? childRevision.preliminaryNeeds as Json[] : [];
    invariant(childRevision.parentRevisionId === identity.revisionId, `${spec.id}:REFINE_PARENT_DRIFT`);
    invariant(String(childRevision.parameters?.[lengthParameterId] ?? "") === refinedRouteLength,
      `${spec.id}:REFINE_VALUE_MISSING`);
    invariant(childRows.length + childNeeds.length === expectedCompositionCount,
      `${spec.id}:REFINE_COMPOSITION_DENOMINATOR_RED`);
    activeRevisionId = childRevisionId;
    if (resumeRefinedRevisionId) {
      await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(childRevisionId)}`, {
        waitUntil: "commit",
        timeout: 180_000,
      });
      await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
      await enterConsumer(page);
      await openFullEstimateAfterMeaningfulPreview(page, true);
      await ensureEstimatePositionsVisible(page);
    } else {
      await page.getByTestId("request-estimate-parameter-apply-status")
        .waitFor({ state: "visible", timeout: 60_000 });
    }
    const refinedScreenshot = resolve(OUTPUT_ROOT, `${spec.id}_ROUTE_LENGTH_25.png`);
    await page.screenshot({ path: refinedScreenshot, fullPage: true });
    refinement = {
      attempted: true,
      parentRevisionId: identity.revisionId,
      childRevisionId,
      revisionNumber: childRevision.revisionNumber,
      previousRouteLengthM: currentRouteLength,
      routeLengthM: childRevision.parameters[lengthParameterId],
      rowCount: childRows.length,
      preliminaryNeedCount: childNeeds.length,
      visibleCompositionCount: childRows.length + childNeeds.length,
      screenshot: refinedScreenshot,
    };

    const quantityNeed = childNeeds.find((need) => need.needState === "QUANTITY_REQUIRED"
      && need.rowId === "bedding_installation")
      ?? childNeeds.find((need) => need.needState === "QUANTITY_REQUIRED");
    invariant(quantityNeed, `${spec.id}:EDITABLE_QUANTITY_NEED_MISSING`);
    const targetRowId = String(quantityNeed.rowId);
    const originalTitle = String(quantityNeed.titleRu);
    const editedTitle = `${originalTitle} \u2014 \u0443\u0442\u043e\u0447\u043d\u0435\u043d\u043e \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u043c`;
    const itemIdForTitle = async (title: string): Promise<string> => {
      const titleNode = page.locator('[data-testid^="consumer-repair-item-title-"]')
        .filter({ hasText: title }).first();
      await titleNode.waitFor({ state: "visible", timeout: 60_000 });
      const testId = String(await titleNode.getAttribute("data-testid"));
      const prefix = "consumer-repair-item-title-";
      invariant(testId.startsWith(prefix), `${spec.id}:EDITABLE_ROW_ID_MISSING`);
      return testId.slice(prefix.length);
    };
    const recalculateFromUi = async (action: () => Promise<void>): Promise<{
      revision: Json;
      rows: Json[];
      needs: Json[];
    }> => {
      const historyMarker = page.locator('[data-testid^="consumer-estimate-edit-history-"]').first();
      const previousHistoryTestId = await historyMarker.getAttribute("data-testid");
      const responsePromise = page.waitForResponse((response) =>
        response.url().endsWith("/jobs/recalculate") && response.request().method() === "POST",
      { timeout: 60_000 });
      const [response] = await Promise.all([responsePromise, action()]);
      const body = await json(response);
      invariant(response.status() === 202,
        `${spec.id}:ROW_EDIT_HTTP_${response.status()}:${String(body.error?.code ?? "")}`);
      const revisionId = await waitForJobRevision(authorization, String(body.jobId ?? ""));
      const nextRevision = await api(authorization, `revisions/${revisionId}`);
      const nextRows = await allRows(authorization, revisionId);
      const nextNeeds = Array.isArray(nextRevision.preliminaryNeeds)
        ? nextRevision.preliminaryNeeds as Json[]
        : [];
      invariant(nextRevision.parentRevisionId === activeRevisionId, `${spec.id}:ROW_EDIT_PARENT_DRIFT`);
      invariant(nextRows.length + nextNeeds.length === expectedCompositionCount,
        `${spec.id}:ROW_EDIT_COMPOSITION_DENOMINATOR_RED`);
      activeRevisionId = revisionId;
      await page.waitForFunction((previous) => Array.from(
        document.querySelectorAll('[data-testid^="consumer-estimate-edit-history-"]'),
      ).some((node) => node.getAttribute("data-testid") !== previous), previousHistoryTestId, {
        timeout: 60_000,
      });
      await openFullEstimateAfterMeaningfulPreview(page, true);
      await ensureEstimatePositionsVisible(page);
      return { revision: nextRevision, rows: nextRows, needs: nextNeeds };
    };

    let itemId = await itemIdForTitle(originalTitle);
    const resumeQuantityRevisionId = String(process.env.R4A13_RESUME_QUANTITY_CASE_ID ?? "").trim() === spec.id
      ? String(process.env.R4A13_RESUME_QUANTITY_REVISION_ID ?? "").trim()
      : "";
    let quantityResult: { revision: Json; rows: Json[]; needs: Json[] };
    if (resumeQuantityRevisionId) {
      const quantityRevision = await api(authorization, `revisions/${resumeQuantityRevisionId}`);
      const quantityRows = await allRows(authorization, resumeQuantityRevisionId);
      const quantityNeeds = Array.isArray(quantityRevision.preliminaryNeeds)
        ? quantityRevision.preliminaryNeeds as Json[]
        : [];
      invariant(quantityRevision.parentRevisionId === activeRevisionId,
        `${spec.id}:QUANTITY_RESUME_PARENT_DRIFT`);
      quantityResult = { revision: quantityRevision, rows: quantityRows, needs: quantityNeeds };
      activeRevisionId = resumeQuantityRevisionId;
      await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(activeRevisionId)}`, {
        waitUntil: "commit",
        timeout: 180_000,
      });
      await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
      await enterConsumer(page);
      await openFullEstimateAfterMeaningfulPreview(page, true);
      await ensureEstimatePositionsVisible(page);
    } else {
      quantityResult = await recalculateFromUi(async () => {
        const input = page.getByTestId(`consumer-repair-item-quantity-input-${itemId}`);
        await input.fill("12.5");
        await input.press("Tab");
      });
    }
    const quantityRow = quantityResult.rows.find((row) => row.rowId === targetRowId);
    invariant(quantityRow && Number(quantityRow.quantity) === 12.5,
      `${spec.id}:MANUAL_QUANTITY_NOT_PERSISTED`);

    itemId = await itemIdForTitle(originalTitle);
    const resumePriceRevisionId = String(process.env.R4A13_RESUME_PRICE_CASE_ID ?? "").trim() === spec.id
      ? String(process.env.R4A13_RESUME_PRICE_REVISION_ID ?? "").trim()
      : "";
    let priceResult: { revision: Json; rows: Json[]; needs: Json[] };
    if (resumePriceRevisionId) {
      const priceRevision = await api(authorization, `revisions/${resumePriceRevisionId}`);
      const priceRows = await allRows(authorization, resumePriceRevisionId);
      const priceNeeds = Array.isArray(priceRevision.preliminaryNeeds)
        ? priceRevision.preliminaryNeeds as Json[]
        : [];
      invariant(priceRevision.parentRevisionId === activeRevisionId,
        `${spec.id}:PRICE_RESUME_PARENT_DRIFT`);
      priceResult = { revision: priceRevision, rows: priceRows, needs: priceNeeds };
      activeRevisionId = resumePriceRevisionId;
      await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(activeRevisionId)}`, {
        waitUntil: "commit",
        timeout: 180_000,
      });
      await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
      await enterConsumer(page);
      await openFullEstimateAfterMeaningfulPreview(page, true);
      await ensureEstimatePositionsVisible(page);
    } else {
      priceResult = await recalculateFromUi(async () => {
        const input = page.getByTestId(`consumer-repair-item-unit-price-input-${itemId}`);
        await input.fill("250");
        await input.press("Tab");
      });
    }
    const priceRow = priceResult.rows.find((row) => row.rowId === targetRowId);
    invariant(priceRow && Number(priceRow.quantity) === 12.5 && Number(priceRow.unitPrice) === 250,
      `${spec.id}:MANUAL_PRICE_OR_QUANTITY_NOT_PERSISTED`);

    itemId = await itemIdForTitle(originalTitle);
    const resumeTitleRevisionId = String(process.env.R4A13_RESUME_TITLE_CASE_ID ?? "").trim() === spec.id
      ? String(process.env.R4A13_RESUME_TITLE_REVISION_ID ?? "").trim()
      : "";
    let titleResult: { revision: Json; rows: Json[]; needs: Json[] };
    if (resumeTitleRevisionId) {
      const titleRevision = await api(authorization, `revisions/${resumeTitleRevisionId}`);
      const titleRows = await allRows(authorization, resumeTitleRevisionId);
      const titleNeeds = Array.isArray(titleRevision.preliminaryNeeds)
        ? titleRevision.preliminaryNeeds as Json[]
        : [];
      invariant(titleRevision.parentRevisionId === activeRevisionId,
        `${spec.id}:TITLE_RESUME_PARENT_DRIFT`);
      titleResult = { revision: titleRevision, rows: titleRows, needs: titleNeeds };
      activeRevisionId = resumeTitleRevisionId;
      await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(activeRevisionId)}`, {
        waitUntil: "commit",
        timeout: 180_000,
      });
      await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
      await enterConsumer(page);
      await openFullEstimateAfterMeaningfulPreview(page, true);
      await ensureEstimatePositionsVisible(page);
    } else {
      titleResult = await recalculateFromUi(async () => {
        await page.getByTestId(`consumer-repair-item-specification-edit-${itemId}`).click();
        const input = page.getByTestId(`consumer-repair-item-specification-input-${itemId}`);
        await input.fill(editedTitle);
        await input.waitFor({ state: "visible", timeout: 60_000 });
        await page.getByTestId(`consumer-repair-item-specification-save-${itemId}`).click();
      });
    }
    const titleRow = titleResult.rows.find((row) => row.rowId === targetRowId);
    invariant(titleRow && titleRow.titleRu === editedTitle
      && Number(titleRow.quantity) === 12.5 && Number(titleRow.unitPrice) === 250,
    `${spec.id}:MANUAL_TITLE_OR_CUMULATIVE_OVERRIDES_NOT_PERSISTED`);

    itemId = await itemIdForTitle(editedTitle);
    const resumeExcludedRevisionId = String(process.env.R4A13_RESUME_EXCLUDED_CASE_ID ?? "").trim() === spec.id
      ? String(process.env.R4A13_RESUME_EXCLUDED_REVISION_ID ?? "").trim()
      : "";
    let excludedResult: { revision: Json; rows: Json[]; needs: Json[] };
    if (resumeExcludedRevisionId) {
      const excludedRevision = await api(authorization, `revisions/${resumeExcludedRevisionId}`);
      const excludedRows = await allRows(authorization, resumeExcludedRevisionId);
      const excludedNeeds = Array.isArray(excludedRevision.preliminaryNeeds)
        ? excludedRevision.preliminaryNeeds as Json[]
        : [];
      invariant(excludedRevision.parentRevisionId === activeRevisionId,
        `${spec.id}:EXCLUDED_RESUME_PARENT_DRIFT`);
      excludedResult = { revision: excludedRevision, rows: excludedRows, needs: excludedNeeds };
      activeRevisionId = resumeExcludedRevisionId;
      await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(activeRevisionId)}`, {
        waitUntil: "commit",
        timeout: 180_000,
      });
      await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
      await enterConsumer(page);
      await openFullEstimateAfterMeaningfulPreview(page, true);
      await ensureEstimatePositionsVisible(page);
    } else {
      excludedResult = await recalculateFromUi(() =>
        page.getByTestId(`consumer-repair-item-remove-${itemId}`).click());
    }
    const excludedRow = excludedResult.rows.find((row) => row.rowId === targetRowId);
    invariant(excludedRow?.includedInEstimate === false, `${spec.id}:ROW_EXCLUSION_NOT_PERSISTED`);

    const resumeRestoredRevisionId = String(process.env.R4A13_RESUME_RESTORED_CASE_ID ?? "").trim() === spec.id
      ? String(process.env.R4A13_RESUME_RESTORED_REVISION_ID ?? "").trim()
      : "";
    let restoredResult: { revision: Json; rows: Json[]; needs: Json[] };
    if (resumeRestoredRevisionId) {
      const restoredRevision = await api(authorization, `revisions/${resumeRestoredRevisionId}`);
      const restoredRows = await allRows(authorization, resumeRestoredRevisionId);
      const restoredNeeds = Array.isArray(restoredRevision.preliminaryNeeds)
        ? restoredRevision.preliminaryNeeds as Json[]
        : [];
      invariant(restoredRevision.parentRevisionId === activeRevisionId,
        `${spec.id}:RESTORED_RESUME_PARENT_DRIFT`);
      restoredResult = { revision: restoredRevision, rows: restoredRows, needs: restoredNeeds };
      activeRevisionId = resumeRestoredRevisionId;
      await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(activeRevisionId)}`, {
        waitUntil: "commit",
        timeout: 180_000,
      });
      await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
      await enterConsumer(page);
      await openFullEstimateAfterMeaningfulPreview(page, true);
      await ensureEstimatePositionsVisible(page);
    } else {
      await page.getByTestId("consumer-repair-restore-item").waitFor({ state: "visible", timeout: 60_000 });
      restoredResult = await recalculateFromUi(() =>
        page.getByTestId("consumer-repair-restore-item").click());
    }
    const restoredRow = restoredResult.rows.find((row) => row.rowId === targetRowId);
    const restoredOverride = restoredResult.revision.amendmentContract?.rowOverrides?.[targetRowId];
    invariant(restoredRow?.includedInEstimate === true
      && restoredRow.titleRu === editedTitle
      && Number(restoredRow.quantity) === 12.5
      && Number(restoredRow.unitPrice) === 250
      && restoredOverride?.includedInEstimate === true,
    `${spec.id}:ROW_RESTORE_OR_CUMULATIVE_OVERRIDES_NOT_PERSISTED`);
    const lifecycleScreenshot = resolve(OUTPUT_ROOT, `${spec.id}_EDIT_RESTORE.png`);
    await page.screenshot({ path: lifecycleScreenshot, fullPage: true });
    const reloadUrl = `${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(activeRevisionId)}`;
    await page.goto(reloadUrl, { waitUntil: "commit", timeout: 180_000 });
    await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
    await page.getByTestId("ROUTE_PROOF_REQUEST_ROUTE_READY").waitFor({ timeout: 60_000 });
    await openFullEstimateAfterMeaningfulPreview(page, true);
    await ensureEstimatePositionsVisible(page);
    await page.getByTestId("consumer-estimate-edit-history-summary")
      .waitFor({ state: "visible", timeout: 60_000 });
    await page.locator('[data-testid^="consumer-repair-item-title-"]')
      .filter({ hasText: editedTitle }).first()
      .waitFor({ state: "visible", timeout: 60_000 });
    const reloadScreenshot = resolve(OUTPUT_ROOT, `${spec.id}_RELOAD_PERSISTED.png`);
    await page.screenshot({ path: reloadScreenshot, fullPage: true });
    editLifecycle = {
      attempted: true,
      targetRowId,
      initialRevisionId: childRevisionId,
      quantityRevisionId: quantityResult.revision.revisionId,
      priceRevisionId: priceResult.revision.revisionId,
      titleRevisionId: titleResult.revision.revisionId,
      excludedRevisionId: excludedResult.revision.revisionId,
      restoredRevisionId: restoredResult.revision.revisionId,
      finalRow: restoredRow,
      cumulativeOverride: restoredOverride,
      screenshot: lifecycleScreenshot,
      reloadUrl,
      reloadPersisted: true,
      reloadScreenshot,
    };
  }

  await openFullEstimateAfterMeaningfulPreview(page);
  let procurement: Json = { attempted: false };
  const procurementButton = page.getByTestId("consumer-estimate-open-procurement").first();
  if (await procurementButton.isVisible().catch(() => false) && await procurementButton.isEnabled().catch(() => false)) {
    const responsePromise = page.waitForResponse((response) => response.request().method() === "GET"
      && response.status() === 200
      && response.url().includes(`/revisions/${activeRevisionId}/artifacts/procurement`), { timeout: 180_000 });
    const [artifactResponse] = await Promise.all([responsePromise, procurementButton.click()]);
    const body = await json(artifactResponse);
    procurement = {
      attempted: true,
      httpStatus: artifactResponse.status(),
      status: body.status,
      revisionId: body.revisionId,
      releaseId: body.releaseId,
    };
  }

  let pdf: Json = { attempted: false };
  const pdfButton = page.getByTestId("consumer-estimate-make-pdf").first();
  if (await pdfButton.isVisible().catch(() => false) && await pdfButton.isEnabled().catch(() => false)) {
    const responsePromise = page.waitForResponse((response) => response.request().method() === "GET"
      && response.status() === 200
      && response.url().includes(`/revisions/${activeRevisionId}/artifacts/pdf`), { timeout: 180_000 });
    const [artifactResponse] = await Promise.all([responsePromise, pdfButton.click()]);
    const body = await json(artifactResponse);
    pdf = {
      attempted: true,
      httpStatus: artifactResponse.status(),
      status: body.status,
      revisionId: body.revisionId,
      releaseId: body.releaseId,
    };
  }

  let confirmation: Json = { attempted: false };
  if (fullWorkflow.attempted === true) {
    invariant(procurement.attempted === true && procurement.status === "ready",
      `${spec.id}:FULL_PROCUREMENT_NOT_READY`);
    invariant(pdf.attempted === true && pdf.status === "ready", `${spec.id}:FULL_PDF_NOT_READY`);
    // Both artifact actions may hand the browser to a signed document URL.
    // Return through the supported revision deep-link before confirming.
    await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(activeRevisionId)}`, {
      waitUntil: "commit",
      timeout: 180_000,
    });
    await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
    await enterConsumer(page);
    await openFullEstimateAfterMeaningfulPreview(page, true);
    await ensureEstimatePositionsVisible(page);
    const deliverySummary = page.getByTestId("consumer-repair-delivery-summary").last();
    if (!await deliverySummary.isVisible().catch(() => false)) {
      await page.getByTestId("consumer-repair-city-input").last().fill("Bishkek");
      await page.getByTestId("consumer-repair-address-input").last().fill("\u041a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\u043d\u044b\u0439 \u0430\u0434\u0440\u0435\u0441 Web E2E, 1");
      await page.getByTestId("consumer-repair-time-input").last().fill("\u041f\u043e\u0441\u043b\u0435 \u0441\u043e\u0433\u043b\u0430\u0441\u043e\u0432\u0430\u043d\u0438\u044f");
      await page.getByTestId("consumer-repair-phone-input").last().fill("0700000000");
      await deliverySummary.waitFor({ state: "visible", timeout: 30_000 });
    }
    const approve = page.getByTestId("consumer-repair-approve").last();
    await approve.waitFor({ state: "visible", timeout: 30_000 });
    invariant(await approve.isEnabled(), `${spec.id}:FULL_APPROVAL_DISABLED:${await approve.innerText()}`);
    await approve.click();
    const status = page.getByTestId("consumer-repair-status");
    await status.waitFor({ state: "visible", timeout: 120_000 });
    await page.waitForFunction(() => {
      const value = document.querySelector('[data-testid="consumer-repair-status"]')?.textContent ?? "";
      return value.includes("\u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430")
        || value.includes("\u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d\u0430");
    }, undefined, { timeout: 120_000 });
    const statusText = (await status.innerText()).trim();
    const confirmationScreenshot = resolve(OUTPUT_ROOT, `${spec.id}_CONFIRMED.png`);
    await page.screenshot({ path: confirmationScreenshot, fullPage: true });

    await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(activeRevisionId)}`, {
      waitUntil: "commit",
      timeout: 180_000,
    });
    await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
    await enterConsumer(page);
    await openFullEstimateAfterMeaningfulPreview(page, true);
    await ensureEstimatePositionsVisible(page);
    await page.waitForFunction((expected) =>
      document.querySelectorAll('[data-testid^="request-estimate-item-anchor-"]').length === expected,
    fullExpectedRowCount, { timeout: 60_000 });
    confirmation = {
      attempted: true,
      confirmed: true,
      revisionId: activeRevisionId,
      statusText,
      screenshot: confirmationScreenshot,
      reopenedAfterConfirmation: true,
    };
  }

  const expectedNavigationAborts = requestFailures.filter((failure) => {
    if (!failure.includes("ERR_ABORTED")) return false;
    if (failure.includes("/artifact-files/") || failure.includes("/auth/v1/logout")) return true;
    const path = failure.match(/^GET\s+(\/revisions\/[^\s]+\/parameter-session)\s+/u)?.[1];
    return Boolean(path && backendRequests.some((request) =>
      request.method === "GET" && request.path === path && request.status === 200));
  });
  const unexpectedFailures = requestFailures.filter((failure) => !expectedNavigationAborts.includes(failure));
  invariant(pageErrors.length === 0, `${spec.id}:PAGE_ERRORS:${pageErrors.join("|")}`);
  invariant(unexpectedFailures.length === 0, `${spec.id}:REQUEST_FAILURES:${unexpectedFailures.join("|")}`);
  const exposedRouteProofMarkers = await page.locator('[data-testid^="ROUTE_PROOF_"]').evaluateAll((elements) =>
    elements.flatMap((element) => {
      let current: Element | null = element;
      let hidden = false;
      while (current) {
        const style = window.getComputedStyle(current);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
          hidden = true;
          break;
        }
        current = current.parentElement;
      }
      const rect = element.getBoundingClientRect();
      return hidden || rect.width <= 1 || rect.height <= 1
        ? []
        : [String(element.getAttribute("data-testid") ?? element.textContent ?? "")];
    }),
  );
  invariant(exposedRouteProofMarkers.length === 0,
    `${spec.id}:VISIBLE_ROUTE_PROOF_MARKERS:${exposedRouteProofMarkers.join(",")}`);

  return {
    id: spec.id,
    prompt,
    selectedWorkText,
    catalog: catalogProjection(detailedCatalog.item ?? detailedCatalog),
    revision: {
      revisionId: identity.revisionId,
      releaseId: identity.releaseId,
      catalogId: identity.catalogId,
      revisionNumber: revision.revisionNumber,
      rowCount: rows.length,
      preliminaryNeedCount: preliminaryNeeds.length,
      visibleCompositionCount: rows.length + preliminaryNeeds.length,
      total: revision.totals,
      inputParameters: revision.parameters,
    },
    rows: rows.map((row) => ({
      rowId: row.rowId,
      section: row.section,
      category: row.category,
      titleRu: row.titleRu,
      unitId: row.unitId,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      amount: row.amount,
    })),
    preliminaryNeeds: preliminaryNeeds.map((need) => ({
      rowId: need.rowId,
      section: need.section,
      category: need.category,
      titleRu: need.titleRu,
      unitId: need.unitId,
      quantity: need.quantity,
      needState: need.needState,
      missingParameterIds: need.missingParameterIds,
      selected: need.selected,
    })),
    uiComposition: {
      visibleItemCount,
      visibleTotalCountText,
      categoryCountText,
      unknownQuantityCopyVisible,
      visibleParameterCardIds,
    },
    history: { before: historyBeforeRows.length, after: historyAfterRows.length, delta: 1 },
    parameters: {
      missingSummaryText,
      visibleMissingParameterIds,
      panelText: parameterPanelText,
    },
    refinement,
    editLifecycle,
    fullWorkflow,
    procurement,
    pdf,
    confirmation,
    exposedRouteProofMarkers,
    screenshot,
    backendRequests,
    consoleErrorCount: consoleErrors.length,
    pageErrorCount: pageErrors.length,
    requestFailureCount: unexpectedFailures.length,
  };
}

async function databaseAudit(client: Client): Promise<Json> {
  const catalogs = CASES.map((entry) => entry.catalogId);
  const definitions = (await client.query(`
    select definition.catalog_id,definition.id::text definition_id,definition.definition_version,identity.title_ru,
      baseline.id::text baseline_id,baseline.input_values,baseline.input_classification,
      (select count(*)::integer from public.estimate_parameter_definition parameter
        where parameter.definition_version_id=definition.id) parameter_count,
      (select count(*)::integer from public.estimate_parameter_definition parameter
        where parameter.definition_version_id=definition.id
          and parameter.truth_metadata->>'preliminary_compilation_allowed'='true') preliminary_parameter_count,
      (select count(*)::integer from public.estimate_formula_graph formula
        where formula.definition_version_id=definition.id) formula_count,
      (select count(*)::integer from public.estimate_resource_spec resource
        where resource.definition_version_id=definition.id) resource_count
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
    join public.estimate_work_identity identity on identity.catalog_id=definition.catalog_id
    join public.estimate_approved_template_baseline baseline on baseline.definition_version_id=definition.id
    where manifest.release_id=$1 and definition.catalog_id=any($2::text[])
    order by definition.catalog_id
  `, [RELEASE_ID, catalogs])).rows as Json[];
  invariant(definitions.length === CASES.length, "DATABASE_DEFINITION_DENOMINATOR_RED");
  const blockingParameters = (await client.query(`
    select definition.catalog_id,parameter.parameter_id,parameter.title_ru,parameter.required,
      parameter.truth_metadata->>'visibility_role' visibility_role,
      parameter.truth_metadata->>'preliminary_compilation_allowed' preliminary_compilation_allowed,
      parameter.truth_metadata->'formula_consumers' formula_consumers,
      parameter.truth_metadata->'resource_branch_consumers' resource_branch_consumers
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
    join public.estimate_parameter_definition parameter on parameter.definition_version_id=definition.id
    where manifest.release_id=$1 and definition.catalog_id=any($2::text[])
      and parameter.required
      and parameter.truth_metadata->>'preliminary_compilation_allowed' is distinct from 'true'
    order by definition.catalog_id,parameter.ordinal
  `, [RELEASE_ID, catalogs])).rows as Json[];

  const oldRevision = (await client.query(`
    select revision.id::text,revision.release_id::text,revision.catalog_id,revision.revision_number,
      revision.row_count,revision.checksum_sha256,revision.created_at,
      coalesce(json_agg(json_build_object('rowId',row.row_id,'titleRu',row.title_ru,'quantity',row.quantity,'unitId',row.unit_id)
        order by row.ordinal) filter(where row.row_id is not null),'[]'::json) rows
    from public.estimate_revision revision
    left join public.estimate_revision_row row on row.revision_id=revision.id
    where revision.id=$1
    group by revision.id
  `, [OLD_BAD_REVISION_ID])).rows[0] as Json | undefined;
  invariant(oldRevision && Number(oldRevision.row_count) === 6, "OLD_BAD_REVISION_NOT_PRESERVED");

  const immutableTriggers = (await client.query(`
    select tgname,tgenabled from pg_trigger
    where tgname in ('estimate_revision_immutable_trg','estimate_revision_row_immutable_trg','estimate_revision_row_price_immutable_trg')
    order by tgname
  `)).rows as Json[];

  return {
    definitions: definitions.map((definition) => ({
      catalogId: definition.catalog_id,
      definitionId: definition.definition_id,
      version: definition.definition_version,
      titleRu: definition.title_ru,
      baselineId: definition.baseline_id,
      parameterCount: Number(definition.parameter_count),
      preliminaryParameterCount: Number(definition.preliminary_parameter_count),
      formulaCount: Number(definition.formula_count),
      resourceCount: Number(definition.resource_count),
      runtimeEligibleBaselineInputs: canonicalApprovedBaselineRuntimeParameters({
        input_values: definition.input_values,
        input_classification: definition.input_classification,
      }),
      fixtureOnlyInputCount: Object.values(definition.input_classification as Json)
        .filter((value) => value === "FIXTURE_ONLY").length,
    })),
    blockingRequiredParameters: blockingParameters,
    oldBadRevision: oldRevision,
    immutableTriggers,
  };
}

async function main(): Promise<void> {
  if (process.argv.includes("--database-only")) {
    const client = new Client({ connectionString: DATABASE_URL, application_name: "r4a13-runtime-routing-boq-truth-inspect" });
    await client.connect();
    try {
      process.stdout.write(`${JSON.stringify(await databaseAudit(client), null, 2)}\n`);
    } finally {
      await client.end();
    }
    return;
  }
  const runtimeReceipt = readJson(BACKEND_RUNTIME_RECEIPT_PATH);
  const metroReceipt = readJson(METRO_RUNTIME_RECEIPT_PATH);
  const sourceTree = String(runtimeReceipt.compatibility_tuple?.sourceTree ?? "");
  invariant(runtimeReceipt.compatibility_tuple?.definitionReleaseId === RELEASE_ID, "BACKEND_RELEASE_RECEIPT_DRIFT");
  invariant(runtimeReceipt.compatibility_tuple?.searchReleaseId === SEARCH_RELEASE_ID, "BACKEND_SEARCH_RECEIPT_DRIFT");
  invariant(metroReceipt.definition_release_id === RELEASE_ID, "METRO_RELEASE_RECEIPT_DRIFT");
  invariant(metroReceipt.search_release_id === SEARCH_RELEASE_ID, "METRO_SEARCH_RECEIPT_DRIFT");
  invariant(sourceTree.length === 64 && metroReceipt.source_tree_hash === sourceTree, "METRO_SOURCE_RECEIPT_DRIFT");

  const browser = await chromium.launch({ headless: true });
  const results: Json[] = [];
  try {
    const requestedCase = process.env.R4A13_CASE;
    const selectedCases = requestedCase ? CASES.filter((spec) => spec.id === requestedCase) : CASES;
    invariant(selectedCases.length > 0, `REQUESTED_CASE_NOT_FOUND:${requestedCase}`);
    for (const spec of selectedCases) {
      const context = await browser.newContext();
      try {
        results.push(await runCase(await context.newPage(), spec));
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const bundleResponse = await fetch(`${ORIGIN}${BUNDLE_PATH}`, { signal: AbortSignal.timeout(180_000) });
  invariant(bundleResponse.ok, `METRO_BUNDLE_HTTP_${bundleResponse.status}`);
  const bundle = Buffer.from(await bundleResponse.arrayBuffer());

  const client = new Client({ connectionString: DATABASE_URL, application_name: "r4a13-runtime-routing-boq-truth-web" });
  await client.connect();
  let database: Json;
  try {
    database = await databaseAudit(client);
  } finally {
    await client.end();
  }

  const receipt = {
    schemaVersion: "rik-expo-app.r4-a13-4.platform-core-global-workflow-web.v1",
    generatedUtc: new Date().toISOString(),
    status: "GREEN_R4_A13_4_PLATFORM_CORE_GLOBAL_WORKFLOW_WEB",
    runtime: {
      origin: ORIGIN,
      backend: BACKEND,
      definitionReleaseId: RELEASE_ID,
      searchReleaseId: SEARCH_RELEASE_ID,
      sourceTree,
      metroPid: metroReceipt.pid,
      backendPid: runtimeReceipt.backend_pid,
      capabilityId: runtimeReceipt.compatibility_tuple.capabilityId,
      bundleBytes: bundle.length,
      actualServedBundleSha256: sha256(bundle),
      receiptsAgree: true,
    },
    cases: results,
    database,
    protectedFiles: PROTECTED_FILES.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) })),
    productionAccessed: false,
    deployPerformed: false,
    releaseActivated: false,
    secretsCaptured: false,
  };
  atomicJson(OUTPUT, { ...receipt, receiptSha256: sha256(JSON.stringify(receipt)) });
  process.stdout.write(`${JSON.stringify({
    status: receipt.status,
    runtime: receipt.runtime,
    cases: results.map((entry) => ({
      id: entry.id,
      revisionId: entry.revision.revisionId,
      rowCount: entry.revision.rowCount,
      preliminaryNeedCount: entry.revision.preliminaryNeedCount,
      visibleCompositionCount: entry.revision.visibleCompositionCount,
      rows: entry.rows.map((row: Json) => `${row.titleRu} | ${row.quantity} ${row.unitId}`),
      nonNullDefaults: entry.catalog.nonNullDefaults,
      pdf: entry.pdf,
      procurement: entry.procurement,
      fullWorkflow: entry.fullWorkflow,
      confirmation: entry.confirmation,
    })),
    oldRevision: { id: database.oldBadRevision.id, rowCount: database.oldBadRevision.row_count, checksum: database.oldBadRevision.checksum_sha256 },
    evidence: OUTPUT,
  })}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
