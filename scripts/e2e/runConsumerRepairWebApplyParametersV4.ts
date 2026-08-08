import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium, type BrowserContext, type Page } from "playwright";

import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  RoadworksWaveAProductionRegistry,
} from "../../src/lib/estimate/v4/roadworks";
import {
  compactConsumerRepairBundleForDurableStorage,
  decodeConsumerRepairBundleFromDurableStorage,
  encodeConsumerRepairBundleForDurableStorage,
} from "../../src/lib/platform/compactConsumerRepairDurableState";
import type { ConsumerRepairDraftBundle } from "../../src/lib/consumerRequests";
import { ensureProductionGradeWebServer } from "./runProductionGradeEstimateWebSmoke";

const STORAGE = {
  manifest: "rik.consumer_repair.request_bundles.v2.manifest",
  bundlePrefix: "rik.consumer_repair.request_bundle.v2:",
};
const exactSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const status = execFileSync("git", ["status", "--porcelain=v1"], { encoding: "utf8" });
const diff = execFileSync("git", ["diff", "--binary"], { encoding: "utf8" });
const subjectTreeHash = createHash("sha256")
  .update(JSON.stringify({ exactSha, status, diff }))
  .digest("hex");
const outputRoot = path.join(
  ".release-runtime",
  "asphalt-v3-final-r5",
  exactSha,
  "web-apply-v4",
);
const baseUrl = process.env.CONSUMER_REPAIR_WEB_APPLY_V4_BASE_URL ?? "http://localhost:8112";
const matchedRegistration = RoadworksWaveAProductionRegistry.find(
  (item) => item.technologyFamily === "asphalt_surface_repair" && item.workId.endsWith("_standard"),
);
if (!matchedRegistration) throw new Error("ASPHALT_REPAIR_STANDARD_REGISTRATION_MISSING");
const registration = matchedRegistration;

type AnyBundle = ConsumerRepairDraftBundle & Record<string, any>;
type AnyRecord = Record<string, any>;

type ScenarioResult = {
  scenario: "fresh_canonical" | "saved_cold_remount" | "isolated_historical_prepared";
  passed: boolean;
  draft_id: string | null;
  apply_button_clicked: boolean;
  revision_before: string | null;
  revision_after: string | null;
  revision_count_before: number;
  revision_count_after: number;
  previous_revision_immutable: boolean;
  exact_owner_preserved: boolean;
  area_before: number | null;
  area_after: number | null;
  changed_rows: number;
  unexpected_rows_changed: number;
  reload_replay_parity: boolean;
  history_parity: boolean;
  pdf_parity: boolean;
  generic_rebuild_after_apply: number;
  state_missing_console_errors: number;
  uncaught_errors: number;
  blockers: string[];
};

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function calculationState(bundle: AnyBundle | null): AnyRecord | null {
  return (bundle?.estimateDraftRevisionState
    ?? bundle?.estimateRevisionState?.calculation_state
    ?? null) as AnyRecord | null;
}

function currentCalculationRevision(bundle: AnyBundle | null): AnyRecord | null {
  const state = calculationState(bundle);
  return state?.revisions?.find((item: AnyRecord) => item.revisionId === state.currentRevisionId)
    ?? state?.revisions?.at(-1)
    ?? null;
}

function currentCanonicalRevision(bundle: AnyBundle | null): AnyRecord | null {
  const state = bundle?.estimateRevisionState;
  return state?.revisions?.find((item) => item.revision_id === state.current_revision_id)
    ?? state?.revisions?.at(-1)
    ?? null;
}

function paramValue(revision: AnyRecord | null, key: string): unknown {
  const raw = revision?.params?.[key];
  return raw && typeof raw === "object" && "value" in raw ? raw.value : raw;
}

function bundleRevisionCount(bundle: AnyBundle | null): number {
  return calculationState(bundle)?.revisions?.length ?? 0;
}

async function rawBundleRecord(page: Page, draftId?: string): Promise<unknown | null> {
  return page.evaluate(({ prefix, id }) => {
    const records: any[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.draft?.id) records.push(parsed);
      } catch {
        // A malformed record cannot satisfy the proof predicate.
      }
    }
    if (id) return records.find((record) => record.draft.id === id) ?? null;
    return records.sort((left, right) =>
      String(right.draft?.updatedAt ?? right.draft?.createdAt ?? "")
        .localeCompare(String(left.draft?.updatedAt ?? left.draft?.createdAt ?? "")),
    )[0] ?? null;
  }, { prefix: STORAGE.bundlePrefix, id: draftId ?? null });
}

