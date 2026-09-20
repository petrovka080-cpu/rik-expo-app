import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page, type Response } from "playwright";
import { Client } from "pg";

type Json = Record<string, any>;

const ORIGIN = "http://127.0.0.1:8081";
const BACKEND = "http://127.0.0.1:8765";
const PROVIDER = "http://127.0.0.1:54321";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const BASE_REVISION_ID = "3fa74942-c5f8-4c32-91e6-ade2dc76038e";
const OUTPUT_ROOT = resolve(".release-runtime/r4a13-4/platform-core-global/catalog-quantity-web");
const OUTPUT = resolve(OUTPUT_ROOT, "01_catalog_quantity_lifecycle.json");
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const METRO_RECEIPT = resolve(".release-runtime/r568/runtime/local-developer-current/metro.json");
const BUNDLE_PATH = "/index.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable";
const PROTECTED_FILES = [
  "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_api34_results.json",
  "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_screenshots.json",
  "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_ui_dumps.json",
] as const;

let latestBrowserAuthorization = "";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`R4A134_CATALOG_QUANTITY:${code}`);
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

function fileIdentity(path: string): Json {
  const bytes = readFileSync(resolve(path));
  return { path, byteSize: bytes.byteLength, sha256: sha256(bytes) };
}

async function loginConsumer(): Promise<{ authorization: string; userId: string }> {
  const credentials = JSON.parse(readFileSync(CREDENTIALS, "utf8")) as Json;
  invariant(credentials.provider_url === PROVIDER, "PROVIDER_IDENTITY_RED");
  const consumer = (credentials.principals as Json[]).find((entry) => entry.role === "consumer");
  invariant(consumer?.email && consumer?.password && credentials.publishable_key, "CONSUMER_CREDENTIALS_MISSING");
  const response = await fetch(`${PROVIDER}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: consumer.email, password: consumer.password }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null) as Json | null;
  invariant(response.ok && body?.access_token, `CONSUMER_LOGIN_HTTP_${response.status}`);
  return { authorization: `Bearer ${body.access_token}`, userId: String(consumer.user_id) };
}

async function api(
  authorization: string,
  path: string,
  expectedStatus = 200,
): Promise<Json> {
  const response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    headers: { Authorization: authorization },
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.status === expectedStatus,
    `API_${response.status}_EXPECTED_${expectedStatus}:${path}:${String(body.error?.code ?? "")}`);
  return body;
}

async function apiPost(
  authorization: string,
  path: string,
  body: Json,
  expectedStatus = 202,
): Promise<Json> {
  const response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const responseBody = await response.json().catch(() => ({})) as Json;
  invariant(response.status === expectedStatus,
    `API_POST_${response.status}_EXPECTED_${expectedStatus}:${path}:${String(responseBody.error?.code ?? "")}:${String(responseBody.error?.message ?? "")}`);
  return responseBody;
}

async function waitForJob(authorization: string, jobId: string): Promise<Json> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await api(authorization, `jobs/${jobId}`);
    if (["succeeded", "failed", "cancelled"].includes(String(job.status))) return job;
    await new Promise((accept) => setTimeout(accept, 100));
  }
  throw new Error(`R4A134_CATALOG_QUANTITY:JOB_TIMEOUT:${jobId}`);
}

async function waitForSuccessfulRevision(authorization: string, accepted: Json): Promise<Json> {
  const job = await waitForJob(authorization, String(accepted.jobId ?? ""));
  invariant(job.status === "succeeded" && job.resultRevisionId,
    `JOB_${String(job.status)}:${String(job.errorCode ?? "UNKNOWN")}`);
  return api(authorization, `revisions/${job.resultRevisionId}`);
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

function preliminaryNeeds(revision: Json): Json[] {
  return Array.isArray(revision.preliminaryNeeds) ? revision.preliminaryNeeds : [];
}

function recalculateBody(input: {
  revision: Json;
  idempotencyKey: string;
  rowId: string;
  quantity: string | number | null;
  reason: string;
}): Json {
  const previous = input.revision.amendmentContract?.rowOverrides?.[input.rowId] ?? {};
  return {
    idempotencyKey: input.idempotencyKey,
    catalogId: input.revision.catalogId,
    parentRevisionId: input.revision.revisionId,
    sourceRequestText: input.revision.sourceRequestText,
    primaryMeasureParameterId: input.revision.primaryMeasureParameterId,
    parameters: input.revision.parameters,
    currencyCode: input.revision.currencyCode,
    rowOverrides: {
      ...(input.revision.amendmentContract?.rowOverrides ?? {}),
      [input.rowId]: {
        ...previous,
        quantity: input.quantity,
        provenance: { kind: "manual", reason: input.reason },
      },
    },
    customRows: input.revision.amendmentContract?.customRows ?? [],
  };
}

async function chooseResource(
  authorization: string,
  rowType: "material" | "service",
  queries: string[],
): Promise<Json> {
  for (const query of queries) {
    const result = await api(
      authorization,
      `search/resources?query=${encodeURIComponent(query)}&kind=all&pageSize=100`,
    );
    const item = (result.items as Json[] | undefined)?.find((candidate) => candidate.rowType === rowType);
    if (item) return item;
  }
  throw new Error(`R4A134_CATALOG_QUANTITY:RESOURCE_${rowType.toUpperCase()}_NOT_FOUND`);
}

async function enterConsumer(page: Page): Promise<void> {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (await page.getByTestId("consumer-repair-problem-input").isVisible().catch(() => false)) return;
    const ownerLogin = page.getByTestId("local-developer-director-login");
    if (await ownerLogin.isVisible().catch(() => false) && await ownerLogin.isEnabled().catch(() => false)) {
      await ownerLogin.click({ timeout: 2_000 }).catch(() => undefined);
    } else {
      const consumerLogin = page.getByTestId("auth.login.local-consumer")
        .or(page.getByTestId("protected-identity-local-consumer-login")).first();
      if (await consumerLogin.isVisible().catch(() => false)
        && await consumerLogin.isEnabled().catch(() => false)) {
        await consumerLogin.click({ timeout: 2_000 }).catch(() => undefined);
      }
    }
    await page.waitForTimeout(250);
  }
  throw new Error("R4A134_CATALOG_QUANTITY:CONSUMER_ROUTE_NOT_READY");
}

async function openRevision(page: Page, revisionId: string): Promise<void> {
  await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(revisionId)}`, {
    waitUntil: "commit",
    timeout: 180_000,
  });
  await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
  await enterConsumer(page);
  await page.getByTestId("request-estimate-items-total-count").waitFor({ state: "visible", timeout: 90_000 });
}

