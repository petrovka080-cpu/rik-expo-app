import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page, type Response } from "playwright";

type Json = Record<string, any>;

const ORIGIN = "http://127.0.0.1:8081";
const BACKEND = "http://127.0.0.1:8765";
const RELEASE_ID = process.env.R4A13_DEFINITION_RELEASE_ID
  ?? "a76ff40a-8030-5ee4-a83b-11ec0828fee4";
const SEARCH_RELEASE_ID = process.env.R4A13_SEARCH_RELEASE_ID
  ?? "f03d0f16-c355-5e45-b2c6-832668eac066";
const OUTPUT_ROOT = resolve(process.env.R4A13_OUTPUT_ROOT
  ?? ".release-runtime/r4a13-6/s19-first-estimate/web-master30-current-a76-v1");
const OUTPUT = resolve(OUTPUT_ROOT, "master30-web-acceptance.json");
const STATE_PATH = resolve(OUTPUT_ROOT, "run-state.json");
const BACKEND_RUNTIME_RECEIPT_PATH = resolve(process.env.R4A13_BACKEND_RUNTIME_RECEIPT_PATH
  ?? ".release-runtime/r568/runtime/local-developer-current/backend.json");
const METRO_RUNTIME_RECEIPT_PATH = resolve(process.env.R4A13_METRO_RUNTIME_RECEIPT_PATH
  ?? ".release-runtime/r568/runtime/local-developer-current/metro.json");
const EVIDENCE_MAP_PATH = resolve(process.env.R4A13_EVIDENCE_MAP_PATH
  ?? ".release-runtime/r4a13-6/s19-first-estimate/master-benchmark-evidence-map-v1/master-benchmark-evidence-map.json");
const BACKEND_EVIDENCE_PATH = resolve(process.env.R4A13_BACKEND_EVIDENCE_PATH
  ?? ".release-runtime/r4a13-6/s19-first-estimate/master-backend-benchmarks-v30/master-backend-benchmarks.json");
const W12_WEB_EVIDENCE_PATH = resolve(process.env.R4A13_W12_WEB_EVIDENCE_PATH
  ?? ".release-runtime/r4a13-6/s19-first-estimate/web-current-a76-w12-v1/12_complete_editable_workflow.json");
const BUNDLE_PATH = "/index.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`MASTER30_WEB:${code}`);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, "")) as Json;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const pending = `${path}.pending-${process.pid}`;
  writeFileSync(pending, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(pending, path);
}

async function responseJson(response: Response): Promise<Json> {
  return response.json().catch(() => ({})) as Promise<Json>;
}

async function api(authorization: string, path: string): Promise<Json> {
  const response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    headers: { Authorization: authorization },
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.status === 200,
    `API_${response.status}:${path}:${String(body.error?.code ?? "UNKNOWN")}`);
  return body;
}

async function waitForJobRevision(authorization: string, jobId: string): Promise<string> {
  invariant(jobId.length > 0, "JOB_ID_MISSING");
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await api(authorization, `jobs/${jobId}`);
    if (job.status === "succeeded" && typeof job.resultRevisionId === "string") {
      return job.resultRevisionId;
    }
    invariant(!["failed", "cancelled"].includes(String(job.status)),
      `JOB_${jobId}_${String(job.status)}:${String(job.errorCode ?? "UNKNOWN")}`);
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`MASTER30_WEB:JOB_TIMEOUT:${jobId}`);
}

async function allRows(authorization: string, revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const body = await api(authorization, `revisions/${revisionId}/rows?${query.toString()}`);
    rows.push(...(Array.isArray(body.rows) ? body.rows : []));
    cursor = String(body.nextCursor ?? "");
  } while (cursor);
  return rows;
}

