import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";

import { gitOutput, timestampForPath } from "../estimate/buildControlledPilotHealthDashboard";
import { createConsumerRepairRequestDraft } from "../../src/lib/consumerRequests/consumerRequestService";
import { buildProjectExecutionDraftFromRevision } from "../../src/lib/projectExecution/buildProjectExecutionDraftFromRevision";
import { decodeConsumerRepairBundleFromDurableStorage } from "../../src/lib/platform/compactConsumerRepairDurableState";

export const GREEN_T8_PLATFORM_CORE_WEB_ACCEPTANCE =
  "GREEN_T8_PLATFORM_CORE_WEB_ACCEPTANCE" as const;
export const STOP_T8_PLATFORM_CORE_WEB_ACCEPTANCE =
  "STOP_T8_PLATFORM_CORE_WEB_ACCEPTANCE" as const;

const PROMPT =
  "электрика под ключ 100 кв метров площадь длина трассы 500 метров 40 розеток 20 выключателей 30 точек освещения";
const ADDRESS = "Бишкек, проверочный адрес T8";
const PHONE = "0700000000";
const CANONICAL_WORK_KEY = "electrical_area_installation";
const LEGACY_WORK_KEY = "electrical_turnkey_area_legacy_42";
const STORAGE = {
  legacy: "rik.consumer_repair.request_bundles.v1",
  manifest: "rik.consumer_repair.request_bundles.v2.manifest",
  prefix: "rik.consumer_repair.request_bundle.v2:",
};

type Bundle = Record<string, any>;

type AcceptanceSummary = {
  final_status:
    | typeof GREEN_T8_PLATFORM_CORE_WEB_ACCEPTANCE
    | typeof STOP_T8_PLATFORM_CORE_WEB_ACCEPTANCE;
  source_sha: string;
  generated_at: string;
  base_url: string;
  actual_browser: true;
  electrical: Record<string, unknown>;
  legacy: Record<string, unknown>;
  console_errors: string[];
  page_errors: string[];
  blockers: string[];
  runtime_summary_path?: string;
};

function currentRevision(bundle: Bundle): any {
  const state = bundle.estimateDraftRevisionState;
  return state?.revisions?.find((revision: any) => revision.revisionId === state.currentRevisionId)
    ?? state?.revisions?.at(-1)
    ?? null;
}

async function installNameHelper(page: Page): Promise<void> {
  await page.evaluate("var __name = globalThis.__name || ((target) => target); globalThis.__name = __name;");
}

async function readBundles(page: Page): Promise<Bundle[]> {
  const encoded = await page.evaluate((storage) => {
    const result: any[] = [];
    const legacy = window.localStorage.getItem(storage.legacy);
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed)) result.push(...parsed);
      } catch {
        // The acceptance rejects an absent target bundle below.
      }
    }
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(storage.prefix)) continue;
      try {
        const parsed = JSON.parse(window.localStorage.getItem(key) ?? "null");
        if (parsed?.draft?.id) result.push(parsed);
      } catch {
        // The acceptance rejects an absent target bundle below.
      }
    }
    return result;
  }, STORAGE);
  return encoded
    .map((bundle) => decodeConsumerRepairBundleFromDurableStorage(bundle))
    .filter((bundle): bundle is NonNullable<typeof bundle> => bundle != null);
}

async function readBundle(page: Page, draftId?: string): Promise<Bundle> {
  const bundles = await readBundles(page);
  const bundle = draftId
    ? bundles.find((candidate) => candidate?.draft?.id === draftId)
    : bundles.sort((left, right) =>
      String(right?.draft?.createdAt ?? "").localeCompare(String(left?.draft?.createdAt ?? "")),
    )[0];
  if (!bundle) throw new Error(`BUNDLE_NOT_FOUND:${draftId ?? "latest"}`);
  return bundle;
}