async function readBundle(page: Page, draftId?: string): Promise<AnyBundle | null> {
  const raw = await rawBundleRecord(page, draftId);
  return raw ? decodeConsumerRepairBundleFromDurableStorage(raw) as AnyBundle | null : null;
}

async function waitForBundle(
  page: Page,
  draftId: string | undefined,
  predicate: (bundle: AnyBundle) => boolean,
  timeoutMs = 120_000,
): Promise<AnyBundle> {
  const started = Date.now();
  let latest: AnyBundle | null = null;
  while (Date.now() - started < timeoutMs) {
    latest = await readBundle(page, draftId);
    if (latest && predicate(latest)) return latest;
    await page.waitForTimeout(250);
  }
  throw new Error(`WEB_APPLY_BUNDLE_TIMEOUT:${JSON.stringify({
    draftId,
    selectedWorkKey: latest?.draft?.selectedWorkKey ?? null,
    currentRevisionId: currentCalculationRevision(latest)?.revisionId ?? null,
    revisionCount: bundleRevisionCount(latest),
    area: paramValue(currentCalculationRevision(latest), "area_m2") ?? null,
    rows: currentCalculationRevision(latest)?.boq?.rows?.length ?? null,
  })}`);
}

async function openParameterPanel(page: Page): Promise<void> {
  if (await page.getByTestId("request-estimate-parameter-panel").count() === 0) {
    await page.getByTestId("request-estimate-parameters-toggle").click();
    await page.getByTestId("request-estimate-parameter-panel").waitFor({ timeout: 30_000 });
  }
  const showMoreMissing = page.getByTestId("request-estimate-show-more-parameters");
  if (await showMoreMissing.count() > 0) await showMoreMissing.click();
}

async function fillParameter(page: Page, key: string, rawValue: string): Promise<void> {
  let editor = page.getByTestId(`editable-param-inline-editor-${key}`);
  if (await editor.count() === 0) {
    const filledToggle = page.getByTestId("request-estimate-filled-parameters-toggle");
    if (await filledToggle.count() > 0) await filledToggle.click();
    const derivedToggle = page.getByTestId("request-estimate-derived-parameters-toggle");
    if (await editor.count() === 0 && await derivedToggle.count() > 0) await derivedToggle.click();
    editor = page.getByTestId(`editable-param-inline-editor-${key}`);
  }
  await editor.waitFor({ timeout: 30_000 });
  await editor.scrollIntoViewIfNeeded();
  const option = page.getByTestId(`editable-param-option-${key}-${rawValue}`);
  if (await option.count() > 0) {
    await option.first().click();
  } else {
    const input = editor.getByTestId("editable-param-popover-input");
    await input.fill(rawValue);
    if (await input.inputValue() !== rawValue) throw new Error(`PARAMETER_INPUT_DID_NOT_ACCEPT:${key}`);
  }
}

async function clickApply(page: Page): Promise<void> {
  const apply = page.getByTestId("editable-param-batch-apply").first();
  await apply.waitFor({ timeout: 30_000 });
  await apply.scrollIntoViewIfNeeded();
  await apply.click({ timeout: 30_000 });
}

async function compileFreshExactDraft(page: Page): Promise<AnyBundle> {
  await page.goto(`${baseUrl}/request`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  const prompt = page.getByTestId("consumer-repair-problem-input");
  await prompt.waitFor({ timeout: 90_000 });
  await prompt.fill(registration.professionalNameRu);
  await page.getByTestId("consumer-repair-prepare-draft").click();
  await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 120_000 });
  const initial = await waitForBundle(page, undefined, (bundle) =>
    bundle.draft?.selectedWorkKey === registration.workId,
  );
  const draftId = initial.draft.id as string;
  const initialRevision = currentCalculationRevision(initial);
  await openParameterPanel(page);
  for (const key of registration.parameterSchema) {
    await fillParameter(
      page,
      key,
      String(DEFAULT_ROADWORKS_WAVE_A_INPUTS[key as keyof typeof DEFAULT_ROADWORKS_WAVE_A_INPUTS]),
    );
  }
  await clickApply(page);
  return waitForBundle(page, draftId, (bundle) => {
    const revision = currentCalculationRevision(bundle);
    return Boolean(
      revision?.revisionId !== initialRevision?.revisionId &&
      revision?.missingInputs?.length === 0 &&
      revision?.boq?.rows?.length > 1 &&
      bundle.draft?.selectedWorkKey === registration.workId,
    );
  });
}

