import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";
import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  RoadworksWaveAProductionRegistry,
  buildAsphalt35NormativeCompositionLedgerV3,
} from "../../src/lib/estimate/v4/roadworks";
import { decodeConsumerRepairBundleFromDurableStorage } from "../../src/lib/platform/compactConsumerRepairDurableState";
import { ensureProductionGradeWebServer } from "./runProductionGradeEstimateWebSmoke";

const exactSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const status = execFileSync("git", ["status", "--porcelain=v1"], { encoding: "utf8" }).trim();
const diff = execFileSync("git", ["diff", "--binary"], { encoding: "utf8" });
const subjectTreeHash = createHash("sha256").update(JSON.stringify({ exactSha, status, diff })).digest("hex");
const outputRoot = path.join(".release-runtime", "asphalt-v3-final-r5", exactSha, "web");
const baseUrl = process.env.ASPHALT_35_WEB_BASE_URL ?? "http://localhost:8111";
const decisions = new Map(buildAsphalt35NormativeCompositionLedgerV3().map((row) => [row.workId, row]));
const screenshotScopes = new Set(["standard", "small_area", "large_area", "wet_zone", "technical_room"]);
const diagnosticWorkKey = process.env.ASPHALT_35_WEB_DIAGNOSTIC_WORK_KEY?.trim() || null;
const registrations = diagnosticWorkKey
  ? RoadworksWaveAProductionRegistry.filter((registration) => registration.workId === diagnosticWorkKey)
  : RoadworksWaveAProductionRegistry;
if (diagnosticWorkKey && registrations.length !== 1) throw new Error(`UNKNOWN_DIAGNOSTIC_WORK_KEY:${diagnosticWorkKey}`);
const storagePrefix = "rik.consumer_repair.request_bundle.v2:";
const producerVersion = "post-r6-01-final-r5-web-runtime-auto-composition-v2";
const inputManifestHash = createHash("sha256").update(JSON.stringify(
  RoadworksWaveAProductionRegistry.map((registration) => ({
    work_key: registration.workId,
    parameter_schema_id: registration.parameterSchemaId,
    parameter_schema: registration.parameterSchema,
    semantic_fingerprint: registration.semanticFingerprint,
  })),
)).digest("hex");

function parameterRawValue(key: string): string {
  return String(DEFAULT_ROADWORKS_WAVE_A_INPUTS[key as keyof typeof DEFAULT_ROADWORKS_WAVE_A_INPUTS]);
}

async function readLatestBundle(page: Page): Promise<any | null> {
  const encoded = await page.evaluate((prefix) => {
    const bundles: any[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      try {
        const bundle = JSON.parse(raw);
        if (bundle?.draft?.id) bundles.push(bundle);
      } catch {
        // Invalid storage is reported as a missing durable bundle below.
      }
    }
    return bundles.sort((left, right) =>
      String(right.draft?.updatedAt ?? right.draft?.createdAt ?? "")
        .localeCompare(String(left.draft?.updatedAt ?? left.draft?.createdAt ?? ""))
    )[0] ?? null;
  }, storagePrefix);
  return encoded ? decodeConsumerRepairBundleFromDurableStorage(encoded) : null;
}

function currentRevision(bundle: any): any | null {
  const state = bundle?.estimateDraftRevisionState;
  return state?.revisions?.find((revision: any) => revision.revisionId === state.currentRevisionId) ?? null;
}