async function clearStorage(page: Page, baseUrl: string): Promise<void> {
  await page.goto(new URL("/request", `${baseUrl}/`).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await installNameHelper(page);
  await page.evaluate((storage) => {
    window.localStorage.removeItem(storage.legacy);
    window.localStorage.removeItem(storage.manifest);
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(storage.prefix)) window.localStorage.removeItem(key);
    }
  }, STORAGE);
}

async function waitForBundle(
  page: Page,
  predicate: (bundle: Bundle) => boolean,
  draftId?: string,
  timeoutMs = 60_000,
): Promise<Bundle> {
  const started = Date.now();
  let last: Bundle | null = null;
  while (Date.now() - started < timeoutMs) {
    last = await readBundle(page, draftId).catch(() => null);
    if (last && predicate(last)) return last;
    await page.waitForTimeout(200);
  }
  throw new Error(`BUNDLE_WAIT_TIMEOUT:${draftId ?? "latest"}:${JSON.stringify(last?.draft ?? null)}`);
}

async function expandDelivery(page: Page): Promise<void> {
  if (await page.getByTestId("consumer-repair-phone-input").count()) return;
  const summary = page.getByTestId("consumer-repair-delivery-summary");
  if (await summary.count()) await summary.click();
  await page.getByTestId("consumer-repair-phone-input").waitFor({ timeout: 30_000 });
}

async function makePdf(page: Page, requestUrl: string, draftId: string): Promise<Bundle> {
  await page.getByTestId("consumer-estimate-make-pdf").first().scrollIntoViewIfNeeded();
  await page.getByTestId("consumer-estimate-make-pdf").first().click();
  await page.waitForURL((url) => url.pathname.includes("/pdf-viewer"), { timeout: 30_000 });
  await page.goBack({ waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!page.url().includes("/request")) {
    await page.goto(requestUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  }
  await installNameHelper(page);
  await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 30_000 });
  return waitForBundle(
    page,
    (bundle) => bundle.pdfs?.some((pdf: any) => pdf.pdfStatus === "generated"),
    draftId,
  );
}

function rowsById(revision: any): Map<string, any> {
  return new Map((revision?.boq?.rows ?? []).map((row: any) => [row.rowId, row]));
}

function comparableQuantity(row: any): string {
  return `${Number(row?.quantity).toFixed(6)}|${row?.unit ?? row?.definition?.unit_id ?? ""}`;
}

function buildLegacyBundle(): Bundle {
  const legacyTitles = [
    "Кабель",
    "Кабельные линии",
    "Кабель силовой",
    ...Array.from({ length: 39 }, (_, index) => `Старая позиция ${index + 1}`),
  ];
  const legacy = createConsumerRepairRequestDraft({
    consumerUserId: "consumer-demo-user",
    problemText: "электрика под ключ 100 квадратных метров",
    repairType: "electrical",
    selectedWork: {
      selectedCatalogWorkId: LEGACY_WORK_KEY,
      selectedWorkKey: LEGACY_WORK_KEY,
      selectedWorkTitleRu: "Электрика под ключ",
      selectedWorkCategoryKey: "electrical",
      selectedWorkCategoryTitleRu: "Электромонтажные работы",
      selectedWorkRawInput: "электрика под ключ 100 квадратных метров",
      selectedWorkSource: "user_selected",
      selectedWorkResolverReGuessed: false,
    },
    aiDraft: {
      titleRu: "Электрика под ключ",
      summaryRu: "Старая недостоверная смета",
      repairType: "electrical",
      dangerousDiyBlocked: false,
      missingData: [],
      items: legacyTitles.map((titleRu) => ({
        itemType: "material" as const,
        titleRu,
        quantity: 100,
        unit: "linear_m",
        unitPrice: null,
        currency: "KGS",
        source: "reference_price_book" as const,
      })),
    },
  });
  if (legacy.items.length !== 42) throw new Error(`LEGACY_FIXTURE_NOT_42:${legacy.items.length}`);
  return legacy;
}

