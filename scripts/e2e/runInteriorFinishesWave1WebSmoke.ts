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
import { INTERIOR_FINISHES_DOMAIN_INVENTORY } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { openAndroidChromeCdpSession } from "./androidChromeCdpHarness";

const baseUrl = process.env.INTERIOR_WAVE1_WEB_BASE_URL ?? "http://localhost:8081";
const target = process.env.INTERIOR_WAVE1_SMOKE_TARGET === "android-chrome" ? "android-chrome" : "web";
const androidDeviceId = process.env.E2E_ANDROID_DEVICE_ID ?? "emulator-5554";
const outputRoot = path.join(
  ".release-runtime",
  "interior-finishes-domain-complete-r1",
  `interior-${target}-${new Date().toISOString().replace(/[:.]/g, "-")}`,
);
const bundlePrefix = "rik.consumer_repair.request_bundle.v2:";

type AnyBundle = ConsumerRepairDraftBundle & Record<string, any>;

const scenarios = [
  "plaster_paint_interior_wall_plaster_apply_standard",
  "tile_stone_interior_shower_tile_lay_wet_zone",
  "flooring_interior_subfloor_prepare_standard",
  "drywall_ceiling_interior_drywall_partition_install_standard",
  "drywall_ceiling_interior_drywall_ceiling_install_technical_room",
  "flooring_interior_laminate_replace_standard",
] as const;

const activeScenarios = target === "android-chrome" ? scenarios.slice(0, 2) : scenarios;

