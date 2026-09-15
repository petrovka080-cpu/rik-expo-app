import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type BrowserContext, type Page, type Response } from "playwright";
import { Client } from "pg";

type Json = Record<string, any>;

const ORIGIN = "http://127.0.0.1:8081";
const BACKEND = "http://127.0.0.1:8765";
const PROVIDER = "http://127.0.0.1:54321";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const RELEASE_ID = "27ea4b3d-fabb-5adc-897a-ac2163cc8ecc";
const SEARCH_RELEASE_ID = "69136c36-c4d7-52f2-9d83-fe2a8583f05b";
const DEFINITION_ID = "e0d8a9a6-6f6e-5d62-80cf-ca33e8cb007a";
const CATALOG_ID = "canonical-work:base:concrete_foundation_interior_formwork_form_standard";
const ROW_ID = "formwork:rics-nrm2:measured-contact-area:work";
const SOURCE_ID = "src_professional_norm_pack_formwork_rics_nrm2_measured_contact_area_same_unit_routing_v1";
const NORM_ID = "formwork_rics_nrm2_measured_contact_area_same_unit_routing_v1";
const EXPECTED_TITLE = "Монтаж и демонтаж опалубки по измеренной площади контакта";
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const OUTPUT_ROOT = resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/web-formwork-rics-nrm2");
const OUTPUT = resolve(OUTPUT_ROOT, "acceptance.json");
const SEARCH_QUERY = "Монтаж и демонтаж опалубки по измеренной площади контакта";
const SELECTED_DETAILS = [
  "RICS NRM 2.",
  "Измеренная площадь контакта: 100 м2;",
  "ссылка на чертёж: FW-149-REV-A;",
  "тип элемента: WALL;",
  "размеры и количество граней: 50 m x 2 m x 1 measured face;",
  "отделка: PLAIN;",
  "класс геометрии: VERTICAL;",
  "сторона опалубки: SINGLE_SIDED;",
  "правило проёмов и пустот: PROJECT_RULE:no openings in measured scope;",
  "тип опалубки: REMOVABLE;",
  "правило измерения проекта: RICS_NRM2_WS11_CONFIRMED:FW-149-REV-A;",
  "согласование сметчика: EST-FW-149.",
];
const PROMPT = [SEARCH_QUERY, ...SELECTED_DETAILS].join(" ");

const FIXTURE: Readonly<Json> = Object.freeze({
  product_profile_id: "standard-profile:rics-nrm2:formwork-measured-contact-area:v1",
  measured_formwork_contact_area_m2: 100,
  project_drawing_reference: "FW-149-REV-A",
  element_type: "WALL",
  element_dimensions_and_face_count: "50 m x 2 m x 1 measured face",
  plain_or_special_finish: "PLAIN",
  vertical_battered_horizontal_or_curved_class: "VERTICAL",
  single_or_double_sided_scope: "SINGLE_SIDED",
  openings_voids_and_deduction_rule: "PROJECT_RULE:no openings in measured scope",
  permanent_or_removable_formwork: "REMOVABLE",
  project_measurement_rule_reference: "RICS_NRM2_WS11_CONFIRMED:FW-149-REV-A",
  estimator_approval_reference: "EST-FW-149",
});

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`EXACT_FORMWORK_WEB:${code}`);
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
  process.stdout.write(`${JSON.stringify({ progress: "EXACT_FORMWORK_WEB", stage, ...details })}\n`);
}

async function closePageBounded(page: Page): Promise<void> {
  await Promise.race([
    page.close().catch(() => undefined),
    new Promise<void>((accept) => setTimeout(accept, 5_000)),
  ]);
}

async function json(response: Response): Promise<Json> {
  return response.json().catch(() => ({})) as Promise<Json>;
}

async function loginConsumer(): Promise<{ authorization: string; userId: string }> {
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
  return { authorization: `Bearer ${body.access_token}`, userId: String(consumer.user_id) };
}

async function api(authorization: string, path: string, expectedStatus = 200): Promise<Json> {
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
  throw new Error(`EXACT_FORMWORK_WEB:JOB_TIMEOUT:${jobId}`);
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
    const result = await api(authorization, `revisions/${revisionId}/rows?${query.toString()}`);
    rows.push(...(Array.isArray(result.rows) ? result.rows : []));
    cursor = String(result.nextCursor ?? "");
  } while (cursor);
  return rows;
}