async function runElectrical(page: Page, baseUrl: string): Promise<Record<string, unknown>> {
  await clearStorage(page, baseUrl);
  const target = new URL("/request", `${baseUrl}/`);
  target.searchParams.set("autoPrepare", "1");
  target.searchParams.set("prompt", PROMPT);
  target.searchParams.set("t8PlatformCoreWeb", "1");
  await page.goto(target.toString(), { waitUntil: "networkidle", timeout: 90_000 });
  await installNameHelper(page);
  await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 90_000 });
  await page.getByTestId("request-estimate-items-editor").waitFor({ timeout: 30_000 });

  const initialBundle = await waitForBundle(
    page,
    (bundle) => currentRevision(bundle)?.boq?.rows?.length > 0,
  );
  const draftId = initialBundle.draft.id;
  const requestUrl = page.url();
  const initialRevision = currentRevision(initialBundle);
  const initialRows = rowsById(initialRevision);
  const initialParams = Object.fromEntries(
    Object.entries(initialRevision.params ?? {}).map(([key, value]: [string, any]) => [key, value?.value ?? value]),
  );

  await expandDelivery(page);
  await page.getByTestId("consumer-repair-address-input").fill(ADDRESS);
  await page.getByTestId("consumer-repair-phone-input").fill(PHONE);
  const approveVisible = await page.getByTestId("consumer-repair-approve").isVisible();
  const approveEnabled = await page.getByTestId("consumer-repair-approve").isEnabled();

  await page.getByTestId("request-estimate-parameters-toggle").click();
  const routeEditor = page
    .getByTestId("editable-param-inline-editor-route_length_m")
    .getByTestId("editable-param-popover-input");
  await routeEditor.waitFor({ timeout: 20_000 });
  await routeEditor.fill("650");
  await page.getByTestId("editable-param-batch-apply").click();
  await page.getByTestId("request-estimate-parameter-apply-status").waitFor({ timeout: 30_000 });

  const changedBundle = await waitForBundle(
    page,
    (bundle) => {
      const revision = currentRevision(bundle);
      return revision?.revisionId !== initialRevision.revisionId
        && Number(revision?.params?.route_length_m?.value ?? revision?.params?.route_length_m) === 650;
    },
    draftId,
  );
  const changedRevision = currentRevision(changedBundle);
  const changedRows = rowsById(changedRevision);
  const actualChangedIds = [...changedRows]
    .filter(([rowId, row]) => comparableQuantity(initialRows.get(rowId)) !== comparableQuantity(row))
    .map(([rowId]) => rowId)
    .sort();
  const unchangedExact = [...changedRows]
    .filter(([rowId]) => !actualChangedIds.includes(rowId))
    .every(([rowId, row]) => comparableQuantity(initialRows.get(rowId)) === comparableQuantity(row));
  const latestDiff = changedBundle.estimateDraftRevisionState?.diffs?.at(-1) ?? null;
  const diffChangedIds = (latestDiff?.changedRows ?? [])
    .map((row: any) => row.rowId ?? row.id)
    .filter(Boolean)
    .sort();
  const changedRowsDependOnRoute = actualChangedIds.every((rowId) =>
    String(changedRows.get(rowId)?.calculationTrace ?? "").includes("route_length_m"),
  );

  const pdfBundle = await makePdf(page, requestUrl, draftId);
  const pdfRevision = currentRevision(pdfBundle);
  const generatedPdf = pdfBundle.pdfs.find((pdf: any) => pdf.pdfStatus === "generated") ?? null;
  const editableState = pdfBundle.estimateRevisionState;
  const editableRevision = editableState?.revisions?.find(
    (revision: any) => revision.revision_id === editableState.current_revision_id,
  ) ?? null;
  const currentDraftRows = pdfRevision.boq.rows;
  const editableProjectionMatchesDraft = currentDraftRows.length === pdfBundle.items.length
    && currentDraftRows.every((row: any) => {
      const item = pdfBundle.items.find(
        (candidate: any) => candidate.sourceParameters?.rowCode === row.rowId,
      );
      return item && comparableQuantity(item) === comparableQuantity(row);
    });
  const pdfBindingMatchesProjection = Boolean(
    editableRevision
    && generatedPdf?.revisionId === editableRevision.revision_id
    && generatedPdf?.snapshotId === editableRevision.snapshot_id
    && generatedPdf?.revisionRowsHash === editableRevision.rows_hash
    && editableProjectionMatchesDraft,
  );
  const addressPersisted = pdfBundle.draft.addressText === ADDRESS;
  const phonePersisted = pdfBundle.draft.contactPhone === PHONE;

  await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  await installNameHelper(page);
  await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 30_000 });
  const reloadedBundle = await readBundle(page, draftId);
  const reloadedRevision = currentRevision(reloadedBundle);
  const routePersists =
    Number(reloadedRevision.params?.route_length_m?.value ?? reloadedRevision.params?.route_length_m) === 650;

  const procurementButton = page.getByTestId("consumer-estimate-open-procurement").first();
  await procurementButton.scrollIntoViewIfNeeded();
  await procurementButton.click({ force: true });
  const procurementBundle = await waitForBundle(
    page,
    (bundle) => bundle.events?.some(
      (event: any) => event.eventType === "project_execution_draft_saved",
    ),
    draftId,
  ).catch(async (error) => {
    const status = await page.getByTestId("consumer-repair-status").textContent().catch(() => null);
    throw new Error(`${String(error instanceof Error ? error.message : error)}:STATUS=${status}`);
  });
  const positionsToggle = page.getByTestId("request-estimate-positions-toggle");
  if (
    await page.getByTestId("consumer-estimate-procurement-list").count() === 0
    && await positionsToggle.count() > 0
  ) {
    await positionsToggle.click();
  }
  const itemsEditor = page.getByTestId("request-estimate-items-editor");
  if (
    await page.getByTestId("consumer-estimate-procurement-list").count() === 0
    && await itemsEditor.count() > 0
  ) {
    await itemsEditor.first().click();
  }
  await page.getByTestId("consumer-estimate-procurement-list").waitFor({ timeout: 30_000 });
  const expectedProject = buildProjectExecutionDraftFromRevision(reloadedRevision, {
    source: "request_estimate",
    countryCode: "KG",
    cityOrRegion: procurementBundle.draft.city ?? undefined,
    generatedAt: procurementBundle.draft.updatedAt,
    sourceRequestId: draftId,
  });
  const procurementEvent = [...procurementBundle.events]
    .reverse()
    .find((event: any) => event.eventType === "project_execution_draft_saved");
  const renderedProcurementRowIds = await page
    .locator('[data-testid^="consumer-estimate-procurement-row-"]')
    .evaluateAll((nodes) => nodes.map((node) =>
      (node.getAttribute("data-testid") ?? "")
        .slice("consumer-estimate-procurement-row-".length),
    ));
  const renderedProcurementText = await page
    .locator('[data-testid^="consumer-estimate-procurement-row-"]')
    .allInnerTexts();
  const expectedPreview = expectedProject.procurementItems.slice(0, 12);
  const procurementExact =
    procurementEvent?.payload?.sourcePayloadHash === expectedProject.sourcePayloadHash
    && Number(procurementEvent?.payload?.procurementItemCount) === expectedProject.procurementItems.length
    && JSON.stringify(renderedProcurementRowIds) === JSON.stringify(
      expectedPreview.map((item) => item.sourceEstimateRowId),
    )
    && expectedPreview.every((item, index) =>
      renderedProcurementText[index]?.includes(`${item.quantity} ${item.unit}`),
    );

  const positionText = await page.locator('[data-testid^="consumer-repair-item-"]').allInnerTexts();
  const internalTokensVisible = positionText.filter((text) =>
    /\b(?:route_length_m|sourceParameters|formula_id|template_id|electrical_[a-z0-9_]+)\b/i.test(text),
  );
  const uiRowCount = await page.locator('[data-testid^="consumer-repair-item-"]').count();

  await page.goto(new URL("/market", `${baseUrl}/`).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.goBack({ waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 30_000 });
  const returnBundle = await readBundle(page, draftId);
  const returnPathStable =
    new URL(page.url()).searchParams.get("draftId") === draftId
    && currentRevision(returnBundle).revisionId === reloadedRevision.revisionId;

  return {
    draft_id: draftId,
    selected_work_key: initialBundle.draft.selectedWorkKey,
    package_mode: initialParams.package_mode,
    params: initialParams,
    initial_revision_id: initialRevision.revisionId,
    current_revision_id: reloadedRevision.revisionId,
    initial_row_count: initialRevision.boq.rows.length,
    current_row_count: reloadedRevision.boq.rows.length,
    ui_row_count: uiRowCount,
    not_fixed_42_rows: initialRevision.boq.rows.length !== 42,
    only_route_param_changed:
      latestDiff?.changedParams?.length === 1
      && latestDiff.changedParams[0]?.key === "route_length_m"
      && Number(latestDiff.changedParams[0]?.before) === 500
      && Number(latestDiff.changedParams[0]?.after) === 650,
    actual_changed_row_ids: actualChangedIds,
    diff_changed_row_ids: diffChangedIds,
    changed_rows_match_diff: JSON.stringify(actualChangedIds) === JSON.stringify(diffChangedIds),
    changed_rows_depend_on_route: changedRowsDependOnRoute,
    unchanged_rows_exact: unchangedExact,
    route_persists_after_reload: routePersists,
    confirmation_visible: approveVisible,
    confirmation_enabled: approveEnabled,
    address_persisted: addressPersisted,
    phone_persisted: phonePersisted,
    pdf_revision_id: generatedPdf?.revisionId ?? null,
    pdf_projection_revision_id: editableRevision?.revision_id ?? null,
    pdf_projection_matches_draft_revision: editableProjectionMatchesDraft,
    pdf_matches_current_revision: pdfBindingMatchesProjection,
    procurement_source_hash: procurementEvent?.payload?.sourcePayloadHash ?? null,
    procurement_row_count: Number(procurementEvent?.payload?.procurementItemCount ?? 0),
    procurement_preview_row_ids: renderedProcurementRowIds,
    procurement_matches_current_revision: procurementExact,
    internal_tokens_visible: internalTokensVisible,
    no_internal_rows_visible: internalTokensVisible.length === 0,
    return_path_stable: returnPathStable,
  };
}

