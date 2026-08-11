import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { expect, test, type Browser, type Page } from "playwright/test";

import { buildAsphaltRelatedR8Inventory } from "../../scripts/estimate/buildAsphaltRelatedR8Inventory";
import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  RoadworksWaveAProductionRegistry,
  type RoadworksWaveAParameterKey,
} from "../../src/lib/estimate/v4/roadworks";

const BASE_URL = (process.env.ASPHALT_REFERENCE_WEB_BASE_URL ?? "http://localhost:8081")
  .replace(/\/$/, "");
const OUTPUT_PATH = path.join(process.cwd(), "artifacts", "ASPHALT_R9_WEB_R53_MANIFEST.json");
const CANDIDATE_SHA = process.env.EXPO_PUBLIC_BUILD_COMMIT ?? process.env.R9_CANDIDATE_SHA ?? "WORKTREE_UNFROZEN";

const EXTRA_INPUTS: Readonly<Record<string, string | number | boolean>> = Object.freeze({
  area_m2: 120,
  removal_area_m2: 120,
  removal_depth_mm: 50,
  removal_method: "MECHANICAL_BREAKOUT",
  removal_extent: "FULL",
  existing_asphalt_density_t_m3: 2.35,
  haul_required: false,
  material_destination: "RECYCLING",
  work_scope: "PURE_DEMOLITION",
  wearing_layer_thickness_mm: 50,
  binder_layer_thickness_mm: 60,
  asphalt_density_t_m3: 2.35,
  prepared_base_confirmed: true,
  bridge_deck_system_confirmed: true,
  traffic_class_confirmed: true,
});

type Inventory = ReturnType<typeof buildAsphaltRelatedR8Inventory>;
type RelatedRecord = Inventory["records"][number];

function requiredRoadworksWaveADefault(
  key: RoadworksWaveAParameterKey,
): string | number | boolean {
  const value = DEFAULT_ROADWORKS_WAVE_A_INPUTS[key];
  if (value === undefined) throw new Error(`ROADWORKS_WAVE_A_DEFAULT_MISSING:${key}`);
  return value;
}

type R53CaseResult = {
  ordinal: number;
  selected_id: string;
  catalog_id: string;
  classification: string;
  canonical_technology_id: string;
  selected_identity_visible: boolean;
  canonical_owner_visible: boolean;
  generic_fallback_used: false;
  lifecycle: "draft_ready";
  row_count: number;
  boq_digest: string;
  revision_id: string;
  deep_pdf: boolean;
  deep_procurement: boolean;
  procurement_mode: "material_list_opened" | "zero_items_not_applicable" | "alias_not_deep";
  deep_reload: boolean;
  console_errors: string[];
  page_errors: string[];
  duration_ms: number;
};

function selectedRecordId(record: RelatedRecord): string {
  return record.catalog_id.endsWith("_expanded_complex_v1")
    ? record.catalog_id
    : record.work_key;
}

