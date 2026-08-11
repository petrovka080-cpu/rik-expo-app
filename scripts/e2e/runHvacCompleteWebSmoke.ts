import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium, type BrowserContext, type Locator, type Page } from "playwright";

import type { ConsumerRepairDraftBundle } from "../../src/lib/consumerRequests";
import {
  buildRequestEstimateLaunchReadyMarkerId,
  resolveRequestEstimateLaunchTargetV1,
} from "../../src/lib/navigation/requestEstimateLaunchPayload";
import { decodeConsumerRepairBundleFromDurableStorage } from "../../src/lib/platform/compactConsumerRepairDurableState";
import { resolveRegisteredProfessionalEstimateSelectionV1 } from "../../src/lib/estimate/v4/domains/registeredProfessionalEstimateDomainsV1";
import {
  HVAC_DOMAIN_INVENTORY,
  hvacTechnologyProfile,
} from "../../src/lib/estimate/v4/domains/heatingVentilationComplete";
import { openAndroidChromeCdpSession } from "./androidChromeCdpHarness";

const baseUrl = process.env.HVAC_WEB_BASE_URL ?? "http://localhost:8081";
const target = process.env.HVAC_SMOKE_TARGET === "android-chrome" ? "android-chrome" : "web";
const androidDeviceId = process.env.E2E_ANDROID_DEVICE_ID ?? "emulator-5554";
const outputRoot = path.join(
  ".release-runtime",
  "hvac-domain-complete-r1",
  `hvac-${target}-${new Date().toISOString().replace(/[:.]/g, "-")}`,
);
const bundlePrefix = "rik.consumer_repair.request_bundle.v2:";

type AnyBundle = ConsumerRepairDraftBundle & Record<string, any>;

const scenarios = [
  "heating_hvac_interior_heating_pipe_install_standard",
  "heating_hvac_interior_warm_floor_install_standard",
  "heating_hvac_interior_heat_station_install_technical_room",
  "expanded-template:ventilation_system_detailed_boq_from_drawings_expanded_complex_v1",
  "ventilation_interior_duct_balance_standard",
  "heating_hvac_interior_heating_pipe_replace_standard",
] as const;

const activeScenarios = target === "android-chrome" ? scenarios.slice(0, 2) : scenarios;