async function runLegacy(page: Page, baseUrl: string): Promise<Record<string, unknown>> {
  const legacy = buildLegacyBundle();
  await clearStorage(page, baseUrl);
  await page.evaluate(({ storage, bundle }) => {
    window.localStorage.setItem(storage.legacy, JSON.stringify([bundle]));
    window.localStorage.removeItem(storage.manifest);
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(storage.prefix)) window.localStorage.removeItem(key);
    }
  }, { storage: STORAGE, bundle: legacy });
  const target = new URL("/request", `${baseUrl}/`);
  target.searchParams.set("draftId", legacy.draft.id);
  await page.goto(target.toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
  await installNameHelper(page);
  const migrated = await waitForBundle(
    page,
    (bundle) => bundle.draft?.selectedWorkKey === CANONICAL_WORK_KEY,
    legacy.draft.id,
  );
  return {
    draft_id: migrated.draft.id,
    selected_work_key: migrated.draft.selectedWorkKey,
    selected_catalog_work_id: migrated.draft.selectedCatalogWorkId,
    canonical_parameter_status: migrated.canonicalParameterSession?.status ?? null,
    items_count: migrated.items?.length ?? -1,
    structured_payload_is_null: migrated.structuredEstimatePayload == null,
    invalidation_event_present: migrated.events?.some(
      (event: any) => event.eventType === "legacy_electrical_42_row_draft_invalidated",
    ) ?? false,
  };
}