async function itemIdForTitle(page: Page, title: string): Promise<string> {
  const titleNode = page.locator('[data-testid^="consumer-repair-item-title-"]')
    .filter({ hasText: title }).last();
  await titleNode.waitFor({ state: "visible", timeout: 90_000 });
  const testId = String(await titleNode.getAttribute("data-testid"));
  const prefix = "consumer-repair-item-title-";
  invariant(testId.startsWith(prefix), "VISIBLE_ITEM_ID_MISSING");
  return testId.slice(prefix.length);
}

async function waitForUiRevision(page: Page, revision: Json): Promise<void> {
  await page.waitForFunction((expectedRevisionNumber) => {
    const value = document.querySelector('[data-testid="estimate-current-revision-id"]')?.textContent?.trim() ?? "";
    return value === `Текущая версия: ${String(expectedRevisionNumber)}`;
  }, revision.revisionNumber, { timeout: 90_000 });
}

async function addResourceFromUi(input: {
  page: Page;
  authorization: string;
  resource: Json;
}): Promise<{ revision: Json; rowId: string; itemId: string; searchStatus: number }> {
  const searchInput = input.page.getByTestId("request-estimate-items-search");
  const searchResponsePromise = input.page.waitForResponse((response) =>
    response.url().includes("/search/resources?") && response.request().method() === "GET",
  { timeout: 90_000 });
  const [searchResponse] = await Promise.all([
    searchResponsePromise,
    searchInput.fill(String(input.resource.titleRu)),
  ]);
  invariant(searchResponse.status() === 200, `RESOURCE_SEARCH_HTTP_${searchResponse.status()}`);
  const result = input.page.getByTestId(`estimate-material-search-catalog-${input.resource.resourceId}`);
  await result.waitFor({ state: "visible", timeout: 90_000 });
  const acceptedPromise = input.page.waitForResponse((response) =>
    response.url().endsWith("/jobs/recalculate") && response.request().method() === "POST",
  { timeout: 90_000 });
  const [acceptedResponse] = await Promise.all([acceptedPromise, result.click()]);
  const accepted = await acceptedResponse.json().catch(() => ({})) as Json;
  invariant(acceptedResponse.status() === 202,
    `CATALOG_ADD_HTTP_${acceptedResponse.status()}:${String(accepted.error?.code ?? "")}:${String(accepted.error?.message ?? "")}`);
  const actionAuthorization = latestBrowserAuthorization || input.authorization;
  const revision = await waitForSuccessfulRevision(actionAuthorization, accepted);
  const need = preliminaryNeeds(revision).find((candidate) =>
    candidate.titleRu === input.resource.titleRu && String(candidate.rowId).startsWith("manual:"));
  invariant(need && need.quantity == null, `CATALOG_ADD_NOT_PRELIMINARY:${input.resource.rowType}`);
  await waitForUiRevision(input.page, revision);
  const itemId = await itemIdForTitle(input.page, String(input.resource.titleRu));
  return { revision, rowId: String(need.rowId), itemId, searchStatus: searchResponse.status() };
}