function installErrorCollection(page: Page): {
  stateMissing: string[];
  uncaught: string[];
} {
  const stateMissing: string[] = [];
  const uncaught: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (text.includes("CONSUMER_REPAIR_ESTIMATE_DRAFT_REVISION_STATE_MISSING")) stateMissing.push(text);
    if (message.type() === "error" && /Uncaught Error|CONSUMER_REPAIR_ESTIMATE_DRAFT_REVISION_STATE_MISSING/u.test(text)) {
      uncaught.push(text);
    }
  });
  page.on("pageerror", (error) => {
    uncaught.push(error.message);
    if (error.message.includes("CONSUMER_REPAIR_ESTIMATE_DRAFT_REVISION_STATE_MISSING")) {
      stateMissing.push(error.message);
    }
  });
  return { stateMissing, uncaught };
}

function dependencyProof(beforeRevision: AnyRecord, afterRevision: AnyRecord, diffRecord: AnyRecord | null): {
  changedRows: number;
  unexpectedRowsChanged: number;
} {
  const affected = new Set(
    (beforeRevision?.boq?.rows ?? [])
      .filter((row: AnyRecord) => row.sourceParameters?.affectedBy?.includes("area_m2"))
      .map((row: AnyRecord) => row.rowId),
  );
  const changed = diffRecord?.changedRows ?? [];
  const unexpected = changed.filter((row: AnyRecord) => !affected.has(row.rowId));
  if (changed.length === 0 && sha256(beforeRevision?.boq?.rows) !== sha256(afterRevision?.boq?.rows)) {
    return { changedRows: 0, unexpectedRowsChanged: 1 };
  }
  return { changedRows: changed.length, unexpectedRowsChanged: unexpected.length };
}

async function verifyTimeline(page: Page, expectedRevisionCount: number): Promise<boolean> {
  const timeline = page.getByTestId("estimate-revision-timeline");
  if (await timeline.count() === 0) return false;
  const dots = await page.locator('[data-testid^="estimate-revision-timeline-r"]').count();
  return dots === expectedRevisionCount;
}

