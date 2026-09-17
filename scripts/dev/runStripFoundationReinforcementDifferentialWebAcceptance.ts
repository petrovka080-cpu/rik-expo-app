import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, statfsSync, writeFileSync } from "node:fs";
import { freemem } from "node:os";
import { dirname, resolve } from "node:path";

import { chromium, type Page, type Response } from "playwright";

import {
  stripFoundationReinforcementPromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/stripFoundationReinforcementProductionBindingR1";
import {
  STRIP_FOUNDATION_REINFORCEMENT_TARGETS,
  stripFoundationReinforcementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/stripFoundationReinforcementR1";
import {
  anchorGroupInstallationPromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/anchorGroupInstallationProductionBindingR1";
import {
  ANCHOR_GROUP_INSTALLATION_TARGETS,
  ANCHOR_GROUP_PROJECT_SCHEDULE_NORM_ID,
  ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID,
  anchorGroupInstallationAcceptanceInputR1,
} from "../../src/lib/estimate/v4/anchorGroupInstallationR1";

type Json = Record<string, any>;

const IS_ANCHOR = process.env.R4A13_ACCEPTANCE_FAMILY === "anchor-group";
const CONTRACT = IS_ANCHOR
  ? "rik-expo-app.r4-a13-6.anchor-group-installation.differential-web.v1"
  : "rik-expo-app.r4-a13-6.strip-foundation-reinforcement.differential-web.v1";
const GLOBAL_STATUS = "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY";
const ORIGIN = "http://127.0.0.1:8081";
const BACKEND = "http://127.0.0.1:8765";
const PROVIDER = "http://127.0.0.1:54321";
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const OUTPUT_ROOT = resolve(
  IS_ANCHOR
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-installation-family-web"
    : ".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-reinforcement-family-e5-differential-web",
);
const OUTPUT = resolve(OUTPUT_ROOT, "acceptance.json");
const RELEASE_ID = IS_ANCHOR
  ? "80c3ba4b-3d04-5947-b17d-5fb05bcf2bae"
  : "831a5ba4-af0f-561c-8766-09a960cf2c74";
const SEARCH_RELEASE_ID = IS_ANCHOR
  ? "132eb3c0-0a52-5257-8420-cf2f8de425b9"
  : "2a89ec21-c69a-50f2-9c84-9810a9c276e1";
const API_RECEIPT = resolve(
  IS_ANCHOR
    ? ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-installation-family-api/acceptance.json"
    : ".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-reinforcement-family-e5-api/acceptance.json",
);
const TARGET_CONTEXTS = ["standard", "high_load"] as const;
const TARGETS = IS_ANCHOR
  ? ANCHOR_GROUP_INSTALLATION_TARGETS
  : STRIP_FOUNDATION_REINFORCEMENT_TARGETS;
const PRIMARY_PARAMETER_ID = IS_ANCHOR
  ? "anchor_bolt_quantity_piece"
  : "approved_reinforcement_schedule_weight_kg";
const PRIMARY_ROW_ID = IS_ANCHOR
  ? "material:anchor-group:anchor-bolts"
  : "material:reinforcement:steel-approved-schedule";
const DELIVERY_ROW_ID = IS_ANCHOR
  ? "delivery:anchor-group:supply"
  : "delivery:reinforcement:steel";
const SOURCE_ID = IS_ANCHOR
  ? ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID
  : "src_professional_norm_pack_reinforcement_project_bar_schedule_weight_same_unit_routing_v1";
const NORM_ID = IS_ANCHOR
  ? ANCHOR_GROUP_PROJECT_SCHEDULE_NORM_ID
  : "reinforcement_project_bar_schedule_weight_same_unit_routing_v1";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`${IS_ANCHOR ? "ANCHOR_GROUP_WEB" : "STRIP_REINFORCEMENT_DIFFERENTIAL_WEB"}:${code}`);
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

function resources(): Json {
  const disk = statfsSync(resolve("."));
  return {
    capturedAt: new Date().toISOString(),
    availableMemoryBytes: freemem(),
    availableDiskBytes: Number(disk.bavail) * Number(disk.bsize),
  };
}

function progress(stage: string, details: Json = {}): void {
  process.stdout.write(`${JSON.stringify({
    progress: IS_ANCHOR ? "ANCHOR_GROUP_WEB" : "STRIP_REINFORCEMENT_DIFFERENTIAL_WEB",
    stage,
    ...details,
  })}\n`);
}

async function json(response: Response): Promise<Json> {
  return response.json().catch(() => ({})) as Promise<Json>;
}

async function loginLocalDeveloperOwner(): Promise<string> {
  const credentials = JSON.parse(readFileSync(CREDENTIALS, "utf8")) as Json;
  invariant(credentials.provider_url === PROVIDER, "PROVIDER_IDENTITY_RED");
  const owner = credentials.owner as Json | undefined;
  invariant(owner?.role === "platform_developer"
    && owner.email && owner.password && credentials.publishable_key,
  "LOCAL_DEVELOPER_OWNER_CREDENTIALS_MISSING");
  const response = await fetch(`${PROVIDER}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: owner.email, password: owner.password }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null) as Json | null;
  invariant(response.ok && body?.access_token && body.user?.id === owner.user_id,
    `LOCAL_DEVELOPER_OWNER_LOGIN_HTTP_${response.status}`);
  return `Bearer ${body.access_token}`;
}

async function api(
  authorization: string,
  path: string,
  init?: RequestInit,
): Promise<Json> {
  const response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok, `API_${response.status}:${path}:${JSON.stringify(body).slice(0, 1_000)}`);
  return body;
}

async function waitForJob(authorization: string, jobId: string): Promise<Json> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const response = await fetch(`${BACKEND}/jobs/${jobId}`, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(120_000),
    });
    const job = await response.json().catch(() => ({})) as Json;
    if (response.status === 404) {
      await new Promise((accept) => setTimeout(accept, 100));
      continue;
    }
    invariant(response.ok, `JOB_HTTP_${response.status}:${jobId}`);
    if (["succeeded", "failed", "cancelled"].includes(String(job.status))) return job;
    await new Promise((accept) => setTimeout(accept, 100));
  }
  throw new Error(`STRIP_REINFORCEMENT_DIFFERENTIAL_WEB:JOB_TIMEOUT:${jobId}`);
}

async function waitForSuccessfulRevision(authorization: string, accepted: Json): Promise<Json> {
  const job = await waitForJob(authorization, String(accepted.jobId ?? ""));
  invariant(job.status === "succeeded" && job.resultRevisionId,
    `JOB_${job.status}:${job.errorCode ?? "UNKNOWN"}`);
  return api(authorization, `revisions/${job.resultRevisionId}`);
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
    if (await input.isVisible().catch(() => false)) return;
    const login = page.getByTestId("auth.login.local-consumer")
      .or(page.getByTestId("protected-identity-local-consumer-login")).first();
    if (await login.isVisible().catch(() => false) && await login.isEnabled().catch(() => false)) {
      await login.click({ timeout: 2_000 }).catch(() => undefined);
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`STRIP_REINFORCEMENT_DIFFERENTIAL_WEB:CONSUMER_ROUTE_NOT_READY:${page.url()}`);
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
  await page.getByTestId("estimate-revision-timeline").waitFor({ state: "visible", timeout: 60_000 });
  await expandPositions(page);
}

async function assertVisibleRows(page: Page, rows: Json[], code: string): Promise<Json> {
  await expandPositions(page);
  const expected = rows.filter((row) => row.includedInEstimate === true);
  for (const row of expected) {
    await page.locator('[data-testid^="consumer-repair-item-title-"]')
      .filter({ hasText: String(row.titleRu) })
      .waitFor({ state: "visible", timeout: 60_000 });
  }
  const visibleTitles = await page.locator('[data-testid^="consumer-repair-item-title-"]')
    .allInnerTexts();
  invariant(visibleTitles.length === expected.length,
    `${code}:VISIBLE_ROW_DENOMINATOR:${visibleTitles.length}:${expected.length}`);
  const totalLabel = await page.getByTestId("request-estimate-items-total-count").innerText();
  invariant(totalLabel.includes(String(expected.length)), `${code}:TOTAL_LABEL:${totalLabel}`);
  return { visibleTitles, totalLabel, bodyTextSha256: sha256(await page.locator("body").innerText()) };
}

async function editPrimaryMeasure(
  page: Page,
  authorization: string,
  value: number,
): Promise<Json> {
  const chip = page.getByTestId(`editable-param-chip-${PRIMARY_PARAMETER_ID}`);
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

function assertRevisionRows(
  contextKey: string,
  revision: Json,
  rows: Json[],
  fixture: Json,
): Json {
  const parameterMismatches = Object.entries(fixture)
    .filter(([parameterId, value]) => typeof value === "number"
      ? Number(revision.parameters?.[parameterId]) !== value
      : revision.parameters?.[parameterId] !== value)
    .map(([parameterId]) => parameterId);
  invariant(parameterMismatches.length === 0,
    `PARAMETER_DRIFT:${contextKey}:${parameterMismatches.join(",")}`);
  const expectedRowCount = IS_ANCHOR
    ? (contextKey === "high_load" ? 21 : 16)
    : (contextKey === "high_load" ? 16 : 9);
  const expectedProcurementCount = IS_ANCHOR
    ? (contextKey === "high_load" ? 16 : 11)
    : (contextKey === "high_load" ? 10 : 6);
  invariant(rows.length === expectedRowCount && Number(revision.rowCount) === expectedRowCount,
    `ROW_COUNT:${contextKey}:${rows.length}`);
  invariant(rows.every((row) => row.includedInEstimate === true
      && row.unitPrice == null && row.amount == null)
    && rows.filter((row) => row.includedInProcurement === true).length === expectedProcurementCount
    && Number(revision.totals?.includedRowCount) === expectedRowCount
    && Number(revision.totals?.unpricedRowCount) === expectedRowCount,
  `ROW_SCOPE_OR_PRICE:${contextKey}`);
  const primary = rows.find((row) => row.rowId === PRIMARY_ROW_ID);
  const delivery = rows.find((row) => row.rowId === DELIVERY_ROW_ID);
  invariant(primary && delivery, `REFERENCE_ROWS_MISSING:${contextKey}`);
  const expectedPrimary = Number(fixture[PRIMARY_PARAMETER_ID]);
  const expectedDelivery = IS_ANCHOR
    ? Number(fixture.anchor_group_delivered_mass_kg) / 1_000
      * Number(fixture.delivery_distance_km)
    : expectedPrimary / 1_000 * Number(fixture.reinforcement_delivery_distance_km);
  invariant(Number(primary.quantity) === expectedPrimary
    && Math.abs(Number(delivery.quantity) - expectedDelivery) < 1e-8,
  `PROJECT_SCHEDULE_QUANTITY:${contextKey}`);
  const traces = Array.isArray(primary.normativeTrace) ? primary.normativeTrace as Json[] : [];
  invariant(traces.some((trace) => (trace.sourceId ?? trace.source_id) === SOURCE_ID
      && (trace.normId ?? trace.norm_id) === NORM_ID)
    && !traces.some((trace) => String(trace.sourceId ?? trace.source_id).includes("kg_m3")),
  `NORMATIVE_SOURCE_TRUTH:${contextKey}`);
  return {
    rowCount: rows.length,
    includedRowCount: rows.filter((row) => row.includedInEstimate === true).length,
    procurementRowCount: rows.filter((row) => row.includedInProcurement === true).length,
    primaryQuantity: Number(primary.quantity),
    deliveryTKm: Number(delivery.quantity),
    unknownPriceRows: rows.filter((row) => row.unitPrice == null && row.amount == null).length,
  };
}

async function buildArtifact(
  authorization: string,
  revision: Json,
  rows: Json[],
  kind: "pdf" | "procurement",
): Promise<Json> {
  const documentProfile = kind === "pdf" ? "professional_v1" : null;
  const accepted = await api(authorization, `revisions/${revision.revisionId}/artifacts/${kind}`, {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: `${CONTRACT}:${kind}:${revision.revisionId}`,
      ...(documentProfile ? { documentProfile } : {}),
    }),
  });
  if (accepted.jobId) {
    const job = await waitForJob(authorization, String(accepted.jobId));
    invariant(job.status === "succeeded", `ARTIFACT_${kind}_JOB_${job.status}`);
  } else {
    invariant(accepted.created === false && accepted.artifactId,
      `ARTIFACT_${kind}_IDEMPOTENT_REPLAY_RED`);
  }
  const suffix = documentProfile ? `?documentProfile=${documentProfile}` : "";
  const artifact = await api(authorization,
    `revisions/${revision.revisionId}/artifacts/${kind}${suffix}`);
  invariant(artifact.status === "ready" && artifact.revisionId === revision.revisionId
    && artifact.releaseId === RELEASE_ID && artifact.signedUrl
    && Number(artifact.byteSize) > 0 && /^[0-9a-f]{64}$/u.test(artifact.sha256),
  `ARTIFACT_${kind}_IDENTITY_RED`);
  const response = await fetch(artifact.signedUrl, { signal: AbortSignal.timeout(120_000) });
  const bytes = Buffer.from(await response.arrayBuffer());
  invariant(response.ok && bytes.byteLength === Number(artifact.byteSize)
    && sha256(bytes) === artifact.sha256,
  `ARTIFACT_${kind}_DOWNLOAD_PARITY_RED`);
  if (kind === "pdf") {
    invariant(bytes.subarray(0, 4).toString("ascii") === "%PDF"
      && Number(artifact.metadata?.sourceRowCount) === rows.length
      && Number(artifact.metadata?.projectedRowCount) === rows.length
      && artifact.metadata?.grandTotalStatus === "PARTIAL_NEEDS_PRICE",
    "PDF_SEMANTIC_TRUTH_RED");
    return { ...artifact, downloadedByteSize: bytes.length, downloadedSha256: sha256(bytes) };
  }
  const projection = JSON.parse(bytes.toString("utf8")) as Json;
  const projectionRows = Array.isArray(projection.rows) ? projection.rows as Json[] : [];
  const expectedRows = rows.filter((row) => row.includedInProcurement === true);
  const expectedIds = expectedRows.map((row) => row.rowId).sort();
  const projectedIds = projectionRows.map((row) => row.rowId).sort();
  invariant(Number(artifact.metadata?.sourceRowCount) === rows.length
    && Number(artifact.metadata?.selectedProcurementRowCount) === expectedRows.length
    && Number(artifact.metadata?.projectedRowCount) === expectedRows.length
    && projection.revisionId === revision.revisionId
    && projection.releaseId === RELEASE_ID
    && JSON.stringify(projectedIds) === JSON.stringify(expectedIds)
    && projectionRows.every((row) => row.unitPrice == null && row.amount == null),
  "PROCUREMENT_SEMANTIC_TRUTH_RED");
  return { ...artifact, downloadedByteSize: bytes.length, downloadedSha256: sha256(bytes), projection };
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const before = resources();
  invariant(before.availableMemoryBytes >= 2 * 1024 ** 3, "AVAILABLE_MEMORY_BELOW_2_GIB");
  const apiReceiptBytes = readFileSync(API_RECEIPT);
  const apiReceipt = JSON.parse(apiReceiptBytes.toString("utf8")) as Json;
  invariant(apiReceipt.status === (IS_ANCHOR
    ? "GREEN_ANCHOR_GROUP_INSTALLATION_6_OF_6_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
    : "GREEN_STRIP_FOUNDATION_REINFORCEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE")
    && apiReceipt.denominator?.acceptedTargetCount === (IS_ANCHOR ? 6 : 7),
  "API_FAMILY_RECEIPT_RED");
  const definitionIds = new Map<string, string>((apiReceipt.targetResults as Json[])
    .map((result) => [String(result.contextKey), String(result.definitionVersionId)]));
  const authorization = await loginLocalDeveloperOwner();
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
      const target = TARGETS.find(
        (candidate) => candidate.contextKey === contextKey,
      );
      invariant(target, `TARGET_MISSING:${contextKey}`);
      const definitionVersionId = definitionIds.get(contextKey);
      invariant(definitionVersionId, `DEFINITION_ID_MISSING:${contextKey}`);
      const fixture = (IS_ANCHOR
        ? { ...anchorGroupInstallationAcceptanceInputR1(contextKey) }
        : { ...stripFoundationReinforcementAcceptanceInputR1(contextKey) }) as Json;
      const promptDetails = IS_ANCHOR
        ? anchorGroupInstallationPromptDetailsR1(fixture)
        : stripFoundationReinforcementPromptDetailsR1(fixture);
      invariant(promptDetails.length === (IS_ANCHOR ? 39 : 37),
        `PROMPT_PARAMETER_COUNT:${contextKey}`);
      const prompt = [target.titleRu, ...promptDetails].join("\n");
      const historyBefore = await api(authorization,
        `revisions?catalogId=${encodeURIComponent(target.catalogId)}&limit=100`);
      const beforeIds = (historyBefore.revisions as Json[]).map((revision) => revision.revisionId);
      const route = `${ORIGIN}/request?context=${encodeURIComponent(
        `acceptance:strip-reinforcement-differential-web:${contextKey}:${Date.now()}`,
      )}`;
      const page = await context.newPage();
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(`${contextKey}:${message.text().slice(0, 1_000)}`);
      });
      page.on("pageerror", (error) => pageErrors.push(`${contextKey}:${error.message}`));
      page.on("requestfailed", (request) => requestFailures.push(
        `${contextKey}:${request.method()} ${new URL(request.url()).pathname} ${request.failure()?.errorText ?? ""}`,
      ));

      await page.goto(route, { waitUntil: "commit", timeout: 180_000 });
      await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
      await enterConsumer(page, route);
      const input = page.getByTestId("consumer-repair-problem-input");
      await input.waitFor({ state: "visible", timeout: 60_000 });
      const searchPromise = page.waitForResponse((response) =>
        response.url().includes("/search/catalog") && response.request().method() === "GET",
      { timeout: 120_000 });
      await input.fill("");
      await input.fill(target.titleRu);
      const searchResponse = await searchPromise;
      const searchBody = await json(searchResponse);
      invariant(searchResponse.ok() && searchBody.searchIndexReleaseId === SEARCH_RELEASE_ID,
        `SEARCH_HTTP_OR_RELEASE:${contextKey}:${searchResponse.status()}`);
      const searchItems = Array.isArray(searchBody.items) ? searchBody.items as Json[] : [];
      const selectedIndex = searchItems.findIndex((item) => item.catalogId === target.catalogId);
      invariant(selectedIndex >= 0, `SEARCH_EXACT_TARGET_MISSING:${contextKey}`);
      const suggestion = page.getByTestId(`consumer-repair-work-suggestion-${selectedIndex + 1}`);
      await suggestion.waitFor({ state: "visible", timeout: 120_000 });
      const selectedWorkText = (await suggestion.innerText()).trim();
      await suggestion.click();
      const selectedPrefix = await input.inputValue();
      invariant(selectedPrefix.includes(target.titleRu), `SEARCH_SELECTION_PREFIX:${contextKey}`);
      await input.fill(`${selectedPrefix}\n${promptDetails.join("\n")}`);
      const prepareButton = page.getByTestId("consumer-repair-prepare-draft");
      await prepareButton.waitFor({ state: "visible", timeout: 60_000 });
      invariant(await prepareButton.isEnabled(), `PREPARE_DISABLED:${contextKey}`);
      const compilePromise = page.waitForResponse((response) =>
        response.url().endsWith("/jobs/compile") && response.request().method() === "POST",
      { timeout: 180_000 });
      const [compileResponse] = await Promise.all([compilePromise, prepareButton.click()]);
      const accepted = await json(compileResponse);
      invariant(compileResponse.status() === 202,
        `COMPILE_HTTP_${contextKey}_${compileResponse.status()}:${JSON.stringify(accepted).slice(0, 1_000)}`);
      const createdRevision = await waitForSuccessfulRevision(authorization, accepted);
      invariant(createdRevision.catalogId === target.catalogId
        && createdRevision.definitionVersionId === definitionVersionId
        && createdRevision.releaseId === RELEASE_ID,
      `CREATE_IDENTITY:${contextKey}`);
      const createdRows = await allRows(authorization, createdRevision.revisionId);
      const createdTruth = assertRevisionRows(contextKey, createdRevision, createdRows, fixture);
      await openRevision(page, createdRevision.revisionId);
      const createdVisible = await assertVisibleRows(page, createdRows, `CREATE:${contextKey}`);
      const createScreenshot = resolve(OUTPUT_ROOT, `01_${contextKey}_created.png`);
      await page.screenshot({ path: createScreenshot, fullPage: true });

      const originalPrimary = Number(fixture[PRIMARY_PARAMETER_ID]);
      const editedPrimary = originalPrimary + (IS_ANCHOR ? 4 : 100);
      const editedRevision = await editPrimaryMeasure(page, authorization, editedPrimary);
      invariant(editedRevision.parentRevisionId === createdRevision.revisionId
        && editedRevision.catalogId === target.catalogId,
      `EDIT_LINEAGE:${contextKey}`);
      const editedRows = await allRows(authorization, editedRevision.revisionId);
      const editedFixture = { ...fixture, [PRIMARY_PARAMETER_ID]: editedPrimary };
      const editedTruth = assertRevisionRows(contextKey, editedRevision, editedRows, editedFixture);
      const createdById = new Map(createdRows.map((row) => [row.rowId, Number(row.quantity)]));
      const changedRowIds = editedRows
        .filter((row) => Number(row.quantity) !== createdById.get(row.rowId))
        .map((row) => row.rowId).sort();
      const expectedChangedRowIds = IS_ANCHOR
        ? [PRIMARY_ROW_ID]
        : [DELIVERY_ROW_ID, PRIMARY_ROW_ID].sort();
      invariant(JSON.stringify(changedRowIds) === JSON.stringify(expectedChangedRowIds),
        `EDIT_SCOPE:${contextKey}:${changedRowIds.join(",")}`);
      await openRevision(page, editedRevision.revisionId);
      const editedVisible = await assertVisibleRows(page, editedRows, `EDIT:${contextKey}`);
      const editScreenshot = resolve(OUTPUT_ROOT, `02_${contextKey}_edited.png`);
      await page.screenshot({ path: editScreenshot, fullPage: true });

      const [pdf, procurement] = await Promise.all([
        buildArtifact(authorization, editedRevision, editedRows, "pdf"),
        buildArtifact(authorization, editedRevision, editedRows, "procurement"),
      ]);

      const coldPage = await context.newPage();
      const coldUrl = `${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(editedRevision.revisionId)}`;
      await coldPage.goto(coldUrl, { waitUntil: "commit", timeout: 180_000 });
      await coldPage.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
      await enterConsumer(coldPage, coldUrl);
      await coldPage.getByTestId("request-estimate-items-total-count").waitFor({
        state: "visible",
        timeout: 90_000,
      });
      await coldPage.getByTestId("estimate-revision-timeline")
        .waitFor({ state: "visible", timeout: 60_000 });
      const coldVisible = await assertVisibleRows(coldPage, editedRows, `COLD:${contextKey}`);
      await coldPage.locator(`[data-testid*="revision-${editedRevision.revisionId}"]`)
        .waitFor({ state: "visible", timeout: 60_000 });
      const coldScreenshot = resolve(OUTPUT_ROOT, `03_${contextKey}_cold.png`);
      await coldPage.screenshot({ path: coldScreenshot, fullPage: true });
      await coldPage.close();

      const historyAfter = await api(authorization,
        `revisions?catalogId=${encodeURIComponent(target.catalogId)}&limit=100`);
      const afterIds = (historyAfter.revisions as Json[]).map((revision) => revision.revisionId);
      invariant(afterIds.length === beforeIds.length + 2
        && afterIds.includes(createdRevision.revisionId)
        && afterIds.includes(editedRevision.revisionId)
        && afterIds.indexOf(editedRevision.revisionId) < afterIds.indexOf(createdRevision.revisionId),
      `HISTORY:${contextKey}:${beforeIds.length}:${afterIds.length}`);

      results.push({
        contextKey,
        catalogId: target.catalogId,
        definitionVersionId,
        branch: contextKey === "high_load"
          ? "SITE_FABRICATED_COUPLERS_LIFTING_FULL"
          : "READY_CAGES_NO_COUPLERS_NO_LIFTING_MINIMAL",
        promptParameterCount: promptDetails.length,
        promptSha256: sha256(prompt),
        search: { selectedIndex, selectedWorkText, searchReleaseId: searchBody.searchIndexReleaseId },
        create: {
          jobId: accepted.jobId,
          revisionId: createdRevision.revisionId,
          revisionNumber: createdRevision.revisionNumber,
          ...createdTruth,
          visibleRowCount: createdVisible.visibleTitles.length,
          screenshot: { path: createScreenshot, sha256: sha256(readFileSync(createScreenshot)) },
        },
        edit: {
          parentRevisionId: createdRevision.revisionId,
          revisionId: editedRevision.revisionId,
          revisionNumber: editedRevision.revisionNumber,
          originalPrimaryQuantity: originalPrimary,
          editedPrimaryQuantity: editedPrimary,
          changedRowIds,
          singleBatchApply: true,
          ...editedTruth,
          visibleRowCount: editedVisible.visibleTitles.length,
          screenshot: { path: editScreenshot, sha256: sha256(readFileSync(editScreenshot)) },
        },
        artifacts: {
          pdf: {
            artifactId: pdf.artifactId,
            revisionId: pdf.revisionId,
            byteSize: pdf.byteSize,
            sha256: pdf.sha256,
            pageCount: pdf.metadata?.pageCount,
            grandTotalStatus: pdf.metadata?.grandTotalStatus,
            downloadParity: true,
          },
          procurement: {
            artifactId: procurement.artifactId,
            revisionId: procurement.revisionId,
            byteSize: procurement.byteSize,
            sha256: procurement.sha256,
            selectedProcurementRowCount: procurement.metadata?.selectedProcurementRowCount,
            downloadParity: true,
          },
        },
        history: { before: beforeIds.length, after: afterIds.length, delta: 2, immutableParentLineage: true },
        coldOpen: {
          revisionId: editedRevision.revisionId,
          rowCount: editedRows.length,
          visibleRowCount: coldVisible.visibleTitles.length,
          screenshot: { path: coldScreenshot, sha256: sha256(readFileSync(coldScreenshot)) },
        },
      });
      progress("TARGET_GREEN", {
        contextKey,
        createdRevisionId: createdRevision.revisionId,
        editedRevisionId: editedRevision.revisionId,
        rows: editedRows.length,
        procurementRows: procurement.metadata?.selectedProcurementRowCount,
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
    && results.some((result) => result.contextKey === "standard"
      && result.edit.rowCount === (IS_ANCHOR ? 16 : 9))
    && results.some((result) => result.contextKey === "high_load"
      && result.edit.rowCount === (IS_ANCHOR ? 21 : 16)),
  "RESULT_DENOMINATOR_RED");
  invariant(pageErrors.length === 0 && unexpectedConsoleErrors.length === 0
    && unexpectedRequestFailures.length === 0,
  `DIAGNOSTICS_RED:${JSON.stringify({ pageErrors, unexpectedConsoleErrors, unexpectedRequestFailures })}`);
  const manifestAfter = await api(authorization, "runtime-manifest");
  invariant(manifestAfter.definitionRelease?.status === "prepared"
    && manifestAfter.searchRelease?.status === "draft"
    && Number(manifestAfter.activeCompileJobCount) === 0,
  "RUNTIME_AFTER_RED");
  const after = resources();

  const evidence = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    status: IS_ANCHOR
      ? "GREEN_ANCHOR_GROUP_INSTALLATION_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
      : "GREEN_STRIP_FOUNDATION_REINFORCEMENT_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE",
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
      selectedDifferentialContexts: [
        {
          contextKey: "standard",
          reason: IS_ANCHOR
            ? "minimal no-weld/no-lift anchor branch with 16 rows"
            : "minimal ready-cage branch with 9 rows",
        },
        {
          contextKey: "high_load",
          reason: IS_ANCHOR
            ? "maximal protected/welded/lifting/torque anchor branch with 21 rows"
            : "maximal onsite/couplers/lifting branch with 16 rows",
        },
      ],
      backendAcceptedEquivalentOrIntermediateContexts: IS_ANCHOR
        ? ["large_area", "small_area", "technical_room", "wet_zone"]
        : ["large_area", "repair", "small_area", "technical_room", "wet_zone"],
    },
    results,
    diagnostics: {
      consoleErrors,
      pageErrors,
      requestFailures,
      unexpectedConsoleErrors,
      unexpectedRequestFailures,
    },
    resourceControl: {
      before,
      after,
      availableMemoryDeltaBytes: after.availableMemoryBytes - before.availableMemoryBytes,
      availableDiskDeltaBytes: after.availableDiskBytes - before.availableDiskBytes,
      heavyProcessStarted: false,
      existingBackendAndMetroReused: true,
      databasePreserved: true,
      historyPreserved: true,
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