async function recalculateFromQuantityUi(input: {
  page: Page;
  authorization: string;
  title: string;
  value: string;
}): Promise<{ revision: Json; rows: Json[]; needs: Json[]; itemId: string }> {
  const itemId = await itemIdForTitle(input.page, input.title);
  const responsePromise = input.page.waitForResponse((response) =>
    response.url().endsWith("/jobs/recalculate") && response.request().method() === "POST",
  { timeout: 90_000 });
  const [response] = await Promise.all([
    responsePromise,
    input.page.getByTestId(`consumer-repair-item-quantity-input-${itemId}`).fill(input.value),
  ]);
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.status() === 202, `QUANTITY_UI_HTTP_${response.status()}:${String(body.error?.code ?? "")}`);
  const actionAuthorization = latestBrowserAuthorization || input.authorization;
  const revision = await waitForSuccessfulRevision(actionAuthorization, body);
  await waitForUiRevision(input.page, revision);
  await itemIdForTitle(input.page, input.title);
  return {
    revision,
    rows: await allRows(actionAuthorization, revision.revisionId),
    needs: preliminaryNeeds(revision),
    itemId,
  };
}

async function recalculateFromUiAction(input: {
  page: Page;
  authorization: string;
  action: () => Promise<void>;
}): Promise<{ revision: Json; rows: Json[]; needs: Json[] }> {
  const responsePromise = input.page.waitForResponse((response) =>
    response.url().endsWith("/jobs/recalculate") && response.request().method() === "POST",
  { timeout: 90_000 });
  const [response] = await Promise.all([responsePromise, input.action()]);
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.status() === 202, `ROW_ACTION_HTTP_${response.status()}:${String(body.error?.code ?? "")}`);
  const actionAuthorization = latestBrowserAuthorization || input.authorization;
  const revision = await waitForSuccessfulRevision(actionAuthorization, body);
  await waitForUiRevision(input.page, revision);
  return {
    revision,
    rows: await allRows(actionAuthorization, revision.revisionId),
    needs: preliminaryNeeds(revision),
  };
}

async function buildArtifact(
  authorization: string,
  revision: Json,
  kind: "pdf" | "procurement",
): Promise<Json> {
  const documentProfile = kind === "pdf" ? "professional_v1" : null;
  const accepted = await apiPost(
    authorization,
    `revisions/${revision.revisionId}/artifacts/${kind}`,
    {
      idempotencyKey: `r4a134-${kind}-${revision.revisionId}`,
      ...(documentProfile ? { documentProfile } : {}),
    },
  );
  if (accepted.jobId) {
    const job = await waitForJob(authorization, String(accepted.jobId));
    invariant(job.status === "succeeded", `ARTIFACT_${kind}_JOB_${String(job.status)}:${String(job.errorCode ?? "")}`);
  } else {
    invariant(accepted.created === false
      && accepted.artifactId
      && accepted.artifactStatus === "ready",
    `ARTIFACT_${kind}_IDEMPOTENT_REPLAY_RED`);
  }
  const suffix = documentProfile ? `?documentProfile=${documentProfile}` : "";
  const artifact = await api(
    authorization,
    `revisions/${revision.revisionId}/artifacts/${kind}${suffix}`,
  );
  invariant(artifact.status === "ready" && artifact.revisionId === revision.revisionId,
    `ARTIFACT_${kind}_IDENTITY_RED`);
  return artifact;
}