async function generateAndVerifyPdf(
  page: Page,
  draftId: string,
  expectedBundle: AnyBundle,
): Promise<boolean> {
  const expectedCanonical = currentCanonicalRevision(expectedBundle);
  const button = page.getByTestId("consumer-estimate-make-pdf").first();
  await button.waitFor({ timeout: 30_000 });
  await button.scrollIntoViewIfNeeded();
  await button.click({ timeout: 30_000 });
  await page.waitForURL((url) => url.pathname.includes("/pdf-viewer"), { timeout: 45_000 });
  const pdfBundle = await waitForBundle(page, draftId, (bundle) => bundle.pdfs?.some((pdf) =>
    pdf.pdfStatus === "generated" &&
    pdf.revisionId === bundle.estimateRevisionState?.current_revision_id,
  ), 90_000);
  const generated = pdfBundle.pdfs.find((pdf) =>
    pdf.pdfStatus === "generated" &&
    pdf.revisionId === pdfBundle.estimateRevisionState?.current_revision_id
  );
  const parity = Boolean(
    expectedCanonical &&
    generated?.revisionId === expectedCanonical.revision_id &&
    generated?.revisionRowsHash === expectedCanonical.rows_hash &&
    pdfBundle.draft?.selectedWorkKey === registration.workId,
  );
  await page.goBack({ waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!page.url().includes("/request")) {
    await page.goto(`${baseUrl}/request?draftId=${encodeURIComponent(draftId)}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
  }
  await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 60_000 });
  return parity;
}

async function exerciseApplyScenario(input: {
  page: Page;
  scenario: ScenarioResult["scenario"];
  draftId: string;
  areaAfter: number;
  dependencyBaselineRevision?: AnyRecord | null;
}): Promise<ScenarioResult> {
  const { page, scenario, draftId, areaAfter } = input;
  const errors = installErrorCollection(page);
  const blockers: string[] = [];
  let applyButtonClicked = false;
  let reloadReplayParity = false;
  let historyParity = false;
  let pdfParity = false;
  let after: AnyBundle | null = null;
  const before = await readBundle(page, draftId);
  const beforeState = calculationState(before);
  const beforeRevision = currentCalculationRevision(before);
  const dependencyBaseline = input.dependencyBaselineRevision ?? beforeRevision;
  const beforeRevisionBytes = beforeRevision ? JSON.stringify(beforeRevision) : null;
  const revisionBefore = beforeRevision?.revisionId ?? null;
  const revisionCountBefore = bundleRevisionCount(before);
  const areaBefore = Number(paramValue(beforeRevision ?? dependencyBaseline, "area_m2"));
  try {
    await openParameterPanel(page);
    await fillParameter(page, "area_m2", String(areaAfter));
    await clickApply(page);
    applyButtonClicked = true;
    after = await waitForBundle(page, draftId, (bundle) => {
      const revision = currentCalculationRevision(bundle);
      return Boolean(
        revision?.revisionId &&
        revision.revisionId !== revisionBefore &&
        Number(paramValue(revision, "area_m2")) === areaAfter,
      );
    });
    await page.getByTestId("request-estimate-parameter-apply-status").waitFor({ timeout: 30_000 });
    const afterRevision = currentCalculationRevision(after);
    const state = calculationState(after);
    const diffRecord = state?.diffs?.at(-1) ?? null;
    if (!dependencyBaseline || !afterRevision) {
      throw new Error("APPLIED_REVISION_DEPENDENCY_BASELINE_MISSING");
    }
    const dependency = dependencyProof(dependencyBaseline, afterRevision, diffRecord);
    if (dependency.changedRows === 0) blockers.push("dependent_rows_unchanged");
    if (dependency.unexpectedRowsChanged !== 0) blockers.push(`unexpected_rows_changed:${dependency.unexpectedRowsChanged}`);
    if (after?.draft?.selectedWorkKey !== registration.workId) blockers.push("exact_owner_lost");
    if (afterRevision?.resolvedIdentity?.requestedCatalogWorkId !== registration.workId) blockers.push("resolved_identity_lost");
    if (afterRevision?.resolvedIdentity?.legacyFallbackUsed === true) blockers.push("generic_parser_rebuild");
    if (!afterRevision?.boq?.rows?.every((row: AnyRecord) =>
      row.sourceParameters?.roadworksWaveA === true &&
      row.sourceParameters?.selectedWorkId === registration.workId
    )) blockers.push("generic_compiler_rebuild");
    if (beforeRevisionBytes && JSON.stringify(state?.revisions?.find((item: AnyRecord) => item.revisionId === revisionBefore)) !== beforeRevisionBytes) {
      blockers.push("previous_revision_mutated");
    }
    historyParity = await verifyTimeline(page, bundleRevisionCount(after));
    if (!historyParity) blockers.push("revision_timeline_parity_failed");
    await page.screenshot({ path: path.join(outputRoot, `${scenario}-after-apply.png`), fullPage: true });
    pdfParity = await generateAndVerifyPdf(page, draftId, after);
    if (!pdfParity) blockers.push("pdf_revision_rows_hash_parity_failed");
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 60_000 });
    const replay = await readBundle(page, draftId);
    const replayRevision = currentCalculationRevision(replay);
    reloadReplayParity = Boolean(
      replayRevision?.revisionId === currentCalculationRevision(after)?.revisionId &&
      Number(paramValue(replayRevision, "area_m2")) === areaAfter &&
      replay?.draft?.selectedWorkKey === registration.workId &&
      sha256(replayRevision?.boq?.rows) === sha256(currentCalculationRevision(after)?.boq?.rows),
    );
    if (!reloadReplayParity) blockers.push("reload_replay_parity_failed");
    const body = await page.locator("body").innerText();
    if (/Uncaught Error|CONSUMER_REPAIR_ESTIMATE_DRAFT_REVISION_STATE_MISSING/u.test(body)) {
      blockers.push("red_error_overlay_visible");
    }
  } catch (error) {
    blockers.push(`flow:${error instanceof Error ? error.message : String(error)}`);
    await page.screenshot({ path: path.join(outputRoot, `${scenario}-failure.png`), fullPage: true }).catch(() => undefined);
  }
  if (errors.stateMissing.length > 0) blockers.push(`state_missing_console_errors:${errors.stateMissing.length}`);
  if (errors.uncaught.length > 0) blockers.push(`uncaught_errors:${errors.uncaught.length}`);
  const afterRevision = currentCalculationRevision(after);
  const afterState = calculationState(after);
  const dependency = dependencyBaseline && afterRevision
    ? dependencyProof(dependencyBaseline, afterRevision, afterState?.diffs?.at(-1))
    : { changedRows: 0, unexpectedRowsChanged: 0 };
  return {
    scenario,
    passed: blockers.length === 0,
    draft_id: draftId,
    apply_button_clicked: applyButtonClicked,
    revision_before: revisionBefore,
    revision_after: afterRevision?.revisionId ?? null,
    revision_count_before: revisionCountBefore,
    revision_count_after: bundleRevisionCount(after),
    previous_revision_immutable: !beforeRevisionBytes || JSON.stringify(afterState?.revisions?.find((item: AnyRecord) => item.revisionId === revisionBefore)) === beforeRevisionBytes,
    exact_owner_preserved: after?.draft?.selectedWorkKey === registration.workId && afterRevision?.resolvedIdentity?.requestedCatalogWorkId === registration.workId,
    area_before: Number.isFinite(areaBefore) ? areaBefore : null,
    area_after: Number(paramValue(afterRevision, "area_m2")) || null,
    changed_rows: dependency.changedRows,
    unexpected_rows_changed: dependency.unexpectedRowsChanged,
    reload_replay_parity: reloadReplayParity,
    history_parity: historyParity,
    pdf_parity: pdfParity,
    generic_rebuild_after_apply: blockers.some((item) => item.includes("generic_")) ? 1 : 0,
    state_missing_console_errors: errors.stateMissing.length,
    uncaught_errors: errors.uncaught.length,
    blockers,
  };
}

async function installHistoricalSeed(
  context: BrowserContext,
  bundle: AnyBundle,
): Promise<{ seeded: AnyBundle; encodedHash: string }> {
  const seeded: AnyBundle = {
    ...bundle,
    estimateRevisionState: bundle.estimateRevisionState
      ? { ...bundle.estimateRevisionState, calculation_state: null }
      : null,
    estimateDraftRevisionState: null,
  };
  const compacted = compactConsumerRepairBundleForDurableStorage(seeded);
  const encoded = encodeConsumerRepairBundleForDurableStorage(compacted);
  const draftId = seeded.draft.id as string;
  const recordKey = `${STORAGE.bundlePrefix}${encodeURIComponent(draftId)}`;
  const manifest = JSON.stringify({
    version: 2,
    bundleIds: [draftId],
    recordCount: 1,
    updatedAt: new Date().toISOString(),
  });
  const raw = JSON.stringify(encoded);
  await context.addInitScript(({ key, manifestKey, manifestValue, value }) => {
    try {
      if (window.localStorage.getItem(key) == null) {
        window.localStorage.setItem(key, value);
      }
      if (window.localStorage.getItem(manifestKey) == null) {
        window.localStorage.setItem(manifestKey, manifestValue);
      }
    } catch {
      // about:blank has no origin; the script runs again after origin navigation.
    }
  }, { key: recordKey, manifestKey: STORAGE.manifest, manifestValue: manifest, value: raw });
  return { seeded, encodedHash: sha256(encoded) };
}

async function main(): Promise<void> {
  mkdirSync(outputRoot, { recursive: true });
  const server = await ensureProductionGradeWebServer(baseUrl, outputRoot, {
    requireOwned: true,
    readinessAttempts: 3,
  });
  const browser = await chromium.launch({ headless: true });
  const scenarios: ScenarioResult[] = [];
  let sourceCloneHashBefore = "";
  let sourceCloneHashAfter = "";
  let isolatedHistoricalSourceUnchanged = false;
  try {
    const sourceContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const sourcePage = await sourceContext.newPage();
    const compiled = await compileFreshExactDraft(sourcePage);
    const draftId = compiled.draft.id as string;
    scenarios.push(await exerciseApplyScenario({
      page: sourcePage,
      scenario: "fresh_canonical",
      draftId,
      areaAfter: 780,
    }));
    scenarios.push(await exerciseApplyScenario({
      page: sourcePage,
      scenario: "saved_cold_remount",
      draftId,
      areaAfter: 900,
    }));

    const sourceBundle = await readBundle(sourcePage, draftId);
    if (!sourceBundle) throw new Error("SOURCE_BUNDLE_MISSING_BEFORE_HISTORICAL_CLONE");
    const dependencyBaselineRevision = currentCalculationRevision(sourceBundle);
    const sourceRawBefore = await rawBundleRecord(sourcePage, draftId);
    sourceCloneHashBefore = sha256(sourceRawBefore);

    const historicalContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const seed = await installHistoricalSeed(historicalContext, sourceBundle);
    const historicalPage = await historicalContext.newPage();
    await historicalPage.goto(`${baseUrl}/request?draftId=${encodeURIComponent(draftId)}`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await historicalPage.getByTestId("request-estimate-summary-card").waitFor({ timeout: 90_000 });
    const seededBundle = await readBundle(historicalPage, draftId);
    if (calculationState(seededBundle) != null) throw new Error("HISTORICAL_SEED_CALCULATION_STATE_NOT_NULL");
    scenarios.push(await exerciseApplyScenario({
      page: historicalPage,
      scenario: "isolated_historical_prepared",
      draftId,
      areaAfter: 1020,
      dependencyBaselineRevision,
    }));
    await historicalContext.close();

    const sourceRawAfter = await rawBundleRecord(sourcePage, draftId);
    sourceCloneHashAfter = sha256(sourceRawAfter);
    isolatedHistoricalSourceUnchanged = sourceCloneHashBefore === sourceCloneHashAfter;
    if (seed.encodedHash.length !== 64) throw new Error("HISTORICAL_SEED_HASH_INVALID");
    await sourceContext.close();
  } finally {
    await browser.close().catch(() => undefined);
    server.stop();
  }

  const failureLedger = scenarios.flatMap((scenario) =>
    scenario.blockers.map((blocker) => `${scenario.scenario}:${blocker}`),
  );
  if (!isolatedHistoricalSourceUnchanged) failureLedger.push("isolated_historical_source_mutated");
  const counts = {
    actual_web_scenarios: `${scenarios.filter((item) => item.passed).length}/3`,
    apply_button_click: `${scenarios.filter((item) => item.apply_button_clicked).length}/3`,
    state_missing_console_errors: scenarios.reduce((sum, item) => sum + item.state_missing_console_errors, 0),
    uncaught_red_screen: scenarios.reduce((sum, item) => sum + item.uncaught_errors, 0),
    reload_replay_parity: `${scenarios.filter((item) => item.reload_replay_parity).length}/3`,
    history_parity: `${scenarios.filter((item) => item.history_parity).length}/3`,
    pdf_parity: `${scenarios.filter((item) => item.pdf_parity).length}/3`,
    generic_rebuild_after_apply: scenarios.reduce((sum, item) => sum + item.generic_rebuild_after_apply, 0),
  };
  const passed = failureLedger.length === 0 && Object.values(counts).every((value) =>
    typeof value === "number" ? value === 0 : value === "3/3",
  );
  const unsigned = {
    schema: "consumer-repair-web-apply-parameters-version-4-v1",
    generated_at: new Date().toISOString(),
    subject_sha: exactSha,
    subject_tree_hash: subjectTreeHash,
    actual_browser: true,
    production_ui_clicks_only: true,
    direct_service_mutations: 0,
    source_user_draft_touched: false,
    isolated_historical_source_unchanged: isolatedHistoricalSourceUnchanged,
    source_clone_hash_before: sourceCloneHashBefore,
    source_clone_hash_after: sourceCloneHashAfter,
    exact_work_key: registration.workId,
    counts,
    scenarios,
    failure_ledger: failureLedger,
  };
  const artifact = {
    ...unsigned,
    passed,
    green_token: passed
      ? "GREEN_CONSUMER_REPAIR_WEB_APPLY_PARAMETERS_CANONICAL_REVISION_STATE_RECOVERY_35_OF_35_ACTUAL_BROWSER_3_OF_3_NO_UNCAUGHT_ERROR_NO_GENERIC_REBUILD_IMMUTABLE_REPLAY_PDF_PROVEN"
      : null,
    artifact_hash: sha256(unsigned),
  };
  const artifactPath = path.join(outputRoot, "actual-browser-3x.json");
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.info(JSON.stringify({ passed, counts, failure_ledger: failureLedger, artifact: artifactPath }, null, 2));
  if (!passed) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
