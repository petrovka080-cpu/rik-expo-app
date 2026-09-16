import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page, type Response } from "playwright";

import {
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS,
  stripFoundationConcretePlacementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/stripFoundationConcretePlacementR1";
import {
  stripFoundationConcretePlacementPromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/stripFoundationConcretePlacementProductionBindingR1";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.strip-foundation-concrete-placement.differential-web.v1";
const GLOBAL_STATUS = "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY";
const ORIGIN = "http://127.0.0.1:8081";
const BACKEND = "http://127.0.0.1:8765";
const PROVIDER = "http://127.0.0.1:54321";
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const OUTPUT_ROOT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-family-e4-differential-web",
);
const OUTPUT = resolve(OUTPUT_ROOT, "acceptance.json");
const RELEASE_ID = "ffce7418-e0b2-54df-94b9-45ec442eb651";
const SEARCH_RELEASE_ID = "84ccfb2b-1c44-550f-9393-409c5a8d3ed1";
const API_RECEIPT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-family-e4-api/acceptance.json",
);
const TARGET_CONTEXTS = ["high_load", "repair"] as const;

const EXPECTED_DEFINITION_IDS: Readonly<Record<(typeof TARGET_CONTEXTS)[number], string>> = Object.freeze({
  high_load: "9cd8563b-bd33-529d-a614-4153c9384b09",
  repair: "b32913a8-ad01-593b-96c8-90cd4370224e",
});

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`CONCRETE_DIFFERENTIAL_WEB:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function progress(stage: string, details: Json = {}): void {
  process.stdout.write(`${JSON.stringify({ progress: "CONCRETE_DIFFERENTIAL_WEB", stage, ...details })}\n`);
}

async function json(response: Response): Promise<Json> {
  return response.json().catch(() => ({})) as Promise<Json>;
}

async function loginConsumer(): Promise<string> {
  const credentials = JSON.parse(readFileSync(CREDENTIALS, "utf8")) as Json;
  invariant(credentials.provider_url === PROVIDER, "PROVIDER_IDENTITY_RED");
  const consumer = (credentials.principals as Json[]).find((entry) => entry.role === "consumer");
  invariant(consumer?.email && consumer?.password && credentials.publishable_key,
    "CONSUMER_CREDENTIALS_MISSING");
  const response = await fetch(`${PROVIDER}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: consumer.email, password: consumer.password }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null) as Json | null;
  invariant(response.ok && body?.access_token, `CONSUMER_LOGIN_HTTP_${response.status}`);
  return `Bearer ${body.access_token}`;
}

async function api(authorization: string, path: string): Promise<Json> {
  const response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    headers: { Authorization: authorization },
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok, `API_${response.status}:${path}:${JSON.stringify(body).slice(0, 1_000)}`);
  return body;
}

async function waitForSuccessfulRevision(authorization: string, accepted: Json): Promise<Json> {
  const jobId = String(accepted.jobId ?? "");
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await api(authorization, `jobs/${jobId}`);
    if (job.status === "succeeded" && job.resultRevisionId) {
      return api(authorization, `revisions/${job.resultRevisionId}`);
    }
    invariant(!["failed", "cancelled"].includes(String(job.status)),
      `JOB_${job.status}:${job.errorCode ?? "UNKNOWN"}`);
    await new Promise((accept) => setTimeout(accept, 100));
  }
  throw new Error(`CONCRETE_DIFFERENTIAL_WEB:JOB_TIMEOUT:${jobId}`);
}

async function allRows(authorization: string, revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const page = await api(authorization, `revisions/${revisionId}/rows?${query.toString()}`);
    rows.push(...(Array.isArray(page.rows) ? page.rows : []));
    cursor = String(page.nextCursor ?? "");
  } while (cursor);
  return rows;
}

