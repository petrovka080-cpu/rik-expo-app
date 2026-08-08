import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright";

import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  RoadworksWaveAProductionRegistry,
  buildAsphalt35NormativeCompositionLedgerV3,
} from "../../src/lib/estimate/v4/roadworks";
import { decodeConsumerRepairBundleFromDurableStorage } from "../../src/lib/platform/compactConsumerRepairDurableState";
import { checkAndroidEmulatorHealth } from "./checkAndroidEmulatorHealth";
import {
  compactAndroidHealth,
  ensureProductionGradeAndroidWebServer,
} from "./runProductionGradeEstimateAndroidSmoke";

const exactSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const status = execFileSync("git", ["status", "--porcelain=v1"], { encoding: "utf8" }).trim();
const diff = execFileSync("git", ["diff", "--binary"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const subjectTreeHash = createHash("sha256").update(JSON.stringify({ exactSha, status, diff })).digest("hex");
const outDir = path.join(".release-runtime", "asphalt-v3-final-r5", exactSha, "android-chrome-mobile-web");
const baseUrl = process.env.ASPHALT_ANDROID_BASE_URL ?? "http://localhost:8112";
const deviceId = process.env.ASPHALT_ANDROID_DEVICE_ID ?? "emulator-5554";
const diagnosticWorkKey = process.env.ASPHALT_ANDROID_ONLY_WORK?.trim() || null;
const registrations = diagnosticWorkKey
  ? RoadworksWaveAProductionRegistry.filter((row) => row.workId === diagnosticWorkKey)
  : RoadworksWaveAProductionRegistry;
if (diagnosticWorkKey && registrations.length !== 1) throw new Error(`UNKNOWN_ANDROID_WORK_KEY:${diagnosticWorkKey}`);
const ledger = new Map(buildAsphalt35NormativeCompositionLedgerV3().map((row) => [row.workId, row]));
const storagePrefix = "rik.consumer_repair.request_bundle.v2:";
const producerVersion = "post-r6-01-final-r5-android-chrome-mobile-web-create-edit-replay-v3";
const inputManifestHash = createHash("sha256").update(JSON.stringify(
  RoadworksWaveAProductionRegistry.map((registration) => ({
    work_key: registration.workId,
    parameter_schema_id: registration.parameterSchemaId,
    parameter_schema: registration.parameterSchema,
    formula_graph_id: registration.formulaGraphId,
    semantic_fingerprint: registration.semanticFingerprint,
  })),
)).digest("hex");
const chromeCommandLine = [
  "chrome",
  "--no-first-run",
  "--disable-fre",
  "--disable-default-apps",
  "--disable-background-networking",
  "--remote-debugging-socket-name=chrome_devtools_remote",
  "--remote-debugging-port=9222",
].join(" ");

function adb(args: string[], timeoutMs = 30_000): string {
  return execFileSync("adb", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
  }).trim();
}

function adbNoThrow(args: string[], timeoutMs = 30_000): boolean {
  try {
    adb(args, timeoutMs);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectAndroidChrome(): Promise<Browser> {
  const port = new URL(baseUrl).port || "80";
  adb(["-s", deviceId, "reverse", `tcp:${port}`, `tcp:${port}`]);
  const commandLinePath = path.join(outDir, "chrome-command-line");
  writeFileSync(commandLinePath, `${chromeCommandLine}\n`, "utf8");
  adb(["-s", deviceId, "push", commandLinePath, "/data/local/tmp/chrome-command-line"], 15_000);
  adb(["-s", deviceId, "shell", "chmod", "644", "/data/local/tmp/chrome-command-line"], 15_000);
  adbNoThrow(["-s", deviceId, "forward", "--remove", "tcp:9222"]);
  adb(["-s", deviceId, "forward", "tcp:9222", "localabstract:chrome_devtools_remote"]);
  adbNoThrow(["-s", deviceId, "shell", "am", "force-stop", "com.android.chrome"]);
  adb([
    "-s", deviceId, "shell", "am", "start",
    "-n", "com.android.chrome/com.google.android.apps.chrome.Main",
    "-a", "android.intent.action.VIEW",
    "-d", `${baseUrl.replace(/\/+$/, "")}/request`,
  ]);
  let devtoolsReady = false;
  for (let attempt = 1; attempt <= 90; attempt += 1) {
    try {
      const response = await fetch("http://127.0.0.1:9222/json/version", {
        signal: AbortSignal.timeout(1_000),
      });
      const version = await response.json() as { webSocketDebuggerUrl?: string };
      if (response.ok && version.webSocketDebuggerUrl) {
        devtoolsReady = true;
        break;
      }
    } catch {
      // Android Chrome exposes its DevTools socket only after cold-start setup.
    }
    await sleep(1_000);
  }
  if (!devtoolsReady) throw new Error("ANDROID_CHROME_DEVTOOLS_ENDPOINT_TIMEOUT");
  await sleep(1_000);
  let lastError: unknown;
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      return await chromium.connectOverCDP("http://127.0.0.1:9222");
    } catch (error) {
      lastError = error;
      await sleep(1000);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("ANDROID_CHROME_CDP_CONNECT_TIMEOUT");
}

function parameterRawValue(key: string): string {
  return String(DEFAULT_ROADWORKS_WAVE_A_INPUTS[key as keyof typeof DEFAULT_ROADWORKS_WAVE_A_INPUTS]);
}

async function readLatestBundle(page: Page): Promise<any | null> {
  const encoded = await page.evaluate((prefix) => {
    const bundles: any[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      try {
        const bundle = JSON.parse(window.localStorage.getItem(key) ?? "null");
        if (bundle?.draft?.id) bundles.push(bundle);
      } catch {
        // Malformed durable state makes the evidence fail below.
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

async function waitForBundle(
  page: Page,
  predicate: (bundle: any, revision: any) => boolean,
  timeoutMs = 120_000,
): Promise<any> {
  const started = Date.now();
  let latest: any | null = null;
  while (Date.now() - started < timeoutMs) {
    latest = await readLatestBundle(page);
    if (latest && predicate(latest, currentRevision(latest))) return latest;
    await page.waitForTimeout(250);
  }
  throw new Error(`ANDROID_BUNDLE_TIMEOUT:${JSON.stringify({
    draft: latest?.draft?.selectedWorkKey ?? null,
    revision: currentRevision(latest)?.revisionId ?? null,
    missing: currentRevision(latest)?.missingInputs?.map((item: any) => item.key) ?? null,
    rows: currentRevision(latest)?.boq?.rows?.length ?? null,
    items: latest?.items?.length ?? null,
  })}`);
}

async function clearOrigin(page: Page): Promise<void> {
  await page.goto(`${baseUrl.replace(/\/+$/, "")}/request`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.evaluate(async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    if (typeof indexedDB.databases === "function") {
      for (const database of await indexedDB.databases()) {
        if (database.name) indexedDB.deleteDatabase(database.name);
      }
    }
  });
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
}

async function openAllExactParameters(page: Page): Promise<void> {
  if (await page.getByTestId("request-estimate-parameter-panel").count() === 0) {
    await page.getByTestId("request-estimate-parameters-toggle").click({ force: true });
    await page.getByTestId("request-estimate-parameter-panel").waitFor({ timeout: 20_000 });
  }
  const showMore = page.getByTestId("request-estimate-show-more-parameters");
  if (await showMore.count() > 0) await showMore.first().click({ force: true });
}

async function setExactParameter(page: Page, key: string, value: string): Promise<void> {
  const editor = page.getByTestId(`editable-param-inline-editor-${key}`);
  await editor.waitFor({ timeout: 20_000 });
  await editor.scrollIntoViewIfNeeded();
  const option = page.getByTestId(`editable-param-option-${key}-${value}`);
  if (await option.count() > 0) await option.first().click({ force: true });
  else await editor.getByTestId("editable-param-popover-input").fill(value);
}

async function fillAllMissing(page: Page, keys: readonly string[]): Promise<string[]> {
  await openAllExactParameters(page);
  const filled: string[] = [];
  for (const key of keys) {
    if (await page.getByTestId(`request-estimate-missing-param-${key}`).count() === 0) continue;
    await setExactParameter(page, key, parameterRawValue(key));
    filled.push(key);
  }
  await page.getByTestId("editable-param-batch-bar").waitFor({ timeout: 20_000 });
  return filled;
}

async function openAllPositions(page: Page): Promise<number> {
  if (await page.locator("[data-testid^='request-estimate-section-']").count() === 0) {
    await page.getByTestId("request-estimate-positions-toggle").click({ force: true });
  }
  await page.locator("[data-testid^='request-estimate-section-']").first().waitFor({ timeout: 45_000 });
  for (let index = 0; index < 20; index += 1) {
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
  return page.locator("[data-testid^='consumer-repair-item-quantity-input-']").count();
}

async function runWork(page: Page, registration: (typeof RoadworksWaveAProductionRegistry)[number]) {
  const decision = ledger.get(registration.workId)!;
  const expectedRows = decision.resourceRowIds.length;
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const onConsole = (message: any) => { if (message.type() === "error") consoleErrors.push(message.text()); };
  const onPageError = (error: Error) => pageErrors.push(error.message);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  try {
    await clearOrigin(page);
    const prompt = page.getByTestId("consumer-repair-problem-input");
    await prompt.waitFor({ timeout: 60_000 });
    await prompt.fill(registration.professionalNameRu);
    await page.getByTestId("consumer-repair-prepare-draft").click({ timeout: 30_000 });
    await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 90_000 });
    const initialBundle = await readLatestBundle(page);
    const initialRevision = currentRevision(initialBundle);
    const filledKeys = await fillAllMissing(page, registration.parameterSchema);
    await page.getByTestId("editable-param-batch-apply").click({ force: true });
    const compiledBundle = await waitForBundle(page, (bundle, revision) =>
      bundle.draft?.selectedWorkKey === registration.workId &&
      revision?.revisionId !== initialRevision?.revisionId &&
      revision?.missingInputs?.length === 0 &&
      revision?.boq?.rows?.length === expectedRows &&
      bundle.items?.length === expectedRows
    );
    const compiledRevision = currentRevision(compiledBundle);
    const compiledFrozen = JSON.stringify(compiledRevision);
    const createBlockers = [
      initialBundle?.draft?.selectedWorkKey === registration.workId ? "" : "initial_exact_work_missing",
      initialBundle?.items?.length === 1 ? "" : `initial_conditional_rows:${initialBundle?.items?.length ?? "null"}`,
      initialRevision?.missingInputs?.length === registration.parameterSchema.length ? "" : `initial_missing:${initialRevision?.missingInputs?.length ?? "null"}`,
      new Set(filledKeys).size === registration.parameterSchema.length ? "" : `filled:${filledKeys.length}/${registration.parameterSchema.length}`,
      compiledBundle?.estimateDraftRevisionState?.revisions?.length === 2 ? "" : "compiled_not_r2",
      compiledRevision?.professionalWorkId === registration.workId ? "" : "compiled_owner_mismatch",
      compiledRevision?.boq?.rows?.every((row: any) => row.sourceParameters?.domainResolutionReadiness === "CALCULATION_READY") ? "" : "compiled_not_ready",
    ].filter(Boolean);

    await openAllExactParameters(page);
    await setExactParameter(page, "area_m2", "120");
    await page.getByTestId("editable-param-batch-apply").click({ force: true });
    const editedBundle = await waitForBundle(page, (bundle, revision) =>
      revision?.revisionId !== compiledRevision?.revisionId &&
      revision?.previousRevisionId === compiledRevision?.revisionId &&
      revision?.params?.area_m2?.value === 120 &&
      revision?.boq?.rows?.length === expectedRows &&
      bundle.items?.length === expectedRows
    );
    const editedRevision = currentRevision(editedBundle);
    const immutableCompiled = editedBundle.estimateDraftRevisionState.revisions.find(
      (revision: any) => revision.revisionId === compiledRevision.revisionId,
    );
    const editBlockers = [
      editedBundle.estimateDraftRevisionState.revisions.length === 3 ? "" : "edited_not_r3",
      editedRevision?.professionalWorkId === registration.workId ? "" : "edited_owner_mismatch",
      editedRevision?.resolvedIdentity?.requestedCatalogWorkId === registration.workId ? "" : "edited_identity_mismatch",
      editedBundle.estimateDraftRevisionState.diffs.at(-1)?.changedRowsCount > 0 ? "" : "edit_changed_rows_zero",
      JSON.stringify(immutableCompiled) === compiledFrozen ? "" : "compiled_revision_mutated",
    ].filter(Boolean);

    const editedQuantities = editedRevision.boq.rows.map((row: any) => `${row.rowId}:${row.quantity}`).join("|");
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 60_000 });
    const replayBundle = await readLatestBundle(page);
    const replayRevision = currentRevision(replayBundle);
    const visibleRows = await openAllPositions(page);
    const bodyText = await page.locator("body").innerText({ timeout: 20_000 });
    const replayQuantities = replayRevision?.boq?.rows?.map((row: any) => `${row.rowId}:${row.quantity}`).join("|");
    const requiredSections = ["Работы", "Труд", "Машины и механизмы", "Лабораторный контроль", "Документация"];
    if (decision.applicableCategories.includes("material")) requiredSections.push("Материалы");
    if (decision.applicableCategories.includes("service")) requiredSections.push("Услуги");
    if (decision.applicableCategories.includes("logistics")) requiredSections.push("Логистика");
    const replayBlockers = [
      replayRevision?.revisionId === editedRevision?.revisionId ? "" : "replay_revision_mismatch",
      replayBundle?.draft?.selectedWorkKey === registration.workId ? "" : "replay_work_mismatch",
      replayRevision?.professionalWorkId === registration.workId ? "" : "replay_owner_mismatch",
      replayQuantities === editedQuantities ? "" : "replay_quantity_mismatch",
      visibleRows === expectedRows ? "" : `visible_rows:${visibleRows}/${expectedRows}`,
      requiredSections.every((title) => bodyText.includes(title)) ? "" : `sections:${requiredSections.filter((title) => !bodyText.includes(title)).join(",")}`,
      /PRICE_MISSING|source_parameters|template_id|formula_id|paving_roads_landscape_interior/iu.test(bodyText) ? "raw_internal_text_visible" : "",
      consoleErrors.length === 0 ? "" : `console_errors:${consoleErrors.length}`,
      pageErrors.length === 0 ? "" : `page_errors:${pageErrors.length}`,
    ].filter(Boolean);
    return {
      work_key: registration.workId,
      expected_rows: expectedRows,
      initial_missing_inputs: initialRevision?.missingInputs?.length ?? null,
      filled_inputs: filledKeys.length,
      visible_rows: visibleRows,
      revisions: [initialRevision?.revisionId, compiledRevision?.revisionId, editedRevision?.revisionId],
      create: { passed: createBlockers.length === 0, blockers: createBlockers },
      edit: { passed: editBlockers.length === 0, blockers: editBlockers },
      replay: { passed: replayBlockers.length === 0, blockers: replayBlockers },
      console_errors: consoleErrors,
      page_errors: pageErrors,
    };
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const health = checkAndroidEmulatorHealth({ serial: deviceId, requireEmulator: true, requireChrome: true }).artifact;
  const sdk = adb(["-s", deviceId, "shell", "getprop", "ro.build.version.sdk"]);
  if (!health.android_lab_healthy || sdk !== "34") {
    throw new Error(`android_lab_unhealthy:${health.blocking_reasons.join("|")}:sdk=${sdk}`);
  }
  const server = await ensureProductionGradeAndroidWebServer(baseUrl, outDir);
  let browser: Browser | null = null;
  const records: any[] = [];
  const blockers: string[] = [];
  try {
    browser = await connectAndroidChrome();
    const context = browser.contexts()[0];
    if (!context) throw new Error("ANDROID_CHROME_CONTEXT_MISSING");
    const page = context.pages().find((candidate) => candidate.url().includes("/request"))
      ?? context.pages().at(-1)
      ?? await context.newPage();
    for (const [index, registration] of registrations.entries()) {
      let record: any;
      try {
        record = await runWork(page, registration);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        record = {
          work_key: registration.workId,
          create: { passed: false, blockers: [`flow:${message}`] },
          edit: { passed: false, blockers: [`not_reached_after:${message}`] },
          replay: { passed: false, blockers: [`not_reached_after:${message}`] },
        };
        await page.screenshot({ path: path.join(outDir, `failure-${index + 1}.png`), fullPage: true }).catch(() => undefined);
      }
      records.push(record);
      for (const phase of ["create", "edit", "replay"] as const) {
        blockers.push(...record[phase].blockers.map((reason: string) => `${registration.workId}:${phase}:${reason}`));
      }
      writeFileSync(path.join(outDir, "asphalt-35-android-chrome-mobile-web-checkpoint.json"), `${JSON.stringify({
        subject_sha: exactSha,
        subject_tree_hash: subjectTreeHash,
        records,
        blockers,
      }, null, 2)}\n`);
      console.info(`[${index + 1}/${registrations.length}] ${registration.workId} create=${record.create.passed ? "GREEN" : "RED"} edit=${record.edit.passed ? "GREEN" : "RED"} replay=${record.replay.passed ? "GREEN" : "RED"}`);
    }
  } finally {
    await browser?.close().catch(() => undefined);
    server.stop();
  }
  const healthAfter = checkAndroidEmulatorHealth({ serial: deviceId, requireEmulator: true, requireChrome: true }).artifact;
  if (!healthAfter.android_lab_healthy) blockers.push(...healthAfter.blocking_reasons.map((reason) => `health_after:${reason}`));
  const createPassed = records.filter((record) => record.create.passed).length;
  const editPassed = records.filter((record) => record.edit.passed).length;
  const replayPassed = records.filter((record) => record.replay.passed).length;
  const unsigned = {
    schema: "asphalt-35-android-chrome-mobile-web-create-edit-replay-final-r5-v3",
    generated_at: new Date().toISOString(),
    subject_sha: exactSha,
    subject_tree_hash: subjectTreeHash,
    producer_version: producerVersion,
    input_manifest_hash: inputManifestHash,
    actual_android_emulator: true,
    target: "android_chrome_mobile_web",
    native_expo_react_native_runtime_executed: false,
    android_chrome_results_not_counted_as_native: true,
    device_id: deviceId,
    sdk: Number(sdk),
    diagnostic_only: diagnosticWorkKey !== null,
    health_before: compactAndroidHealth(health),
    health_after: compactAndroidHealth(healthAfter),
    result_counts: {
      create: `${createPassed}/${registrations.length}`,
      edit: `${editPassed}/${registrations.length}`,
      replay: `${replayPassed}/${registrations.length}`,
      android_chrome_mobile_web: `${createPassed + editPassed + replayPassed}/${registrations.length * 3}`,
    },
    failure_ledger: blockers,
    records,
  };
  const payload = {
    ...unsigned,
    passed: blockers.length === 0 && records.length === registrations.length &&
      createPassed === registrations.length && editPassed === registrations.length && replayPassed === registrations.length,
    artifact_hash: createHash("sha256").update(JSON.stringify(unsigned)).digest("hex"),
  };
  writeFileSync(path.join(outDir, "asphalt-35-android-chrome-mobile-web-35x3.json"), `${JSON.stringify(payload, null, 2)}\n`);
  console.info(JSON.stringify({ passed: payload.passed, result_counts: payload.result_counts, blockers: blockers.slice(0, 100) }, null, 2));
  if (!payload.passed) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