async function waitForCompiledBundle(
  page: Page,
  workKey: string,
  previousRevisionId: string,
  expectedRows: number,
  timeoutMs = 120_000,
): Promise<any> {
  const started = Date.now();
  let latest: any | null = null;
  while (Date.now() - started < timeoutMs) {
    latest = await readLatestBundle(page);
    const revision = currentRevision(latest);
    if (
      latest?.draft?.selectedWorkKey === workKey &&
      revision?.revisionId && revision.revisionId !== previousRevisionId &&
      revision?.missingInputs?.length === 0 &&
      revision?.boq?.rows?.length === expectedRows &&
      latest?.items?.length === expectedRows
    ) return latest;
    await page.waitForTimeout(250);
  }
  throw new Error(`COMPILED_BUNDLE_TIMEOUT:${JSON.stringify({
    workKey,
    expectedRows,
    selectedWorkKey: latest?.draft?.selectedWorkKey ?? null,
    revisionId: currentRevision(latest)?.revisionId ?? null,
    missingInputs: currentRevision(latest)?.missingInputs?.map((item: any) => item.key) ?? null,
    revisionRows: currentRevision(latest)?.boq?.rows?.length ?? null,
    itemRows: latest?.items?.length ?? null,
  })}`);
}

async function openAllExactParameters(page: Page): Promise<void> {
  if (await page.getByTestId("request-estimate-parameter-panel").count() === 0) {
    await page.getByTestId("request-estimate-parameters-toggle").click({ force: true });
    await page.getByTestId("request-estimate-parameter-panel").waitFor({ timeout: 20_000 });
  }
  const showMore = page.getByTestId("request-estimate-show-more-parameters");
  if (await showMore.count() > 0) await showMore.first().click({ force: true });
}

async function fillExactMissingParameters(
  page: Page,
  parameterSchema: readonly string[],
): Promise<string[]> {
  await openAllExactParameters(page);
  const filled: string[] = [];
  for (const key of parameterSchema) {
    if (await page.getByTestId(`request-estimate-missing-param-${key}`).count() === 0) continue;
    const editor = page.getByTestId(`editable-param-inline-editor-${key}`);
    await editor.waitFor({ timeout: 15_000 });
    const rawValue = parameterRawValue(key);
    const option = page.getByTestId(`editable-param-option-${key}-${rawValue}`);
    if (await option.count() > 0) await option.first().click({ force: true });
    else await editor.getByTestId("editable-param-popover-input").fill(rawValue);
    filled.push(key);
  }
  await page.getByTestId("editable-param-batch-bar").waitFor({ timeout: 15_000 });
  return filled;
}

async function openAllPositions(page: Page): Promise<void> {
  if (await page.locator("[data-testid^='request-estimate-section-']").count() === 0) {
    await page.getByTestId("request-estimate-positions-toggle").click({ force: true });
  }
  await page.locator("[data-testid^='request-estimate-section-']").first().waitFor({ timeout: 45_000 });
  for (let pageIndex = 0; pageIndex < 20; pageIndex += 1) {
    const loadMore = page.getByTestId("request-estimate-items-load-more");
    if (!(await loadMore.isVisible().catch(() => false))) break;
    const before = await page.locator("[data-testid^='consumer-repair-item-quantity-input-']").count();
    await loadMore.click({ force: true });
    await page.waitForFunction(
      (previous) => document.querySelectorAll("[data-testid^='consumer-repair-item-quantity-input-']").length > previous,
      before,
      { timeout: 15_000 },
    );
  }
}

