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
  compileAsphaltProfessionalEstimateV4,
  validateAsphaltWorkAssemblyCoverageV4,
} from "../../src/lib/estimate/v4/asphalt";
import { formatEstimateUnitLabel } from "../../src/lib/ai/globalEstimate/formatEstimateUnitLabel";

const EVIDENCE_ROOT = path.join(".release-runtime", "ai-estimate-v4-phase1c-expanded-asphalt", "web");
const MANIFEST_KEY = "rik.consumer_repair.request_bundles.v2.manifest";
const BUNDLE_PREFIX = "rik.consumer_repair.request_bundle.v2:";
const LEGACY_KEY = "rik.consumer_repair.request_bundles.v1";
const EXACT_PROMPT = "Полное строительство автомобильной дороги, длина 3000 м, ширина 32 м";
const FULL_PROMPT = "Новая парковка площадью 5000 м², двухслойное асфальтобетонное покрытие, слои 60 и 40 мм, без бордюров, водоотвода, геотекстиля, труб, дорожных знаков, разметки, ограждений и ночных работ";

const FULL_VALUES: Record<string, string> = {
  geometry_method: "direct_area",
  area_m2: "5000",
  purpose: "yard_parking",
  traffic_load_category: "medium",
  construction_mode: "new_construction",
  soil_type_condition: "project_spec",
  base_condition: "new_project",
  groundwater_condition: "below_design_zone",
  site_access: "free",
  sand_layer_required: "no",
  crushed_layer_count: "2",
  crushed_layer_1_fraction: "40_70",
  crushed_layer_1_thickness_mm: "180",
  crushed_layer_1_compaction_factor: "1.18",
  crushed_layer_1_waste_percent: "3",
  crushed_layer_2_fraction: "20_40",
  crushed_layer_2_thickness_mm: "120",
  crushed_layer_2_compaction_factor: "1.16",
  crushed_layer_2_waste_percent: "3",
  geotextile_required: "no",
  asphalt_layer_count: "2",
  asphalt_layer_1_mixture_type: "coarse_lower",
  asphalt_layer_1_thickness_mm: "60",
  asphalt_layer_1_density_t_m3: "2.35",
  asphalt_layer_1_waste_percent: "2",
  asphalt_layer_2_mixture_type: "dense_fine",
  asphalt_layer_2_thickness_mm: "40",
  asphalt_layer_2_density_t_m3: "2.35",
  asphalt_layer_2_waste_percent: "2",
  emulsion_measurement_basis: "litre",
  emulsion_rate_l_m2: "0.3",
  curb_required: "no",
  drainage_required: "no",
  utility_pipes_required: "no",
  traffic_signs_required: "no",
  road_marking_required: "no",
  guardrail_required: "no",
  constrained_site: "no",
  night_work_required: "no",
  live_traffic_required: "no",
  asphalt_plant_distance_km: "20",
  truck_payload_t: "15",
  region_city: "Бишкек",
  execution_season: "warm_dry",
  laboratory_control: "none",
  road_worker_productivity_m2_per_man_hour: "12",
  grader_productivity_m2_per_machine_hour: "220",
  roller_productivity_m2_per_machine_hour: "150",
  paver_productivity_m2_per_machine_hour: "180",
};

const REQUIRED_FULL_KEYS = [
  "crushed_layer_2_fraction",
  "crushed_layer_2_thickness_mm",
  "asphalt_layer_2_mixture_type",
  "asphalt_layer_2_thickness_mm",
  "asphalt_layer_2_density_t_m3",
  "asphalt_layer_2_waste_percent",
] as const;

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
  return bundle;
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

