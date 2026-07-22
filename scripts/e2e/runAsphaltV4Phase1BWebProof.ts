import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

import { chromium, type BrowserContext, type Page } from "playwright";

import {
  ASPHALT_PARAMETER_SCHEMA_ID_V4,
  ASPHALT_V4_RUNTIME_TEMPLATE_ID,
  ASPHALT_WORK_ID_V4,
  GREEN_V4_PHASE1D_FULL_ROAD_INFRASTRUCTURE_EXPANDED_PROFESSIONAL_BOQ_END_TO_END_SOFTWARE_SEALED_READY_FOR_ROAD_ENGINEER_AND_ESTIMATOR_REVIEW_NO_RELEASE,
  FULL_ROAD_INFRASTRUCTURE_FASTENER_OWNERSHIP_V4,
  FULL_ROAD_INFRASTRUCTURE_MATERIAL_ROW_IDS_BY_GROUP_V4,
  FULL_ROAD_INFRASTRUCTURE_REQUIRED_ROW_IDS_V4,
  FULL_ROAD_EXPANDED_INFORMATIONAL_COMPONENT_ROW_IDS_V4,
  FULL_ROAD_EXPANDED_REQUIRED_MATERIAL_ROW_IDS_V4,
  FULL_ROAD_EXPANDED_REQUIRED_ROW_IDS_V4,
  FULL_ROAD_EXPANDED_WBS_V4,
  auditFullRoadInfrastructurePhase1DV4,
  compileAsphaltProfessionalEstimateV4,
  validateAsphaltWorkAssemblyCoverageV4,
} from "../../src/lib/estimate/v4/asphalt";
import { formatEstimateUnitLabel } from "../../src/lib/ai/globalEstimate/formatEstimateUnitLabel";
import { decodeConsumerRepairBundleFromDurableStorage } from "../../src/lib/platform/compactConsumerRepairDurableState";

const EVIDENCE_ROOT = path.join(".release-runtime", "ai-estimate-v4-full-road-expanded-boq", "web");
const MANIFEST_KEY = "rik.consumer_repair.request_bundles.v2.manifest";
const BUNDLE_PREFIX = "rik.consumer_repair.request_bundle.v2:";
const LEGACY_KEY = "rik.consumer_repair.request_bundles.v1";
const EXACT_PROMPT = "Полное строительство автомобильной дороги с водоотводом, дорожными знаками, разметкой, барьерным ограждением и освещением, длина 3000 м, ширина 32 м";
type RuntimeBundle = Record<string, any>;

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 10_000,
  }).trim();
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function csvCell(value: unknown): string {
  const text = value == null ? "" : Array.isArray(value) ? value.join("|") : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function contentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".json" || ext === ".map") return "application/json; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".woff") return "font/woff";
  if (ext === ".woff2") return "font/woff2";
  if (ext === ".ttf") return "font/ttf";
  return "application/octet-stream";
}

function staticFile(root: string, requestUrl: string): string | null {
  const url = new URL(requestUrl, "http://127.0.0.1");
  const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const candidate = path.resolve(root, relative || "index.html");
  if (!candidate.startsWith(`${root}${path.sep}`) && candidate !== root) return null;
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  if (path.extname(url.pathname)) return null;
  return path.join(root, "index.html");
}

async function startStaticServer(distDir: string, sourceSha: string) {
  const root = path.resolve(distDir);
  const indexPath = path.join(root, "index.html");
  if (!fs.existsSync(indexPath)) throw new Error(`PRODUCTION_DIST_MISSING:${indexPath}`);
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/health" || url.pathname === "/api/health") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      res.end(JSON.stringify({ status: "ok", source_sha: sourceSha, runtime: "production-static-proof" }));
      return;
    }
    const filePath = staticFile(root, req.url ?? "/");
    if (!filePath) {
      res.writeHead(404);
      res.end("not_found");
      return;
    }
    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(500);
        res.end("static_read_failed");
        return;
      }
      res.writeHead(200, {
        "content-type": contentType(filePath),
        "cache-control": filePath.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable",
      });
      res.end(data);
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("STATIC_SERVER_ADDRESS_MISSING");
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    indexSha256: sha256(fs.readFileSync(indexPath)),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

function currentRevision(bundle: RuntimeBundle): Record<string, any> {
  const state = bundle?.estimateDraftRevisionState;
  const revision = state?.revisions?.find((item: any) => item.revisionId === state.currentRevisionId);
  if (!revision) throw new Error("BROWSER_CURRENT_REVISION_MISSING");
  return revision;
}

async function readLatestBundle(page: Page): Promise<RuntimeBundle> {
  const bundle = await page.evaluate(({ manifestKey, bundlePrefix, legacyKey }) => {
    const parse = (value: string | null) => {
      try { return value ? JSON.parse(value) : null; } catch { return null; }
    };
    const bundles: any[] = [];
    const manifest = parse(window.localStorage.getItem(manifestKey));
    for (const id of Array.isArray(manifest?.bundleIds) ? manifest.bundleIds : []) {
      const item = parse(window.localStorage.getItem(bundlePrefix + encodeURIComponent(String(id))));
      if (item?.draft?.id) bundles.push(item);
    }
    const legacy = parse(window.localStorage.getItem(legacyKey));
    if (Array.isArray(legacy)) bundles.push(...legacy.filter((item) => item?.draft?.id));
    for (const key of Object.keys(window.localStorage)) {
      if (!key.startsWith(bundlePrefix)) continue;
      const item = parse(window.localStorage.getItem(key));
      if (item?.draft?.id && !bundles.some((candidate) => candidate.draft.id === item.draft.id)) bundles.push(item);
    }
    bundles.sort((left, right) => String(right.draft?.updatedAt ?? right.draft?.createdAt ?? "")
      .localeCompare(String(left.draft?.updatedAt ?? left.draft?.createdAt ?? "")));
    return bundles[0] ?? null;
  }, { manifestKey: MANIFEST_KEY, bundlePrefix: BUNDLE_PREFIX, legacyKey: LEGACY_KEY });
  if (!bundle) throw new Error("BROWSER_DURABLE_BUNDLE_MISSING");
  const decoded = decodeConsumerRepairBundleFromDurableStorage(bundle);
  if (!decoded) throw new Error("BROWSER_DURABLE_BUNDLE_DECODE_FAILED");
  return decoded as RuntimeBundle;
}

async function waitForRevisionChange(page: Page, previousRevisionId: string): Promise<RuntimeBundle> {
  let latest: RuntimeBundle | null = null;
  await page.waitForFunction(({ manifestKey, bundlePrefix, previous }) => {
    const parse = (value: string | null) => {
      try { return value ? JSON.parse(value) : null; } catch { return null; }
    };
    const manifest = parse(window.localStorage.getItem(manifestKey));
    const ids = Array.isArray(manifest?.bundleIds) ? manifest.bundleIds : [];
    return ids.some((id: unknown) => {
      const bundle = parse(window.localStorage.getItem(bundlePrefix + encodeURIComponent(String(id))));
      return bundle?.estimateDraftRevisionState?.currentRevisionId &&
        bundle.estimateDraftRevisionState.currentRevisionId !== previous;
    });
  }, { manifestKey: MANIFEST_KEY, bundlePrefix: BUNDLE_PREFIX, previous: previousRevisionId }, { timeout: 30_000 });
  latest = await readLatestBundle(page);
  return latest;
}

async function prepareRequest(page: Page, baseUrl: string, prompt: string): Promise<RuntimeBundle> {
  await page.goto(`${baseUrl}/request`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 45_000 });
  await page.getByTestId("consumer-repair-city-input").fill("Бишкек");
  await page.getByTestId("consumer-repair-address-input").fill("Тестовая площадка Phase 1C");
  await page.getByTestId("consumer-repair-time-input").fill("По согласованию");
  await page.getByTestId("consumer-repair-phone-input").fill("0700000000");
  await page.getByTestId("consumer-repair-problem-input").fill(prompt);
  await page.getByTestId("consumer-repair-prepare-draft").click();
  await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 60_000 });
  return readLatestBundle(page);
}