const values: Readonly<Record<string, string>> = Object.freeze({
  work_included: "true",
  estimate_scope_mode: "FULL_APPLICABLE_SCOPE",
  scope_capability: "standard",
  funding_source: "PRIVATE_RECOMMENDED",
  project_type: "RESIDENTIAL_INTERIOR",
  area_m2: "120",
  length_m: "12",
  width_m: "10",
  junction_length_m: "48",
  surface_type: "PROJECT_SPECIFIED",
  existing_condition: "ACCEPTED",
  application_method: "MECHANIZED",
  product_profile_id: "PROJECT-MATERIAL-PASSPORT-IFW1",
  normative_rate_code: "PROJECT-VERIFIED-RATE-IFW1",
  layer_thickness_mm: "2",
  material_consumption_kg_m2_mm: "0.9",
  coat_count: "2",
  material_consumption_kg_m2_coat: "0.18",
  material_consumption_m2_m2: "1.1",
  material_consumption_m_m: "1.05",
  material_mass_kg_per_unit: "0.2",
  labor_productivity_output_per_man_hour: "8",
  equipment_productivity_output_per_machine_hour: "25",
  surface_preparation_productivity_output_per_man_hour: "15",
  auxiliary_material_rate_kg_per_output: "0.05",
  waste_percent: "3",
  delivery_distance_km: "12",
  truck_payload_t: "5",
  loading_productivity_kg_per_man_hour: "500",
  waste_handling_productivity_kg_per_man_hour: "300",
  qa_interval_output_per_test: "100",
  documentation_record_count: "3",
  small_area_detail_productivity_output_per_man_hour: "4",
  large_area_material_handling_productivity_kg_per_machine_hour: "750",
  wet_zone_protection_rate_kg_per_output: "0.35",
  wet_zone_moisture_control_interval_output_per_test: "40",
  technical_room_protective_material_rate_kg_per_output: "0.22",
  technical_room_detailing_productivity_output_per_man_hour: "5",
  high_load_reinforcement_rate_output_per_output: "1.08",
  high_load_reinforcement_productivity_output_per_man_hour: "6",
  repair_removal_quantity_output: "24",
  repair_removed_mass_kg_per_output: "8",
  repair_removal_productivity_output_per_man_hour: "3",
  repair_waste_haul_distance_km: "18",
  material_consumption_kg_m2: "0.9",
  labor_productivity_m2_per_man_hour: "8",
  equipment_productivity_m2_per_machine_hour: "25",
  preparation_productivity_m2_per_man_hour: "15",
  protective_consumables_rate_kg_m2: "0.05",
  system_accessory_rate_per_m2: "0.1",
  qa_interval_m2_per_test: "100",
  small_area_detail_productivity_m2_per_man_hour: "4",
  large_area_handling_productivity_kg_per_machine_hour: "750",
  wet_zone_protection_rate_kg_m2: "0.35",
  wet_zone_test_interval_m2: "40",
  technical_protection_rate_kg_m2: "0.22",
  technical_detail_productivity_m2_per_man_hour: "5",
  high_load_reinforcement_rate_m2_m2: "1.08",
  high_load_reinforcement_productivity_m2_per_man_hour: "6",
  removal_area_m2: "24",
  removed_mass_kg_m2: "8",
  removal_productivity_m2_per_man_hour: "3",
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
  throw new Error(`INTERIOR_WEB_BUNDLE_TIMEOUT:${JSON.stringify({
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
  throw new Error(`INTERIOR_WEB_TRANSACTIONAL_BUNDLE_TIMEOUT:${JSON.stringify({
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
  throw new Error(`INTERIOR_WEB_PARAMETER_CONTROL_NOT_VISIBLE:${parameterId}`);
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
    throw new Error(`INTERIOR_WEB_HISTORY_LATEST_TITLE_MISMATCH:${title}:${await firstRow.innerText()}`);
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
  if (!selection) throw new Error(`INTERIOR_WEB_SELECTION_NOT_REGISTERED:${catalogId}`);
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    const scenarioValues: Readonly<Record<string, string>> = {
      ...values,
      scope_capability: INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) => row.catalog_id === catalogId)?.scope_capability ?? "",
    };
    const launchId = `interior-complete-${target}-${index + 1}-${Date.now()}`;
    const launchTarget = resolveRequestEstimateLaunchTargetV1(
      `/request?autoPrepare=1&catalogWorkId=${encodeURIComponent(catalogId)}&prompt=${encodeURIComponent(selection.title_ru)}`,
      { launchId },
    );
    if (!launchTarget) throw new Error(`INTERIOR_WEB_LAUNCH_TARGET_MISSING:${catalogId}`);
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
        throw new Error(`INTERIOR_WEB_FIXTURE_VALUE_MISSING:${catalogId}:${definition.parameterId}`);
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
      if (!categories.has(category)) throw new Error(`INTERIOR_WEB_PROFESSIONAL_CATEGORY_MISSING:${catalogId}:${category}`);
    }
    if (
      r1.resolvedIdentity?.requestedCatalogWorkId !== catalogId ||
      r1.professionalWorkId !== selection.work_key ||
      applied.draft.selectedCatalogWorkId !== catalogId ||
      applied.draft.selectedWorkKey !== selection.work_key
    ) {
      throw new Error(`INTERIOR_WEB_EXACT_IDENTITY_LOST:${catalogId}`);
    }

    const quantityKey = selection.canonical_parameter_schema.definitions.some((item) => item.parameterId === "area_m2")
      ? "area_m2"
      : "junction_length_m";
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
      throw new Error(`INTERIOR_WEB_EDIT_REVISION_CHAIN_INVALID:${catalogId}`);
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
      throw new Error(`INTERIOR_WEB_PDF_PARITY_INVALID:${catalogId}:${JSON.stringify({
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
      throw new Error(`INTERIOR_WEB_DURABLE_REOPEN_MISMATCH:${catalogId}`);
    }
    await proveHistoryUi(page, selection.title_ru);
    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      throw new Error(`INTERIOR_WEB_CONSOLE_RED:${catalogId}:${JSON.stringify({ consoleErrors, pageErrors })}`);
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
    const resetMarker = "rik.interior-complete-web-smoke.storage-reset.v1";
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
      schema: `interior-finishes-complete-${target}-representative-smoke:v1`,
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
    artifact = {
      schema: `interior-finishes-complete-${target}-representative-smoke:v1`,
      generated_at: new Date().toISOString(),
      source_sha: git("rev-parse", "HEAD"),
      source_tree: git("rev-parse", "HEAD^{tree}"),
      status: "RED",
      scenario_count: 0,
      passed: 0,
      total: activeScenarios.length,
      classification: "PRODUCT_OR_HARNESS_RED",
      signature: error instanceof Error ? error.message : String(error),
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
      ? "INTERIOR_FINISHES_COMPLETE_ANDROID_SMOKE.json"
      : "INTERIOR_FINISHES_COMPLETE_WEB_SMOKE.json",
  );
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.info(JSON.stringify({ artifact: artifactPath, ...artifact }, null, 2));
  if (artifact.status !== "GREEN") process.exitCode = 1;
}

void main();