function comparable(value: unknown): string {
  if (value === true) return "yes";
  if (value === false) return "no";
  if (typeof value === "number") return String(Number(value.toFixed(6)));
  return String(value ?? "").replace(",", ".").trim();
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

async function visibleEditorKeys(page: Page): Promise<string[]> {
  return page.locator('[data-testid^="editable-param-inline-editor-"]').evaluateAll((nodes) => nodes.flatMap((node) => {
    const id = node.getAttribute("data-testid") ?? "";
    return id.startsWith("editable-param-inline-editor-") ? [id.slice("editable-param-inline-editor-".length)] : [];
  }));
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

async function applyFixtureThroughUi(page: Page, values: Record<string, string>): Promise<RuntimeBundle> {
  let bundle = await readLatestBundle(page);
  for (let wave = 0; wave < 30; wave += 1) {
    await openAllParameters(page);
    bundle = await readLatestBundle(page);
    const revision = currentRevision(bundle);
    const params = revision.params ?? {};
    const requiredApplied = REQUIRED_FULL_KEYS.every((key) => comparable(params[key]?.value) === comparable(values[key]));
    const requiredRowsPresent = [
      "crushed_layer_1_material",
      "crushed_layer_2_material",
      "asphalt_layer_1_material",
      "asphalt_layer_2_material",
    ].every((rowId) => revision.boq?.rows?.some((row: any) => row.rowId === rowId));
    if (requiredApplied && requiredRowsPresent) return bundle;

    const keys = await visibleEditorKeys(page);
    const changed: string[] = [];
    for (const key of keys) {
      const desired = values[key];
      if (desired == null || comparable(params[key]?.value) === comparable(desired)) continue;
      if (await setEditorValue(page, key, desired)) changed.push(key);
    }
    if (changed.length === 0) {
      throw new Error(`UI_FIXTURE_STALLED:${JSON.stringify({ wave, visible_keys: keys, required_missing: REQUIRED_FULL_KEYS.filter((key) => comparable(params[key]?.value) !== comparable(values[key])) })}`);
    }
    const previousRevisionId = revision.revisionId;
    await page.getByTestId("editable-param-batch-apply").click({ force: true });
    bundle = await waitForRevisionChange(page, previousRevisionId);
  }
  throw new Error("UI_FIXTURE_WAVE_LIMIT");
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
    const exactBundle = await prepareRequest(page, server.baseUrl, EXACT_PROMPT);
    const exactRevision = currentRevision(exactBundle);
    const exactCompilation = compileAsphaltProfessionalEstimateV4({ raw_text: EXACT_PROMPT });
    const exactCoverage = validateAsphaltWorkAssemblyCoverageV4(exactCompilation);
    const exactEvidenceRows = exactCompilation.compiled_rows.map((row) => {
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
        unit_price: null,
        amount: null,
        price_source: null,
        procurement_eligible: row.included_in_procurement,
      };
    });
    const exactRenderedRowCount = await page.locator('[data-testid^="consumer-repair-item-consumer_item_"]').count();
    const exactEditorScreenshot = path.join(outDir, "expanded-estimate-full-road-3000x32-editor.png");
    await page.screenshot({ path: exactEditorScreenshot, fullPage: true });
    await page.getByTestId("request-estimate-section-asphalt_materials").scrollIntoViewIfNeeded();
    const exactBoqVisibleScreenshot = path.join(outDir, "expanded-estimate-full-road-3000x32-boq-visible.png");
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

    const exactProcurementButton = page.getByTestId("consumer-estimate-open-procurement").first();
    await exactProcurementButton.waitFor({ timeout: 30_000 });
    await exactProcurementButton.click({ force: true });
    await page.getByTestId("consumer-estimate-procurement-list").waitFor({ timeout: 30_000 });
    const exactProcurementRowIds = await page.locator('[data-testid^="consumer-estimate-procurement-row-"]').evaluateAll((nodes) => nodes.map((node) =>
      (node.getAttribute("data-testid") ?? "").slice("consumer-estimate-procurement-row-".length)
    ));
    const exactProcurementScreenshot = path.join(outDir, "expanded-estimate-full-road-3000x32-procurement.png");
    await page.screenshot({ path: exactProcurementScreenshot, fullPage: true });
    const exactRuntimeInvariants = runtimeInvariants(exactBundle, exactProcurementRowIds, exactRenderedRowCount);

    const exactPdfButton = page.getByTestId("consumer-estimate-make-pdf").first();
    await exactPdfButton.waitFor({ timeout: 30_000 });
    await exactPdfButton.click({ force: true });
    await page.waitForURL((url) => url.pathname.includes("/pdf-viewer"), { timeout: 30_000 });
    const exactPdfUri = new URL(page.url()).searchParams.get("uri");
    if (!exactPdfUri?.startsWith("data:application/pdf;base64,")) throw new Error("EXACT_EXPANDED_PDF_DATA_URI_MISSING");
    const exactPdfPath = path.join(outDir, "expanded-estimate-full-road-3000x32.pdf");
    fs.writeFileSync(exactPdfPath, Buffer.from(exactPdfUri.slice("data:application/pdf;base64,".length), "base64"));
    const exactPdfScreenshot = path.join(outDir, "expanded-estimate-full-road-3000x32-pdf-viewer.png");
    await page.screenshot({ path: exactPdfScreenshot, fullPage: true });

    const expandedEstimate = {
      schema_version: "AsphaltExpandedProfessionalEstimateEvidenceV1",
      generated_at: new Date().toISOString(),
      source_sha: sourceSha,
      scope_id: exactCompilation.preliminary_assembly_policy.profile_id,
      scope_title_ru: exactCompilation.preliminary_assembly_policy.profile_title_ru,
      quantity_basis: exactCompilation.quantity_basis,
      quantity_coverage: exactEvidenceRows.length === 0 ? 0 : exactEvidenceRows.filter((row) => row.quantity > 0).length / exactEvidenceRows.length,
      price_coverage: exactCompilation.price_coverage.coverage_ratio,
      amount_coverage: 0,
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
    const expandedJsonPath = path.join(outDir, "expanded-estimate-full-road-3000x32.json");
    writeJson(expandedJsonPath, { ...expandedEstimate, counters: evidenceCounters });
    const csvHeaders = ["row_id", "wbs_code", "parent_wbs_id", "category", "professional_name", "specification", "specification_status", "quantity", "unit", "unit_label", "formula", "assumption_ids", "source_ids", "costing_mode", "cost_ownership_id", "component_type", "informational", "priced", "unit_price", "amount", "price_source", "procurement_eligible"];
    const csv = [
      csvHeaders.map(csvCell).join(","),
      ...exactEvidenceRows.map((row) => csvHeaders.map((header) => csvCell((row as Record<string, unknown>)[header])).join(",")),
    ].join("\n");
    const expandedCsvPath = path.join(outDir, "expanded-estimate-full-road-3000x32.csv");
    fs.writeFileSync(expandedCsvPath, `${csv}\n`, "utf8");
    writeJson(path.join(outDir, "assumptions.json"), {
      policy_id: exactCompilation.preliminary_assembly_policy.policy_id,
      assembly_id: exactCompilation.preliminary_assembly_policy.assembly_id,
      profile_id: exactCompilation.preliminary_assembly_policy.profile_id,
      assumptions: exactCompilation.preliminary_assembly_policy.assumptions,
    });
    writeJson(path.join(outDir, "scope-resolution.json"), {
      input: EXACT_PROMPT,
      resolved_profile_id: exactCompilation.preliminary_assembly_policy.profile_id,
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
    writeJson(path.join(outDir, "price-coverage.json"), exactCompilation.price_coverage);
    const paritySummary = {
      editor_pdf_procurement_scope: "NEW_FULL_ROAD_PAVEMENT_3000x32",
      runtime_truth: exactRuntimeInvariants,
      procurement_source_row_ids: exactProcurementRowIds,
      pdf_file: path.relative(process.cwd(), exactPdfPath).replace(/\\/g, "/"),
      pdf_sha256: sha256(fs.readFileSync(exactPdfPath)),
    };
    writeJson(path.join(outDir, "editor-pdf-procurement-parity.json"), paritySummary);

    // Compatibility aliases retain the earlier Phase 1C evidence contract while the full-road names remain canonical.
    writeJson(path.join(outDir, "expanded-estimate-3000x32.json"), { ...expandedEstimate, counters: evidenceCounters });
    fs.writeFileSync(path.join(outDir, "expanded-estimate-3000x32.csv"), `${csv}\n`, "utf8");
    fs.copyFileSync(exactPdfPath, path.join(outDir, "expanded-estimate-3000x32.pdf"));
    writeJson(path.join(outDir, "wbs-coverage.json"), exactCoverage);
    writeJson(path.join(outDir, "parity-summary.json"), paritySummary);

    await page.goto(`${server.baseUrl}/request`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 30_000 });

    let fullBundle = await prepareRequest(page, server.baseUrl, FULL_PROMPT);
    fullBundle = await applyFixtureThroughUi(page, FULL_VALUES);
    await openAllParameters(page);
    const boqScreenshot = path.join(outDir, "B-D-work-specific-parameters-and-boq.png");
    await page.screenshot({ path: boqScreenshot, fullPage: true });
    const beforeRevision = currentRevision(fullBundle);
    const beforeIds = beforeRevision.boq.rows.map((row: any) => row.rowId);
    const lowerBefore = beforeRevision.boq.rows.find((row: any) => row.rowId === "asphalt_layer_1_material")?.quantity;
    const upperBefore = beforeRevision.boq.rows.find((row: any) => row.rowId === "asphalt_layer_2_material")?.quantity;

    fullBundle = await updateOneParameter(page, "asphalt_layer_2_thickness_mm", "50");
    const afterRevision = currentRevision(fullBundle);
    let revisedBundleForTruth = fullBundle;
    const afterIds = afterRevision.boq.rows.map((row: any) => row.rowId);
    const lowerAfter = afterRevision.boq.rows.find((row: any) => row.rowId === "asphalt_layer_1_material")?.quantity;
    const upperAfter = afterRevision.boq.rows.find((row: any) => row.rowId === "asphalt_layer_2_material")?.quantity;
    await page.getByTestId("request-estimate-runtime-details-toggle").click();
    await page.getByTestId("estimate-revision-diff").waitFor({ timeout: 20_000 });
    const revisionScreenshot = path.join(outDir, "G-H-thickness-revision-diff.png");
    await page.screenshot({ path: revisionScreenshot, fullPage: true });
    const revisedRenderedRowCount = await page.locator('[data-testid^="consumer-repair-item-consumer_item_"]').count();
    const manualPriceProof = await setAndWaitForManualPrice(page, 12_345);
    revisedBundleForTruth = manualPriceProof.bundle;
    const pricedRevision = currentRevision(revisedBundleForTruth);
    const pricedRevisionRowIds = pricedRevision.boq.rows.map((row: any) => row.rowId);

    const pdfButton = page.getByTestId("consumer-estimate-make-pdf").first();
    await pdfButton.waitFor({ timeout: 30_000 });
    await pdfButton.click({ force: true });
    await page.waitForURL((url) => url.pathname.includes("/pdf-viewer"), { timeout: 30_000 });
    const pdfScreenshot = path.join(outDir, "latest-revision-pdf-viewer.png");
    await page.screenshot({ path: pdfScreenshot, fullPage: true });
    await page.goto(`${server.baseUrl}/request`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 30_000 });
    fullBundle = await readLatestBundle(page);
    const reopenedRevision = currentRevision(fullBundle);
    const reopenedEditableState = fullBundle.estimateRevisionState;
    const reopenedEditableRevision = reopenedEditableState?.revisions?.find((revision: any) =>
      revision.revision_id === reopenedEditableState.current_revision_id
    );
    const reopenedPricedRow = reopenedEditableRevision?.editable_estimate_snapshot?.rows?.find((row: any) =>
      row.rowId === manualPriceProof.editableRowId
    ) ?? fullBundle.editableEstimateSnapshot?.rows?.find((row: any) => row.rowId === manualPriceProof.editableRowId)
      ?? fullBundle.items?.find((row: any) => row.id === manualPriceProof.editableRowId);
    const reopenProof = {
      assembly_id_before: pricedRevision.workAssemblyId ?? null,
      assembly_id_after: reopenedRevision.workAssemblyId ?? null,
      row_identity_preserved: JSON.stringify(pricedRevisionRowIds) === JSON.stringify(reopenedRevision.boq.rows.map((row: any) => row.rowId)),
      row_count_before: pricedRevisionRowIds.length,
      row_count_after: reopenedRevision.boq.rows.length,
      manual_price_row_id: manualPriceProof.rowId,
      manual_price_editable_row_id: manualPriceProof.editableRowId,
      manual_price_before: manualPriceProof.unitPrice,
      manual_price_after: reopenedPricedRow?.unitPrice ?? null,
    };
    const generatedPdf = fullBundle.pdfs?.find((pdf: any) => pdf.pdfStatus === "generated") ?? null;

    const procurementButton = page.getByTestId("consumer-estimate-open-procurement").first();
    await procurementButton.waitFor({ timeout: 30_000 });
    await procurementButton.click({ force: true });
    await page.getByTestId("consumer-estimate-procurement-list").waitFor({ timeout: 30_000 });
    const procurementDomRowIds = await page.locator('[data-testid^="consumer-estimate-procurement-row-"]').evaluateAll((nodes) => nodes.map((node) =>
      (node.getAttribute("data-testid") ?? "").slice("consumer-estimate-procurement-row-".length)
    ));
    const procurementScreenshot = path.join(outDir, "latest-revision-procurement-list.png");
    await page.screenshot({ path: procurementScreenshot, fullPage: true });
    const invariants = runtimeInvariants(revisedBundleForTruth, procurementDomRowIds, revisedRenderedRowCount);
    const healthAfter = await fetch(`${server.baseUrl}/health`).then((response) => response.json());
    const sourceTreeAfter = git(["status", "--porcelain"]);

    const failures = [
      exactProof.selected_work_key === ASPHALT_WORK_ID_V4 ? "" : "exact_selected_work_mismatch",
      exactProof.professional_work_id === ASPHALT_WORK_ID_V4 ? "" : "exact_professional_work_mismatch",
      exactProof.selected_template_id === ASPHALT_V4_RUNTIME_TEMPLATE_ID ? "" : "exact_template_mismatch",
      exactProof.work_specific_parameter_schema_id === ASPHALT_PARAMETER_SCHEMA_ID_V4 ? "" : "exact_schema_mismatch",
      exactProof.length_m === 3000 ? "" : "exact_length_mismatch",
      exactProof.width_m === 32 ? "" : "exact_width_mismatch",
      exactProof.area_m2 === 96000 ? "" : "exact_area_mismatch",
      exactProof.quantity_basis?.basisType === "project" ? "" : "exact_quantity_basis_mismatch",
      exactCompilation.preliminary_assembly_policy.profile_id === "new_full_road_pavement" ? "" : "exact_scope_mismatch",
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
      Object.values(exactRuntimeInvariants.counters).every((value) => value === 0) ? "" : "exact_runtime_truth_invariants_failed",
      exactProof.required_labels_visible.every((item) => item.visible) ? "" : "work_specific_labels_missing",
      exactProof.forbidden_generic_labels_visible.length === 0 ? "" : "generic_labels_visible",
      JSON.stringify(beforeIds) === JSON.stringify(afterIds) ? "" : "revision_row_identity_changed",
      lowerBefore === lowerAfter ? "" : "lower_layer_changed_with_upper_thickness",
      typeof upperBefore === "number" && typeof upperAfter === "number" && upperAfter > upperBefore ? "" : "upper_layer_not_recalculated",
      reopenProof.manual_price_after === reopenProof.manual_price_before ? "" : "manual_price_not_persisted",
      reopenProof.row_identity_preserved ? "" : "reopened_assembly_row_identity_changed",
      reopenProof.assembly_id_after === reopenProof.assembly_id_before ? "" : "reopened_assembly_id_changed",
      generatedPdf ? "" : "pdf_not_generated",
      generatedPdf?.pdfStatus === "generated" ? "" : "pdf_not_green",
      procurementDomRowIds.length > 0 ? "" : "procurement_not_generated",
      Object.values(invariants.counters).every((value) => value === 0) ? "" : "runtime_truth_invariants_failed",
      consoleErrors.length === 0 ? "" : `console_errors:${consoleErrors.length}`,
      pageErrors.length === 0 ? "" : `page_errors:${pageErrors.length}`,
      healthBefore.status === "ok" && healthBefore.source_sha === sourceSha ? "" : "health_before_failed",
      healthAfter.status === "ok" && healthAfter.source_sha === sourceSha ? "" : "health_after_failed",
      sourceTreeAfter.length === 0 ? "" : "source_tree_dirty_after",
    ].filter(Boolean);

    summary = {
      schema_version: "AsphaltV4Phase1CExpandedProductionWebProofV1",
      final_status: failures.length === 0
        ? "GREEN_V4_PHASE1C_ASPHALT_EXPANDED_FULL_ROAD_WBS_AND_QUANTITY_SOFTWARE_SEALED_PRICE_AND_EXPERT_REVIEW_REQUIRED_NO_RELEASE"
        : "STOP_V4_PHASE1C_EXPANDED_ESTIMATE_SCOPE_WBS_PRICE_TRUTH_INCOMPLETE_NO_RELEASE",
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
      expanded_estimate_evidence: {
        scope_id: exactCompilation.preliminary_assembly_policy.profile_id,
        row_count: exactEvidenceRows.length,
        counters: evidenceCounters,
        quantity_coverage: expandedEstimate.quantity_coverage,
        price_coverage: expandedEstimate.price_coverage,
        runtime_truth: exactRuntimeInvariants,
        procurement_items_count: exactProcurementRowIds.length,
        files: [
          "expanded-estimate-full-road-3000x32.json",
          "expanded-estimate-full-road-3000x32.csv",
          "expanded-estimate-full-road-3000x32.pdf",
          "scope-resolution.json",
          "assembly-manifest-coverage.json",
          "formula-trace.json",
          "cost-ownership.json",
          "price-coverage.json",
          "editor-pdf-procurement-parity.json",
        ].map((name) => path.relative(process.cwd(), path.join(outDir, name)).replace(/\\/g, "/")),
        screenshots: [exactEditorScreenshot, exactBoqVisibleScreenshot, exactScreenshot, exactProcurementScreenshot, exactPdfScreenshot].map((item) => path.relative(process.cwd(), item).replace(/\\/g, "/")),
      },
      full_ui_fixture: {
        prompt: FULL_PROMPT,
        explicit_user_input_fixture: FULL_VALUES,
        before_revision_id: beforeRevision.revisionId,
        after_revision_id: afterRevision.revisionId,
        before_row_count: beforeIds.length,
        after_row_count: afterIds.length,
        row_identity_preserved: JSON.stringify(beforeIds) === JSON.stringify(afterIds),
        lower_layer_quantity_before: lowerBefore,
        lower_layer_quantity_after: lowerAfter,
        upper_layer_quantity_before: upperBefore,
        upper_layer_quantity_after: upperAfter,
        manual_price_persistence: {
          input_test_id: manualPriceProof.inputTestId,
          row_id: manualPriceProof.rowId,
          unit_price: manualPriceProof.unitPrice,
          persisted_after_reopen: reopenProof.manual_price_after === manualPriceProof.unitPrice,
        },
        save_reopen: reopenProof,
        screenshots: [boqScreenshot, revisionScreenshot].map((item) => path.relative(process.cwd(), item).replace(/\\/g, "/")),
      },
      pdf: {
        generated: Boolean(generatedPdf),
        status: generatedPdf?.pdfStatus ?? null,
        revision_id: generatedPdf?.revisionId ?? null,
        revision_rows_hash: generatedPdf?.revisionRowsHash ?? null,
        screenshot: path.relative(process.cwd(), pdfScreenshot).replace(/\\/g, "/"),
      },
      procurement: {
        items_count: procurementDomRowIds.length,
        source_row_ids: procurementDomRowIds,
        screenshot: path.relative(process.cwd(), procurementScreenshot).replace(/\\/g, "/"),
      },
      runtime_truth: invariants,
      console_error_count: consoleErrors.length,
      page_error_count: pageErrors.length,
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