async function databaseProof(revisionIds: string[]): Promise<Json> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const revisions = (await client.query(
      `select id::text,parent_revision_id::text,owner_user_id::text,revision_number,row_count,checksum_sha256,
         totals,amendment_contract
       from public.estimate_revision where id=any($1::uuid[]) order by revision_number`,
      [revisionIds],
    )).rows;
    const customRows = (await client.query(
      `select revision_id::text,row_id,title_ru,category,unit_id,quantity,unit_price,amount,
         procurement_eligible,included_in_estimate,included_in_procurement
       from public.estimate_revision_row
       where revision_id=any($1::uuid[]) and row_id like 'manual:%'
       order by revision_id,row_id`,
      [revisionIds],
    )).rows;
    invariant(revisions.length === revisionIds.length, "DATABASE_REVISION_COUNT_RED");
    return { revisions, customRows };
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const protectedBefore = PROTECTED_FILES.map(fileIdentity);
  let { authorization, userId } = await loginConsumer();
  latestBrowserAuthorization = authorization;
  const manifest = await api(authorization, "runtime-manifest");
  invariant(manifest.runtimeRole === "FULL_CANONICAL_ESTIMATE_BACKEND", "RUNTIME_ROLE_RED");
  invariant(manifest.activeCompileJobCount === 0, "ACTIVE_JOB_AT_START");
  const base = await api(authorization, `revisions/${BASE_REVISION_ID}`);
  invariant(base.revisionId === BASE_REVISION_ID && preliminaryNeeds(base).length === 0,
    "BASE_REVISION_NOT_FULL");
  const baseRows = await allRows(authorization, base.revisionId);
  invariant(baseRows.length === base.rowCount && baseRows.every((row) => row.unitPrice != null),
    "BASE_REVISION_NOT_PRICED");

  const [materialResource, serviceResource] = await Promise.all([
    chooseResource(authorization, "material", ["грунтовка", "профиль", "смесь", "лист"]),
    chooseResource(authorization, "service", ["испытание", "контроль", "проверка", "услуга"]),
  ]);
  invariant(materialResource.procurementEligible === true, "MATERIAL_RESOURCE_NOT_PROCUREMENT_ELIGIBLE");
  invariant(serviceResource.procurementEligible === false, "SERVICE_RESOURCE_PROCUREMENT_ELIGIBILITY_RED");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const backendRequests: Json[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  page.on("response", (response) => {
    if (!response.url().startsWith(`${BACKEND}/`)) return;
    backendRequests.push({
      method: response.request().method(),
      path: new URL(response.url()).pathname,
      status: response.status(),
      requestId: response.headers()["x-request-id"] ?? null,
    });
  });
  page.on("request", (request) => {
    if (!request.url().startsWith(`${BACKEND}/`)) return;
    const value = request.headers().authorization ?? "";
    if (value.startsWith("Bearer ")) latestBrowserAuthorization = value;
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) =>
    requestFailures.push(`${request.method()} ${new URL(request.url()).pathname} ${request.failure()?.errorText ?? ""}`));

  const revisionIds: string[] = [base.revisionId];
  let finalRevision: Json;
  let materialRowId = "";
  let serviceRowId = "";
  let materialAddition: Json;
  let serviceAddition: Json;
  let duplicateCommand: Json;
  let competingRevision: Json;
  let invalidGuards: Json;
  let clearLifecycle: Json;
  let editLifecycle: Json;
  let documents: Json;
  let confirmation: Json;
  try {
    await openRevision(page, base.revisionId);
    const material = await addResourceFromUi({ page, authorization, resource: materialResource });
    authorization = latestBrowserAuthorization || authorization;
    materialRowId = material.rowId;
    materialAddition = {
      resource: materialResource,
      revisionId: material.revision.revisionId,
      rowId: material.rowId,
      rowCount: material.revision.rowCount,
      preliminaryNeedCount: preliminaryNeeds(material.revision).length,
      searchStatus: material.searchStatus,
    };
    revisionIds.push(material.revision.revisionId);
    invariant(preliminaryNeeds(material.revision).find((need) => need.rowId === materialRowId)?.procurementEligible === true,
      "MATERIAL_NEED_PROCUREMENT_ELIGIBILITY_RED");
    const initialInput = page.getByTestId(`consumer-repair-item-quantity-input-${material.itemId}`);
    invariant(await initialInput.inputValue() === "", "INITIAL_UNKNOWN_QUANTITY_NOT_EMPTY");
    await page.getByTestId("request-estimate-incomplete-composition-notice").waitFor({ state: "visible" });
    const statusBeforeReload = (await page.getByTestId("request-estimate-parameter-status").innerText()).trim();
    invariant(!/(^|\s)0(?:\s|$)/u.test(statusBeforeReload), "FALSE_ZERO_MISSING_STATUS_INITIAL");
    const preliminaryScreenshot = resolve(OUTPUT_ROOT, "material_preliminary.png");
    await page.screenshot({ path: preliminaryScreenshot, fullPage: true });

    await openRevision(page, material.revision.revisionId);
    await page.reload({ waitUntil: "commit", timeout: 180_000 });
    await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
    await enterConsumer(page);
    const reloadedMaterialItemId = await itemIdForTitle(page, materialResource.titleRu);
    invariant(await page.getByTestId(`consumer-repair-item-quantity-input-${reloadedMaterialItemId}`).inputValue() === "",
      "PRELIMINARY_QUANTITY_NOT_DURABLE_ON_RELOAD");

    const recalcCountBeforeInvalid = backendRequests.filter((entry) =>
      entry.method === "POST" && entry.path === "/jobs/recalculate").length;
    const invalidInput = page.getByTestId(`consumer-repair-item-quantity-input-${reloadedMaterialItemId}`);
    for (const invalid of ["-1", "Infinity", "NaN", "1kg", "1..2"]) {
      await invalidInput.fill(invalid);
      await page.waitForTimeout(450);
    }
    const recalcCountAfterInvalid = backendRequests.filter((entry) =>
      entry.method === "POST" && entry.path === "/jobs/recalculate").length;
    invariant(recalcCountAfterInvalid === recalcCountBeforeInvalid, "INVALID_UI_QUANTITY_REACHED_BACKEND");

    const invalidJobs: Json[] = [];
    for (const invalid of ["-1", "Infinity", "1kg", "1..2"]) {
      const accepted = await apiPost(authorization, "jobs/recalculate", recalculateBody({
        revision: material.revision,
        idempotencyKey: `r4a134-invalid-${sha256(invalid).slice(0, 16)}-${Date.now()}`,
        rowId: materialRowId,
        quantity: invalid,
        reason: "r4a134_invalid_quantity_guard",
      }));
      const job = await waitForJob(authorization, String(accepted.jobId));
      invariant(job.status === "failed", `INVALID_BACKEND_QUANTITY_NOT_REJECTED:${invalid}`);
      invalidJobs.push({ input: invalid, jobId: job.jobId, status: job.status, errorCode: job.errorCode });
    }
    invalidGuards = {
      uiInputs: ["-1", "Infinity", "NaN", "1kg", "1..2"],
      uiBackendMutationDelta: recalcCountAfterInvalid - recalcCountBeforeInvalid,
      backendJobs: invalidJobs,
    };

    const duplicateBody = recalculateBody({
      revision: material.revision,
      idempotencyKey: `r4a134-duplicate-one-${material.revision.revisionId}`,
      rowId: materialRowId,
      quantity: "1",
      reason: "r4a134_explicit_quantity_one",
    });
    const [duplicateA, duplicateB] = await Promise.all([
      apiPost(authorization, "jobs/recalculate", duplicateBody),
      apiPost(authorization, "jobs/recalculate", duplicateBody),
    ]);
    invariant(duplicateA.jobId === duplicateB.jobId, "DUPLICATE_COMMAND_CREATED_TWO_JOBS");
    invariant([duplicateA.created, duplicateB.created].filter(Boolean).length <= 1,
      "DUPLICATE_COMMAND_CREATED_FLAGS_RED");
    const explicitOneRevision = await waitForSuccessfulRevision(authorization, duplicateA);
    const explicitOneRows = await allRows(authorization, explicitOneRevision.revisionId);
    const explicitOneRow = explicitOneRows.find((row) => row.rowId === materialRowId);
    invariant(explicitOneRow, "EXPLICIT_ONE_ROW_MISSING");
    invariant(Number(explicitOneRow.quantity) === 1 && !preliminaryNeeds(explicitOneRevision)
      .some((need) => need.rowId === materialRowId), "EXPLICIT_ONE_NOT_PRESERVED");
    revisionIds.push(explicitOneRevision.revisionId);
    duplicateCommand = {
      requestCount: 2,
      jobId: duplicateA.jobId,
      createdFlags: [duplicateA.created, duplicateB.created],
      resultRevisionId: explicitOneRevision.revisionId,
      quantity: explicitOneRow.quantity,
    };
    await openRevision(page, explicitOneRevision.revisionId);

    const materialItemForPrice = await itemIdForTitle(page, materialResource.titleRu);
    const pricedMaterial = await recalculateFromUiAction({
      page,
      authorization,
      action: async () => {
        const input = page.getByTestId(`consumer-repair-item-unit-price-input-${materialItemForPrice}`);
        await input.fill("321.5");
        await input.press("Tab");
      },
    });
    revisionIds.push(pricedMaterial.revision.revisionId);
    const pricedMaterialRow = pricedMaterial.rows.find((row) => row.rowId === materialRowId);
    invariant(Number(pricedMaterialRow?.quantity) === 1 && Number(pricedMaterialRow?.unitPrice) === 321.5,
      "MATERIAL_PRICE_OR_ONE_LOST");

    const competitionBodies = ["0.125", "0.25"].map((quantity) => recalculateBody({
      revision: pricedMaterial.revision,
      idempotencyKey: `r4a134-competing-${quantity}-${pricedMaterial.revision.revisionId}`,
      rowId: materialRowId,
      quantity,
      reason: `r4a134_competing_fraction_${quantity}`,
    }));
    const competitionAccepted = await Promise.all(competitionBodies.map((body) =>
      apiPost(authorization, "jobs/recalculate", body)));
    const competitionJobs = await Promise.all(competitionAccepted.map((accepted) =>
      waitForJob(authorization, String(accepted.jobId))));
    const competitionWinners = competitionJobs.filter((job) => job.status === "succeeded");
    invariant(competitionWinners.length === 2
      && new Set(competitionWinners.map((job) => job.resultRevisionId)).size === 2,
      `COMPETING_REVISION_CAS_RED:${competitionJobs.map((job) => job.status).join(",")}`);
    const competitionRevisions = await Promise.all(competitionWinners.map((job) =>
      api(authorization, `revisions/${job.resultRevisionId}`)));
    invariant(competitionRevisions.every((revision) =>
      revision.parentRevisionId === pricedMaterial.revision.revisionId),
    "COMPETING_REVISION_PARENT_DRIFT");
    invariant(new Set(competitionRevisions.map((revision) => revision.revisionNumber)).size === 2,
      "COMPETING_REVISION_NUMBER_COLLISION");
    const competitionRows = await Promise.all(competitionRevisions.map((revision) =>
      allRows(authorization, revision.revisionId)));
    const branchQuantities = competitionRows.map((rows) =>
      Number(rows.find((row) => row.rowId === materialRowId)?.quantity)).sort();
    invariant(branchQuantities[0] === 0.125 && branchQuantities[1] === 0.25,
      "COMPETING_REVISION_BRANCH_VALUE_LOSS");
    const fractionalRevision = [...competitionRevisions]
      .sort((left, right) => Number(right.revisionNumber) - Number(left.revisionNumber))[0];
    const fractionalRows = await allRows(authorization, fractionalRevision.revisionId);
    const fractionalRow = fractionalRows.find((row) => row.rowId === materialRowId);
    invariant(fractionalRow, "FRACTIONAL_ROW_MISSING");
    invariant([0.125, 0.25].includes(Number(fractionalRow.quantity)), "FRACTIONAL_QUANTITY_LOST");
    invariant(Number(fractionalRow.unitPrice) === 321.5, "FRACTIONAL_RECALC_LOST_PRICE");
    revisionIds.push(fractionalRevision.revisionId);
    competingRevision = {
      parentRevisionId: pricedMaterial.revision.revisionId,
      jobs: competitionJobs.map((job) => ({
        jobId: job.jobId,
        status: job.status,
        resultRevisionId: job.resultRevisionId ?? null,
        errorCode: job.errorCode ?? null,
      })),
      branchRevisionNumbers: competitionRevisions.map((revision) => revision.revisionNumber).sort(),
      branchQuantities,
      policy: "IMMUTABLE_SERIALIZED_SIBLING_BRANCHES",
      winnerRevisionId: fractionalRevision.revisionId,
      winningQuantity: fractionalRow.quantity,
    };
    await openRevision(page, fractionalRevision.revisionId);

    const service = await addResourceFromUi({ page, authorization, resource: serviceResource });
    serviceRowId = service.rowId;
    serviceAddition = {
      resource: serviceResource,
      revisionId: service.revision.revisionId,
      rowId: service.rowId,
      rowCount: service.revision.rowCount,
      preliminaryNeedCount: preliminaryNeeds(service.revision).length,
      searchStatus: service.searchStatus,
    };
    revisionIds.push(service.revision.revisionId);
    const serviceNeed = preliminaryNeeds(service.revision).find((need) => need.rowId === serviceRowId);
    invariant(serviceNeed?.category === "service" && serviceNeed.procurementEligible === false,
      "SERVICE_NEED_CLASSIFICATION_RED");
    const statusWithServiceNeed = (await page.getByTestId("request-estimate-parameter-status").innerText()).trim();
    invariant(!/(^|\s)0(?:\s|$)/u.test(statusWithServiceNeed), "FALSE_ZERO_MISSING_STATUS_SERVICE");
    const approvalWithNeed = page.getByTestId("consumer-repair-approve").last();
    await approvalWithNeed.waitFor({ state: "visible", timeout: 30_000 });
    invariant(!await approvalWithNeed.isEnabled(), "APPROVAL_ENABLED_WITH_MANUAL_NEED");

    const serviceQuantity = await recalculateFromQuantityUi({
      page,
      authorization,
      title: serviceResource.titleRu,
      value: "2.5",
    });
    revisionIds.push(serviceQuantity.revision.revisionId);
    const serviceQuantityRow = serviceQuantity.rows.find((row) => row.rowId === serviceRowId);
    invariant(Number(serviceQuantityRow?.quantity) === 2.5
      && serviceQuantityRow?.procurementEligible === false
      && serviceQuantityRow?.includedInProcurement === false,
    "SERVICE_QUANTITY_OR_PROCUREMENT_RED");

    const serviceItemForPrice = await itemIdForTitle(page, serviceResource.titleRu);
    const servicePriced = await recalculateFromUiAction({
      page,
      authorization,
      action: async () => {
        const input = page.getByTestId(`consumer-repair-item-unit-price-input-${serviceItemForPrice}`);
        await input.fill("900");
        await input.press("Tab");
      },
    });
    revisionIds.push(servicePriced.revision.revisionId);
    const servicePricedRow = servicePriced.rows.find((row) => row.rowId === serviceRowId);
    invariant(Number(servicePricedRow?.unitPrice) === 900, "SERVICE_PRICE_LOST");

    const serviceItemForExclude = await itemIdForTitle(page, serviceResource.titleRu);
    const excluded = await recalculateFromUiAction({
      page,
      authorization,
      action: () => page.getByTestId(`consumer-repair-item-remove-${serviceItemForExclude}`).click(),
    });
    revisionIds.push(excluded.revision.revisionId);
    invariant(excluded.rows.find((row) => row.rowId === serviceRowId)?.includedInEstimate === false,
      "SERVICE_EXCLUSION_NOT_PERSISTED");
    await page.getByTestId("consumer-repair-restore-item").waitFor({ state: "visible", timeout: 30_000 });
    const restored = await recalculateFromUiAction({
      page,
      authorization,
      action: () => page.getByTestId("consumer-repair-restore-item").click(),
    });
    revisionIds.push(restored.revision.revisionId);
    const restoredService = restored.rows.find((row) => row.rowId === serviceRowId);
    invariant(restoredService?.includedInEstimate === true
      && Number(restoredService.quantity) === 2.5
      && Number(restoredService.unitPrice) === 900,
    "SERVICE_RESTORE_LOST_VALUES");
    editLifecycle = {
      excludedRevisionId: excluded.revision.revisionId,
      restoredRevisionId: restored.revision.revisionId,
      restoredRow: restoredService,
    };

    const cleared = await recalculateFromQuantityUi({
      page,
      authorization,
      title: materialResource.titleRu,
      value: "",
    });
    revisionIds.push(cleared.revision.revisionId);
    const clearedNeed = cleared.needs.find((need) => need.rowId === materialRowId);
    invariant(clearedNeed && clearedNeed.quantity == null
      && Number(clearedNeed.unitPrice) === 321.5
      && clearedNeed.category === "material"
      && clearedNeed.titleRu === materialResource.titleRu,
    "CLEAR_TO_PRELIMINARY_LOST_IDENTITY_OR_PRICE");
    invariant(!cleared.rows.some((row) => row.rowId === materialRowId), "CLEARED_ROW_DUPLICATED_AS_CALCULATED");
    await openRevision(page, cleared.revision.revisionId);
    await page.reload({ waitUntil: "commit", timeout: 180_000 });
    await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
    await enterConsumer(page);
    const clearedItemId = await itemIdForTitle(page, materialResource.titleRu);
    invariant(await page.getByTestId(`consumer-repair-item-quantity-input-${clearedItemId}`).inputValue() === "",
      "CLEARED_PRELIMINARY_NOT_DURABLE_ON_RELOAD");
    const clearedScreenshot = resolve(OUTPUT_ROOT, "material_cleared_preliminary_reload.png");
    await page.screenshot({ path: clearedScreenshot, fullPage: true });

    const reResolved = await recalculateFromQuantityUi({
      page,
      authorization,
      title: materialResource.titleRu,
      value: "1.25",
    });
    revisionIds.push(reResolved.revision.revisionId);
    const finalMaterial = reResolved.rows.find((row) => row.rowId === materialRowId);
    const finalService = reResolved.rows.find((row) => row.rowId === serviceRowId);
    invariant(reResolved.needs.length === 0
      && Number(finalMaterial?.quantity) === 1.25
      && Number(finalMaterial?.unitPrice) === 321.5
      && Number(finalService?.quantity) === 2.5
      && Number(finalService?.unitPrice) === 900,
    "RE_RESOLVE_NOT_COMPLETE_OR_VALUES_LOST");
    finalRevision = reResolved.revision;
    clearLifecycle = {
      clearedRevisionId: cleared.revision.revisionId,
      clearedNeed,
      clearedCalculatedDuplicateCount: cleared.rows.filter((row) => row.rowId === materialRowId).length,
      reloadPersisted: true,
      screenshot: clearedScreenshot,
      reResolvedRevisionId: finalRevision.revisionId,
      finalMaterial,
      finalService,
    };

    const [procurement, pdf] = await Promise.all([
      buildArtifact(authorization, finalRevision, "procurement"),
      buildArtifact(authorization, finalRevision, "pdf"),
    ]);
    invariant(Number(procurement.metadata?.selectedProcurementRowCount) < finalRevision.rowCount,
      "SERVICE_WAS_INCORRECTLY_PROCURED");
    invariant(pdf.metadata?.grandTotalStatus === "COMPLETE", "FINAL_PDF_TOTAL_NOT_COMPLETE");

    await openRevision(page, finalRevision.revisionId);
    const procurementResponsePromise = page.waitForResponse((response) => response.request().method() === "GET"
      && response.url().includes(`/revisions/${finalRevision.revisionId}/artifacts/procurement`),
    { timeout: 180_000 });
    const [procurementResponse] = await Promise.all([
      procurementResponsePromise,
      page.getByTestId("consumer-estimate-open-procurement").first().click(),
    ]);
    const procurementUi = await procurementResponse.json().catch(() => ({})) as Json;
    invariant(procurementResponse.status() === 200 && procurementUi.status === "ready",
      "PROCUREMENT_UI_NOT_READY");

    await openRevision(page, finalRevision.revisionId);
    const pdfResponsePromise = page.waitForResponse((response) => response.request().method() === "GET"
      && response.url().includes(`/revisions/${finalRevision.revisionId}/artifacts/pdf`),
    { timeout: 180_000 });
    const [pdfResponse] = await Promise.all([
      pdfResponsePromise,
      page.getByTestId("consumer-estimate-make-pdf").first().click(),
    ]);
    const pdfUi = await pdfResponse.json().catch(() => ({})) as Json;
    invariant(pdfResponse.status() === 200 && pdfUi.status === "ready", "PDF_UI_NOT_READY");
    documents = {
      procurement: {
        artifactId: procurement.artifactId,
        revisionId: procurement.revisionId,
        status: procurement.status,
        sourceRowCount: procurement.metadata?.sourceRowCount,
        projectedRowCount: procurement.metadata?.projectedRowCount,
        selectedProcurementRowCount: procurement.metadata?.selectedProcurementRowCount,
        uiHttpStatus: procurementResponse.status(),
      },
      pdf: {
        artifactId: pdf.artifactId,
        revisionId: pdf.revisionId,
        status: pdf.status,
        sourceRowCount: pdf.metadata?.sourceRowCount,
        pageCount: pdf.metadata?.pageCount,
        grandTotalStatus: pdf.metadata?.grandTotalStatus,
        uiHttpStatus: pdfResponse.status(),
      },
    };

    await openRevision(page, finalRevision.revisionId);
    const deliverySummary = page.getByTestId("consumer-repair-delivery-summary").last();
    if (!await deliverySummary.isVisible().catch(() => false)) {
      await page.getByTestId("consumer-repair-city-input").last().fill("Bishkek");
      await page.getByTestId("consumer-repair-address-input").last().fill("Контрольный адрес R4-A13-4, 1");
      await page.getByTestId("consumer-repair-time-input").last().fill("После согласования");
      await page.getByTestId("consumer-repair-phone-input").last().fill("0700000000");
      await deliverySummary.waitFor({ state: "visible", timeout: 30_000 });
    }
    const approve = page.getByTestId("consumer-repair-approve").last();
    await approve.waitFor({ state: "visible", timeout: 30_000 });
    invariant(await approve.isEnabled(), `FINAL_APPROVAL_DISABLED:${await approve.innerText()}`);
    await approve.click();
    const status = page.getByTestId("consumer-repair-status");
    await status.waitFor({ state: "visible", timeout: 120_000 });
    await page.waitForFunction(() => {
      const value = document.querySelector('[data-testid="consumer-repair-status"]')?.textContent ?? "";
      return value.toLocaleLowerCase("ru-RU").includes("утвержден")
        || value.toLocaleLowerCase("ru-RU").includes("утверждён");
    }, undefined, { timeout: 120_000 });
    const finalScreenshot = resolve(OUTPUT_ROOT, "catalog_quantity_final_confirmed.png");
    await page.screenshot({ path: finalScreenshot, fullPage: true });
    confirmation = {
      revisionId: finalRevision.revisionId,
      confirmed: true,
      statusText: (await status.innerText()).trim(),
      screenshot: finalScreenshot,
    };
  } finally {
    await browser.close();
  }

  const expectedNavigationAborts = requestFailures.filter((failure) => {
    if (!failure.includes("ERR_ABORTED")) return false;
    return failure.includes("/artifact-files/")
      || /^GET \/revisions\/[0-9a-f-]+\/(?:attachments|parameter-session) /u.test(failure);
  });
  const unexpectedFailures = requestFailures.filter((failure) => !expectedNavigationAborts.includes(failure));
  invariant(pageErrors.length === 0, `PAGE_ERRORS:${pageErrors.join("|")}`);
  invariant(unexpectedFailures.length === 0, `REQUEST_FAILURES:${unexpectedFailures.join("|")}`);
  const db = await databaseProof(revisionIds);
  const protectedAfter = PROTECTED_FILES.map(fileIdentity);
  invariant(JSON.stringify(protectedAfter) === JSON.stringify(protectedBefore), "PROTECTED_ANDROID_FILES_CHANGED");
  const metro = JSON.parse(readFileSync(METRO_RECEIPT, "utf8").replace(/^\uFEFF/u, "")) as Json;
  const bundleResponse = await fetch(`${ORIGIN}${BUNDLE_PATH}`, { signal: AbortSignal.timeout(180_000) });
  const bundleBytes = Buffer.from(await bundleResponse.arrayBuffer());
  invariant(bundleResponse.ok && bundleBytes.byteLength > 1_000_000, "SERVED_BUNDLE_RED");
  const actualBundleSha256 = sha256(bundleBytes);

  const receiptBase = {
    schemaVersion: "rik-expo-app.r4-a13-4.catalog-quantity-lifecycle-web.v1",
    generatedUtc: new Date().toISOString(),
    status: "GREEN_R4_A13_4_CATALOG_QUANTITY_LIFECYCLE_WEB",
    runtime: {
      origin: ORIGIN,
      backend: BACKEND,
      sourceHead: manifest.compatibilityTuple?.sourceHead,
      definitionReleaseId: manifest.compatibilityTuple?.definitionReleaseId,
      searchReleaseId: manifest.compatibilityTuple?.searchReleaseId,
      sourceTreeHash: metro.source_tree_hash,
      productSourceHash: metro.product_source_hash,
      expectedJsBundleFingerprint: metro.js_bundle_fingerprint,
      actualServedBundleSha256: actualBundleSha256,
      bundleByteSize: bundleBytes.byteLength,
      capabilityId: manifest.compatibilityTuple?.capabilityId,
      activeCompileJobsAtStart: manifest.activeCompileJobCount,
    },
    principal: {
      apiProbeUserId: userId,
      realProviderSession: true,
      uiBearerUsedInMemory: true,
      credentialsPrinted: false,
      tokensPersisted: false,
    },
    base: { revisionId: base.revisionId, rowCount: base.rowCount, preliminaryNeedCount: 0 },
    materialAddition,
    serviceAddition,
    invalidGuards,
    duplicateCommand,
    competingRevision,
    editLifecycle,
    clearLifecycle,
    documents,
    confirmation,
    revisionChain: revisionIds,
    database: db,
    backendRequests,
    diagnostics: { pageErrors, requestFailures, expectedNavigationAborts },
    protectedFiles: { before: protectedBefore, after: protectedAfter, unchanged: true },
    productionAccessed: false,
    deployPerformed: false,
    releaseActivated: false,
    secretsPersisted: false,
  };
  atomicJson(OUTPUT, { ...receiptBase, receiptSha256: sha256(JSON.stringify(receiptBase)) });
  process.stdout.write(`${JSON.stringify({
    status: receiptBase.status,
    receipt: OUTPUT,
    sourceTreeHash: receiptBase.runtime.sourceTreeHash,
    actualServedBundleSha256: actualBundleSha256,
    materialRowId,
    serviceRowId,
    finalRevisionId: finalRevision!.revisionId,
    revisionCount: revisionIds.length,
    productionAccessed: false,
  })}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