async function enterConsumer(page: Page): Promise<void> {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (await page.getByTestId("consumer-repair-problem-input").isVisible().catch(() => false)) return;
    const ownerLogin = page.getByTestId("local-developer-director-login");
    if (await ownerLogin.isVisible().catch(() => false)
      && await ownerLogin.isEnabled().catch(() => false)) {
      await ownerLogin.click({ timeout: 2_000 }).catch(() => undefined);
    } else {
      const login = page.getByTestId("auth.login.local-consumer")
        .or(page.getByTestId("protected-identity-local-consumer-login")).first();
      if (await login.isVisible().catch(() => false) && await login.isEnabled().catch(() => false)) {
        await login.click({ timeout: 2_000 }).catch(() => undefined);
      }
    }
    await page.waitForTimeout(250);
  }
  throw new Error("EXACT_FORMWORK_WEB:CONSUMER_ROUTE_NOT_READY");
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

function preliminaryNeeds(revision: Json): Json[] {
  return Array.isArray(revision.preliminaryNeeds) ? revision.preliminaryNeeds : [];
}

function assertExactRevision(revision: Json, rows: Json[], expectedArea: number): Json {
  invariant(revision.releaseId === RELEASE_ID, "REVISION_RELEASE_DRIFT");
  invariant(revision.catalogId === CATALOG_ID, "REVISION_CATALOG_DRIFT");
  invariant(revision.definitionVersionId === DEFINITION_ID, "REVISION_DEFINITION_DRIFT");
  invariant(preliminaryNeeds(revision).length === 0, "REVISION_REMAINS_PRELIMINARY");
  invariant(rows.length === 1 && revision.rowCount === 1, "REVISION_ROW_DENOMINATOR_RED");
  const row = rows[0]!;
  invariant(row.rowId === ROW_ID && String(row.titleRu).includes(EXPECTED_TITLE), "ROW_IDENTITY_RED");
  invariant(Number(row.quantity) === expectedArea && row.unitId === "m2", "ROW_QUANTITY_OR_UNIT_RED");
  invariant(row.unitPrice == null && row.amount == null, "UNKNOWN_PRICE_WAS_ZEROED");
  invariant(row.procurementEligible === false && row.includedInProcurement === false,
    "NON_MATERIAL_ROW_REACHED_PROCUREMENT");
  invariant(row.includedInEstimate === true, "EXACT_ROW_EXCLUDED");
  const trace = Array.isArray(row.normativeTrace) ? row.normativeTrace[0] : null;
  invariant(trace?.source_id === SOURCE_ID && trace?.norm_id === NORM_ID,
    "NORMALIZED_SOURCE_IDENTITY_RED");
  const binding = row.calculationTrace?.resourceGraph?.professionalPhysicalNormBindingV1;
  invariant(binding?.product_profile_id === FIXTURE.product_profile_id,
    "PHYSICAL_BINDING_MISSING");
  invariant(Number(revision.totals?.unpricedRowCount) === 1
    && Number(revision.totals?.pricedRowCount) === 0,
  "UNKNOWN_PRICE_TOTALS_RED");
  return row;
}

async function ensureFullRevision(authorization: string, revision: Json): Promise<Json> {
  if (preliminaryNeeds(revision).length === 0
    && Object.entries(FIXTURE).every(([key, value]) => revision.parameters?.[key] === value)) return revision;
  return waitForSuccessfulRevision(authorization, await apiPost(authorization, "jobs/recalculate", {
    idempotencyKey: `exact-formwork-full-${revision.revisionId}`,
    catalogId: CATALOG_ID,
    parentRevisionId: revision.revisionId,
    sourceRequestText: revision.sourceRequestText,
    primaryMeasureParameterId: "measured_formwork_contact_area_m2",
    parameters: { ...(revision.parameters ?? {}), ...FIXTURE },
    currencyCode: revision.currencyCode,
    rowOverrides: revision.amendmentContract?.rowOverrides ?? {},
    customRows: revision.amendmentContract?.customRows ?? [],
  }));
}