const values: Readonly<Record<string, string>> = Object.freeze({
  work_included: "true",
  estimate_scope_mode: "FULL_APPLICABLE_SCOPE",
  scope_capability: "standard",
  funding_source: "PRIVATE_RECOMMENDED",
  project_type: "HVAC_PROJECT",
  route_length_m: "120",
  component_count: "12",
  system_count: "2",
  surface_area_m2: "150",
  zone_area_m2: "150",
  exact_material_or_equipment: "Точная проектная система HVAC",
  product_profile_id: "PROJECT-HVAC-PASSPORT",
  normative_rate_code: "PROJECT-VERIFIED-HVAC-RATE",
  medium_or_air_system: "HEATING_WATER",
  network_location: "INTERNAL",
  nominal_diameter_mm: "110",
  pipe_material_and_class: "Сталь / класс и толщина по проекту",
  jointing_method: "Сварка по проекту",
  design_supply_temperature_c: "90",
  design_return_temperature_c: "70",
  working_pressure_mpa: "0.6",
  test_pressure_mpa: "0.9",
  primary_resource_units_per_output: "1.05",
  procurement_factor: "1.03",
  primary_resource_mass_kg_per_unit: "2.4",
  accessory_count: "12",
  connection_count: "12",
  joint_consumable_kg_per_connection: "0.05",
  support_count: "3",
  penetration_count: "3",
  labor_productivity_output_per_man_hour: "10",
  equipment_productivity_output_per_machine_hour: "10",
  connection_productivity_item_per_man_hour: "10",
  loading_productivity_kg_per_man_hour: "10",
  handling_productivity_kg_per_machine_hour: "10",
  delivery_distance_km: "12",
  waste_percent: "3",
  control_section_output: "50",
  commissioning_productivity_output_per_man_hour: "10",
  documentation_record_count: "4",
  firestopping_included: "true",
  firestop_material_kg_per_penetration: "2",
  firestop_productivity_item_per_man_hour: "2",
  insulation_included: "true",
  insulation_quantity: "150",
  insulation_labor_productivity_per_man_hour: "10",
  elbow_count: "12",
  tee_count: "6",
  reducer_count: "4",
  valve_count: "8",
  pressure_test_section_count: "2",
  heating_terminals_included: "true",
  heating_terminal_count: "12",
  heating_terminal_connection_count: "12",
  heating_terminal_productivity_item_per_man_hour: "2",
  duct_material_and_coating: "Оцинкованная сталь по проекту",
  duct_shape: "RECTANGULAR",
  duct_surface_area_m2: "300",
  design_airflow_m3_h: "2500",
  duct_pressure_class: "Класс B по проекту",
  duct_elbow_count: "12",
  duct_tee_count: "6",
  duct_transition_count: "8",
  damper_count: "10",
  air_terminal_count: "16",
  measurement_point_count: "16",
  silencer_count: "4",
  equipment_model: "Проектная модель HVAC",
  design_capacity_kw: "100",
  equipment_design_flow_m3_h: "2500",
  equipment_performance_profile: "Рабочая точка по утверждённому проекту",
  equipment_mass_kg: "1000",
  frame_count: "2",
  vibration_isolator_count: "8",
  lifting_productivity_kg_per_machine_hour: "500",
  auxiliary_equipment_count: "4",
  flexible_connection_count: "6",
  electrical_automation_included: "true",
  electrical_connection_count: "2",
  automation_point_count: "4",
  electrical_labor_productivity_point_per_man_hour: "2",
  manufacturer_system_profile_id: "PROJECT-MANUFACTURER-HVAC-SYSTEM",
  refrigerant_type: "R32 по паспорту",
  liquid_line_length_m: "80",
  gas_line_length_m: "80",
  refrigerant_branch_count: "4",
  manufacturer_charge_kg: "12",
  vacuum_test_section_count: "2",
  condensate_drain_included: "true",
  condensate_drain_length_m: "80",
  condensate_drain_fitting_count: "12",
  condensate_drain_productivity_m_per_man_hour: "10",
  circuit_length_m: "900",
  circuit_count: "12",
  manifold_outlet_count: "12",
  fixing_units_per_m2: "5",
  interior_screed_included: "true",
  screed_volume_m3: "12",
  screed_productivity_m3_per_man_hour: "2",
  design_flow_total: "1000",
  measurement_productivity_point_per_man_hour: "3",
  earthworks_included: "true",
  external_work_length_m: "120",
  trench_width_m: "1.2",
  trench_depth_m: "1.8",
  bedding_thickness_m: "0.15",
  excavation_productivity_m3_per_machine_hour: "10",
  backfill_productivity_m3_per_machine_hour: "10",
  surplus_soil_m3: "10",
  soil_bulk_density_t_m3: "1.6",
  soil_haul_distance_km: "12",
  restoration_included: "true",
  restoration_area_m2: "150",
  restoration_material_kg_per_m2: "25",
  restoration_productivity_m2_per_man_hour: "10",
  demolition_included: "true",
  demolition_output_quantity: "20",
  demolition_productivity_output_per_man_hour: "3",
  removed_mass_kg_per_output: "8",
  demolition_haul_distance_km: "12",
});

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

async function readBundle(page: Page, draftId?: string): Promise<AnyBundle | null> {
  const raw = await page.evaluate(({ prefix, id }) => {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const value = window.localStorage.getItem(key);
      if (!value) continue;
      const parsed = JSON.parse(value);
      if (!id || parsed?.draft?.id === id) return parsed;
    }
    return null;
  }, { prefix: bundlePrefix, id: draftId ?? null });
  return raw ? decodeConsumerRepairBundleFromDurableStorage(raw) as AnyBundle : null;
}

async function waitForBundle(
  page: Page,
  draftId: string | undefined,
  predicate: (bundle: AnyBundle) => boolean,
): Promise<AnyBundle> {
  const started = Date.now();
  let latest: AnyBundle | null = null;
  while (Date.now() - started < 60_000) {
    latest = await readBundle(page, draftId);
    if (latest && predicate(latest)) return latest;
    await page.waitForTimeout(150);
  }
  throw new Error(`HVAC_WEB_BUNDLE_TIMEOUT:${JSON.stringify({
    draftId,
    status: latest?.draft?.status ?? null,
    revisionCount: latest?.estimateDraftRevisionState?.revisions.length ?? 0,
    revisionId: latest?.estimateDraftRevisionState?.currentRevisionId ?? null,
  })}`);
}

