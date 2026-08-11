import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium, type Page } from "playwright";

import type { ConsumerRepairDraftBundle } from "../../src/lib/consumerRequests";
import {
  buildRequestEstimateLaunchReadyMarkerId,
  resolveRequestEstimateLaunchTargetV1,
} from "../../src/lib/navigation/requestEstimateLaunchPayload";
import { decodeConsumerRepairBundleFromDurableStorage } from "../../src/lib/platform/compactConsumerRepairDurableState";

const baseUrl = process.env.ASPHALT_APPLY_WEB_BASE_URL ?? "http://localhost:8081";
const outputRoot = path.join(
  ".release-runtime",
  "asphalt-related-r9-r10",
  "apply-without-compiled-revision",
  new Date().toISOString().replace(/[:.]/g, "-"),
);
const bundlePrefix = "rik.consumer_repair.request_bundle.v2:";

const MINIMAL_RESOURCE_VALUES: Readonly<Record<string, string>> = Object.freeze({
  asphalt_waste_percent: "3",
  base_emulsion_rate_l_m2: "0.3",
  surface_cleaner_productivity_m2_per_machine_hour: "500",
  bitumen_distributor_productivity_m2_per_machine_hour: "800",
  paver_productivity_m2_per_machine_hour: "300",
  roller_productivity_m2_per_machine_hour: "250",
  pneumatic_roller_productivity_m2_per_machine_hour: "250",
  road_worker_productivity_m2_per_man_hour: "25",
  asphalt_plant_distance_km: "10",
  truck_payload_t: "20",
  truck_average_speed_km_per_machine_hour: "40",
  truck_turnaround_machine_hours: "0.5",
  laboratory_control: "contractor",
  incoming_control_interval_m2_per_test: "1000",
  compaction_control_interval_m2_per_test: "1000",
  core_sampling_interval_m2_per_test: "1000",
  laboratory_test_interval_m2_per_test: "1000",
  temperature_control_trips_per_test: "5",
  smoothness_control_interval_m2_per_test: "1000",
  thickness_control_interval_m2_per_test: "1000",
  laboratory_protocol_count: "1",
  executive_survey_service_count: "1",
  execution_documentation_count: "1",
});

type AnyBundle = ConsumerRepairDraftBundle & Record<string, any>;

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
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
  throw new Error(`WEB_APPLY_BUNDLE_TIMEOUT:${JSON.stringify({
    draftId,
    revisionId: latest?.estimateDraftRevisionState?.currentRevisionId ?? null,
    revisionCount: latest?.estimateDraftRevisionState?.revisions.length ?? 0,
    rows: latest?.estimateDraftRevisionState?.revisions.at(-1)?.boq?.rows?.length ?? 0,
  })}`);
}

async function select(page: Page, key: string, value: string): Promise<void> {
  const option = page.getByTestId(`editable-param-option-${key}-${value}`).first();
  await option.waitFor({ timeout: 30_000 });
  await option.scrollIntoViewIfNeeded();
  await option.click();
}

async function enter(page: Page, key: string, value: string): Promise<void> {
  const editor = page.getByTestId(`editable-param-inline-editor-${key}`).first();
  await editor.waitFor({ timeout: 30_000 });
  await editor.scrollIntoViewIfNeeded();
  await editor.getByTestId("editable-param-popover-input").fill(value);
}

async function selectOrEnter(page: Page, key: string, value: string): Promise<void> {
  const option = page.getByTestId(`editable-param-option-${key}-${value}`).first();
  if (await option.count()) {
    await option.scrollIntoViewIfNeeded();
    await option.click();
    return;
  }
  await enter(page, key, value);
}