function blockersFor(summary: AcceptanceSummary): string[] {
  const e = summary.electrical as any;
  const l = summary.legacy as any;
  const checks: [boolean, string][] = [
    [e.selected_work_key === CANONICAL_WORK_KEY, "canonical_electrical_not_selected"],
    [e.package_mode === "turnkey", "turnkey_package_mode_missing"],
    [e.params?.area_m2 === 100, "area_param_not_100"],
    [e.params?.route_length_m === 500, "route_param_not_500"],
    [e.params?.outlet_count === 40, "outlet_param_not_40"],
    [e.params?.switch_count === 20, "switch_param_not_20"],
    [e.params?.lighting_point_count === 30, "lighting_param_not_30"],
    [e.initial_row_count > 42 && e.current_row_count === e.initial_row_count, "professional_row_count_invalid"],
    [e.only_route_param_changed, "route_diff_not_exact"],
    [e.actual_changed_row_ids?.length > 0, "route_changed_no_rows"],
    [e.changed_rows_match_diff, "changed_rows_diff_mismatch"],
    [e.changed_rows_depend_on_route, "nondependent_row_changed"],
    [e.unchanged_rows_exact, "unchanged_row_mutated"],
    [e.route_persists_after_reload, "route_edit_not_persisted"],
    [e.confirmation_visible && e.confirmation_enabled, "confirmation_not_available"],
    [e.address_persisted && e.phone_persisted, "delivery_fields_not_persisted"],
    [e.pdf_matches_current_revision, "pdf_revision_mismatch"],
    [e.procurement_matches_current_revision, "procurement_revision_mismatch"],
    [e.no_internal_rows_visible, "internal_rows_visible"],
    [e.return_path_stable, "request_return_path_not_stable"],
    [l.selected_work_key === CANONICAL_WORK_KEY, "legacy_not_canonicalized"],
    [l.selected_catalog_work_id === LEGACY_WORK_KEY, "legacy_alias_not_retained"],
    [l.canonical_parameter_status === "BLOCKING_REQUIRED", "legacy_not_blocked"],
    [l.items_count === 0, "legacy_rows_not_invalidated"],
    [l.structured_payload_is_null, "legacy_payload_not_invalidated"],
    [l.invalidation_event_present, "legacy_invalidation_event_missing"],
    [summary.console_errors.length === 0, "console_errors_present"],
    [summary.page_errors.length === 0, "page_errors_present"],
  ];
  return checks.filter(([passed]) => !passed).map(([, blocker]) => blocker);
}