async function readTransactionalBundle(page: Page, draftId: string): Promise<AnyBundle | null> {
  const raw = await page.evaluate(async ({ id }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open("rik-estimate-revision-durable-v1", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("INDEXED_DB_OPEN_FAILED"));
    });
    try {
      const transaction = database.transaction("revision-records", "readonly");
      const store = transaction.objectStore("revision-records");
      const pointerRequest = store.get(`@pointer:${encodeURIComponent(id)}`);
      const pointer = await new Promise<any>((resolve, reject) => {
        pointerRequest.onsuccess = () => resolve(pointerRequest.result);
        pointerRequest.onerror = () => reject(pointerRequest.error ?? new Error("INDEXED_DB_POINTER_READ_FAILED"));
      });
      if (!pointer?.currentVersion) return null;
      const envelopeRequest = store.get(
        `@revision:${encodeURIComponent(id)}:${encodeURIComponent(pointer.currentVersion)}`,
      );
      const envelope = await new Promise<any>((resolve, reject) => {
        envelopeRequest.onsuccess = () => resolve(envelopeRequest.result);
        envelopeRequest.onerror = () => reject(envelopeRequest.error ?? new Error("INDEXED_DB_ENVELOPE_READ_FAILED"));
      });
      return typeof envelope?.serializedBundle === "string"
        ? JSON.parse(envelope.serializedBundle)
        : null;
    } finally {
      database.close();
    }
  }, { id: draftId });
  return raw ? decodeConsumerRepairBundleFromDurableStorage(raw) as AnyBundle : null;
}

async function waitForTransactionalBundle(
  page: Page,
  draftId: string,
  predicate: (bundle: AnyBundle) => boolean,
): Promise<AnyBundle> {
  const started = Date.now();
  let latest: AnyBundle | null = null;
  while (Date.now() - started < 60_000) {
    latest = await readTransactionalBundle(page, draftId);
    if (latest && predicate(latest)) return latest;
    await page.waitForTimeout(150);
  }
  throw new Error(`HVAC_WEB_TRANSACTIONAL_BUNDLE_TIMEOUT:${JSON.stringify({
    draftId,
    status: latest?.draft?.status ?? null,
    revisionId: latest?.estimateDraftRevisionState?.currentRevisionId ?? null,
    immutableRevisionId: latest?.estimateRevisionState?.current_revision_id ?? null,
  })}`);
}

async function clickControl(locator: Locator): Promise<void> {
  if (target === "android-chrome") {
    // Android Chrome exposes oversized sticky-layer hit boxes through CDP.
    // Keep the real control away from both sticky bars before dispatching the
    // pointer event so an option cannot accidentally hit the Delete action.
    await locator.evaluate((element) => element.scrollIntoView({ block: "center", inline: "center" }));
    await locator.page().waitForTimeout(100);
    await locator.click({ force: true });
    return;
  }
  await locator.click();
}

async function setParameter(page: Page, parameterId: string, value: string): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const option = page.getByTestId(`editable-param-option-${parameterId}-${value}`).first();
    if (await option.count()) {
      await option.scrollIntoViewIfNeeded();
      await clickControl(option);
      return;
    }
    const editor = page.getByTestId(`editable-param-inline-editor-${parameterId}`).first();
    if (await editor.count()) {
      await editor.scrollIntoViewIfNeeded();
      await editor.getByTestId("editable-param-popover-input").fill(value);
      return;
    }
    const showMore = page.getByTestId("request-estimate-show-more-parameters");
    if (await showMore.count()) {
      await clickControl(showMore);
    }
    await page.waitForTimeout(100);
  }
  throw new Error(`HVAC_WEB_PARAMETER_CONTROL_NOT_VISIBLE:${parameterId}`);
}

async function openAllParameters(page: Page): Promise<void> {
  if (await page.getByTestId("request-estimate-parameter-panel").count() === 0) {
    await clickControl(page.getByTestId("request-estimate-parameters-toggle"));
  }
  const showMore = page.getByTestId("request-estimate-show-more-parameters");
  if (await showMore.count()) await clickControl(showMore);
}