async function enterConsumer(page: Page, returnTo: string): Promise<void> {
  const deadline = Date.now() + 60_000;
  let routeRecoveryCount = 0;
  while (Date.now() < deadline) {
    if (routeRecoveryCount < 3 && new URL(page.url()).pathname !== new URL(returnTo).pathname) {
      routeRecoveryCount += 1;
      await page.goto(returnTo, { waitUntil: "commit", timeout: 180_000 });
      await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
      continue;
    }
    const input = page.getByTestId("consumer-repair-problem-input");
    if (await input.isVisible().catch(() => false) && await input.isEditable().catch(() => false)) return;
    const login = page.getByTestId("auth.login.local-consumer")
      .or(page.getByTestId("protected-identity-local-consumer-login")).first();
    if (await login.isVisible().catch(() => false) && await login.isEnabled().catch(() => false)) {
      await login.click({ timeout: 2_000 }).catch(() => undefined);
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`CONCRETE_DIFFERENTIAL_WEB:CONSUMER_ROUTE_NOT_READY:${page.url()}`);
}

async function expandPositions(page: Page): Promise<void> {
  const panel = page.getByTestId("request-estimate-positions-panel");
  if (await panel.isVisible().catch(() => false)) return;
  const toggle = page.getByTestId("request-estimate-positions-toggle");
  if (await toggle.isVisible().catch(() => false)) await toggle.click();
  await panel.waitFor({ state: "visible", timeout: 60_000 });
}

async function openRevision(page: Page, revisionId: string): Promise<void> {
  const url = `${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(revisionId)}`;
  await page.goto(url, { waitUntil: "commit", timeout: 180_000 });
  await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
  await enterConsumer(page, url);
  await page.getByTestId("request-estimate-items-total-count").waitFor({
    state: "visible",
    timeout: 90_000,
  });
  await expandPositions(page);
}

async function assertVisibleRows(page: Page, rows: Json[], code: string): Promise<Json> {
  await expandPositions(page);
  for (const row of rows) {
    await page.locator('[data-testid^="consumer-repair-item-title-"]')
      .filter({ hasText: String(row.titleRu) })
      .waitFor({ state: "visible", timeout: 60_000 });
  }
  const visibleTitles = await page.locator('[data-testid^="consumer-repair-item-title-"]')
    .allInnerTexts();
  invariant(visibleTitles.length === rows.length,
    `${code}:VISIBLE_ROW_DENOMINATOR:${visibleTitles.length}:${rows.length}`);
  const totalLabel = await page.getByTestId("request-estimate-items-total-count").innerText();
  invariant(totalLabel.includes(String(rows.length)), `${code}:TOTAL_LABEL:${totalLabel}`);
  const body = await page.locator("body").innerText();
  return { visibleTitles, totalLabel, bodyTextSha256: sha256(body) };
}

async function editPrimaryMeasure(
  page: Page,
  authorization: string,
  value: number,
): Promise<Json> {
  const chip = page.getByTestId("editable-param-chip-plan_dimension_concrete_volume_m3");
  if (!await chip.isVisible().catch(() => false)) {
    const toggle = page.getByTestId("request-estimate-parameters-toggle");
    if (await toggle.isVisible().catch(() => false)) await toggle.click();
    const showMore = page.getByTestId("request-estimate-show-more-parameters");
    if (await showMore.isVisible().catch(() => false)) await showMore.click();
  }
  await chip.waitFor({ state: "visible", timeout: 60_000 });
  await chip.getByTestId("editable-param-popover-input").fill(String(value));
  await page.getByTestId("editable-param-batch-bar").waitFor({ state: "visible", timeout: 30_000 });
  const responsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/jobs/recalculate") && response.request().method() === "POST",
  { timeout: 60_000 });
  const [response] = await Promise.all([
    responsePromise,
    page.getByTestId("editable-param-batch-apply").click(),
  ]);
  const accepted = await json(response);
  invariant(response.status() === 202, `RECALCULATE_HTTP_${response.status()}`);
  return waitForSuccessfulRevision(authorization, accepted);
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const apiReceiptBytes = readFileSync(API_RECEIPT);
  const apiReceipt = JSON.parse(apiReceiptBytes.toString("utf8")) as Json;
  invariant(apiReceipt.status
    === "GREEN_STRIP_FOUNDATION_CONCRETE_PLACEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
    && apiReceipt.denominator?.acceptedTargetCount === 7,
  "API_7_OF_7_RECEIPT_RED");
  const authorization = await loginConsumer();
  const manifest = await api(authorization, "runtime-manifest");
  invariant(manifest.compatibilityTuple?.definitionReleaseId === RELEASE_ID
    && manifest.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID
    && manifest.definitionRelease?.status === "prepared"
    && manifest.searchRelease?.status === "draft"
    && Number(manifest.activeCompileJobCount) === 0,
  "RUNTIME_TUPLE_RED");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  const results: Json[] = [];
  try {
    for (const contextKey of TARGET_CONTEXTS) {
      const target = STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS.find(
        (candidate) => candidate.contextKey === contextKey,
      );
      invariant(target, `TARGET_MISSING:${contextKey}`);
      const fixture = stripFoundationConcretePlacementAcceptanceInputR1(contextKey);
      const prompt = [target.titleRu, ...stripFoundationConcretePlacementPromptDetailsR1(fixture)].join("\n");
      const route = `${ORIGIN}/request?catalogWorkId=${encodeURIComponent(target.catalogId)}`
        + `&prompt=${encodeURIComponent(prompt)}&autoPrepare=1`
        + `&context=${encodeURIComponent(`acceptance:concrete-differential-web:${contextKey}:${Date.now()}`)}`;
      const page = await context.newPage();
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(`${contextKey}:${message.text().slice(0, 1_000)}`);
      });
      page.on("pageerror", (error) => pageErrors.push(`${contextKey}:${error.message}`));
      page.on("requestfailed", (request) => requestFailures.push(
        `${contextKey}:${request.method()} ${new URL(request.url()).pathname} ${request.failure()?.errorText ?? ""}`,
      ));

      const compilePromise = page.waitForResponse((response) =>
        response.url().endsWith("/jobs/compile") && response.request().method() === "POST",
      { timeout: 180_000 });
      await page.goto(route, { waitUntil: "commit", timeout: 180_000 });
      await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
      await enterConsumer(page, route);
      const compileResponse = await compilePromise;
      const accepted = await json(compileResponse);
      invariant(compileResponse.status() === 202, `COMPILE_HTTP_${contextKey}_${compileResponse.status()}`);
      const createdRevision = await waitForSuccessfulRevision(authorization, accepted);
      invariant(createdRevision.catalogId === target.catalogId
        && createdRevision.definitionVersionId === EXPECTED_DEFINITION_IDS[contextKey]
        && createdRevision.releaseId === RELEASE_ID,
      `CREATE_IDENTITY:${contextKey}`);
      const createdRows = await allRows(authorization, createdRevision.revisionId);
      const expectedOriginalRows = contextKey === "high_load" ? 11 : 7;
      invariant(createdRows.length === expectedOriginalRows,
        `CREATE_ROW_COUNT:${contextKey}:${createdRows.length}`);
      await openRevision(page, createdRevision.revisionId);
      const createdVisible = await assertVisibleRows(page, createdRows, `CREATE:${contextKey}`);
      const readyMix = createdRows.find((row) => row.rowId === "material:concrete:ready-mix");
      invariant(readyMix, `READY_MIX_MISSING:${contextKey}`);
      const createScreenshot = resolve(OUTPUT_ROOT, `01_${contextKey}_created_${readyMix.quantity}.png`);
      await page.screenshot({ path: createScreenshot, fullPage: true });

      const originalVolume = Number(fixture.plan_dimension_concrete_volume_m3);
      const editedVolume = originalVolume + 1;
      const editedRevision = await editPrimaryMeasure(page, authorization, editedVolume);
      invariant(editedRevision.parentRevisionId === createdRevision.revisionId
        && editedRevision.catalogId === target.catalogId,
      `EDIT_LINEAGE:${contextKey}`);
      const editedRows = await allRows(authorization, editedRevision.revisionId);
      const editedReadyMix = editedRows.find((row) => row.rowId === "material:concrete:ready-mix");
      const expectedReadyMix = editedVolume * (1 + Number(fixture.selected_contingency_percent) / 100);
      invariant(editedReadyMix, `EDIT_READY_MIX_MISSING:${contextKey}`);
      invariant(editedRows.length === expectedOriginalRows
        && Math.abs(Number(editedReadyMix.quantity) - expectedReadyMix) < 1e-8,
      `EDIT_QUANTITY:${contextKey}:${String(editedReadyMix?.quantity)}:${expectedReadyMix}`);
      await openRevision(page, editedRevision.revisionId);
      const editedVisible = await assertVisibleRows(page, editedRows, `EDIT:${contextKey}`);
      const editScreenshot = resolve(OUTPUT_ROOT, `02_${contextKey}_edited_${editedReadyMix.quantity}.png`);
      await page.screenshot({ path: editScreenshot, fullPage: true });

      const coldPage = await context.newPage();
      const coldUrl = `${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(editedRevision.revisionId)}`;
      await coldPage.goto(coldUrl, { waitUntil: "commit", timeout: 180_000 });
      await coldPage.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
      await enterConsumer(coldPage, coldUrl);
      await coldPage.getByTestId("request-estimate-items-total-count").waitFor({
        state: "visible",
        timeout: 90_000,
      });
      const coldVisible = await assertVisibleRows(coldPage, editedRows, `COLD:${contextKey}`);
      const coldScreenshot = resolve(OUTPUT_ROOT, `03_${contextKey}_cold_${editedReadyMix.quantity}.png`);
      await coldPage.screenshot({ path: coldScreenshot, fullPage: true });
      await coldPage.close();

      const includedIds = new Set(editedRows.map((row) => row.rowId));
      const branchTruth = contextKey === "high_load"
        ? includedIds.has("material:concrete:winter-heating-cable")
          && includedIds.has("work:concrete:winter-heating")
          && includedIds.has("equipment:concrete:heating-transformer")
          && includedIds.has("equipment:concrete:pump")
          && !includedIds.has("material:concrete:curing-membrane")
        : !includedIds.has("material:concrete:winter-heating-cable")
          && !includedIds.has("work:concrete:winter-heating")
          && !includedIds.has("equipment:concrete:heating-transformer")
          && !includedIds.has("equipment:concrete:pump")
          && !includedIds.has("material:concrete:curing-membrane");
      invariant(branchTruth, `DIFFERENTIAL_BRANCH:${contextKey}`);
      results.push({
        contextKey,
        catalogId: target.catalogId,
        definitionVersionId: EXPECTED_DEFINITION_IDS[contextKey],
        branch: contextKey === "high_load" ? "WINTER_PUMP_MAXIMAL" : "DIRECT_CHUTE_MINIMAL",
        create: {
          jobId: accepted.jobId,
          revisionId: createdRevision.revisionId,
          inputVolumeM3: originalVolume,
          readyMixM3: Number(readyMix.quantity),
          rowCount: createdRows.length,
          visibleRowCount: createdVisible.visibleTitles.length,
          screenshot: { path: createScreenshot, sha256: sha256(readFileSync(createScreenshot)) },
        },
        edit: {
          parentRevisionId: createdRevision.revisionId,
          revisionId: editedRevision.revisionId,
          inputVolumeM3: editedVolume,
          readyMixM3: Number(editedReadyMix.quantity),
          rowCount: editedRows.length,
          visibleRowCount: editedVisible.visibleTitles.length,
          singleBatchApply: true,
          screenshot: { path: editScreenshot, sha256: sha256(readFileSync(editScreenshot)) },
        },
        coldOpen: {
          revisionId: editedRevision.revisionId,
          rowCount: editedRows.length,
          visibleRowCount: coldVisible.visibleTitles.length,
          screenshot: { path: coldScreenshot, sha256: sha256(readFileSync(coldScreenshot)) },
        },
        exactBranchCompositionVisible: true,
        unknownPricesPreserved: editedRows.every((row) => row.unitPrice == null && row.amount == null),
      });
      progress("TARGET_GREEN", {
        contextKey,
        createdRevisionId: createdRevision.revisionId,
        editedRevisionId: editedRevision.revisionId,
        rows: editedRows.length,
      });
      await page.close();
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const unexpectedConsoleErrors = consoleErrors.filter((value) =>
    !value.includes("404 (Not Found)") && !value.includes("favicon"));
  const unexpectedRequestFailures = requestFailures.filter((value) =>
    !value.includes("net::ERR_ABORTED"));
  invariant(results.length === 2
    && results.every((result) => result.exactBranchCompositionVisible
      && result.unknownPricesPreserved),
  "RESULT_DENOMINATOR_RED");
  invariant(pageErrors.length === 0 && unexpectedConsoleErrors.length === 0
    && unexpectedRequestFailures.length === 0,
  `DIAGNOSTICS_RED:${JSON.stringify({ pageErrors, unexpectedConsoleErrors, unexpectedRequestFailures })}`);
  const manifestAfter = await api(authorization, "runtime-manifest");
  invariant(manifestAfter.definitionRelease?.status === "prepared"
    && manifestAfter.searchRelease?.status === "draft"
    && Number(manifestAfter.activeCompileJobCount) === 0,
  "RUNTIME_AFTER_RED");

  const evidence = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    status: "GREEN_STRIP_FOUNDATION_CONCRETE_PLACEMENT_DIFFERENTIAL_WEB_HIGH_LOAD_AND_REPAIR_CREATE_EDIT_COLD",
    globalStatus: GLOBAL_STATUS,
    apiFamilyReceipt: {
      path: API_RECEIPT,
      fileSha256: sha256(apiReceiptBytes),
      receiptSha256: apiReceipt.receiptSha256,
      acceptedTargetCount: apiReceipt.denominator.acceptedTargetCount,
    },
    runtime: {
      definitionReleaseId: RELEASE_ID,
      definitionReleaseStatus: manifest.definitionRelease.status,
      searchReleaseId: SEARCH_RELEASE_ID,
      searchReleaseStatus: manifest.searchRelease.status,
      sourceHead: manifest.sourceHead,
      sourceTree: manifest.sourceTree,
      frontendBuildIdentity: manifest.frontendBuildIdentity,
    },
    selectionRationale: {
      alreadyAcceptedNativeAndWebBaseline: "standard",
      selectedDifferentialContexts: [
        { contextKey: "high_load", reason: "maximal winter/pump branch with 11 rows" },
        { contextKey: "repair", reason: "minimal direct-chute/water-curing branch with 7 rows" },
      ],
      repeatedEquivalentUiContextsSkipped: ["large_area", "small_area", "technical_room", "wet_zone"],
    },
    results,
    diagnostics: {
      consoleErrors,
      pageErrors,
      requestFailures,
      unexpectedConsoleErrors,
      unexpectedRequestFailures,
    },
    productionRequests: 0,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  const sealed = { ...evidence, receiptSha256: sha256(JSON.stringify(evidence)) };
  atomicJson(OUTPUT, sealed);
  progress("GREEN", { output: OUTPUT, receiptSha256: sealed.receiptSha256 });
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