async function main() {
  mkdirSync(outputRoot, { recursive: true });
  const server = await ensureProductionGradeWebServer(baseUrl, outputRoot, { requireOwned: true, readinessAttempts: 3 });
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const [index, registration] of registrations.entries()) {
      const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
      const page = await context.newPage();
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
      page.on("pageerror", (error) => pageErrors.push(error.message));
      const decision = decisions.get(registration.workId)!;
      const blockers: string[] = [];
      let publicText = "";
      let visibleRows = 0;
      let initialMissingInputs = 0;
      let filledInputs = 0;
      let revisionCount = 0;
      let durableReplay = false;
      try {
        await page.goto(`${baseUrl}/request`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        const prompt = page.getByTestId("consumer-repair-problem-input");
        await prompt.waitFor({ timeout: 60_000 });
        await prompt.fill(registration.professionalNameRu);
        await page.getByTestId("consumer-repair-prepare-draft").click({ timeout: 30_000 });
        await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 90_000 });
        const initialBundle = await readLatestBundle(page);
        const initialRevision = currentRevision(initialBundle);
        initialMissingInputs = initialRevision?.missingInputs?.length ?? -1;
        if (initialBundle?.draft?.selectedWorkKey !== registration.workId) blockers.push(`initial_exact_work:${initialBundle?.draft?.selectedWorkKey ?? "null"}`);
        if (initialBundle?.items?.length !== 1) blockers.push(`initial_conditional_rows:${initialBundle?.items?.length ?? "null"}`);
        if (initialMissingInputs !== registration.parameterSchema.length) blockers.push(`initial_missing_inputs:${initialMissingInputs}`);

        const filledKeys = await fillExactMissingParameters(page, registration.parameterSchema);
        filledInputs = filledKeys.length;
        if (new Set(filledKeys).size !== registration.parameterSchema.length) {
          blockers.push(`filled_exact_inputs:${filledKeys.length}/${registration.parameterSchema.length}`);
        }
        await page.getByTestId("editable-param-batch-apply").click({ force: true });
        const compiledBundle = await waitForCompiledBundle(
          page,
          registration.workId,
          initialRevision?.revisionId ?? "",
          decision.resourceRowIds.length,
        );
        const compiledRevision = currentRevision(compiledBundle);
        revisionCount = compiledBundle?.estimateDraftRevisionState?.revisions?.length ?? 0;
        if (revisionCount !== 2) blockers.push(`revision_count:${revisionCount}`);
        if (compiledRevision?.professionalWorkId !== registration.workId) blockers.push(`professional_owner:${compiledRevision?.professionalWorkId ?? "null"}`);
        if (compiledRevision?.workSpecificParameterSchemaId !== registration.parameterSchemaId) blockers.push("parameter_schema_owner_mismatch");
        if (!compiledRevision?.boq?.rows?.every((row: any) =>
          row.sourceParameters?.selectedWorkId === registration.workId &&
          row.sourceParameters?.domainResolutionReadiness === "CALCULATION_READY" &&
          row.sourceParameters?.executableAsphaltProfile === true
        )) blockers.push("compiled_rows_not_exact_calculation_ready");

        await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 60_000 });
        const replayBundle = await readLatestBundle(page);
        const replayRevision = currentRevision(replayBundle);
        durableReplay = Boolean(
          replayRevision?.revisionId === compiledRevision?.revisionId &&
          replayRevision?.boq?.rows?.length === decision.resourceRowIds.length &&
          replayBundle?.items?.length === decision.resourceRowIds.length &&
          replayBundle?.draft?.selectedWorkKey === registration.workId
        );
        if (!durableReplay) blockers.push("durable_browser_replay_failed");
        await openAllPositions(page);
        publicText = await page.locator("body").innerText({ timeout: 15_000 });
        visibleRows = await page.locator("[data-testid^='consumer-repair-item-quantity-input-']").count();
        if (!publicText.includes(registration.professionalNameRu)) blockers.push("work_label_missing");
        if (decision.terminalDecision !== "EXECUTABLE_B") blockers.push(`terminal_decision:${decision.terminalDecision}`);
        if (visibleRows !== decision.resourceRowIds.length) {
          blockers.push(`visible_rows:${visibleRows}`);
        }
        if (/PRICE_MISSING|source_parameters|template_id|formula_id|paving_roads_landscape_interior/iu.test(publicText)) blockers.push("raw_internal_text_visible");
        if (!/Полный итог не рассчитан/u.test(publicText)) blockers.push("honest_total_blocker_missing");
        for (const title of ["Работы", "Труд", "Машины и механизмы", "Лабораторный контроль", "Документация"]) {
          if (!publicText.includes(title)) blockers.push(`section_missing:${title}`);
        }
        if (decision.applicableCategories.includes("material") && !publicText.includes("Материалы")) blockers.push("section_missing:Материалы");
        if (decision.applicableCategories.includes("service") && !publicText.includes("Услуги")) blockers.push("section_missing:Услуги");
        if (decision.applicableCategories.includes("logistics") && !publicText.includes("Логистика")) blockers.push("section_missing:Логистика");
        if (consoleErrors.length) blockers.push(`console_errors:${consoleErrors.length}`);
        if (pageErrors.length) blockers.push(`page_errors:${pageErrors.length}`);
        if (screenshotScopes.has(registration.scopeProfile)) {
          await page.screenshot({ path: path.join(outputRoot, `${registration.scopeProfile}.png`), fullPage: true });
          screenshotScopes.delete(registration.scopeProfile);
        }
      } catch (error) {
        blockers.push(`flow:${error instanceof Error ? error.message.replace(/\s+/g, " ").slice(0, 300) : String(error)}`);
        await page.screenshot({ path: path.join(outputRoot, `failure-${index + 1}.png`), fullPage: true }).catch(() => undefined);
      } finally {
        await Promise.race([context.close(), new Promise<void>((resolve) => setTimeout(resolve, 5_000))]);
      }
      results.push({
        work_id: registration.workId,
        scope_profile: registration.scopeProfile,
        terminal_decision: decision.terminalDecision,
        expected_rows: decision.resourceRowIds.length,
        visible_rows: visibleRows,
        initial_missing_inputs: initialMissingInputs,
        filled_inputs: filledInputs,
        revision_count: revisionCount,
        durable_replay: durableReplay,
        passed: blockers.length === 0,
        blockers,
        public_text_sha256: createHash("sha256").update(publicText).digest("hex"),
      });
      console.info(`[${index + 1}/${registrations.length}] ${registration.workId} ${blockers.length === 0 ? "GREEN" : `RED ${blockers.join(",")}`}`);
    }
  } finally {
    await browser.close().catch(() => undefined);
    server.stop();
  }
  const blockers = results.flatMap((row) => row.blockers.map((blocker) => `${row.work_id}:${blocker}`));
  const unsignedPayload = {
    schema: "asphalt-35-web-runtime-auto-composition-final-r5-v2",
    generated_at: new Date().toISOString(),
    subject_sha: exactSha,
    subject_tree_hash: subjectTreeHash,
    producer_version: producerVersion,
    input_manifest_hash: inputManifestHash,
    actual_browser: true,
    diagnostic_only: diagnosticWorkKey !== null,
    records_seen: results.length,
    records_terminal: results.filter((row) => row.passed).length,
    missing: registrations.length - results.length,
    duplicates: results.length - new Set(results.map((row) => row.work_id)).size,
    incomplete_p0_seen: results.filter((row) => row.initial_missing_inputs > 0).length,
    runtime_auto_composed: results.filter((row) => row.passed).length,
    durable_replay_passed: results.filter((row) => row.durable_replay).length,
    failure_ledger: blockers,
    result_counts: {
      web: `${results.filter((row) => row.passed).length}/35`,
      incomplete_p0: `${results.filter((row) => row.initial_missing_inputs > 0).length}/35`,
      durable_replay: `${results.filter((row) => row.durable_replay).length}/35`,
    },
    records: results,
  };
  const payload = {
    ...unsignedPayload,
    passed: blockers.length === 0 && results.length === registrations.length,
    artifact_hash: createHash("sha256").update(JSON.stringify(unsignedPayload)).digest("hex"),
  };
  writeFileSync(path.join(outputRoot, "asphalt-35-web-visible-output.json"), `${JSON.stringify(payload, null, 2)}\n`);
  console.info(JSON.stringify({ records_terminal: `${payload.records_terminal}/35`, blockers: blockers.slice(0, 30), outputRoot }, null, 2));
  if (!payload.passed) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