async function clickApply(page: Page): Promise<void> {
  const apply = page.getByTestId("editable-param-batch-apply").first();
  if (target === "android-chrome") {
    await apply.evaluate((element) => element.scrollIntoView({ block: "center", inline: "center" }));
    await page.waitForTimeout(150);
    // The mobile web shell has sticky header/footer layers whose oversized
    // hit-test boxes can overlap a visually unobscured control in CDP. This is
    // the same established Android-Chrome harness treatment used by the
    // Asphalt matrix; it still dispatches the real React press handler.
    await apply.click({ force: true });
    return;
  } else {
    await apply.scrollIntoViewIfNeeded();
  }
  await apply.click();
}

async function fillDelivery(page: Page): Promise<void> {
  if (await page.getByTestId("consumer-repair-address-input").count() === 0) {
    await clickControl(page.getByTestId("consumer-repair-delivery-summary"));
  }
  await page.getByTestId("consumer-repair-city-input").fill("Bishkek");
  await page.getByTestId("consumer-repair-address-input").fill("64 Malikova Street");
  await page.getByTestId("consumer-repair-time-input").fill("Завтра");
  await page.getByTestId("consumer-repair-phone-input").fill("0707052577");
}

async function proveHistoryUi(page: Page, title: string): Promise<void> {
  const history = page.getByTestId("consumer-repair-history-button");
  await history.waitFor({ timeout: 30_000 });
  await history.scrollIntoViewIfNeeded();
  await clickControl(history);
  const modal = page.getByTestId("consumer-repair-history-modal");
  await modal.waitFor({ timeout: 30_000 });
  const firstRow = modal.getByTestId("consumer-repair-history-row").first();
  await firstRow.waitFor({ timeout: 30_000 });
  if (!(await firstRow.innerText()).includes(title)) {
    throw new Error(`HVAC_WEB_HISTORY_LATEST_TITLE_MISMATCH:${title}:${await firstRow.innerText()}`);
  }
  await clickControl(firstRow.getByTestId("consumer-repair-history-main"));
  await modal.getByTestId("consumer-repair-history-readonly-snapshot").waitFor({ timeout: 30_000 });
  await clickControl(modal.getByTestId("consumer-repair-history-close"));
}