function writeManifest(input: {
  records: R53CaseResult[];
  failures: string[];
  startedAt: string;
}): void {
  const aliasRows = input.records.filter((record) => record.classification === "ALIAS");
  const canonicalRows = input.records.filter((record) => record.classification === "EXECUTABLE");
  const manifest = {
    schema_version: "AsphaltR9WebR53ManifestV1",
    candidate_sha: CANDIDATE_SHA,
    started_at: input.startedAt,
    updated_at: new Date().toISOString(),
    browser: "chromium",
    real_browser: true,
    records_completed: input.records.length,
    records_denominator: 53,
    unique_technologies_completed: new Set(input.records.map((record) => record.canonical_technology_id)).size,
    unique_technologies_denominator: 44,
    aliases_completed: aliasRows.length,
    aliases_denominator: 9,
    canonical_deep_pdf_completed: canonicalRows.filter((record) => record.deep_pdf).length,
    canonical_deep_procurement_completed: canonicalRows.filter((record) => record.deep_procurement).length,
    canonical_deep_reload_completed: canonicalRows.filter((record) => record.deep_reload).length,
    console_errors: input.records.flatMap((record) => record.console_errors),
    page_errors: input.records.flatMap((record) => record.page_errors),
    failures: input.failures,
    final_status:
      input.records.length === 53
      && canonicalRows.length === 44
      && aliasRows.length === 9
      && canonicalRows.every((record) => record.deep_pdf && record.deep_procurement && record.deep_reload)
      && input.records.every((record) => !record.generic_fallback_used)
      && input.failures.length === 0
        ? "GREEN_R9_WEB_R53_EXACT_ROUTING_REAL_BROWSER"
        : "STOP_R9_WEB_R53_EXACT_ROUTING_REAL_BROWSER",
    records: input.records,
    fake_green_claimed: false,
  };
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function p0Values(record: RelatedRecord): Record<string, string | number | boolean> {
  const old = RoadworksWaveAProductionRegistry.find((entry) => entry.workId === record.work_key);
  if (!old) return { ...EXTRA_INPUTS };
  return Object.fromEntries(
    old.parameterDefinitions
      .filter((definition) => definition.tier === "P0")
      .map((definition) => [
        definition.key,
        requiredRoadworksWaveADefault(definition.key as RoadworksWaveAParameterKey),
      ]),
  );
}

async function fillParameterIfPresent(
  page: Page,
  key: string,
  value: string | number | boolean,
): Promise<boolean> {
  const option = page.getByTestId(`editable-param-option-${key}-${String(value)}`);
  if (await option.count()) {
    await option.click();
    await expect(page.getByTestId(`editable-param-dirty-${key}`)).toBeVisible();
    return true;
  }
  const editor = page.getByTestId(`editable-param-inline-editor-${key}`);
  if (!await editor.count()) return false;
  const input = editor.getByTestId("editable-param-popover-input");
  const nextValue = String(value).replace(".", ",");
  const currentValue = (await input.inputValue()).replace(".", ",");
  if (currentValue === nextValue) return false;
  await input.fill(nextValue);
  await expect(page.getByTestId(`editable-param-dirty-${key}`)).toBeVisible();
  return true;
}

async function applyRepresentativeP0(page: Page, record: RelatedRecord): Promise<void> {
  const parametersToggle = page.getByTestId("request-estimate-parameters-toggle");
  await expect(parametersToggle).toBeVisible({ timeout: 90_000 });
  if (await parametersToggle.getByText("Уточнить параметры").count()) {
    await parametersToggle.evaluate((node) => (node as HTMLElement).click());
  }
  await expect(parametersToggle).toContainText("Скрыть параметры", { timeout: 30_000 });
  await expect(page.getByTestId("request-estimate-parameter-panel")).toBeVisible({ timeout: 30_000 });
  let changed = 0;
  for (const [key, value] of Object.entries(p0Values(record))) {
    if (await fillParameterIfPresent(page, key, value)) changed += 1;
  }
  if (changed > 0) {
    await expect(page.getByTestId("editable-param-batch-apply")).toBeEnabled();
    await page.getByTestId("editable-param-batch-apply").click();
  }
}

async function openExactRecord(
  browser: Browser,
  record: RelatedRecord,
): Promise<R53CaseResult> {
  const startedAt = Date.now();
  const selectedId = selectedRecordId(record);
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const url = new URL("/request", BASE_URL);
  url.searchParams.set("prompt", `${record.name_ru} 120 м²`);
  url.searchParams.set("catalogWorkId", selectedId);
  url.searchParams.set("autoPrepare", "1");
  await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 90_000 });
  await expect(page.getByTestId(`request-estimate-selected-catalog-id-${selectedId}`)).toBeAttached({
    timeout: 90_000,
  });

  if (record.canonical_technology_id === "asphalt_concrete_pavement") {
    await expect(page.getByTestId("road-scope-selection")).toBeVisible({ timeout: 90_000 });
    await page.getByTestId("road-scope-option-full_pavement_structure").click();
  } else {
    await applyRepresentativeP0(page, record);
  }

  const rowCountLabel = page.getByTestId("request-estimate-row-count");
  await expect(rowCountLabel).toBeVisible({ timeout: 120_000 });
  await expect.poll(async () =>
    Number((await rowCountLabel.innerText()).match(/\d+/)?.[0] ?? 0),
  { timeout: 120_000 }).toBeGreaterThan(0);
  const rowCount = Number((await rowCountLabel.innerText()).match(/\d+/)?.[0] ?? 0);
  expect(rowCount).toBeGreaterThan(0);
  await expect(page.getByTestId(
    `request-estimate-canonical-owner-${record.canonical_technology_id}`,
  )).toBeAttached();
  await expect(page.getByTestId("request-estimate-exact-generic-fallback-not-used")).toBeAttached();

  const positionsToggle = page.getByTestId("request-estimate-positions-toggle");
  await expect(positionsToggle).toBeVisible();
  if (await positionsToggle.getByText("Показать позиции").count()) {
    await positionsToggle.evaluate((node) => (node as HTMLElement).click());
  }
  await expect(positionsToggle).toContainText("Скрыть позиции", { timeout: 30_000 });
  const rows = page.getByTestId("request-estimate-items-editor-content");
  await expect(rows).toBeVisible();
  const visibleBoq = (await rows.innerText()).replace(/\s+/g, " ").trim();
  const boqDigest = createHash("sha256").update(`${rowCount}:${visibleBoq}`).digest("hex");
  const revisionId = (await page.getByTestId("estimate-current-revision-id").innerText()).trim();
  const deep = record.classification === "EXECUTABLE";
  let deepProcurement = false;
  let procurementMode: R53CaseResult["procurement_mode"] = "alias_not_deep";
  let deepPdf = false;
  let deepReload = false;

  if (deep) {
    const procurement = page.getByTestId("consumer-estimate-open-procurement");
    if (await procurement.count()) {
      await expect(procurement).toBeVisible();
      await procurement.click();
      await expect(page.locator("body")).toContainText("Список закупки", { timeout: 60_000 });
      procurementMode = "material_list_opened";
    } else {
      await expect(page.getByTestId("request-estimate-procurement-not-applicable-zero-items"))
        .toBeAttached();
      procurementMode = "zero_items_not_applicable";
    }
    deepProcurement = true;

    const draftUrl = page.url();
    await page.getByTestId("consumer-estimate-make-pdf").click();
    await page.waitForURL(/pdf-viewer/, { timeout: 90_000 });
    deepPdf = true;
    await page.goBack({ waitUntil: "domcontentloaded", timeout: 90_000 });
    await expect(page.getByTestId("request-estimate-row-count")).toContainText(String(rowCount), {
      timeout: 90_000,
    });
    await page.goto(draftUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await expect(page.getByTestId("request-estimate-row-count")).toContainText(String(rowCount), {
      timeout: 90_000,
    });
    await expect(page.getByTestId(`request-estimate-selected-catalog-id-${selectedId}`)).toBeAttached();
    deepReload = true;
  }

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(page.url()).not.toContain("error");
  await expect(page.locator("body")).not.toContainText("Произошла ошибка");
  const result: R53CaseResult = {
    ordinal: record.ordinal,
    selected_id: selectedId,
    catalog_id: record.catalog_id,
    classification: record.classification,
    canonical_technology_id: record.canonical_technology_id!,
    selected_identity_visible: true,
    canonical_owner_visible: true,
    generic_fallback_used: false,
    lifecycle: "draft_ready",
    row_count: rowCount,
    boq_digest: boqDigest,
    revision_id: revisionId,
    deep_pdf: deepPdf,
    deep_procurement: deepProcurement,
    procurement_mode: procurementMode,
    deep_reload: deepReload,
    console_errors: consoleErrors,
    page_errors: pageErrors,
    duration_ms: Date.now() - startedAt,
  };
  await context.close();
  return result;
}