async function main(): Promise<void> {
  const baseUrl = String(process.env.T8_PLATFORM_CORE_WEB_BASE_URL ?? "").replace(/\/$/, "");
  if (!baseUrl) throw new Error("T8_PLATFORM_CORE_WEB_BASE_URL_REQUIRED");
  const outDir = path.join(".release-runtime", "t8-platform-core-web", timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const summary: AcceptanceSummary = {
    final_status: STOP_T8_PLATFORM_CORE_WEB_ACCEPTANCE,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    generated_at: new Date().toISOString(),
    base_url: baseUrl,
    actual_browser: true,
    electrical: {},
    legacy: {},
    console_errors: [],
    page_errors: [],
    blockers: [],
  };
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") summary.console_errors.push(message.text().slice(0, 500));
    });
    page.on("pageerror", (error) => summary.page_errors.push(error.message.slice(0, 500)));
    summary.electrical = await runElectrical(page, baseUrl);
    await page.screenshot({ path: path.join(outDir, "electrical-current-revision.png"), fullPage: true });
    summary.legacy = await runLegacy(page, baseUrl);
    await page.screenshot({ path: path.join(outDir, "legacy-invalidated.png"), fullPage: true });
    await page.waitForTimeout(300);
    await context.close();
  } finally {
    await browser.close();
  }
  summary.blockers = blockersFor(summary);
  summary.final_status = summary.blockers.length === 0
    ? GREEN_T8_PLATFORM_CORE_WEB_ACCEPTANCE
    : STOP_T8_PLATFORM_CORE_WEB_ACCEPTANCE;
  summary.runtime_summary_path = path.join(outDir, "summary.json");
  writeFileSync(summary.runtime_summary_path, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
  if (summary.blockers.length) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