async function openAllParameters(page: Page): Promise<void> {
  if (await page.getByTestId("request-estimate-parameter-panel").count() === 0) {
    await page.getByTestId("request-estimate-parameters-toggle").click();
    await page.getByTestId("request-estimate-parameter-panel").waitFor({ timeout: 20_000 });
  }
  const showMore = page.getByTestId("request-estimate-show-more-parameters");
  if (await showMore.count() > 0) await showMore.click();
}

async function setEditorValue(page: Page, key: string, value: string): Promise<boolean> {
  const editor = page.getByTestId(`editable-param-inline-editor-${key}`);
  if (await editor.count() === 0) return false;
  const option = page.getByTestId(`editable-param-option-${key}-${value}`);
  if (await option.count() > 0) {
    await option.first().click();
    return true;
  }
  const input = editor.getByTestId("editable-param-popover-input");
  if (await input.count() > 0) {
    await input.fill(value);
    return true;
  }
  return false;
}

async function updateOneParameter(page: Page, key: string, value: string): Promise<RuntimeBundle> {
  await openAllParameters(page);
  const before = await readLatestBundle(page);
  const previousRevisionId = currentRevision(before).revisionId;
  if (!await setEditorValue(page, key, value)) throw new Error(`REVISION_EDITOR_MISSING:${key}`);
  await page.getByTestId("editable-param-batch-apply").click({ force: true });
  return waitForRevisionChange(page, previousRevisionId);
}

async function setAndWaitForManualPrice(page: Page, unitPrice: number) {
  const input = page
    .getByTestId("request-estimate-section-asphalt_materials")
    .locator('[data-testid^="consumer-repair-item-unit-price-input-"]')
    .first();
  await input.waitFor({ timeout: 20_000 });
  const inputTestId = await input.getAttribute("data-testid");
  await input.fill(String(unitPrice));
  await input.blur();
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const bundle = await readLatestBundle(page);
    const editableState = bundle.estimateRevisionState;
    const editableRevision = editableState?.revisions?.find((revision: any) => revision.revision_id === editableState.current_revision_id);
    const pricedRow = editableRevision?.editable_estimate_snapshot?.rows?.find((row: any) => row.unitPrice === unitPrice)
      ?? bundle.editableEstimateSnapshot?.rows?.find((row: any) => row.unitPrice === unitPrice)
      ?? bundle.items?.find((row: any) => row.unitPrice === unitPrice);
    if (pricedRow) {
      return {
        bundle,
        inputTestId,
        editableRowId: pricedRow.rowId ?? pricedRow.id,
        rowId: pricedRow.sourceParameters?.rowCode ?? pricedRow.rowId ?? pricedRow.id,
        unitPrice,
      };
    }
    await page.waitForTimeout(100);
  }
  throw new Error("MANUAL_PRICE_DURABLE_COMMIT_TIMEOUT");
}

function rowProjection(revision: Record<string, any>) {
  return (revision.boq?.rows ?? []).map((row: any) => ({
    row_id: row.rowId,
    category: row.category ?? null,
    quantity: row.quantity,
    unit_id: row.unit,
  }));
}

function itemProjection(bundle: RuntimeBundle) {
  return (bundle.items ?? []).map((item: any) => ({
    row_id: item.sourceParameters?.rowCode ?? "",
    category: item.category ?? null,
    quantity: item.quantity,
    unit_id: item.unit,
  }));
}

function runtimeInvariants(bundle: RuntimeBundle, procurementOutputRowIds: string[], renderedRowCount: number) {
  const revision = currentRevision(bundle);
  const core = rowProjection(revision);
  const durableUi = itemProjection(bundle);
  const ui = durableUi.length > 0 ? durableUi : core;
  const expectedProcurement = (revision.boq?.rows ?? []).filter((row: any) => row.includedInProcurement).map((row: any) => row.rowId);
  const counters = {
    work_id_mismatch: revision.professionalWorkId === ASPHALT_WORK_ID_V4 && revision.matchedFamily === ASPHALT_WORK_ID_V4 ? 0 : 1,
    template_id_mismatch: revision.selectedTemplateId === ASPHALT_V4_RUNTIME_TEMPLATE_ID ? 0 : 1,
    parameter_schema_mismatch: revision.workSpecificParameterSchemaId === ASPHALT_PARAMETER_SCHEMA_ID_V4 ? 0 : 1,
    ui_boq_signature_mismatch: sha256(JSON.stringify(ui)) === sha256(JSON.stringify(core)) ? 0 : 1,
    procurement_output_signature_mismatch: JSON.stringify(procurementOutputRowIds) === JSON.stringify(expectedProcurement) ? 0 : 1,
    row_count_mismatch: ui.length === core.length ? 0 : 1,
    rendered_row_count_mismatch: renderedRowCount === core.length ? 0 : 1,
    legacy_rows: revision.legacyRowsCount
      ?? (revision.boq?.rows ?? []).filter((row: any) => row.sourceParameters?.asphaltV4 !== true).length,
  };
  return {
    counters,
    ui_projection_source: durableUi.length > 0 ? "durable_bundle_items" : "revision_model_rendered_by_editor",
    core_signature: sha256(JSON.stringify(core)),
    ui_signature: sha256(JSON.stringify(ui)),
    row_count: core.length,
    rendered_row_count: renderedRowCount,
    procurement_output_row_count: procurementOutputRowIds.length,
  };
}