test("routes the complete R=53 denominator in real Chromium with M=44 deep artifacts", async ({
  browser,
}) => {
  test.setTimeout(2_400_000);
  const startedAt = new Date().toISOString();
  const inventory = buildAsphaltRelatedR8Inventory();
  const related = inventory.records.filter((record) => record.canonical_technology_id !== null);
  expect(related).toHaveLength(53);
  const records: R53CaseResult[] = [];
  const failures: string[] = [];
  writeManifest({ records, failures, startedAt });

  for (const record of related) {
    try {
      records.push(await openExactRecord(browser, record));
    } catch (error) {
      failures.push(`${selectedRecordId(record)}:${error instanceof Error ? error.message : String(error)}`);
      writeManifest({ records, failures, startedAt });
      throw error;
    }
    writeManifest({ records, failures, startedAt });
  }

  const canonicalDigest = new Map(
    records
      .filter((record) => record.classification === "EXECUTABLE")
      .map((record) => [record.canonical_technology_id, record.boq_digest]),
  );
  for (const alias of records.filter((record) => record.classification === "ALIAS")) {
    expect(alias.boq_digest).toBe(canonicalDigest.get(alias.canonical_technology_id));
  }
  expect(new Set(records.map((record) => record.canonical_technology_id)).size).toBe(44);
  expect(records.filter((record) => record.classification === "ALIAS")).toHaveLength(9);
  expect(records.filter((record) => record.deep_pdf)).toHaveLength(44);
  expect(records.filter((record) => record.deep_procurement)).toHaveLength(44);
  expect(records.filter((record) => record.deep_reload)).toHaveLength(44);
  writeManifest({ records, failures, startedAt });
});