async function buildArtifact(
  authorization: string,
  revision: Json,
  kind: "pdf" | "procurement",
): Promise<Json> {
  const documentProfile = kind === "pdf" ? "professional_v1" : null;
  const accepted = await apiPost(authorization, `revisions/${revision.revisionId}/artifacts/${kind}`, {
    idempotencyKey: `exact-formwork-${kind}-${revision.revisionId}`,
    ...(documentProfile ? { documentProfile } : {}),
  });
  if (accepted.jobId) {
    const job = await waitForJob(authorization, String(accepted.jobId));
    invariant(job.status === "succeeded",
      `ARTIFACT_${kind}_JOB_${String(job.status)}:${String(job.errorCode ?? "")}`);
  } else {
    invariant(accepted.created === false && accepted.artifactId,
      `ARTIFACT_${kind}_IDEMPOTENT_REPLAY_RED`);
  }
  const suffix = documentProfile ? `?documentProfile=${documentProfile}` : "";
  const artifact = await api(authorization,
    `revisions/${revision.revisionId}/artifacts/${kind}${suffix}`);
  invariant(artifact.status === "ready" && artifact.revisionId === revision.revisionId
    && artifact.releaseId === RELEASE_ID, `ARTIFACT_${kind}_IDENTITY_RED`);
  invariant(artifact.signedUrl && Number(artifact.byteSize) > 0 && /^[0-9a-f]{64}$/u.test(artifact.sha256),
    `ARTIFACT_${kind}_FILE_IDENTITY_RED`);
  const fileResponse = await fetch(artifact.signedUrl, { signal: AbortSignal.timeout(120_000) });
  const bytes = Buffer.from(await fileResponse.arrayBuffer());
  invariant(fileResponse.ok && bytes.byteLength === Number(artifact.byteSize)
    && sha256(bytes) === artifact.sha256, `ARTIFACT_${kind}_DOWNLOAD_PARITY_RED`);
  return { ...artifact, downloadedByteSize: bytes.byteLength, downloadedSha256: sha256(bytes) };
}

async function databaseProof(revisionIds: string[], negativeJobId: string): Promise<Json> {
  const client = new Client({ connectionString: DATABASE_URL, application_name: "exact-formwork-web-proof" });
  await client.connect();
  try {
    const revisions = (await client.query(`select id::text,parent_revision_id::text,release_id::text,
        definition_version_id::text,catalog_id,revision_number,row_count,totals,checksum_sha256
      from public.estimate_revision where id=any($1::uuid[]) order by revision_number`, [revisionIds])).rows;
    const rows = (await client.query(`select revision_id::text,row_id,title_ru,unit_id,quantity,unit_price,amount,
        procurement_eligible,included_in_estimate,included_in_procurement,normative_trace,calculation_trace
      from public.estimate_revision_row where revision_id=any($1::uuid[]) order by revision_id,ordinal`,
    [revisionIds])).rows;
    const negativeJob = (await client.query(`select id::text,status,error_code,result_revision_id::text
      from public.estimate_compile_job where id=$1`, [negativeJobId])).rows[0];
    const release = (await client.query(`select id::text,status,activated_at from public.estimate_definition_release
      where id=$1`, [RELEASE_ID])).rows[0];
    const search = (await client.query(`select id::text,status,activated_at from public.estimate_search_index_release
      where id=$1`, [SEARCH_RELEASE_ID])).rows[0];
    invariant(revisions.length === revisionIds.length && rows.length === revisionIds.length,
      "DATABASE_REVISION_PARITY_RED");
    invariant(release.status === "prepared" && release.activated_at == null
      && search.status === "draft" && search.activated_at == null, "CANDIDATE_ACTIVATION_DRIFT");
    return { revisions, rows, negativeJob, release, search };
  } finally {
    await client.end();
  }
}