async function run() {
  const distArg = process.argv.find((arg) => arg.startsWith("--dist-dir="))?.slice("--dist-dir=".length) ?? "dist";
  const sourceSha = git(["rev-parse", "HEAD"]);
  const branch = git(["branch", "--show-current"]);
  const sourceTreeBefore = git(["status", "--porcelain"]);
  const upstream = git(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " ");
  if (sourceTreeBefore) throw new Error(`SOURCE_TREE_NOT_CLEAN:${sourceTreeBefore.replace(/\r?\n/g, "|")}`);
  if (upstream !== "0 0") throw new Error(`SOURCE_NOT_PUSHED:${upstream}`);

  const outDir = path.resolve(EVIDENCE_ROOT, timestampForPath());
  fs.mkdirSync(outDir, { recursive: true });
  const server = await startStaticServer(distArg, sourceSha);
  const healthBefore = await fetch(`${server.baseUrl}/health`).then((response) => response.json());
  const browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.addInitScript("globalThis.__name = (target) => target;");
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  let summary: Record<string, any>;
  try {
    let exactBundle = await prepareRequest(page, server.baseUrl, EXACT_PROMPT);
    const exactRevision = currentRevision(exactBundle);
    let exactCompilation = compileAsphaltProfessionalEstimateV4({ raw_text: EXACT_PROMPT });
    let exactCoverage = validateAsphaltWorkAssemblyCoverageV4(exactCompilation);
    let exactEvidenceRows = exactCompilation.compiled_rows.map((row) => {
      const formula = exactCompilation.passport.formulas.find((item) => item.formula_id === row.definition.formula_id);
      return {
        row_id: row.definition.row_id,
        wbs_code: row.definition.wbs_code,
        parent_wbs_id: row.definition.parent_wbs_id,
        category: row.definition.professional_category,
        internal_category: row.definition.category,
        professional_name: row.definition.professional_name_ru,
        specification: row.definition.technical_specification_ru,
        quantity: row.quantity,
        unit: row.definition.unit_id,
        unit_label: formatEstimateUnitLabel(row.definition.unit_id ?? ""),
        formula: formula?.expression ?? null,
        assumption_ids: row.assumption_ids,
        source_ids: formula?.source_ids ?? [],
        costing_mode: row.definition.costing_mode,
        cost_ownership_id: row.definition.cost_ownership_id,
        component_type: row.definition.component_type,
        specification_status: row.definition.specification_status,
        informational: row.definition.informational,
        priced: row.definition.priced,
        unit_price: null as number | null,
        amount: null as number | null,
        price_source: null as string | null,
        procurement_eligible: row.included_in_procurement,
      };
    });
    let exactRenderedRowCount = await page.locator('[data-testid^="consumer-repair-item-consumer_item_"]').count();
    const exactEditorScreenshot = path.join(outDir, "full-road-infrastructure-3000x32-editor.png");
    await page.screenshot({ path: exactEditorScreenshot, fullPage: true });
    await page.getByTestId("request-estimate-section-asphalt_materials").scrollIntoViewIfNeeded();
    const exactBoqVisibleScreenshot = path.join(outDir, "full-road-infrastructure-3000x32-boq-visible.png");
    await page.screenshot({ path: exactBoqVisibleScreenshot });
    await openAllParameters(page);
    const exactBody = await page.locator("body").innerText();
    const internalPublicTokens = [...new Set([
      ...(exactRevision.boq?.rows ?? []).map((row: any) => String(row.rowId ?? "")),
      ...Object.keys(exactRevision.params ?? {}),
      ...Object.values(exactRevision.params ?? {}).map((param: any) => typeof param?.value === "string" ? param.value : ""),
      "coarse_lower",
      "dense_fine",
      "machine_hour",
      "man_hour",
      "t_km",
    ].filter((value) => value.includes("_")))];
    const exactScreenshot = path.join(outDir, "A-exact-request-work-specific-questions.png");
    await page.screenshot({ path: exactScreenshot, fullPage: true });
    const exactProof = {
      prompt: EXACT_PROMPT,
      selected_work_key: exactBundle.draft?.selectedWorkKey ?? null,
      professional_work_id: exactRevision.professionalWorkId ?? null,
      selected_template_id: exactRevision.selectedTemplateId ?? null,
      work_specific_parameter_schema_id: exactRevision.workSpecificParameterSchemaId ?? null,
      area_m2: exactRevision.params?.area_m2?.value ?? null,
      length_m: exactRevision.params?.length_m?.value ?? null,
      width_m: exactRevision.params?.width_m?.value ?? null,
      quantity_basis: exactRevision.quantityBasis ?? null,
      assembly_id: exactRevision.workAssemblyId ?? null,
      boq_rows: exactRevision.boq?.rows?.length ?? 0,
      rendered_boq_rows: exactRenderedRowCount,
      work_assembly_coverage: exactCoverage,
      professional_boq_evidence: exactEvidenceRows,
      quantity_missing: exactRevision.boq?.rows?.filter((row: any) => row.quantity == null || !(row.quantity > 0)).length ?? 0,
      legacy_rows: exactRevision.legacyRowsCount ?? null,
      immediate_scope_visible: await page.getByTestId("request-estimate-items-editor").count() > 0,
      immediate_material_rows: await page.getByTestId("request-estimate-section-asphalt_materials").locator('[data-testid^="consumer-repair-item-consumer_item_"]').count(),
      immediate_work_rows: await page.getByTestId("request-estimate-section-asphalt_works").locator('[data-testid^="consumer-repair-item-consumer_item_"]').count(),
      immediate_equipment_rows: await page.getByTestId("request-estimate-section-asphalt_machinery").locator('[data-testid^="consumer-repair-item-consumer_item_"]').count(),
      immediate_service_rows: await page.getByTestId("request-estimate-section-asphalt_services").locator('[data-testid^="consumer-repair-item-consumer_item_"]').count(),
      immediate_lab_rows: await page.getByTestId("request-estimate-section-asphalt_lab_control").locator('[data-testid^="consumer-repair-item-consumer_item_"]').count(),
      immediate_documentation_rows: await page.getByTestId("request-estimate-section-asphalt_documentation").locator('[data-testid^="consumer-repair-item-consumer_item_"]').count(),
      internal_ids_visible: internalPublicTokens.filter((value) => exactBody.includes(value)),
      editable_price_inputs: await page.locator('[data-testid^="consumer-repair-item-unit-price-input-"]').count(),
      required_labels_visible: [
        "Тип объекта",
        "Новое строительство или ремонт",
        "Количество асфальтобетонных слоёв",
        "Асфальтобетонный слой 1",
      ].map((label) => ({ label, visible: exactBody.includes(label) })),
      forbidden_generic_labels_visible: [
        "Высота",
        "Материал и марка",
        "Геология и профиль",
        "Сложность работ",
      ].filter((label) => exactBody.split(/\r?\n/u).some((line) => line.trim() === label || line.trim().startsWith(`${label}:`))),
      screenshot: path.relative(process.cwd(), exactScreenshot).replace(/\\/g, "/"),
      editor_screenshot: path.relative(process.cwd(), exactEditorScreenshot).replace(/\\/g, "/"),
      boq_visible_screenshot: path.relative(process.cwd(), exactBoqVisibleScreenshot).replace(/\\/g, "/"),
    };

    const lifecycleStartedAt = Date.now();
    const initialRowIds = exactRevision.boq.rows.map((row: any) => row.rowId);
    const lightingPoleBefore = exactRevision.boq.rows.find((row: any) => row.rowId === "lighting_pole")?.quantity;
    const independentAsphaltBefore = exactRevision.boq.rows.find((row: any) => row.rowId === "asphalt_layer_1_material")?.quantity;
    exactBundle = await updateOneParameter(page, "lighting_pole_spacing_m", "50");
    const revisedExactRevision = currentRevision(exactBundle);
    const revisedRowIds = revisedExactRevision.boq.rows.map((row: any) => row.rowId);
    const lightingPoleAfter = revisedExactRevision.boq.rows.find((row: any) => row.rowId === "lighting_pole")?.quantity;
    const independentAsphaltAfter = revisedExactRevision.boq.rows.find((row: any) => row.rowId === "asphalt_layer_1_material")?.quantity;
    exactRenderedRowCount = await page.locator('[data-testid^="consumer-repair-item-consumer_item_"]').count();
    const revisionScreenshot = path.join(outDir, "full-road-infrastructure-3000x32-revision-diff.png");
    const runtimeToggle = page.getByTestId("request-estimate-runtime-details-toggle");
    if (await runtimeToggle.count() > 0) await runtimeToggle.click();
    if (await page.getByTestId("estimate-revision-diff").count() > 0) {
      await page.getByTestId("estimate-revision-diff").waitFor({ timeout: 20_000 });
    }
    await page.screenshot({ path: revisionScreenshot, fullPage: true });

    const manualPriceProof = await setAndWaitForManualPrice(page, 12_345);
    exactBundle = manualPriceProof.bundle;
    const pricedExactRevision = currentRevision(exactBundle);
    const pricedExactRowIds = pricedExactRevision.boq.rows.map((row: any) => row.rowId);
    exactCompilation = compileAsphaltProfessionalEstimateV4({
      raw_text: EXACT_PROMPT,
      parameter_overrides: { lighting_pole_spacing_m: { value: 50, source: "edited_by_user" } },
    });
    exactCoverage = validateAsphaltWorkAssemblyCoverageV4(exactCompilation);
    exactEvidenceRows = exactCompilation.compiled_rows.map((row) => {
      const formula = exactCompilation.passport.formulas.find((item) => item.formula_id === row.definition.formula_id);
      const manuallyPriced = row.definition.row_id === manualPriceProof.rowId;
      return {
        row_id: row.definition.row_id,
        wbs_code: row.definition.wbs_code,
        parent_wbs_id: row.definition.parent_wbs_id,
        category: row.definition.professional_category,
        internal_category: row.definition.category,
        professional_name: row.definition.professional_name_ru,
        specification: row.definition.technical_specification_ru,
        quantity: row.quantity,
        unit: row.definition.unit_id,
        unit_label: formatEstimateUnitLabel(row.definition.unit_id ?? ""),
        formula: formula?.expression ?? null,
        assumption_ids: row.assumption_ids,
        source_ids: formula?.source_ids ?? [],
        costing_mode: row.definition.costing_mode,
        cost_ownership_id: row.definition.cost_ownership_id,
        component_type: row.definition.component_type,
        specification_status: row.definition.specification_status,
        informational: row.definition.informational,
        priced: manuallyPriced,
        unit_price: manuallyPriced ? manualPriceProof.unitPrice : null,
        amount: manuallyPriced ? Number((row.quantity * manualPriceProof.unitPrice).toFixed(2)) : null,
        price_source: manuallyPriced ? "USER_ENTERED_PRICE" : null,
        procurement_eligible: row.included_in_procurement,
      };
    });
    exactProof.boq_rows = pricedExactRevision.boq.rows.length;
    exactProof.rendered_boq_rows = exactRenderedRowCount;
    exactProof.work_assembly_coverage = exactCoverage;
    exactProof.professional_boq_evidence = exactEvidenceRows;
    exactProof.quantity_missing = pricedExactRevision.boq.rows.filter((row: any) => !(row.quantity > 0)).length;

    const exactProcurementButton = page.getByTestId("consumer-estimate-open-procurement").first();
    await exactProcurementButton.waitFor({ timeout: 30_000 });
    await exactProcurementButton.click({ force: true });
    await page.getByTestId("consumer-estimate-procurement-list").waitFor({ timeout: 30_000 });
    const exactProcurementRowIds = await page.locator('[data-testid^="consumer-estimate-procurement-row-"]').evaluateAll((nodes) => nodes.map((node) =>
      (node.getAttribute("data-testid") ?? "").slice("consumer-estimate-procurement-row-".length)
    ));
    const exactProcurementScreenshot = path.join(outDir, "full-road-infrastructure-3000x32-procurement.png");
    await page.screenshot({ path: exactProcurementScreenshot, fullPage: true });
    const exactRuntimeInvariants = runtimeInvariants(exactBundle, exactProcurementRowIds, exactRenderedRowCount);

    const exactPdfButton = page.getByTestId("consumer-estimate-make-pdf").first();
    await exactPdfButton.waitFor({ timeout: 30_000 });
    // A 600+ row PDF is rendered synchronously in the browser before the click
    // promise can settle. Keep the product path unchanged and give that one
    // bounded action enough time to complete on slower proof machines.
    const pdfStartedAt = Date.now();
    await exactPdfButton.click({ force: true, timeout: 180_000, noWaitAfter: true });
    await page.waitForURL((url) => url.pathname.includes("/pdf-viewer"), { timeout: 30_000 });
    const exactPdfUri = new URL(page.url()).searchParams.get("uri");
    if (!exactPdfUri?.startsWith("data:application/pdf;base64,")) throw new Error("EXACT_EXPANDED_PDF_DATA_URI_MISSING");
    const exactPdfPath = path.join(outDir, "full-road-infrastructure-3000x32.pdf");
    const exactPdfBuffer = Buffer.from(exactPdfUri.slice("data:application/pdf;base64,".length), "base64");
    fs.writeFileSync(exactPdfPath, exactPdfBuffer);
    const exactPdfPageCount = (exactPdfBuffer.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length;
    const exactPdfDurationMs = Date.now() - pdfStartedAt;
    const exactPdfScreenshot = path.join(outDir, "full-road-infrastructure-3000x32-pdf-viewer.png");
    await page.screenshot({ path: exactPdfScreenshot, fullPage: true });

    const pdfBoundBundle = await readLatestBundle(page);
    const pdfBoundEditableState = pdfBoundBundle.estimateRevisionState;
    const pdfBoundEditableRevision = pdfBoundEditableState?.revisions?.find((revision: any) =>
      revision.revision_id === pdfBoundEditableState.current_revision_id
    );
    const exactGeneratedPdfBeforeRestore = pdfBoundBundle.pdfs?.find((pdf: any) => pdf.pdfStatus === "generated") ?? null;
    const storageRecovery = await page.evaluate(() => {
      const entries = Object.entries(window.localStorage);
      window.localStorage.clear();
      const cleared = window.localStorage.length === 0;
      for (const [key, value] of entries) window.localStorage.setItem(key, value);
      return { entries_saved: entries.length, store_cleared: cleared, entries_restored: window.localStorage.length };
    });
    await page.goto(`${server.baseUrl}/request`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 30_000 });
    const reopenedExactBundle = await readLatestBundle(page);
    const reopenedExactRevision = currentRevision(reopenedExactBundle);
    const reopenedRenderedRowCount = await page.locator('[data-testid^="consumer-repair-item-consumer_item_"]').count();
    const reopenedScreenshot = path.join(outDir, "full-road-infrastructure-3000x32-reopened.png");
    await page.screenshot({ path: reopenedScreenshot, fullPage: true });
    const reopenedEditableState = reopenedExactBundle.estimateRevisionState;
    const reopenedEditableRevision = reopenedEditableState?.revisions?.find((revision: any) =>
      revision.revision_id === reopenedEditableState.current_revision_id
    );
    const reopenedPricedRow = reopenedEditableRevision?.editable_estimate_snapshot?.rows?.find((row: any) =>
      row.rowId === manualPriceProof.editableRowId
    ) ?? reopenedExactBundle.editableEstimateSnapshot?.rows?.find((row: any) => row.rowId === manualPriceProof.editableRowId)
      ?? reopenedExactBundle.items?.find((row: any) => row.id === manualPriceProof.editableRowId);
    const exactGeneratedPdf = reopenedExactBundle.pdfs?.find((pdf: any) => pdf.pdfStatus === "generated")
      ?? exactGeneratedPdfBeforeRestore;
    const reopenProof = {
      store_recovery: storageRecovery,
      assembly_id_before: pricedExactRevision.workAssemblyId ?? null,
      assembly_id_after: reopenedExactRevision.workAssemblyId ?? null,
      row_identity_preserved: JSON.stringify(pricedExactRowIds) === JSON.stringify(reopenedExactRevision.boq.rows.map((row: any) => row.rowId)),
      row_quantity_hash_before: sha256(JSON.stringify(rowProjection(pricedExactRevision))),
      row_quantity_hash_after: sha256(JSON.stringify(rowProjection(reopenedExactRevision))),
      row_count_before: pricedExactRowIds.length,
      row_count_after: reopenedExactRevision.boq.rows.length,
      rendered_row_count_after: reopenedRenderedRowCount,
      manual_price_row_id: manualPriceProof.rowId,
      manual_price_editable_row_id: manualPriceProof.editableRowId,
      manual_price_before: manualPriceProof.unitPrice,
      manual_price_after: reopenedPricedRow?.unitPrice ?? null,
      pdf_revision_rows_hash: exactGeneratedPdf?.revisionRowsHash ?? null,
      editable_revision_rows_hash: reopenedEditableRevision?.rows_hash ?? pdfBoundEditableRevision?.rows_hash ?? null,
      pdf_rows_hash_matches_revision: Boolean(
        exactGeneratedPdf?.revisionRowsHash
        && exactGeneratedPdf.revisionRowsHash === (reopenedEditableRevision?.rows_hash ?? pdfBoundEditableRevision?.rows_hash)
      ),
    };
    const lifecycleEvidence = {
      revision_id_before: exactRevision.revisionId,
      revision_id_after: revisedExactRevision.revisionId,
      revision_created: exactRevision.revisionId !== revisedExactRevision.revisionId,
      row_identity_preserved: JSON.stringify(initialRowIds) === JSON.stringify(revisedRowIds),
      changed_parameter: { key: "lighting_pole_spacing_m", before: 35, after: 50 },
      dependent_quantity: { row_id: "lighting_pole", before: lightingPoleBefore, after: lightingPoleAfter, changed: lightingPoleBefore !== lightingPoleAfter },
      independent_quantity: { row_id: "asphalt_layer_1_material", before: independentAsphaltBefore, after: independentAsphaltAfter, unchanged: independentAsphaltBefore === independentAsphaltAfter },
      manual_price: {
        input_test_id: manualPriceProof.inputTestId,
        row_id: manualPriceProof.rowId,
        editable_row_id: manualPriceProof.editableRowId,
        unit_price: manualPriceProof.unitPrice,
      },
      reopen: reopenProof,
      duration_ms: Date.now() - lifecycleStartedAt,
    };

    const expandedEstimate = {
      schema_version: "AsphaltExpandedProfessionalEstimateEvidenceV1",
      generated_at: new Date().toISOString(),
      source_sha: sourceSha,
      scope_id: exactCompilation.preliminary_assembly_policy.public_scope_id,
      scope_title_ru: exactCompilation.preliminary_assembly_policy.profile_title_ru,
      quantity_basis: exactCompilation.quantity_basis,
      quantity_coverage: exactEvidenceRows.length === 0 ? 0 : exactEvidenceRows.filter((row) => row.quantity > 0).length / exactEvidenceRows.length,
      price_coverage: exactEvidenceRows.length === 0 ? 0 : exactEvidenceRows.filter((row) => row.unit_price != null).length / exactEvidenceRows.length,
      amount_coverage: exactEvidenceRows.length === 0 ? 0 : exactEvidenceRows.filter((row) => row.amount != null).length / exactEvidenceRows.length,
      total_amount: null,
      display_total_ru: "Итог не рассчитан: цены заполнены не для всех строк",
      total_confidence: "PRICE_AND_EXPERT_REVIEW_REQUIRED",
      rows: exactEvidenceRows,
    };
    const categoryCounts = [
      "MATERIAL",
      "PRODUCT",
      "LABOR",
      "WORK",
      "EQUIPMENT",
      "MACHINERY",
      "SERVICE",
      "LOGISTICS",
      "LAB_CONTROL",
      "DOCUMENTATION",
      "SUBTOTAL_INFORMATIONAL",
    ].reduce<Record<string, number>>((counts, category) => {
      counts[category] = exactEvidenceRows.filter((row) => row.category === category).length;
      return counts;
    }, {});
    const evidenceCounters = {
      rows_total: exactEvidenceRows.length,
      category_counts: categoryCounts,
      informational_rows: exactEvidenceRows.filter((row) => row.informational === true).length,
      priced_rows: exactEvidenceRows.filter((row) => row.priced === true).length,
      rows_with_price: exactEvidenceRows.filter((row) => row.unit_price != null).length,
      rows_without_price: exactEvidenceRows.filter((row) => row.unit_price == null).length,
      rows_without_quantity: exactEvidenceRows.filter((row) => !(row.quantity > 0)).length,
      manifest_coverage: exactCoverage.manifest_coverage_ratio,
      double_count_blockers: exactCoverage.counters.double_cost_ownership
        + exactCoverage.counters.duplicate_physical_resources
        + exactCoverage.counters.priced_analytical_rows
        + exactCoverage.counters.priced_informational_subtotals,
    };
    const phase1dAudit = auditFullRoadInfrastructurePhase1DV4(exactCompilation);
    const scalingPrompts = [
      [100, 7],
      [1000, 14],
      [3000, 32],
      [10000, 32],
    ] as const;
    const geometryScaling = scalingPrompts.map(([length, width]) => {
      const compilation = compileAsphaltProfessionalEstimateV4({
        raw_text: `Полное строительство автомобильной дороги длиной ${length} м, шириной ${width} м`,
      });
      const categoryQuantityTotals = ["MATERIAL", "WORK", "LABOR", "MACHINERY", "LOGISTICS", "LAB_CONTROL"].reduce<Record<string, number>>((totals, category) => {
        totals[category] = Number(compilation.compiled_rows
          .filter((row) => row.definition.professional_category === category)
          .reduce((sum, row) => sum + row.quantity, 0).toFixed(6));
        return totals;
      }, {});
      return {
        length_m: length,
        width_m: width,
        area_m2: length * width,
        rows: compilation.compiled_rows.length,
        procurement_rows: compilation.passport.procurement_lines.length,
        category_quantity_totals: categoryQuantityTotals,
        discrete_quantity_failures: compilation.compiled_rows.filter((row) =>
          ["pcs", "trip", "test", "document", "service"].includes(row.definition.unit_id ?? "")
          && (!Number.isInteger(row.quantity) || row.quantity <= 0)
        ).map((row) => row.definition.row_id),
      };
    });
    const scalingCategories = ["MATERIAL", "WORK", "LABOR", "MACHINERY", "LOGISTICS", "LAB_CONTROL"];
    const geometryScalingEvidence = {
      scenarios: geometryScaling,
      strictly_increasing_categories: Object.fromEntries(scalingCategories.map((category) => [category, geometryScaling.every((scenario, index) =>
        index === 0 || scenario.category_quantity_totals[category] > geometryScaling[index - 1].category_quantity_totals[category]
      )])),
      discrete_quantity_failures: geometryScaling.flatMap((scenario) => scenario.discrete_quantity_failures),
    };
    const expandedJsonPath = path.join(outDir, "full-road-infrastructure-3000x32-estimate.json");
    writeJson(expandedJsonPath, { ...expandedEstimate, counters: evidenceCounters });
    fs.writeFileSync(path.join(outDir, "exact-input.txt"), `${EXACT_PROMPT}\n`, "utf8");
    const csvHeaders = ["row_id", "wbs_code", "parent_wbs_id", "category", "professional_name", "specification", "specification_status", "quantity", "unit", "unit_label", "formula", "assumption_ids", "source_ids", "costing_mode", "cost_ownership_id", "component_type", "informational", "priced", "unit_price", "amount", "price_source", "procurement_eligible"];
    const csv = [
      csvHeaders.map(csvCell).join(","),
      ...exactEvidenceRows.map((row) => csvHeaders.map((header) => csvCell((row as Record<string, unknown>)[header])).join(",")),
    ].join("\n");
    const expandedCsvPath = path.join(outDir, "full-road-infrastructure-3000x32-estimate.csv");
    fs.writeFileSync(expandedCsvPath, `${csv}\n`, "utf8");
    const materialEvidenceRows = exactEvidenceRows.filter((row) => row.category === "MATERIAL" || row.category === "EQUIPMENT");
    const rowById = new Map(exactEvidenceRows.map((row) => [row.row_id, row]));
    const groupMaterialMissing = (groups: (keyof typeof FULL_ROAD_INFRASTRUCTURE_MATERIAL_ROW_IDS_BY_GROUP_V4)[]) => groups
      .flatMap((group) => FULL_ROAD_INFRASTRUCTURE_MATERIAL_ROW_IDS_BY_GROUP_V4[group])
      .filter((rowId) => !((rowById.get(rowId)?.quantity ?? 0) > 0)).length;
    const allRowsFor = (groups: (keyof typeof FULL_ROAD_INFRASTRUCTURE_MATERIAL_ROW_IDS_BY_GROUP_V4)[]) => {
      const ids = new Set(FULL_ROAD_INFRASTRUCTURE_REQUIRED_ROW_IDS_V4.filter((rowId) => groups.some((group) => (
        FULL_ROAD_INFRASTRUCTURE_MATERIAL_ROW_IDS_BY_GROUP_V4[group].includes(rowId) ||
        rowId.startsWith(`${group}_`) ||
        (group === "storm_pipe" && rowId.startsWith("storm_sewer_")) ||
        (group === "sign" && rowId.startsWith("traffic_management_"))
      ))));
      return exactEvidenceRows.filter((row) => ids.has(row.row_id));
    };
    const pavementMaterialIds = [
      "geotextile_material", "sand_material", "crushed_layer_1_material", "crushed_layer_2_material",
      "base_emulsion_material", "asphalt_layer_1_material", "emulsion_interface_1_2", "asphalt_layer_2_material",
      "emulsion_interface_2_3", "asphalt_layer_3_material", "joint_sealing_material",
    ];
    const requiredMaterialIds = [...new Set([
      ...pavementMaterialIds,
      ...Object.values(FULL_ROAD_INFRASTRUCTURE_MATERIAL_ROW_IDS_BY_GROUP_V4).flat(),
      ...FULL_ROAD_EXPANDED_REQUIRED_MATERIAL_ROW_IDS_V4,
    ])];
    const procurementExpectedIds = exactEvidenceRows.filter((row) => row.procurement_eligible).map((row) => row.row_id);
    const materialCompletenessCounters = {
      pavementMaterialsMissing: pavementMaterialIds.filter((rowId) => !rowById.has(rowId)).length,
      curbMaterialsMissing: groupMaterialMissing(["curb"]),
      drainageMaterialsMissing: groupMaterialMissing(["drainage", "storm_inlet"]),
      stormSewerMaterialsMissing: groupMaterialMissing(["storm_pipe", "storm_well"]),
      markingMaterialsMissing: groupMaterialMissing(["marking"]),
      signMaterialsMissing: groupMaterialMissing(["sign"]),
      signFoundationMaterialsMissing: groupMaterialMissing(["sign_foundation"]),
      barrierMaterialsMissing: groupMaterialMissing(["barrier"]),
      lightingMaterialsMissing: groupMaterialMissing(["lighting"]),
      expandedRowsMissing: FULL_ROAD_EXPANDED_REQUIRED_ROW_IDS_V4.filter((rowId) => !rowById.has(rowId)).length,
      expandedMaterialsMissing: FULL_ROAD_EXPANDED_REQUIRED_MATERIAL_ROW_IDS_V4.filter((rowId) => !rowById.has(rowId)).length,
      allRequiredMaterialRowsMissing: requiredMaterialIds.filter((rowId) => !rowById.has(rowId)).length,
      wbsSectionsMissing: Object.keys(FULL_ROAD_EXPANDED_WBS_V4).filter((wbs) => !exactEvidenceRows.some((row) => row.wbs_code === wbs)).length,
      fastenerOwnershipErrors: Object.entries(FULL_ROAD_INFRASTRUCTURE_FASTENER_OWNERSHIP_V4).filter(([rowId, group]) => rowById.get(rowId)?.cost_ownership_id !== `infra:${group}:${rowId}`).length,
      quantityMissing: exactEvidenceRows.filter((row) => !(row.quantity > 0)).length,
      unitMissing: exactEvidenceRows.filter((row) => !row.unit).length,
      formulaMissing: exactEvidenceRows.filter((row) => !row.formula).length,
      sourceOrAssumptionMissing: exactEvidenceRows.filter((row) => row.source_ids.length === 0 || row.assumption_ids.length === 0).length,
      genericMaterialNames: materialEvidenceRows.filter((row) => /^(?:материалы?|товары?|оборудование|комплект|прочее)$/iu.test(row.professional_name)).length,
      paddingRows: exactEvidenceRows.filter((row) => /(?:padding|заполнитель строки|резервная строка)/iu.test(`${row.row_id} ${row.professional_name}`)).length,
      internalTokensVisible: exactProof.internal_ids_visible.length,
      duplicateMaterialOwnership: materialEvidenceRows.length - new Set(materialEvidenceRows.map((row) => row.cost_ownership_id)).size,
      procurementParityFailures: JSON.stringify(exactProcurementRowIds) === JSON.stringify(procurementExpectedIds) ? 0 : 1,
      informationalComponentsInProcurement: FULL_ROAD_EXPANDED_INFORMATIONAL_COMPONENT_ROW_IDS_V4.filter((rowId) => rowById.get(rowId)?.procurement_eligible === true).length,
    };
    writeJson(path.join(outDir, "full-road-infrastructure-material-manifest.json"), {
      scope_id: "NEW_FULL_ROAD_INFRASTRUCTURE",
      material_count: materialEvidenceRows.length,
      procurement_count: exactProcurementRowIds.length,
      counters: materialCompletenessCounters,
      materials: materialEvidenceRows,
    });
    writeJson(path.join(outDir, "full-road-all-materials-manifest.json"), {
      scope_id: "NEW_FULL_ROAD_INFRASTRUCTURE",
      required_material_row_ids: requiredMaterialIds,
      missing_material_row_ids: requiredMaterialIds.filter((rowId) => !rowById.has(rowId)),
      informational_mix_component_row_ids: FULL_ROAD_EXPANDED_INFORMATIONAL_COMPONENT_ROW_IDS_V4,
      informational_components_in_procurement: materialCompletenessCounters.informationalComponentsInProcurement,
      rows: materialEvidenceRows,
    });
    writeJson(path.join(outDir, "full-road-expanded-wbs.json"), {
      scope_id: "NEW_FULL_ROAD_INFRASTRUCTURE",
      required_sections: FULL_ROAD_EXPANDED_WBS_V4,
      missing_sections: Object.keys(FULL_ROAD_EXPANDED_WBS_V4).filter((wbs) => !exactEvidenceRows.some((row) => row.wbs_code === wbs)),
      sections: Object.entries(FULL_ROAD_EXPANDED_WBS_V4).map(([wbs_code, title_ru]) => ({
        wbs_code,
        title_ru,
        row_count: exactEvidenceRows.filter((row) => row.wbs_code === wbs_code).length,
        row_ids: exactEvidenceRows.filter((row) => row.wbs_code === wbs_code).map((row) => row.row_id),
      })),
    });
    writeJson(path.join(outDir, "wbs-coverage-matrix.json"), {
      scope_id: "NEW_FULL_ROAD_INFRASTRUCTURE",
      columns: ["materials", "works", "labor", "machinery", "logistics", "testing", "documents"],
      blocker_counters: phase1dAudit.counters,
      matrix: phase1dAudit.matrix,
    });
    writeJson(path.join(outDir, "professional-blocker-audit.json"), phase1dAudit);
    writeJson(path.join(outDir, "geometry-scaling.json"), geometryScalingEvidence);
    writeJson(path.join(outDir, "lifecycle-parity.json"), lifecycleEvidence);
    writeJson(path.join(outDir, "revision-reopen-evidence.json"), reopenProof);
    writeJson(path.join(outDir, "performance-metrics.json"), {
      lifecycle_duration_ms: lifecycleEvidence.duration_ms,
      pdf_duration_ms: exactPdfDurationMs,
      pdf_bytes: exactPdfBuffer.length,
      pdf_pages: exactPdfPageCount,
      rendered_rows: exactRenderedRowCount,
      reopened_rendered_rows: reopenedRenderedRowCount,
    });
    const subassemblies: Record<string, typeof exactEvidenceRows> = {
      "curb-subassembly.json": allRowsFor(["curb"]),
      "drainage-subassembly.json": allRowsFor(["drainage"]),
      "storm-sewer-subassembly.json": allRowsFor(["storm_inlet", "storm_pipe", "storm_well"]),
      "marking-subassembly.json": allRowsFor(["marking"]),
      "sign-subassembly.json": allRowsFor(["sign", "sign_foundation"]),
      "barrier-subassembly.json": allRowsFor(["barrier"]),
      "lighting-subassembly.json": allRowsFor(["lighting"]),
    };
    for (const [fileName, rows] of Object.entries(subassemblies)) writeJson(path.join(outDir, fileName), {
      scope_id: "NEW_FULL_ROAD_INFRASTRUCTURE",
      row_count: rows.length,
      quantity_missing: rows.filter((row) => !(row.quantity > 0)).length,
      rows,
    });
    writeJson(path.join(outDir, "fastener-ownership.json"), {
      ownership: FULL_ROAD_INFRASTRUCTURE_FASTENER_OWNERSHIP_V4,
      ownership_errors: materialCompletenessCounters.fastenerOwnershipErrors,
      duplicate_material_ownership: materialCompletenessCounters.duplicateMaterialOwnership,
      rows: Object.keys(FULL_ROAD_INFRASTRUCTURE_FASTENER_OWNERSHIP_V4).map((rowId) => rowById.get(rowId)),
    });
    writeJson(path.join(outDir, "procurement-parity.json"), {
      expected_source_row_ids: procurementExpectedIds,
      rendered_source_row_ids: exactProcurementRowIds,
      failures: materialCompletenessCounters.procurementParityFailures,
    });
    writeJson(path.join(outDir, "assumptions.json"), {
      policy_id: exactCompilation.preliminary_assembly_policy.policy_id,
      assembly_id: exactCompilation.preliminary_assembly_policy.assembly_id,
      public_scope_id: exactCompilation.preliminary_assembly_policy.public_scope_id,
      profile_id: exactCompilation.preliminary_assembly_policy.profile_id,
      assumptions: exactCompilation.preliminary_assembly_policy.assumptions,
    });
    writeJson(path.join(outDir, "scope-resolution.json"), {
      input: EXACT_PROMPT,
      resolved_profile_id: exactCompilation.preliminary_assembly_policy.profile_id,
      public_scope_id: exactCompilation.preliminary_assembly_policy.public_scope_id,
      resolved_profile_title_ru: exactCompilation.preliminary_assembly_policy.profile_title_ru,
      quantity_basis: exactCompilation.quantity_basis,
      assembly_id: exactCompilation.preliminary_assembly_policy.assembly_id,
    });
    writeJson(path.join(outDir, "assembly-manifest-coverage.json"), exactCoverage);
    writeJson(path.join(outDir, "formula-trace.json"), exactEvidenceRows.map((row) => ({ row_id: row.row_id, formula: row.formula, quantity: row.quantity, unit: row.unit, assumption_ids: row.assumption_ids, source_ids: row.source_ids })));
    writeJson(path.join(outDir, "cost-ownership.json"), {
      counters: {
        double_cost_ownership: exactCoverage.counters.double_cost_ownership,
        duplicate_physical_resources: exactCoverage.counters.duplicate_physical_resources,
        priced_analytical_rows: exactCoverage.counters.priced_analytical_rows,
        priced_informational_subtotals: exactCoverage.counters.priced_informational_subtotals,
      },
      rows: exactEvidenceRows.map((row) => ({
        row_id: row.row_id,
        costing_mode: row.costing_mode,
        cost_ownership_id: row.cost_ownership_id,
        priced: row.priced,
        informational: row.informational,
      })),
    });
    writeJson(path.join(outDir, "price-coverage.json"), {
      total_rows: exactEvidenceRows.length,
      priced_rows: evidenceCounters.rows_with_price,
      missing_price_rows: evidenceCounters.rows_without_price,
      coverage_ratio: expandedEstimate.price_coverage,
      total_amount: null,
      display_total_ru: expandedEstimate.display_total_ru,
      invented_prices: 0,
      user_entered_price_rows: exactEvidenceRows.filter((row) => row.price_source === "USER_ENTERED_PRICE").map((row) => row.row_id),
    });
    const compiledBoqProjection = exactCompilation.compiled_rows.map((row) => ({
      row_id: row.definition.row_id,
      quantity: row.quantity,
      unit_id: row.definition.unit_id,
    }));
    const draftBoqProjection = pricedExactRevision.boq.rows.map((row: any) => ({
      row_id: row.rowId,
      quantity: row.quantity,
      unit_id: row.unit,
    }));
    const paritySummary = {
      editor_pdf_procurement_scope: "NEW_FULL_ROAD_INFRASTRUCTURE_3000x32",
      runtime_truth: exactRuntimeInvariants,
      compiled_boq_hash: sha256(JSON.stringify(compiledBoqProjection)),
      draft_boq_hash: sha256(JSON.stringify(draftBoqProjection)),
      rendered_boq_hash: exactRuntimeInvariants.ui_signature,
      saved_boq_hash: reopenProof.row_quantity_hash_before,
      reopened_boq_hash: reopenProof.row_quantity_hash_after,
      pdf_revision_rows_hash: reopenProof.pdf_revision_rows_hash,
      pdf_rows_hash_matches_revision: reopenProof.pdf_rows_hash_matches_revision,
      rows: exactEvidenceRows.length,
      rendered_rows: exactRenderedRowCount,
      pdf_rows: reopenProof.pdf_rows_hash_matches_revision ? exactEvidenceRows.length : 0,
      reopened_rows: reopenProof.row_count_after,
      procurement_source_row_ids: exactProcurementRowIds,
      pdf_file: path.relative(process.cwd(), exactPdfPath).replace(/\\/g, "/"),
      pdf_sha256: sha256(fs.readFileSync(exactPdfPath)),
      pdf_page_count: exactPdfPageCount,
    };
    writeJson(path.join(outDir, "editor-pdf-procurement-parity.json"), paritySummary);

    // Compatibility aliases retain the earlier Phase 1C evidence contract while the full-road names remain canonical.
    writeJson(path.join(outDir, "expanded-estimate-3000x32.json"), { ...expandedEstimate, counters: evidenceCounters });
    fs.writeFileSync(path.join(outDir, "expanded-estimate-3000x32.csv"), `${csv}\n`, "utf8");
    fs.copyFileSync(exactPdfPath, path.join(outDir, "expanded-estimate-3000x32.pdf"));
    writeJson(path.join(outDir, "wbs-coverage.json"), exactCoverage);
    writeJson(path.join(outDir, "parity-summary.json"), paritySummary);

    const healthAfter = await fetch(`${server.baseUrl}/health`).then((response) => response.json());
    const sourceTreeAfter = git(["status", "--porcelain"]);
    const blockerCounters = {
      ...phase1dAudit.counters,
      pdf_truncation: exactPdfPageCount > 0 && reopenProof.pdf_rows_hash_matches_revision ? 0 : 1,
      procurement_mismatch: materialCompletenessCounters.procurementParityFailures,
      history_mismatch: reopenProof.row_identity_preserved
        && reopenProof.row_quantity_hash_before === reopenProof.row_quantity_hash_after
        && reopenProof.manual_price_before === reopenProof.manual_price_after ? 0 : 1,
      compiled_draft_mismatch: paritySummary.compiled_boq_hash === paritySummary.draft_boq_hash ? 0 : 1,
      rendered_mismatch: Object.values(exactRuntimeInvariants.counters).every((value) => value === 0) ? 0 : 1,
    };

    const failures = [
      exactProof.selected_work_key === ASPHALT_WORK_ID_V4 ? "" : "exact_selected_work_mismatch",
      exactProof.professional_work_id === ASPHALT_WORK_ID_V4 ? "" : "exact_professional_work_mismatch",
      exactProof.selected_template_id === ASPHALT_V4_RUNTIME_TEMPLATE_ID ? "" : "exact_template_mismatch",
      exactProof.work_specific_parameter_schema_id === ASPHALT_PARAMETER_SCHEMA_ID_V4 ? "" : "exact_schema_mismatch",
      exactProof.length_m === 3000 ? "" : "exact_length_mismatch",
      exactProof.width_m === 32 ? "" : "exact_width_mismatch",
      exactProof.area_m2 === 96000 ? "" : "exact_area_mismatch",
      exactProof.quantity_basis?.basisType === "project" ? "" : "exact_quantity_basis_mismatch",
      exactCompilation.preliminary_assembly_policy.profile_id === "new_full_road_infrastructure" ? "" : "exact_scope_mismatch",
      exactProof.boq_rows > 0 ? "" : "exact_boq_empty",
      exactProof.quantity_missing === 0 ? "" : "exact_quantity_missing",
      exactProof.work_assembly_coverage?.status === "GREEN_ASPHALT_WORK_ASSEMBLY_COVERAGE_V4" ? "" : "work_assembly_coverage_failed",
      exactEvidenceRows.length === exactProof.boq_rows ? "" : "evidence_runtime_row_count_mismatch",
      exactProof.legacy_rows === 0 ? "" : "exact_legacy_rows_present",
      exactProof.immediate_scope_visible ? "" : "immediate_scope_missing",
      exactProof.immediate_material_rows > 0 ? "" : "immediate_materials_missing",
      exactProof.immediate_work_rows > 0 ? "" : "immediate_works_missing",
      exactProof.immediate_equipment_rows > 0 ? "" : "immediate_equipment_missing",
      exactProof.immediate_service_rows > 0 ? "" : "immediate_services_missing",
      exactProof.immediate_lab_rows > 0 ? "" : "immediate_lab_control_missing",
      exactProof.immediate_documentation_rows > 0 ? "" : "immediate_documentation_missing",
      exactProof.internal_ids_visible.length === 0 ? "" : `internal_ids_visible:${exactProof.internal_ids_visible.join(",")}`,
      exactProof.editable_price_inputs > 0 ? "" : "immediate_price_editors_missing",
      fs.existsSync(exactPdfPath) && fs.statSync(exactPdfPath).size > 0 ? "" : "exact_expanded_pdf_missing",
      exactProcurementRowIds.length > 0 ? "" : "exact_procurement_not_generated",
      Object.values(materialCompletenessCounters).every((value) => value === 0) ? "" : "material_completeness_counters_failed",
      Object.values(exactRuntimeInvariants.counters).every((value) => value === 0) ? "" : "exact_runtime_truth_invariants_failed",
      exactProof.required_labels_visible.every((item) => item.visible) ? "" : "work_specific_labels_missing",
      exactProof.forbidden_generic_labels_visible.length === 0 ? "" : "generic_labels_visible",
      phase1dAudit.status === GREEN_V4_PHASE1D_FULL_ROAD_INFRASTRUCTURE_EXPANDED_PROFESSIONAL_BOQ_END_TO_END_SOFTWARE_SEALED_READY_FOR_ROAD_ENGINEER_AND_ESTIMATOR_REVIEW_NO_RELEASE ? "" : "phase1d_professional_audit_failed",
      Object.values(blockerCounters).every((value) => value === 0) ? "" : "phase1d_blocker_counters_failed",
      Object.values(geometryScalingEvidence.strictly_increasing_categories).every(Boolean) ? "" : "geometry_scaling_failed",
      geometryScalingEvidence.discrete_quantity_failures.length === 0 ? "" : "discrete_quantity_rounding_failed",
      lifecycleEvidence.revision_created ? "" : "revision_not_created",
      lifecycleEvidence.row_identity_preserved ? "" : "revision_row_identity_changed",
      lifecycleEvidence.dependent_quantity.changed ? "" : "dependent_quantity_not_recalculated",
      lifecycleEvidence.independent_quantity.unchanged ? "" : "independent_quantity_changed",
      reopenProof.manual_price_after === reopenProof.manual_price_before ? "" : "manual_price_not_persisted",
      reopenProof.row_identity_preserved ? "" : "reopened_assembly_row_identity_changed",
      reopenProof.row_quantity_hash_after === reopenProof.row_quantity_hash_before ? "" : "reopened_quantity_hash_changed",
      reopenProof.assembly_id_after === reopenProof.assembly_id_before ? "" : "reopened_assembly_id_changed",
      reopenProof.store_recovery.store_cleared && reopenProof.store_recovery.entries_saved === reopenProof.store_recovery.entries_restored ? "" : "store_restore_failed",
      exactGeneratedPdf ? "" : "pdf_not_generated",
      exactGeneratedPdf?.pdfStatus === "generated" ? "" : "pdf_not_green",
      reopenProof.pdf_rows_hash_matches_revision ? "" : "pdf_rows_hash_mismatch",
      exactPdfPageCount > 1 ? "" : "pdf_pagination_missing",
      exactProcurementRowIds.length > 250 ? "" : "procurement_not_complete",
      reopenedRenderedRowCount === exactEvidenceRows.length ? "" : "reopened_rendered_rows_mismatch",
      consoleErrors.length === 0 ? "" : `console_errors:${consoleErrors.length}`,
      pageErrors.length === 0 ? "" : `page_errors:${pageErrors.length}`,
      healthBefore.status === "ok" && healthBefore.source_sha === sourceSha ? "" : "health_before_failed",
      healthAfter.status === "ok" && healthAfter.source_sha === sourceSha ? "" : "health_after_failed",
      sourceTreeAfter.length === 0 ? "" : "source_tree_dirty_after",
    ].filter(Boolean);

    summary = {
      schema_version: "AsphaltV4Phase1DFullRoadInfrastructureEndToEndProductionWebProofV1",
      final_status: failures.length === 0
        ? GREEN_V4_PHASE1D_FULL_ROAD_INFRASTRUCTURE_EXPANDED_PROFESSIONAL_BOQ_END_TO_END_SOFTWARE_SEALED_READY_FOR_ROAD_ENGINEER_AND_ESTIMATOR_REVIEW_NO_RELEASE
        : "STOP_V4_PHASE1D_FULL_ROAD_INFRASTRUCTURE_END_TO_END_TRUTH_INCOMPLETE_NO_RELEASE",
      generated_at: new Date().toISOString(),
      source_sha: sourceSha,
      branch,
      upstream,
      source_tree_clean_before: sourceTreeBefore.length === 0,
      source_tree_clean_after: sourceTreeAfter.length === 0,
      production_static_dist_served: true,
      production_dist_index_sha256: server.indexSha256,
      base_url: server.baseUrl,
      route: "/request",
      same_browser_context: true,
      browser_pages_before_close: context.pages().length,
      health_before: healthBefore,
      health_after: healthAfter,
      exact_request: exactProof,
      counters: {
        total_rows: exactEvidenceRows.length,
        materials: categoryCounts.MATERIAL,
        works: categoryCounts.WORK,
        labor: categoryCounts.LABOR,
        machinery: categoryCounts.MACHINERY,
        equipment: categoryCounts.EQUIPMENT,
        services: categoryCounts.SERVICE,
        logistics: categoryCounts.LOGISTICS,
        tests: categoryCounts.LAB_CONTROL,
        documents: categoryCounts.DOCUMENTATION,
        procurement_rows: exactProcurementRowIds.length,
        priced_rows: evidenceCounters.rows_with_price,
        missing_price_rows: evidenceCounters.rows_without_price,
        rendered_rows: exactRenderedRowCount,
        pdf_rows: reopenProof.pdf_rows_hash_matches_revision ? exactEvidenceRows.length : 0,
        reopened_rows: reopenProof.row_count_after,
      },
      blocker_counters: blockerCounters,
      professional_audit: phase1dAudit,
      geometry_scaling: geometryScalingEvidence,
      expanded_estimate_evidence: {
        scope_id: exactCompilation.preliminary_assembly_policy.public_scope_id,
        row_count: exactEvidenceRows.length,
        counters: evidenceCounters,
        material_completeness_counters: materialCompletenessCounters,
        all_infrastructure_subassemblies_enabled: true,
        quantity_coverage: expandedEstimate.quantity_coverage,
        price_coverage: expandedEstimate.price_coverage,
        runtime_truth: exactRuntimeInvariants,
        procurement_items_count: exactProcurementRowIds.length,
        files: [
          "full-road-infrastructure-3000x32-estimate.json",
          "full-road-infrastructure-3000x32-estimate.csv",
          "full-road-infrastructure-3000x32.pdf",
          "full-road-infrastructure-material-manifest.json",
          "full-road-all-materials-manifest.json",
          "full-road-expanded-wbs.json",
          "wbs-coverage-matrix.json",
          "professional-blocker-audit.json",
          "geometry-scaling.json",
          "lifecycle-parity.json",
          "revision-reopen-evidence.json",
          "performance-metrics.json",
          "exact-input.txt",
          "curb-subassembly.json",
          "drainage-subassembly.json",
          "storm-sewer-subassembly.json",
          "marking-subassembly.json",
          "sign-subassembly.json",
          "barrier-subassembly.json",
          "lighting-subassembly.json",
          "fastener-ownership.json",
          "procurement-parity.json",
          "scope-resolution.json",
          "assembly-manifest-coverage.json",
          "formula-trace.json",
          "cost-ownership.json",
          "price-coverage.json",
          "editor-pdf-procurement-parity.json",
        ].map((name) => path.relative(process.cwd(), path.join(outDir, name)).replace(/\\/g, "/")),
        screenshots: [exactEditorScreenshot, exactBoqVisibleScreenshot, exactScreenshot, revisionScreenshot, exactProcurementScreenshot, exactPdfScreenshot, reopenedScreenshot].map((item) => path.relative(process.cwd(), item).replace(/\\/g, "/")),
      },
      lifecycle: {
        ...lifecycleEvidence,
        manual_price_persistence: {
          input_test_id: manualPriceProof.inputTestId,
          row_id: manualPriceProof.rowId,
          unit_price: manualPriceProof.unitPrice,
          persisted_after_reopen: reopenProof.manual_price_after === manualPriceProof.unitPrice,
        },
        save_reopen: reopenProof,
        screenshots: [revisionScreenshot, reopenedScreenshot].map((item) => path.relative(process.cwd(), item).replace(/\\/g, "/")),
      },
      pdf: {
        generated: Boolean(exactGeneratedPdf),
        status: exactGeneratedPdf?.pdfStatus ?? null,
        revision_id: exactGeneratedPdf?.revisionId ?? null,
        revision_rows_hash: exactGeneratedPdf?.revisionRowsHash ?? null,
        revision_rows_hash_matches: reopenProof.pdf_rows_hash_matches_revision,
        rows: reopenProof.pdf_rows_hash_matches_revision ? exactEvidenceRows.length : 0,
        pages: exactPdfPageCount,
        bytes: exactPdfBuffer.length,
        duration_ms: exactPdfDurationMs,
        screenshot: path.relative(process.cwd(), exactPdfScreenshot).replace(/\\/g, "/"),
      },
      procurement: {
        items_count: exactProcurementRowIds.length,
        source_row_ids: exactProcurementRowIds,
        screenshot: path.relative(process.cwd(), exactProcurementScreenshot).replace(/\\/g, "/"),
      },
      runtime_truth: exactRuntimeInvariants,
      console_error_count: consoleErrors.length,
      page_error_count: pageErrors.length,
      console_errors: consoleErrors,
      page_errors: pageErrors,
      failure_codes: failures,
      release_authorized: false,
      phase2_started: false,
      other_works_migrated: 0,
    };
  } finally {
    await context.close();
    await browser.close();
    await server.close();
  }
  const summaryPath = path.join(outDir, "summary.json");
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.info(JSON.stringify({ ...summary, summary_path: path.relative(process.cwd(), summaryPath).replace(/\\/g, "/") }, null, 2));
  if (summary.failure_codes.length > 0) process.exitCode = 1;
}

void run().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