async function enterConsumer(page: Page, allowOpenedRevision = false): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await page.getByTestId("consumer-repair-problem-input").isVisible().catch(() => false)) return;
    if (allowOpenedRevision && (
      await page.getByTestId("request-estimate-items-total-count").isVisible().catch(() => false)
      || await page.getByTestId("request-estimate-positions-toggle").isVisible().catch(() => false)
      || await page.getByTestId("request-estimate-parameter-status").isVisible().catch(() => false)
    )) return;
    const director = page.getByTestId("local-developer-director-login");
    if (await director.isVisible().catch(() => false)
      && await director.isEnabled().catch(() => false)) {
      await director.click({ timeout: 2_000 }).catch(() => undefined);
    } else {
      const consumer = page.getByTestId("auth.login.local-consumer")
        .or(page.getByTestId("protected-identity-local-consumer-login")).first();
      if (await consumer.isVisible().catch(() => false)
        && await consumer.isEnabled().catch(() => false)) {
        await consumer.click({ timeout: 2_000 }).catch(() => undefined);
      }
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`MASTER30_WEB:CONSUMER_ROUTE_NOT_READY:${
    (await page.locator("body").innerText()).replace(/\s+/gu, " ").slice(0, 2_000)}`);
}

async function ensureEstimatePositionsVisible(page: Page): Promise<void> {
  const total = page.getByTestId("request-estimate-items-total-count");
  if (await total.isVisible().catch(() => false)) return;
  const toggle = page.getByTestId("request-estimate-positions-toggle");
  await toggle.waitFor({ state: "visible", timeout: 60_000 });
  if (/Показать позиции/iu.test(await toggle.innerText())) await toggle.click();
  await total.waitFor({ state: "visible", timeout: 60_000 });
}

function stringSet(values: readonly unknown[]): string[] {
  return [...new Set(values.map(String))].sort();
}

function expectedNeedProjection(benchmark: Json): Json[] {
  return (Array.isArray(benchmark.shortPreliminaryNeeds)
    ? benchmark.shortPreliminaryNeeds as Json[]
    : []).map((need) => ({
    rowId: String(need.rowId),
    needState: String(need.needState),
    missingParameterIds: stringSet(Array.isArray(need.missingParameterIds)
      ? need.missingParameterIds
      : []),
  })).sort((left, right) => left.rowId.localeCompare(right.rowId));
}

function actualNeedProjection(needs: Json[]): Json[] {
  return needs.map((need) => ({
    rowId: String(need.rowId),
    needState: String(need.needState),
    missingParameterIds: stringSet(Array.isArray(need.missingParameterIds)
      ? need.missingParameterIds
      : []),
  })).sort((left, right) => left.rowId.localeCompare(right.rowId));
}

async function openConsumerRoute(page: Page, marker: string): Promise<void> {
  await page.goto(`${ORIGIN}/request?master30=${encodeURIComponent(marker)}`, {
    waitUntil: "commit",
    timeout: 180_000,
  });
  await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
  await enterConsumer(page);
}