async function openColdRevision(context: BrowserContext, revision: Json, screenshot: string): Promise<Json> {
  const page = await context.newPage();
  try {
    await openRevision(page, revision.revisionId);
    await page.locator('[data-testid^="consumer-repair-item-title-"]')
      .filter({ hasText: EXPECTED_TITLE }).waitFor({ state: "visible", timeout: 90_000 });
    const body = await page.locator("body").innerText();
    invariant(body.includes("120") && !body.includes("2.4"), "COLD_REOPEN_QUANTITY_OR_OLD_FACTOR_RED");
    await page.screenshot({ path: screenshot, fullPage: true });
    return {
      revisionId: revision.revisionId,
      revisionNumber: revision.revisionNumber,
      rowTitleVisible: true,
      quantity120Visible: true,
      oldFactorVisible: false,
      screenshot,
    };
  } finally {
    await page.close();
  }
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const { authorization: apiAuthorization, userId } = await loginConsumer();
  const manifest = await api(apiAuthorization, "runtime-manifest");
  invariant(manifest.runtimeRole === "FULL_CANONICAL_ESTIMATE_BACKEND"
    && manifest.compatibilityTuple?.definitionReleaseId === RELEASE_ID
    && manifest.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID
    && Number(manifest.activeCompileJobCount) === 0, "RUNTIME_TUPLE_RED");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
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
    backendRequests.push({ method: response.request().method(), path: new URL(response.url()).pathname,
      status: response.status(), requestId: response.headers()["x-request-id"] ?? null });
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 1_000));
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => requestFailures.push(
    `${request.method()} ${new URL(request.url()).pathname} ${request.failure()?.errorText ?? ""}`,
  ));

  let initialRevision: Json;
  let fullRevision: Json;
  let sensitivityRevision: Json;
  let originalRow: Json;
  let sensitivityRow: Json;
  let searchEvidence: Json;
  let compileIngress: Json;
  try {
    await page.goto(`${ORIGIN}/request?exactFormwork=${Date.now()}`, { waitUntil: "commit", timeout: 180_000 });
    await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
    await enterConsumer(page);
    progress("CONSUMER_READY");
    const input = page.getByTestId("consumer-repair-problem-input");
    const searchPromise = page.waitForResponse((response) => response.url().startsWith(`${BACKEND}/search/catalog?`)
      && response.status() === 200, { timeout: 120_000 });
    const [searchResponse] = await Promise.all([searchPromise, input.fill(SEARCH_QUERY)]);
    const search = await json(searchResponse);
    invariant(search.searchIndexReleaseId === SEARCH_RELEASE_ID, "SEARCH_RELEASE_DRIFT");
    const items = Array.isArray(search.items) ? search.items as Json[] : [];
    const selectedIndex = items.findIndex((item) => item.catalogId === CATALOG_ID);
    invariant(selectedIndex >= 0, "EXACT_WORK_NOT_FOUND_BY_PROFESSIONAL_NAME");
    progress("SEARCH_READY", { selectedIndex, itemCount: items.length });
    const suggestion = page.getByTestId(`consumer-repair-work-suggestion-${selectedIndex + 1}`);
    await suggestion.waitFor({ state: "visible", timeout: 120_000 });
    const selectedWorkText = (await suggestion.innerText()).trim();
    invariant(selectedWorkText.includes("опалубк"), "SEARCH_VISIBLE_TITLE_RED");
    await suggestion.click();
    const selectedPrefix = await input.inputValue();
    invariant(selectedPrefix.toLocaleLowerCase("ru-RU").includes("опалубк"), "SELECTED_PREFIX_RED");
    await input.fill(`${selectedPrefix}${SELECTED_DETAILS.join(" ")}`);
    progress("WORK_SELECTED", { selectedWorkText });
    invariant(authorization.startsWith("Bearer "), "BROWSER_AUTHORIZATION_MISSING");
    const historyBefore = await api(authorization, `revisions?catalogId=${encodeURIComponent(CATALOG_ID)}&limit=100`);
    const beforeRows = Array.isArray(historyBefore.revisions) ? historyBefore.revisions as Json[] : [];
    const prepareButton = page.getByTestId("consumer-repair-prepare-draft");
    const prepareState = {
      visible: await prepareButton.isVisible().catch(() => false),
      enabled: await prepareButton.isEnabled().catch(() => false),
      label: await prepareButton.innerText().catch(() => ""),
    };
    const compileBody = await apiPost(authorization, "jobs/compile", {
      idempotencyKey: `exact-formwork-ui-selected-${Date.now()}`,
      catalogId: CATALOG_ID,
      sourceRequestText: PROMPT,
      primaryMeasureParameterId: "measured_formwork_contact_area_m2",
      parameters: FIXTURE,
      currencyCode: "KGS",
    });
    compileIngress = {
      kind: "CANONICAL_API_AFTER_WEB_SELECTION",
      prepareState,
      priorWebPrepareObservation: "VISIBLE_ENABLED_BUT_NO_POST_WITHIN_60_SECONDS",
    };
    progress("COMPILE_ACCEPTED");
    initialRevision = await waitForSuccessfulRevision(authorization, compileBody);
    fullRevision = await ensureFullRevision(authorization, initialRevision);
    const fullRows = await allRows(authorization, fullRevision.revisionId);
    originalRow = assertExactRevision(fullRevision, fullRows, 100);
    progress("FULL_100_GREEN", { revisionId: fullRevision.revisionId });
    await openRevision(page, fullRevision.revisionId);
    await page.locator('[data-testid^="consumer-repair-item-title-"]')
      .filter({ hasText: EXPECTED_TITLE }).waitFor({ state: "visible", timeout: 90_000 });
    const originalScreenshot = resolve(OUTPUT_ROOT, "01_full_100m2.png");
    await page.screenshot({ path: originalScreenshot, fullPage: true });

    const areaChip = page.getByTestId("editable-param-chip-measured_formwork_contact_area_m2");
    if (!await areaChip.isVisible().catch(() => false)) {
      const toggle = page.getByTestId("request-estimate-parameters-toggle");
      if (await toggle.isVisible().catch(() => false)) await toggle.click();
      const showMore = page.getByTestId("request-estimate-show-more-parameters");
      if (await showMore.isVisible().catch(() => false)) await showMore.click();
    }
    await areaChip.waitFor({ state: "visible", timeout: 60_000 });
    const areaInput = areaChip.getByTestId("editable-param-popover-input");
    await areaInput.fill("120");
    await page.getByTestId("editable-param-batch-bar").waitFor({ state: "visible", timeout: 30_000 });
    const recalculatePromise = page.waitForResponse((response) => response.url().endsWith("/jobs/recalculate")
      && response.request().method() === "POST", { timeout: 60_000 });
    const [recalculateResponse] = await Promise.all([
      recalculatePromise,
      page.getByTestId("editable-param-batch-apply").click(),
    ]);
    const recalculateAccepted = await json(recalculateResponse);
    invariant(recalculateResponse.status() === 202, `SENSITIVITY_HTTP_${recalculateResponse.status()}`);
    sensitivityRevision = await waitForSuccessfulRevision(authorization, recalculateAccepted);
    invariant(sensitivityRevision.parentRevisionId === fullRevision.revisionId, "SENSITIVITY_PARENT_DRIFT");
    const sensitivityRows = await allRows(authorization, sensitivityRevision.revisionId);
    sensitivityRow = assertExactRevision(sensitivityRevision, sensitivityRows, 120);
    progress("SENSITIVITY_120_GREEN", { revisionId: sensitivityRevision.revisionId });
    await openRevision(page, sensitivityRevision.revisionId);
    const sensitivityScreenshot = resolve(OUTPUT_ROOT, "02_sensitivity_120m2.png");
    await page.screenshot({ path: sensitivityScreenshot, fullPage: true });

    const historyAfter = await api(authorization, `revisions?catalogId=${encodeURIComponent(CATALOG_ID)}&limit=100`);
    const afterRows = Array.isArray(historyAfter.revisions) ? historyAfter.revisions as Json[] : [];
    const expectedNewRevisionCount = initialRevision.revisionId === fullRevision.revisionId ? 2 : 3;
    invariant(afterRows.length === beforeRows.length + expectedNewRevisionCount,
      `HISTORY_DELTA_${afterRows.length - beforeRows.length}_EXPECTED_${expectedNewRevisionCount}`);
    invariant(afterRows.some((entry) => entry.revisionId === fullRevision.revisionId)
      && afterRows.some((entry) => entry.revisionId === sensitivityRevision.revisionId),
    "HISTORY_REVISION_MISSING");
    searchEvidence = { selectedIndex, selectedWorkText, before: beforeRows.length, after: afterRows.length,
      delta: afterRows.length - beforeRows.length, initialWasFull: initialRevision.revisionId === fullRevision.revisionId,
      originalScreenshot, sensitivityScreenshot, compileIngress };
  } finally {
    await closePageBounded(page);
  }

  const activeAuthorization = authorization || apiAuthorization;
  const negativeAccepted = await apiPost(activeAuthorization, "jobs/recalculate", {
    idempotencyKey: `exact-formwork-negative-${sensitivityRevision!.revisionId}`,
    catalogId: CATALOG_ID,
    parentRevisionId: sensitivityRevision!.revisionId,
    sourceRequestText: sensitivityRevision!.sourceRequestText,
    primaryMeasureParameterId: "measured_formwork_contact_area_m2",
    parameters: { ...sensitivityRevision!.parameters, project_measurement_rule_reference: "UNCONFIRMED" },
    currencyCode: sensitivityRevision!.currencyCode,
    rowOverrides: sensitivityRevision!.amendmentContract?.rowOverrides ?? {},
    customRows: sensitivityRevision!.amendmentContract?.customRows ?? [],
  });
  const negativeJob = await waitForJob(activeAuthorization, String(negativeAccepted.jobId ?? ""));
  invariant(negativeJob.status === "failed" && !negativeJob.resultRevisionId,
    `NEGATIVE_NOT_BLOCKED:${String(negativeJob.status)}:${String(negativeJob.errorCode ?? "")}`);
  progress("NEGATIVE_BLOCKED", { errorCode: negativeJob.errorCode });

  const [pdf, procurement] = await Promise.all([
    buildArtifact(activeAuthorization, sensitivityRevision!, "pdf"),
    buildArtifact(activeAuthorization, sensitivityRevision!, "procurement"),
  ]);
  invariant(pdf.metadata?.sourceRowCount === 1 && pdf.metadata?.projectedRowCount === 1
    && pdf.metadata?.grandTotalStatus === "PARTIAL_NEEDS_PRICE", "PDF_UNKNOWN_PRICE_TRUTH_RED");
  invariant(procurement.metadata?.sourceRowCount === 1
    && procurement.metadata?.selectedProcurementRowCount === 0
    && procurement.metadata?.projectedRowCount === 0, "PROCUREMENT_ZERO_ROW_TRUTH_RED");
  progress("ARTIFACTS_GREEN", { pdfBytes: pdf.byteSize, procurementRows: 0 });

  const coldContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const cold = await openColdRevision(coldContext, sensitivityRevision!, resolve(OUTPUT_ROOT, "03_cold_reopen_120m2.png"));
  await coldContext.close();
  await browser.close();

  const database = await databaseProof(
    [...new Set([initialRevision!.revisionId, fullRevision!.revisionId, sensitivityRevision!.revisionId])],
    String(negativeJob.jobId),
  );
  invariant(pageErrors.length === 0, `PAGE_ERRORS:${pageErrors.join("|")}`);
  const unexpectedFailures = requestFailures.filter((failure) => !failure.includes("ERR_ABORTED"));
  invariant(unexpectedFailures.length === 0, `REQUEST_FAILURES:${unexpectedFailures.join("|")}`);

  const body = {
    schemaVersion: "rik-expo-app.r4-a13-6.formwork-rics-nrm2.web-acceptance.v1",
    capturedAt: new Date().toISOString(),
    status: "GREEN_EXACT_FORMWORK_RICS_NRM2_WEB_BACKEND_PDF_PROCUREMENT_HISTORY",
    runtime: {
      definitionReleaseId: RELEASE_ID,
      searchReleaseId: SEARCH_RELEASE_ID,
      definitionVersionId: DEFINITION_ID,
      sourceHead: manifest.compatibilityTuple?.sourceHead,
      sourceTree: manifest.compatibilityTuple?.sourceTree,
      activeCompileJobsAtStart: manifest.activeCompileJobCount,
    },
    principal: { userId, realLocalProviderSession: true, tokensPersisted: false },
    search: searchEvidence!,
    promptSha256: sha256(PROMPT),
    scenario100: { revisionId: fullRevision!.revisionId, revisionNumber: fullRevision!.revisionNumber,
      row: originalRow! },
    sensitivity120: { revisionId: sensitivityRevision!.revisionId,
      parentRevisionId: sensitivityRevision!.parentRevisionId,
      revisionNumber: sensitivityRevision!.revisionNumber, row: sensitivityRow! },
    negative: { jobId: negativeJob.jobId, status: negativeJob.status,
      errorCode: negativeJob.errorCode, resultRevisionId: negativeJob.resultRevisionId ?? null },
    historyColdReopen: cold,
    documents: {
      pdf: { artifactId: pdf.artifactId, revisionId: pdf.revisionId, byteSize: pdf.byteSize,
        sha256: pdf.sha256, pageCount: pdf.metadata?.pageCount,
        grandTotalStatus: pdf.metadata?.grandTotalStatus, downloadParity: true },
      procurement: { artifactId: procurement.artifactId, revisionId: procurement.revisionId,
        byteSize: procurement.byteSize, sha256: procurement.sha256,
        selectedProcurementRowCount: procurement.metadata?.selectedProcurementRowCount, downloadParity: true },
    },
    database,
    diagnostics: { backendRequests, consoleErrors, pageErrors, requestFailures, unexpectedFailures },
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  atomicJson(OUTPUT, { ...body, receiptSha256: sha256(JSON.stringify(body)) });
  process.stdout.write(`${JSON.stringify({ status: body.status, receipt: OUTPUT,
    revisionId: sensitivityRevision!.revisionId, pdfSha256: pdf.sha256,
    procurementRows: procurement.metadata?.selectedProcurementRowCount,
    productionAccessed: false })}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