async function main(): Promise<void> {
  mkdirSync(outputRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  // Start from one clean durable session, but do not erase the repository on
  // the product's draftId navigation or on the reload this smoke must prove.
  await context.addInitScript(() => {
    const resetMarker = "rik.asphalt-r63-web-smoke.storage-reset.v1";
    if (window.sessionStorage.getItem(resetMarker) === "1") return;
    window.localStorage.clear();
    window.sessionStorage.setItem(resetMarker, "1");
  });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    consoleMessages.push(`${message.type()}:${message.text()}`);
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  let artifact: Record<string, unknown>;
  try {
    const promptText = "асфальтирование парковки 5000 кв метров";
    const launchId = `asphalt-r63-web-smoke-${Date.now()}`;
    const launchTarget = resolveRequestEstimateLaunchTargetV1(
      `/request?autoPrepare=1&catalogWorkId=${encodeURIComponent("built-in-ai-1000:0702")}&prompt=${encodeURIComponent(promptText)}`,
      { launchId },
    );
    if (!launchTarget) throw new Error("HARNESS_CANONICAL_REQUEST_LAUNCH_TARGET_MISSING");
    await page.goto(`${baseUrl}${launchTarget.pathname}${launchTarget.query}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.getByTestId(buildRequestEstimateLaunchReadyMarkerId(launchId)).waitFor({ timeout: 30_000 });
    await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 60_000 });
    const initial = await waitForBundle(page, undefined, (bundle) =>
      bundle.draft?.selectedCatalogWorkId === "built-in-ai-1000:0702" &&
      bundle.estimateDraftRevisionState == null,
    );
    const draftId = initial.draft.id;
    if (await page.getByTestId("request-estimate-parameter-panel").count() === 0) {
      await page.getByTestId("request-estimate-parameters-toggle").click();
    }
    const showMore = page.getByTestId("request-estimate-show-more-parameters");
    if (await showMore.count() > 0) await showMore.click();

    await select(page, "parking_purpose", "PASSENGER_CARS");
    await select(page, "traffic_class", "LIGHT");
    await select(page, "base_condition", "ACCEPTED");
    await select(page, "prepared_base_confirmed", "true");
    await enter(page, "wearing_layer_thickness_mm", "50");
    await select(page, "wearing_mix_type", "DENSE_FINE_GRAINED");
    await enter(page, "asphalt_density_t_m3", "2.35");
    await select(page, "estimate_scope_mode", "MINIMAL_EXPLICIT_SCOPE");
    await select(page, "project_scope", "SURFACING_ONLY");
    for (const [key, value] of Object.entries(MINIMAL_RESOURCE_VALUES)) {
      await selectOrEnter(page, key, value);
    }

    const dirtyText = await page.getByTestId("editable-param-batch-dirty-count").innerText();
    if (!dirtyText.includes("32")) throw new Error(`WEB_APPLY_DIRTY_COUNT_NOT_32:${dirtyText}`);
    const apply = page.getByTestId("editable-param-batch-apply").first();
    await apply.scrollIntoViewIfNeeded();
    await apply.click();
    await page.getByTestId("consumer-repair-status").filter({
      hasText: "Параметры применены. Смета сформирована и сохранена: R1",
    }).waitFor({ timeout: 60_000 });

    const applied = await waitForBundle(page, draftId, (bundle) => {
      const state = bundle.estimateDraftRevisionState;
      const revision = state?.revisions.find((item) => item.revisionId === state.currentRevisionId);
      return Boolean(state?.revisions.length === 1 && (revision?.boq.rows.length ?? 0) > 0);
    });
    const state = applied.estimateDraftRevisionState!;
    const revision = state.revisions.find((item) => item.revisionId === state.currentRevisionId)!;
    if (revision.boq.rows.length < 25) {
      throw new Error(`WEB_APPLY_PROFESSIONAL_BOQ_UNDERDECOMPOSED:${revision.boq.rows.length}`);
    }
    const equipmentRows = revision.boq.rows.filter((row) =>
      row.category === "machinery" || row.rowType === "equipment"
    );
    if (equipmentRows.length < 5 || equipmentRows.some((row) => row.unit === "m2")) {
      throw new Error(`WEB_APPLY_RESOURCE_DIMENSION_INVALID:${JSON.stringify(equipmentRows.map((row) => ({ rowId: row.rowId, unit: row.unit })))}`);
    }
    const rowsHash = hash(revision.boq.rows);
    if (applied.draft.selectedCatalogWorkId !== "built-in-ai-1000:0702") {
      throw new Error(`WEB_APPLY_CATALOG_IDENTITY_LOST:${applied.draft.selectedCatalogWorkId}`);
    }
    if (applied.draft.selectedWorkKey !== "asphalt_parking_lot" || revision.professionalWorkId !== "asphalt_parking_lot") {
      throw new Error(`WEB_APPLY_WORK_IDENTITY_LOST:${applied.draft.selectedWorkKey}:${revision.professionalWorkId}`);
    }

    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 60_000 });
    const reopened = await waitForBundle(page, draftId, (bundle) =>
      bundle.estimateDraftRevisionState?.currentRevisionId === revision.revisionId,
    );
    const reopenedState = reopened.estimateDraftRevisionState!;
    const reopenedRevision = reopenedState.revisions.find(
      (item) => item.revisionId === reopenedState.currentRevisionId,
    )!;
    const reopenedSameRevision =
      reopenedRevision.revisionId === revision.revisionId &&
      hash(reopenedRevision.boq.rows) === rowsHash;
    if (!reopenedSameRevision) throw new Error("WEB_APPLY_REOPEN_REVISION_MISMATCH");

    await page.screenshot({ path: path.join(outputRoot, "parking-after-apply-reload.png"), fullPage: true });
    artifact = {
      schema: "asphalt-apply-without-compiled-revision-web-smoke-v1",
      generated_at: new Date().toISOString(),
      base_url: baseUrl,
      passed: true,
      apply_click: 1,
      revision_before: 0,
      new_revision: 1,
      revision_id: revision.revisionId,
      boq_rows: revision.boq.rows.length,
      exact_catalog_id: applied.draft.selectedCatalogWorkId,
      exact_work_key: applied.draft.selectedWorkKey,
      history_reopen_same_revision: reopenedSameRevision,
      rows_hash: rowsHash,
      launch_id: launchId,
      canonical_launch_fingerprint: launchTarget.payload.fingerprint,
      console_errors: consoleErrors,
      page_errors: pageErrors,
    };
  } catch (error) {
    await page.screenshot({ path: path.join(outputRoot, "parking-apply-failure.png"), fullPage: true }).catch(() => undefined);
    artifact = {
      schema: "asphalt-apply-without-compiled-revision-web-smoke-v1",
      generated_at: new Date().toISOString(),
      base_url: baseUrl,
      passed: false,
      classification: "PRODUCT_OR_HARNESS_RED",
      signature: error instanceof Error ? error.message : String(error),
      page_url: page.url(),
      body_text: ((await page.locator("body").innerText().catch(() => "")) || "").slice(0, 4_000),
      console_messages: consoleMessages.slice(-200),
      console_errors: consoleErrors,
      page_errors: pageErrors,
    };
  } finally {
    await context.close();
    await browser.close();
  }
  const artifactPath = path.join(outputRoot, "web-apply-smoke.json");
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.info(JSON.stringify({ artifact: artifactPath, ...artifact }, null, 2));
  if (!artifact.passed) process.exitCode = 1;
}

void main();