async function runCase(input: {
  page: Page;
  mapping: Json;
  benchmark: Json;
  runtime: Json;
  state: Json;
}): Promise<Json> {
  const { page, mapping, benchmark, runtime, state } = input;
  const ordinal = Number(mapping.ordinal);
  const caseId = `MASTER_${String(ordinal).padStart(2, "0")}_${String(mapping.fixtureId)}`;
  const catalogId = String(mapping.currentCatalogId);
  const prompt = String(mapping.historicalPromptRu).trim();
  invariant(prompt.length > 0 && catalogId.startsWith("canonical-work:"), `${caseId}:INPUT_RED`);
  invariant(String(benchmark.currentCatalogId) === catalogId, `${caseId}:BACKEND_CATALOG_DRIFT`);
  invariant(benchmark.backendContentAcceptanceStatus === "ACCEPTED_CURRENT_PREPARED_CANDIDATE",
    `${caseId}:BACKEND_CONTENT_NOT_ACCEPTED`);

  let authorization = "";
  const backendRequests: Json[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(`${BACKEND}/`)) return;
    const header = request.headers().authorization ?? "";
    if (header.startsWith("Bearer ")) authorization = header;
  });
  page.on("response", (response) => {
    if (!response.url().startsWith(`${BACKEND}/`)) return;
    backendRequests.push({
      method: response.request().method(),
      path: new URL(response.url()).pathname,
      status: response.status(),
      requestId: response.headers()["x-request-id"] ?? null,
    });
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 1_000));
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    requestFailures.push(`${request.method()} ${new URL(request.url()).pathname} ${
      request.failure()?.errorText ?? ""}`);
  });

  await openConsumerRoute(page, `${caseId}-${Date.now()}`);
  const problemInput = page.getByTestId("consumer-repair-problem-input");
  const searchPromise = page.waitForResponse((response) =>
    response.url().startsWith(`${BACKEND}/search/catalog?`) && response.status() === 200,
  { timeout: 120_000 });
  const [searchResponse] = await Promise.all([searchPromise, problemInput.fill(prompt)]);
  const search = await responseJson(searchResponse);
  invariant(search.searchIndexReleaseId === SEARCH_RELEASE_ID, `${caseId}:SEARCH_RELEASE_DRIFT`);
  const items = Array.isArray(search.items) ? search.items as Json[] : [];
  const selectedIndex = items.findIndex((item) => String(item.catalogId) === catalogId);
  invariant(selectedIndex >= 0, `${caseId}:EXPECTED_CATALOG_NOT_FOUND`);
  const selected = items[selectedIndex];
  invariant(selected.estimateReady === true, `${caseId}:EXPECTED_CATALOG_NOT_ESTIMATE_READY`);
  const suggestion = page.getByTestId(`consumer-repair-work-suggestion-${selectedIndex + 1}`);
  await suggestion.waitFor({ state: "visible", timeout: 120_000 });
  const selectedWorkText = (await suggestion.innerText()).trim();
  invariant(selectedWorkText.length > 0, `${caseId}:VISIBLE_SUGGESTION_EMPTY`);
  await suggestion.click();
  invariant(authorization.startsWith("Bearer "), `${caseId}:AUTHORIZATION_MISSING`);

  const previous = (state.cases?.[caseId] ?? {}) as Json;
  let jobId = String(previous.jobId ?? "");
  let revisionId = String(previous.revisionId ?? "");
  if (revisionId) {
    process.stdout.write(`${JSON.stringify({ ordinal, caseId, stage: "REVISION_RESUMED", revisionId })}\n`);
  } else if (jobId) {
    process.stdout.write(`${JSON.stringify({ ordinal, caseId, stage: "JOB_RESUMED", jobId })}\n`);
    revisionId = await waitForJobRevision(authorization, jobId);
    state.cases[caseId] = { ...previous, phase: "REVISION_OBTAINED", jobId, revisionId };
    atomicJson(STATE_PATH, state);
  } else {
    const prepareButton = page.getByTestId("consumer-repair-prepare-draft");
    await prepareButton.waitFor({ state: "visible", timeout: 60_000 });
    invariant(await prepareButton.isEnabled(), `${caseId}:PREPARE_DISABLED`);
    state.cases[caseId] = {
      phase: "UI_SELECTION_COMPLETE",
      ordinal,
      fixtureId: mapping.fixtureId,
      catalogId,
      promptSha256: sha256(prompt),
      selectedIndex,
      searchItemCount: items.length,
    };
    atomicJson(STATE_PATH, state);
    const compilePromise = page.waitForResponse((response) =>
      response.url().endsWith("/jobs/compile") && response.request().method() === "POST",
    { timeout: 60_000 });
    const [compileResponse] = await Promise.all([compilePromise, prepareButton.click()]);
    const compileBody = await responseJson(compileResponse);
    invariant(compileResponse.status() === 202,
      `${caseId}:COMPILE_HTTP_${compileResponse.status()}:${String(compileBody.error?.code ?? "")}`);
    jobId = String(compileBody.jobId ?? "");
    invariant(jobId.length > 0, `${caseId}:COMPILE_JOB_ID_MISSING`);
    state.cases[caseId] = { ...state.cases[caseId], phase: "COMPILE_ACCEPTED", jobId };
    atomicJson(STATE_PATH, state);
    revisionId = await waitForJobRevision(authorization, jobId);
    state.cases[caseId] = {
      ...state.cases[caseId],
      phase: "REVISION_OBTAINED",
      revisionId,
    };
    atomicJson(STATE_PATH, state);
  }

  const revision = await api(authorization, `revisions/${revisionId}`);
  invariant(revision.releaseId === RELEASE_ID, `${caseId}:DEFINITION_RELEASE_DRIFT`);
  invariant(revision.catalogId === catalogId, `${caseId}:REVISION_CATALOG_DRIFT`);
  invariant(String(revision.sourceRequestText).trim() === prompt, `${caseId}:SOURCE_REQUEST_TEXT_DRIFT`);
  const rows = await allRows(authorization, revisionId);
  const needs = Array.isArray(revision.preliminaryNeeds) ? revision.preliminaryNeeds as Json[] : [];
  const expectedRowIds = Array.isArray(benchmark.shortCalculatedRowIds)
    ? benchmark.shortCalculatedRowIds.map(String)
    : [];
  const expectedNeeds = expectedNeedProjection(benchmark);
  const expectedNeedIds = expectedNeeds.map((need) => need.rowId);
  const actualRowIds = rows.map((row) => String(row.rowId));
  const actualNeeds = actualNeedProjection(needs);
  const actualNeedIds = actualNeeds.map((need) => need.rowId);
  const expectedCompositionIds = stringSet([...expectedRowIds, ...expectedNeedIds]);
  const actualCompositionIds = stringSet([...actualRowIds, ...actualNeedIds]);
  invariant(actualCompositionIds.every((rowId) => expectedCompositionIds.includes(rowId)),
    `${caseId}:UNEXPECTED_VISIBLE_COMPOSITION_ID:${JSON.stringify(actualCompositionIds)}`);
  invariant(expectedRowIds.every((rowId: string) => actualCompositionIds.includes(rowId)),
    `${caseId}:BACKEND_CALCULATED_ROW_DISAPPEARED`);
  const promotedBackendNeeds = expectedNeedIds.filter((rowId) => actualRowIds.includes(rowId));
  const deferredBackendRows = expectedRowIds.filter((rowId: string) => actualNeedIds.includes(rowId));
  const prunedConditionalBackendNeeds = expectedNeeds.filter((need) =>
    !actualCompositionIds.includes(need.rowId));
  invariant(prunedConditionalBackendNeeds.every((need) =>
    need.needState === "CONDITION_REQUIRED"
      && need.missingParameterIds.some((parameterId: string) =>
        revision.parameters?.[parameterId] != null)),
  `${caseId}:UNJUSTIFIED_BACKEND_COMPOSITION_PRUNING:${JSON.stringify(prunedConditionalBackendNeeds)}`);
  invariant(rows.length + needs.length > 0, `${caseId}:EMPTY_ESTIMATE`);
  invariant(expectedRowIds.length === 0 || rows.length > 0,
    `${caseId}:EXPECTED_CALCULATED_COMPOSITION_DEGRADED_TO_NEEDS_ONLY`);
  invariant(rows.every((row) => Number(row.quantity) > 0), `${caseId}:NON_POSITIVE_CALCULATED_QUANTITY`);
  invariant([...rows, ...needs].every((entry) => {
    const title = String(entry.titleRu ?? "").trim();
    return title.length >= 5 && title !== String(entry.rowId ?? "") && !title.includes("PROJECT:");
  }), `${caseId}:UNPROFESSIONAL_VISIBLE_TITLE`);
  invariant(needs.every((need) => need.quantity == null || (
    Array.isArray(need.calculationTrace?.inputParameterIds)
      && need.calculationTrace.inputParameterIds.length > 0
      && need.calculationTrace.inputParameterIds.every((parameterId: string) =>
        revision.parameters?.[parameterId] != null)
  )), `${caseId}:UNSUPPORTED_PRELIMINARY_QUANTITY`);

  await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(revisionId)}`, {
    waitUntil: "commit",
    timeout: 180_000,
  });
  await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
  await enterConsumer(page, true);
  await ensureEstimatePositionsVisible(page);
  const visibleCompositionCount = rows.length + needs.length;
  await page.waitForFunction((expected) =>
    document.querySelectorAll('[data-testid^="request-estimate-item-anchor-"]').length === expected,
  visibleCompositionCount, { timeout: 120_000 });
  const visibleItemCount = await page.locator('[data-testid^="request-estimate-item-anchor-"]').count();
  const visibleTotalCountText = (await page.getByTestId("request-estimate-items-total-count").innerText()).trim();
  const visiblePageText = await page.locator("body").innerText();
  const parameterStatus = page.getByTestId("request-estimate-parameter-status");
  const parameterStatusText = await parameterStatus.isVisible().catch(() => false)
    ? (await parameterStatus.innerText()).trim()
    : "";
  invariant(visibleItemCount === visibleCompositionCount, `${caseId}:UI_COMPOSITION_COUNT_DRIFT`);
  if (needs.length > 0) {
    invariant(parameterStatusText.length > 0, `${caseId}:UI_REFINEMENT_STATUS_MISSING`);
    invariant(/уточн|нужн/iu.test(visiblePageText), `${caseId}:UI_REFINEMENT_COPY_MISSING`);
  }
  const history = await api(authorization, `revisions?catalogId=${encodeURIComponent(catalogId)}&limit=100`);
  const historyRows = Array.isArray(history.revisions) ? history.revisions as Json[] : [];
  invariant(historyRows.some((entry) => entry.revisionId === revisionId), `${caseId}:HISTORY_REVISION_MISSING`);
  const exposedRouteMarkers = await page.locator('[data-testid^="ROUTE_PROOF_"]').evaluateAll((elements) =>
    elements.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 1 && rect.height > 1 && style.display !== "none" && style.visibility !== "hidden"
        ? [String(element.getAttribute("data-testid") ?? "")]
        : [];
    }));
  invariant(exposedRouteMarkers.length === 0, `${caseId}:VISIBLE_ROUTE_PROOF_MARKERS`);
  const expectedNavigationFailures = requestFailures.filter((failure) =>
    failure.includes("ERR_ABORTED") && (
      failure.includes("/auth/v1/logout")
        || failure === "GET /revisions net::ERR_ABORTED"
    ));
  const unexpectedFailures = requestFailures.filter((failure) => !expectedNavigationFailures.includes(failure));
  invariant(pageErrors.length === 0, `${caseId}:PAGE_ERRORS:${pageErrors.join("|")}`);
  invariant(unexpectedFailures.length === 0,
    `${caseId}:REQUEST_FAILURES:${unexpectedFailures.join("|")}`);

  const screenshot = resolve(OUTPUT_ROOT, "screenshots", `${String(ordinal).padStart(2, "0")}-${mapping.fixtureId}.png`);
  mkdirSync(dirname(screenshot), { recursive: true });
  await page.screenshot({ path: screenshot, fullPage: true });
  const caseReceipt = {
    schemaVersion: "rik-expo-app.r4-a13-6.master30-current-web-case.v1",
    generatedAt: new Date().toISOString(),
    status: "GREEN_CURRENT_CANDIDATE_WEB_BENCHMARK",
    ordinal,
    fixtureId: mapping.fixtureId,
    masterTitleRu: mapping.masterTitleRu,
    prompt,
    promptSha256: sha256(prompt),
    runtime,
    search: {
      searchReleaseId: search.searchIndexReleaseId,
      returnedItemCount: items.length,
      selectedIndex,
      selectedCatalogId: catalogId,
      selectedEstimateReady: selected.estimateReady,
      selectedTitleRu: selected.titleRu,
      selectedWorkText,
    },
    compile: { jobId, revisionId },
    estimate: {
      revisionNumber: revision.revisionNumber,
      releaseId: revision.releaseId,
      catalogId: revision.catalogId,
      sourceRequestText: revision.sourceRequestText,
      primaryMeasureParameterId: revision.primaryMeasureParameterId,
      calculatedRowCount: rows.length,
      preliminaryNeedCount: needs.length,
      visibleCompositionCount,
      calculatedRows: rows.map((row) => ({
        rowId: row.rowId,
        titleRu: row.titleRu,
        category: row.category,
        unitId: row.unitId,
        quantity: row.quantity,
        calculationTrace: row.calculationTrace,
      })),
      preliminaryNeeds: needs.map((need) => ({
        rowId: need.rowId,
        titleRu: need.titleRu,
        category: need.category,
        unitId: need.unitId,
        quantity: need.quantity,
        needState: need.needState,
        missingParameterIds: need.missingParameterIds,
        calculationTrace: need.calculationTrace,
      })),
      backendCompositionContractMatch: true,
      promotedBackendNeedIds: promotedBackendNeeds,
      deferredBackendRowIds: deferredBackendRows,
      prunedConditionalBackendNeedIds: prunedConditionalBackendNeeds.map((need) => need.rowId),
    },
    ui: {
      visibleItemCount,
      visibleTotalCountText,
      parameterStatusText,
      historyContainsRevision: true,
      exposedRouteMarkers,
      screenshot: screenshot.replaceAll("\\", "/"),
    },
    diagnostics: {
      backendRequests,
      consoleErrors,
      pageErrors,
      unexpectedRequestFailures: unexpectedFailures,
    },
    productionAccessed: false,
    deployPerformed: false,
    releaseActivated: false,
    otaPerformed: false,
  };
  const casePath = resolve(OUTPUT_ROOT, "cases", `${String(ordinal).padStart(2, "0")}-${mapping.fixtureId}.json`);
  atomicJson(casePath, caseReceipt);
  const caseSha256 = sha256(readFileSync(casePath));
  state.cases[caseId] = {
    ...state.cases[caseId],
    phase: "GREEN",
    casePath: casePath.replaceAll("\\", "/"),
    caseSha256,
  };
  atomicJson(STATE_PATH, state);
  process.stdout.write(`${JSON.stringify({
    ordinal,
    caseId,
    stage: "GREEN",
    revisionId,
    calculatedRows: rows.length,
    preliminaryNeeds: needs.length,
    selectedIndex,
  })}\n`);
  return { casePath, caseSha256, receipt: caseReceipt };
}

async function main(): Promise<void> {
  const runtimeReceipt = readJson(BACKEND_RUNTIME_RECEIPT_PATH);
  const metroReceipt = readJson(METRO_RUNTIME_RECEIPT_PATH);
  const sourceTree = String(runtimeReceipt.compatibility_tuple?.sourceTree ?? "");
  invariant(runtimeReceipt.status === "GREEN_R568_LOCAL_DEVELOPER_CANONICAL_BACKEND_EXACT",
    "BACKEND_RUNTIME_RECEIPT_RED");
  invariant(runtimeReceipt.compatibility_tuple?.definitionReleaseId === RELEASE_ID,
    "BACKEND_DEFINITION_RELEASE_DRIFT");
  invariant(runtimeReceipt.compatibility_tuple?.searchReleaseId === SEARCH_RELEASE_ID,
    "BACKEND_SEARCH_RELEASE_DRIFT");
  invariant(metroReceipt.definition_release_id === RELEASE_ID, "METRO_DEFINITION_RELEASE_DRIFT");
  invariant(metroReceipt.search_release_id === SEARCH_RELEASE_ID, "METRO_SEARCH_RELEASE_DRIFT");
  invariant(sourceTree.length === 64 && metroReceipt.source_tree_hash === sourceTree,
    "BACKEND_METRO_SOURCE_TREE_DRIFT");
  const runtime = {
    origin: ORIGIN,
    backend: BACKEND,
    definitionReleaseId: RELEASE_ID,
    searchReleaseId: SEARCH_RELEASE_ID,
    sourceTree,
    productSourceHash: runtimeReceipt.compatibility_tuple.frontendProductSourceHash,
    jsBundleFingerprint: runtimeReceipt.compatibility_tuple.frontendJsBundleFingerprint,
    backendRuntimeSourceSha256: runtimeReceipt.compatibility_tuple.backendRuntimeSourceSha256,
    buildCommit: runtimeReceipt.compatibility_tuple.sourceHead,
    backendPid: runtimeReceipt.backend_pid,
    metroPid: metroReceipt.pid,
    capabilityId: runtimeReceipt.compatibility_tuple.capabilityId,
  };

  const mapBytes = readFileSync(EVIDENCE_MAP_PATH);
  const evidenceMap = JSON.parse(mapBytes.toString("utf8")) as Json;
  const backendBytes = readFileSync(BACKEND_EVIDENCE_PATH);
  const backendEvidence = JSON.parse(backendBytes.toString("utf8")) as Json;
  const w12Bytes = readFileSync(W12_WEB_EVIDENCE_PATH);
  const w12Evidence = JSON.parse(w12Bytes.toString("utf8")) as Json;
  const mappings = Array.isArray(evidenceMap.mappedBenchmarks)
    ? evidenceMap.mappedBenchmarks as Json[]
    : [];
  const benchmarks = Array.isArray(backendEvidence.benchmarks)
    ? backendEvidence.benchmarks as Json[]
    : [];
  invariant(mappings.length === 30 && benchmarks.length === 30, "DENOMINATOR_RED");
  invariant(backendEvidence.counts?.backendContentAccepted === 30,
    "BACKEND_ACCEPTANCE_DENOMINATOR_RED");
  invariant(backendEvidence.candidate?.definitionReleaseId === RELEASE_ID,
    "BACKEND_EVIDENCE_RELEASE_DRIFT");
  invariant(w12Evidence.status === "GREEN_R4_A13_4_PLATFORM_CORE_GLOBAL_WORKFLOW_WEB"
    && w12Evidence.runtime?.definitionReleaseId === RELEASE_ID
    && w12Evidence.runtime?.searchReleaseId === SEARCH_RELEASE_ID,
  "W12_SHARED_LIFECYCLE_EVIDENCE_RED");
  const backendByOrdinal = new Map(benchmarks.map((benchmark) => [Number(benchmark.ordinal), benchmark]));

  let state: Json;
  try {
    state = readJson(STATE_PATH);
    invariant(state.definitionReleaseId === RELEASE_ID
      && state.searchReleaseId === SEARCH_RELEASE_ID
      && state.sourceTree === sourceTree,
    "EXISTING_RUN_STATE_DEPENDENCY_DRIFT");
    state.cases ??= {};
  } catch (error) {
    if ((error as Error).message.includes("EXISTING_RUN_STATE_DEPENDENCY_DRIFT")) throw error;
    state = {
      schemaVersion: "rik-expo-app.r4-a13-6.master30-current-web-run-state.v1",
      startedAt: new Date().toISOString(),
      definitionReleaseId: RELEASE_ID,
      searchReleaseId: SEARCH_RELEASE_ID,
      sourceTree,
      cases: {},
    };
    atomicJson(STATE_PATH, state);
  }

  const results: Json[] = [];
  const browser = await chromium.launch({ headless: true });
  try {
    for (const mapping of mappings) {
      const ordinal = Number(mapping.ordinal);
      const caseId = `MASTER_${String(ordinal).padStart(2, "0")}_${String(mapping.fixtureId)}`;
      const completed = state.cases?.[caseId] as Json | undefined;
      if (completed?.phase === "GREEN") {
        const casePath = resolve(String(completed.casePath));
        const bytes = readFileSync(casePath);
        invariant(sha256(bytes) === completed.caseSha256, `${caseId}:SAVED_CASE_HASH_DRIFT`);
        const receipt = JSON.parse(bytes.toString("utf8")) as Json;
        invariant(receipt.status === "GREEN_CURRENT_CANDIDATE_WEB_BENCHMARK"
          && receipt.runtime?.sourceTree === sourceTree
          && receipt.runtime?.definitionReleaseId === RELEASE_ID,
        `${caseId}:SAVED_CASE_DEPENDENCY_DRIFT`);
        results.push({ casePath, caseSha256: completed.caseSha256, receipt });
        process.stdout.write(`${JSON.stringify({ ordinal, caseId, stage: "REUSED_GREEN" })}\n`);
        continue;
      }
      const context = await browser.newContext();
      try {
        const benchmark = backendByOrdinal.get(ordinal);
        invariant(benchmark, `${caseId}:BACKEND_BENCHMARK_MISSING`);
        results.push(await runCase({
          page: await context.newPage(),
          mapping,
          benchmark,
          runtime,
          state,
        }));
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  invariant(results.length === 30, "RESULT_DENOMINATOR_RED");
  const bundleResponse = await fetch(`${ORIGIN}${BUNDLE_PATH}`, { signal: AbortSignal.timeout(180_000) });
  invariant(bundleResponse.ok, `METRO_BUNDLE_HTTP_${bundleResponse.status}`);
  const bundle = Buffer.from(await bundleResponse.arrayBuffer());
  const summaryCases = results.map((result) => ({
    ordinal: result.receipt.ordinal,
    fixtureId: result.receipt.fixtureId,
    catalogId: result.receipt.estimate.catalogId,
    revisionId: result.receipt.compile.revisionId,
    selectedIndex: result.receipt.search.selectedIndex,
    calculatedRowCount: result.receipt.estimate.calculatedRowCount,
    preliminaryNeedCount: result.receipt.estimate.preliminaryNeedCount,
    visibleCompositionCount: result.receipt.estimate.visibleCompositionCount,
    backendCompositionContractMatch: result.receipt.estimate.backendCompositionContractMatch,
    historyContainsRevision: result.receipt.ui.historyContainsRevision,
    casePath: result.casePath.replaceAll("\\", "/"),
    caseSha256: result.caseSha256,
  }));
  const receipt = {
    schemaVersion: "rik-expo-app.r4-a13-6.master30-current-web-acceptance.v1",
    generatedAt: new Date().toISOString(),
    status: "GREEN_CURRENT_CANDIDATE_WEB_MASTER_30_OF_30",
    runtime: {
      ...runtime,
      bundleBytes: bundle.length,
      actualServedBundleSha256: sha256(bundle),
      receiptsAgree: true,
    },
    dependencies: {
      evidenceMapPath: EVIDENCE_MAP_PATH.replaceAll("\\", "/"),
      evidenceMapSha256: sha256(mapBytes),
      backendEvidencePath: BACKEND_EVIDENCE_PATH.replaceAll("\\", "/"),
      backendEvidenceSha256: sha256(backendBytes),
      w12WebEvidencePath: W12_WEB_EVIDENCE_PATH.replaceAll("\\", "/"),
      w12WebEvidenceSha256: sha256(w12Bytes),
    },
    boundary: [
      "Each of the thirty MASTER historical natural-language prompts was entered through the ordinary Web request UI, the exact current catalog successor was selected from the visible search suggestions, and the first estimate was created through the UI prepare action.",
      "Each saved revision is bound to the prepared current candidate and its calculated-row and row-local preliminary-need identities exactly match the separately accepted backend evidence.",
      "This all-thirty wave proves current Web input/search/select/prepare/history and visible preliminary composition. Voluntary refinement, pricing, PDF, procurement, confirmation and history reopen are proved on the same current candidate by the separately hash-bound W12 full lifecycle receipt.",
    ],
    counts: {
      masterBenchmarkDenominator: 30,
      searchFound: summaryCases.length,
      estimateReady: summaryCases.length,
      uiPrepared: summaryCases.length,
      backendCompositionContractMatched: summaryCases.filter(
        (entry) => entry.backendCompositionContractMatch,
      ).length,
      historyPersisted: summaryCases.filter((entry) => entry.historyContainsRevision).length,
      webAccepted: summaryCases.length,
    },
    cases: summaryCases,
    productionAccessed: false,
    deployPerformed: false,
    releaseActivated: false,
    mergePerformed: false,
    otaPerformed: false,
    secretsCaptured: false,
  };
  atomicJson(OUTPUT, { ...receipt, receiptSha256: sha256(JSON.stringify(receipt)) });
  state.completedAt = new Date().toISOString();
  state.status = receipt.status;
  state.output = OUTPUT.replaceAll("\\", "/");
  state.outputSha256 = sha256(readFileSync(OUTPUT));
  atomicJson(STATE_PATH, state);
  process.stdout.write(`${JSON.stringify({
    status: receipt.status,
    counts: receipt.counts,
    runtime: receipt.runtime,
    output: OUTPUT,
    outputSha256: state.outputSha256,
  })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