async function runScenario(
  context: BrowserContext,
  catalogId: string,
  index: number,
): Promise<Record<string, unknown>> {
  const selection = resolveRegisteredProfessionalEstimateSelectionV1(catalogId);
  if (!selection) throw new Error(`HVAC_WEB_SELECTION_NOT_REGISTERED:${catalogId}`);
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    const inventory = HVAC_DOMAIN_INVENTORY.find((row) => row.catalog_id === catalogId);
    if (!inventory) throw new Error(`HVAC_WEB_INVENTORY_NOT_FOUND:${catalogId}`);
    const profile = hvacTechnologyProfile(inventory);
    const scenarioValues: Readonly<Record<string, string>> = {
      ...values,
      scope_capability: inventory.scope_capability,
      system_purpose: profile.system_purpose,
      medium_or_air_system: profile.medium_or_air_system,
      network_location: profile.network_location,
    };
    const launchId = `hvac-complete-${target}-${index + 1}-${Date.now()}`;
    const launchTarget = resolveRequestEstimateLaunchTargetV1(
      `/request?autoPrepare=1&catalogWorkId=${encodeURIComponent(catalogId)}&prompt=${encodeURIComponent(selection.title_ru)}`,
      { launchId },
    );
    if (!launchTarget) throw new Error(`HVAC_WEB_LAUNCH_TARGET_MISSING:${catalogId}`);
    await page.goto(`${baseUrl}${launchTarget.pathname}${launchTarget.query}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.getByTestId(buildRequestEstimateLaunchReadyMarkerId(launchId)).waitFor({ timeout: 30_000 });
    await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 60_000 });
    const initial = await waitForBundle(page, undefined, (bundle) =>
      bundle.draft?.selectedCatalogWorkId === catalogId &&
      bundle.draft?.selectedWorkKey === selection.work_key &&
      bundle.estimateDraftRevisionState == null,
    );
    const draftId = initial.draft.id;
    await fillDelivery(page);
    await openAllParameters(page);

    // Select the scope first so the canonical panel reveals the matching P1
    // fields; visible_when and required_when are the same domain contract.
    await setParameter(page, "estimate_scope_mode", values.estimate_scope_mode);
    await page.waitForTimeout(100);
    const showMore = page.getByTestId("request-estimate-show-more-parameters");
    if (await showMore.count()) await clickControl(showMore);
    for (const definition of selection.canonical_parameter_schema.definitions) {
      if (definition.parameterId === "estimate_scope_mode") continue;
      const parameterValue = scenarioValues[definition.parameterId];
      if (parameterValue == null) {
        throw new Error(`HVAC_WEB_FIXTURE_VALUE_MISSING:${catalogId}:${definition.parameterId}`);
      }
      await setParameter(page, definition.parameterId, parameterValue);
    }
    await clickApply(page);
    await page.getByTestId("consumer-repair-status").filter({
      hasText: "Параметры применены. Смета сформирована и сохранена: R1",
    }).waitFor({ timeout: 60_000 });

    const applied = await waitForBundle(page, draftId, (bundle) => {
      const state = bundle.estimateDraftRevisionState;
      const revision = state?.revisions.find((candidate) => candidate.revisionId === state.currentRevisionId);
      return Boolean(state?.revisions.length === 1 && revision?.boq.rows.length);
    });
    const r1State = applied.estimateDraftRevisionState!;
    const r1 = r1State.revisions.find((candidate) => candidate.revisionId === r1State.currentRevisionId)!;
    const categories = new Set(r1.boq.rows.map((row) => row.sourceParameters?.professionalBoqCategory));
    for (const category of ["material", "labor", "equipment", "transport", "waste", "testing", "documentation"]) {
      if (!categories.has(category)) throw new Error(`HVAC_WEB_PROFESSIONAL_CATEGORY_MISSING:${catalogId}:${category}`);
    }
    if (
      r1.resolvedIdentity?.requestedCatalogWorkId !== catalogId ||
      r1.professionalWorkId !== selection.work_key ||
      applied.draft.selectedCatalogWorkId !== catalogId ||
      applied.draft.selectedWorkKey !== selection.work_key
    ) {
      throw new Error(`HVAC_WEB_EXACT_IDENTITY_LOST:${catalogId}`);
    }

    const quantityKey = ["route_length_m", "component_count", "system_count", "surface_area_m2", "zone_area_m2"].find((parameterId) =>
      selection.canonical_parameter_schema.definitions.some((item) => item.parameterId === parameterId));
    if (!quantityKey) throw new Error(`HVAC_WEB_QUANTITY_PARAMETER_NOT_FOUND:${catalogId}`);
    await openAllParameters(page);
    await setParameter(page, quantityKey, String(160 + index));
    await clickApply(page);
    await page.getByTestId("consumer-repair-status").filter({
      hasText: "сохранена: R2",
    }).waitFor({ timeout: 60_000 });
    const edited = await waitForBundle(page, draftId, (bundle) =>
      bundle.estimateDraftRevisionState?.revisions.length === 2,
    );
    const r2State = edited.estimateDraftRevisionState!;
    const r2 = r2State.revisions.find((candidate) => candidate.revisionId === r2State.currentRevisionId)!;
    if (r2.previousRevisionId !== r1.revisionId) {
      throw new Error(`HVAC_WEB_EDIT_REVISION_CHAIN_INVALID:${catalogId}`);
    }
    const rowsHash = hash(r2.boq.rows);

    const approve = page.getByTestId("consumer-repair-approve");
    await approve.waitFor({ timeout: 30_000 });
    await approve.scrollIntoViewIfNeeded();
    await clickControl(approve);
    const approvedSummary = await waitForBundle(page, draftId, (bundle) =>
      bundle.draft.status === "consumer_approved" &&
      bundle.pdfs.some((pdf) => pdf.pdfStatus === "generated"),
    );
    const approved = await waitForTransactionalBundle(page, draftId, (bundle) =>
      bundle.draft.status === "consumer_approved" &&
      bundle.estimateDraftRevisionState?.currentRevisionId === r2.revisionId &&
      bundle.pdfs.some((pdf) => pdf.pdfStatus === "generated"),
    );
    const pdf = approved.pdfs.find((candidate) => candidate.pdfStatus === "generated");
    const immutableState = approved.estimateRevisionState;
    const immutableRevision = immutableState?.revisions.find(
      (candidate) => candidate.revision_id === immutableState.current_revision_id,
    );
    const pdfBinding = immutableState?.pdf_exports.find((candidate) => candidate.pdf_id === pdf?.id);
    const calculationState = immutableState?.calculation_state?.state;
    const durableSummary = approved.durableHistorySummary;
    if (
      !pdf ||
      !immutableRevision ||
      !pdfBinding ||
      calculationState?.currentRevisionId !== r2.revisionId ||
      pdf.revisionId !== immutableRevision.revision_id ||
      pdf.snapshotId !== immutableRevision.snapshot_id ||
      pdf.revisionRowsHash !== immutableRevision.rows_hash ||
      pdf.revisionTotalsHash !== immutableRevision.totals_hash ||
      pdf.revisionFullSnapshotHash !== immutableRevision.full_snapshot_hash ||
      pdfBinding.pdf_export_revision_id !== immutableRevision.revision_id ||
      pdfBinding.pdf_snapshot_id !== immutableRevision.snapshot_id ||
      pdfBinding.pdf_rows_hash !== immutableRevision.rows_hash ||
      pdfBinding.pdf_totals_hash !== immutableRevision.totals_hash ||
      pdfBinding.pdf_full_snapshot_hash !== immutableRevision.full_snapshot_hash ||
      pdfBinding.pdf_recalculated_separately !== false ||
      durableSummary?.sourceRevisionId !== immutableRevision.revision_id ||
      durableSummary.rowsHash !== immutableRevision.rows_hash ||
      durableSummary.totalsHash !== immutableRevision.totals_hash ||
      durableSummary.fullSnapshotHash !== immutableRevision.full_snapshot_hash ||
      approvedSummary.durableHistorySummary?.sourceRevisionId !== immutableRevision.revision_id ||
      approvedSummary.durableHistorySummary.rowsHash !== immutableRevision.rows_hash ||
      approvedSummary.durableHistorySummary.fullSnapshotHash !== immutableRevision.full_snapshot_hash
    ) {
      throw new Error(`HVAC_WEB_PDF_PARITY_INVALID:${catalogId}:${JSON.stringify({
        calculationRevisionId: calculationState?.currentRevisionId ?? null,
        expectedCalculationRevisionId: r2.revisionId,
        immutableRevisionId: immutableRevision?.revision_id ?? null,
        pdfRevisionId: pdf?.revisionId ?? null,
        pdfBindingRevisionId: pdfBinding?.pdf_export_revision_id ?? null,
        durableRevisionId: durableSummary?.sourceRevisionId ?? null,
      })}`);
    }
    await proveHistoryUi(page, selection.title_ru);

    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByTestId("consumer-repair-history-button").waitFor({ timeout: 60_000 });
    const reopened = await waitForTransactionalBundle(page, draftId, (bundle) =>
      bundle.estimateDraftRevisionState?.currentRevisionId === r2.revisionId,
    );
    const reopenedRevision = reopened.estimateDraftRevisionState?.revisions.find(
      (candidate) => candidate.revisionId === r2.revisionId,
    );
    if (!reopenedRevision || hash(reopenedRevision.boq.rows) !== rowsHash) {
      throw new Error(`HVAC_WEB_DURABLE_REOPEN_MISMATCH:${catalogId}`);
    }
    await proveHistoryUi(page, selection.title_ru);
    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      throw new Error(`HVAC_WEB_CONSOLE_RED:${catalogId}:${JSON.stringify({ consoleErrors, pageErrors })}`);
    }
    await page.screenshot({
      path: path.join(outputRoot, `${index + 1}-${catalogId}.png`),
      fullPage: true,
    });
    return {
      catalog_id: catalogId,
      work_key: selection.work_key,
      title_ru: selection.title_ru,
      apply_clicks: 2,
      revision_count: 2,
      r1_revision_id: r1.revisionId,
      r2_revision_id: r2.revisionId,
      boq_rows: r2.boq.rows.length,
      exact_identity: "GREEN",
      professional_categories: [...categories].sort(),
      approval: approved.draft.status,
      pdf_revision_id: pdf.revisionId,
      pdf_rows_hash: pdf.revisionRowsHash,
      immutable_revision_id: immutableRevision.revision_id,
      calculation_revision_id: calculationState.currentRevisionId,
      durable_summary_revision_id: durableSummary.sourceRevisionId,
      durable_reload_same_revision: true,
      history_reopen_same_revision: true,
      rows_hash: rowsHash,
      console_errors: consoleErrors,
      page_errors: pageErrors,
    };
  } catch (error) {
    await page.screenshot({
      path: path.join(outputRoot, `${index + 1}-${catalogId}-failure.png`),
      fullPage: true,
    }).catch(() => undefined);
    const bodyText = await page.locator("body").innerText().catch(() => "");
    writeFileSync(
      path.join(outputRoot, `${index + 1}-${catalogId}-failure.txt`),
      `${bodyText}\n\nCONSOLE\n${consoleErrors.join("\n")}\n\nPAGE_ERRORS\n${pageErrors.join("\n")}\n`,
      "utf8",
    );
    throw error;
  } finally {
    await page.close();
  }
}

async function main(): Promise<void> {
  mkdirSync(outputRoot, { recursive: true });
  const androidSession = target === "android-chrome"
    ? await openAndroidChromeCdpSession({
      deviceId: androidDeviceId,
      baseUrl,
      startUrl: `${baseUrl}/`,
    })
    : null;
  const browser = androidSession?.browser ?? await chromium.launch({ headless: true });
  const context = androidSession?.context ?? await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.addInitScript(() => {
    const resetMarker = "rik.hvac-complete-web-smoke.storage-reset.v1";
    if (window.sessionStorage.getItem(resetMarker) === "1") return;
    window.localStorage.clear();
    window.sessionStorage.setItem(resetMarker, "1");
  });
  const startedAt = Date.now();
  let artifact: Record<string, unknown>;
  try {
    const results: Record<string, unknown>[] = [];
    for (const [index, catalogId] of activeScenarios.entries()) {
      results.push(await runScenario(context, catalogId, index));
    }
    artifact = {
      schema: `hvac-complete-${target}-representative-smoke:v1`,
      generated_at: new Date().toISOString(),
      source_sha: git("rev-parse", "HEAD"),
      source_tree: git("rev-parse", "HEAD^{tree}"),
      status: "GREEN",
      scenario_count: results.length,
      passed: results.length,
      total: activeScenarios.length,
      scenarios: results,
      duration_ms: Date.now() - startedAt,
      base_url: baseUrl,
      target,
      android_device_id: target === "android-chrome" ? androidDeviceId : null,
    };
  } catch (error) {
    const signature = error instanceof Error ? error.message : String(error);
    const classification = /ECONNREFUSED|ERR_CONNECTION_REFUSED|browserType\.launch|CDP|ADB|net::ERR_/.test(signature)
      ? "INFRA"
      : /FIXTURE_VALUE_MISSING|PARAMETER_CONTROL_NOT_VISIBLE|LAUNCH_TARGET_MISSING|locator|Timeout.*testid/i.test(signature)
        ? "HARNESS"
        : /EVIDENCE|artifact|screenshot|write/i.test(signature)
          ? "EVIDENCE"
          : "PRODUCT";
    artifact = {
      schema: `hvac-complete-${target}-representative-smoke:v1`,
      generated_at: new Date().toISOString(),
      source_sha: git("rev-parse", "HEAD"),
      source_tree: git("rev-parse", "HEAD^{tree}"),
      status: "RED",
      scenario_count: 0,
      passed: 0,
      total: activeScenarios.length,
      classification,
      signature,
      duration_ms: Date.now() - startedAt,
      base_url: baseUrl,
      target,
      android_device_id: target === "android-chrome" ? androidDeviceId : null,
    };
  } finally {
    if (androidSession) await androidSession.close();
    else {
      await context.close();
      await browser.close();
    }
  }
  const artifactPath = path.join(
    outputRoot,
    target === "android-chrome"
      ? "HVAC_COMPLETE_ANDROID_SMOKE.json"
      : "HVAC_COMPLETE_WEB_SMOKE.json",
  );
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.info(JSON.stringify({ artifact: artifactPath, ...artifact }, null, 2));
  if (artifact.status !== "GREEN") process.exitCode = 1;
}

void main();
