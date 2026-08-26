import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { chromium, type Page, type Response } from "playwright";

import { isCanonicalEstimateUserEditableParameter } from "../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics";
import {
  defineCanonicalEstimateHarnessWrapper,
  runCanonicalEstimateAcceptanceHarness,
  type CanonicalHarnessWrapper,
} from "../_shared/canonicalEstimateAcceptanceHarness";

type Json = Record<string, any>;

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_REF = "nxrnjywzxxfdpqmzjorh";
const EMULATOR_LOOPBACK_HOST = "10.0.2.2";
const LOCAL_SUPABASE_STORAGE_KEYS = ["sb-127-auth-token", "sb-10-auth-token"];
const MASTER = resolve("C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (8).md");
const MASTER_SHA256 = "9402f9cb2b9e0891ea1eb0179f4c4f5832c0b5f4d23e98121667095c9bc285c8";
const DEFAULT_BACKEND = resolve(".release-runtime/real-professional-estimates-r4/evidence/04-repair/batch002/BATCH002_BACKEND_REVISION_PARITY_R55.json");
const DEFAULT_OUTPUT = resolve(".release-runtime/real-professional-estimates-r4/evidence/05-web/batch002");
const BATCH001_DEFAULT_BACKEND = resolve(".release-runtime/real-professional-estimates-r4/evidence/09-batch001-r56/backend/BATCH001_BACKEND_REVISION_PARITY_R56.json");
const BATCH001_DEFAULT_OUTPUT = resolve(".release-runtime/real-professional-estimates-r4/evidence/09-batch001-r56/web");
const BATCH001_DEFAULT_MANIFEST = resolve(".release-runtime/real-professional-estimates-r4/evidence/09-batch001-r56/matrix/BATCH001_R56_WEB_MATRIX50_MANIFEST.json");
const BATCH003_DEFAULT_BACKEND = resolve(".release-runtime/real-professional-estimates-r4/evidence/10-batch003-r56/backend/BATCH003_BACKEND_REVISION_PARITY_R56.json");
const BATCH003_DEFAULT_OUTPUT = resolve(".release-runtime/real-professional-estimates-r4/evidence/10-batch003-r56/web");
const BATCH003_DEFAULT_MANIFEST = resolve(".release-runtime/real-professional-estimates-r4/evidence/10-batch003-r56/matrix/BATCH003_R56_WEB_MATRIX50_MANIFEST.json");
const BATCH004_DEFAULT_BACKEND = resolve(".release-runtime/real-professional-estimates-r4/evidence/11-batch004-r56/backend/BATCH004_BACKEND_REVISION_PARITY_R56.json");
const BATCH004_DEFAULT_OUTPUT = resolve(".release-runtime/real-professional-estimates-r4/evidence/11-batch004-r56/web");
const BATCH004_DEFAULT_MANIFEST = resolve(".release-runtime/real-professional-estimates-r4/evidence/11-batch004-r56/matrix/BATCH004_R56_WEB_MATRIX50_MANIFEST.json");
const FINAL_BINDING = resolve(".release-runtime/real-professional-estimates-r4/evidence/06-android/batch002/FINAL_RELEASE_REVISION_BINDING_MANIFEST.json");
const COMPONENT_LEDGER = resolve(".release-runtime/real-professional-estimates-r4/evidence/06-android/batch002/COMPONENT_SOURCE_IDENTITY_AND_IMPACT_LEDGER.json");
const FORBIDDEN = /(?:worker_h|man_hour|machine_h|поставка состава|рабочая детализация|входное обследование|входн(?:ой|ого)\s+контрол|контроль\s+качества|контроль\s+выполнения|журнал|акт\b|испытани|координац|комплект документац)/iu;
const MOJIBAKE = /(?:\uFFFD|[РС][\u0080-\u00BF\u0400-\u040F\u0450-\u045F\u2010-\u203A])/u;

function argument(name: string, fallback = ""): string {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function base64Url(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function proofSession(): Json {
  const issuedAt = Math.floor(Date.now() / 1_000) - 60;
  const expiresAt = issuedAt + 86_400;
  const email = "batch002-r4-web-role-matrix@example.invalid";
  return {
    access_token: `${base64Url({ alg: "none", typ: "JWT" })}.${base64Url({
      aud: "authenticated", exp: expiresAt, iat: issuedAt, sub: OWNER_ID, role: "authenticated", email,
    })}.proof`,
    token_type: "bearer",
    expires_in: 86_400,
    expires_at: expiresAt,
    refresh_token: "proof-refresh-disabled",
    user: {
      id: OWNER_ID, aud: "authenticated", role: "authenticated", email,
      email_confirmed_at: new Date(issuedAt * 1_000).toISOString(), phone: "",
      app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, identities: [],
      created_at: new Date(issuedAt * 1_000).toISOString(), updated_at: new Date(issuedAt * 1_000).toISOString(),
    },
  };
}

async function responseJson(response: Response): Promise<Json> {
  try { return await response.json() as Json; } catch { return {}; }
}

async function api(apiRoot: string, path: string): Promise<Json> {
  const response = await fetch(`${apiRoot}/${path.replace(/^\/+/, "")}`, {
    headers: { Accept: "application/json", Authorization: "Bearer local-dev-runtime-token" },
    signal: AbortSignal.timeout(60_000),
  });
  const body = await response.json().catch(() => null) as Json | null;
  if (!response.ok) throw new Error(`BATCH002_R4_WEB_API_${response.status}:${path}:${JSON.stringify(body)}`);
  return body ?? {};
}

async function waitJob(apiRoot: string, jobId: string): Promise<Json> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const job = await api(apiRoot, `jobs/${jobId}`);
    if (job.status === "succeeded") return job;
    if (job.status === "failed" || job.status === "cancelled") throw new Error(`BATCH002_R4_WEB_JOB_${job.status}:${jobId}:${job.errorCode}`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
  }
  throw new Error(`BATCH002_R4_WEB_JOB_TIMEOUT:${jobId}`);
}

function allFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? allFiles(path) : [path];
  });
}

function bundleReachability(bundleRoot: string): Json {
  const tokens = [
    "BATCH002_DRYWALL_SUCCESSOR_R3_CONTRACT",
    "real-professional-estimates-r3.batch002-drywall-successor.v1",
    "buildAllBatch002DrywallSuccessorsR3",
    "drywallBatch002EngineeringSourcesR4",
    "CONTENT_SUBJECT_AUDIT_GREEN_BACKEND_REPLAY_PENDING_R55",
    "BATCH001_DRYWALL_SUCCESSOR_R3_CONTRACT",
    "buildAllBatch001DrywallSuccessorsR3",
    "drywallBatch001EngineeringSourcesR56",
    "CONTENT_RECONCILIATION_GREEN_BACKEND_REPLAY_PENDING_R56",
    "evaluateFormulaGraph",
  ];
  const counts = Object.fromEntries(tokens.map((token) => [token, 0]));
  const javascript = allFiles(bundleRoot).filter((path) => /\.(?:js|mjs)$/iu.test(path));
  let totalBytes = 0;
  for (const path of javascript) {
    const body = readFileSync(path, "utf8");
    totalBytes += statSync(path).size;
    for (const token of tokens) counts[token] += body.split(token).length - 1;
  }
  return {
    javascriptFiles: javascript.length,
    totalBytes,
    forbiddenCompilerTokenCounts: counts,
    status: Object.values(counts).every((count) => count === 0) ? "GREEN" : "RED",
  };
}

async function exactSuggestion(page: Page, catalogId: string) {
  const suggestions = page.locator('[data-testid^="foreman-ai-estimate-work-suggestion-"]');
  const exact = suggestions.filter({ hasText: catalogId }).first();
  await exact.waitFor({ state: "visible", timeout: 60_000 });
  invariant((await exact.innerText()).includes(catalogId), `BATCH002_R4_WEB_EXACT_SUGGESTION_RED:${catalogId}`);
  return exact;
}

async function exposeAllParameters(page: Page): Promise<void> {
  const cards = page.locator('[data-testid^="canonical-estimate-parameter-card-"]');
  if (await cards.count() === 0) await page.getByTestId("canonical-estimate-refine-parameters").click();
  const expand = page.getByTestId("canonical-estimate-expand-parameters");
  if (await expand.isVisible().catch(() => false) && /Показать все/iu.test(await expand.innerText())) await expand.click();
  await cards.first().waitFor({ state: "visible", timeout: 30_000 });
}

async function selectCatalog(
  page: Page,
  catalogId: string,
  revisionId?: string,
): Promise<{ catalog: Json; history: Json; revision: Json; rows: Json }> {
  const input = page.getByTestId("foreman-ai-estimate-input");
  await input.fill("");
  const searchResponse = page.waitForResponse((response) => response.request().method() === "GET"
    && response.url().includes("/canonical-estimate/search/catalog?") && response.status() === 200, { timeout: 60_000 });
  await input.fill(catalogId);
  await searchResponse;
  const suggestion = await exactSuggestion(page, catalogId);
  const catalogResponse = page.waitForResponse((response) => response.request().method() === "GET"
    && new URL(response.url()).pathname.endsWith(`/canonical-estimate/catalog/${catalogId}`)
    && response.status() === 200, { timeout: 60_000 });
  const historyResponse = page.waitForResponse((response) => response.request().method() === "GET"
    && response.url().includes(`/revisions?catalogId=${encodeURIComponent(catalogId)}`)
    && response.status() === 200, { timeout: 60_000 });
  await suggestion.click();
  const catalog = await responseJson(await catalogResponse);
  const history = await responseJson(await historyResponse);
  await page.getByTestId("canonical-estimate-parameter-form").waitFor({ state: "visible", timeout: 60_000 });
  const revisions = Array.isArray(history.revisions) ? history.revisions as Json[] : [];
  const target = revisionId ? revisions.find((item) => item.revisionId === revisionId) : revisions[0];
  invariant(target?.revisionId, `BATCH002_R4_WEB_HISTORY_TARGET_MISSING:${catalogId}:${revisionId ?? "latest"}`);
  const rowsResponse = page.waitForResponse((response) => response.request().method() === "GET"
    && new URL(response.url()).pathname.endsWith(`/revisions/${target.revisionId}/rows`)
    && response.status() === 200, { timeout: 60_000 });
  await page.getByTestId(`canonical-estimate-history-revision-${target.revisionNumber}-${target.revisionId}`).click();
  const rows = await responseJson(await rowsResponse);
  await page.getByTestId("canonical-estimate-selected-catalog-id").filter({ hasText: catalogId })
    .waitFor({ state: "visible", timeout: 60_000 });
  return { catalog: catalog.item, history, revision: target, rows };
}

async function _ordinaryUserCase(page: Page, catalogId: string, revisionId: string, releaseId: string): Promise<Json> {
  const opened = await selectCatalog(page, catalogId, revisionId);
  await exposeAllParameters(page);
  const apiRows = opened.rows.rows as Json[];
  const names = await page.getByTestId("foreman-ai-estimate-row-name").evaluateAll((nodes) => nodes.map((node) => (node as HTMLInputElement).value));
  const quantities = await page.getByTestId("foreman-ai-estimate-row-qty").evaluateAll((nodes) => nodes.map((node) => (node as HTMLInputElement).value));
  const parameterCards = page.locator('[data-testid^="canonical-estimate-parameter-card-"]');
  const parameterCount = await parameterCards.count();
  const visibleParameters = (opened.catalog.parameterSchema as Json[]).filter((parameter) => parameter.visibilityRole === "USER_INPUT");
  const blockers = [
    opened.revision.releaseId === releaseId ? "" : "RELEASE_ID_MISMATCH",
    apiRows.length > 0 && apiRows.length === names.length && names.length === quantities.length ? "" : "ROW_COUNT_MISMATCH",
    apiRows.every((row, index) => row.titleRu === names[index] && Number(row.quantity) === Number(quantities[index])) ? "" : "ROW_UI_API_PARITY_RED",
    names.every((title) => /[а-яё]/iu.test(title) && !FORBIDDEN.test(title) && !MOJIBAKE.test(title)) ? "" : "ROW_LANGUAGE_OR_NOISE_RED",
    parameterCount === visibleParameters.length && parameterCount <= 15 ? "" : `PARAMETER_COUNT_RED:${parameterCount}/${visibleParameters.length}`,
    (await page.getByTestId("canonical-estimate-release-id-top").innerText()).includes(releaseId) ? "" : "VISIBLE_RELEASE_RED",
  ].filter(Boolean);
  return {
    role: "ORDINARY_USER",
    catalogId,
    revisionId: opened.revision.revisionId,
    releaseId: opened.revision.releaseId,
    visibleRows: names.length,
    visibleParameters: parameterCount,
    backendUiRowParity: blockers.includes("ROW_UI_API_PARITY_RED") ? "RED" : "GREEN",
    simpleRussianContent: blockers.includes("ROW_LANGUAGE_OR_NOISE_RED") ? "RED" : "GREEN",
    blockers,
    status: blockers.length === 0 ? "GREEN" : "RED",
  };
}

async function buildArtifact(page: Page, apiRoot: string, revisionId: string, kind: "pdf" | "procurement"): Promise<Json> {
  const acceptedResponse = page.waitForResponse((response) => response.request().method() === "POST"
    && new URL(response.url()).pathname.endsWith(`/revisions/${revisionId}/artifacts/${kind}`)
    && response.status() === 202, { timeout: 60_000 });
  await page.getByTestId(`canonical-estimate-artifact-${kind}-top`).click();
  const accepted = await responseJson(await acceptedResponse);
  await waitJob(apiRoot, String(accepted.jobId));
  const readKind = kind === "pdf" ? "professional_pdf" : kind;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const artifact = await api(apiRoot, `revisions/${revisionId}/artifacts/${readKind}`);
    if (artifact.status === "ready") return artifact;
    if (artifact.status === "failed") throw new Error(`BATCH002_R4_WEB_ARTIFACT_FAILED:${revisionId}:${kind}`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
  }
  throw new Error(`BATCH002_R4_WEB_ARTIFACT_TIMEOUT:${revisionId}:${kind}`);
}

async function _estimatorCase(page: Page, apiRoot: string, catalogId: string, releaseId: string): Promise<Json> {
  const opened = await selectCatalog(page, catalogId);
  const parentRows = opened.rows.rows as Json[];
  const materialIndex = parentRows.findIndex((row) => row.category === "material");
  invariant(materialIndex >= 0, `BATCH002_R4_WEB_MATERIAL_ROW_MISSING:${catalogId}`);
  const priceInput = page.getByTestId("foreman-ai-estimate-row-price").nth(materialIndex);
  const beforePrice = Number(await priceInput.inputValue()) || 0;
  const afterPrice = Math.round((beforePrice + 7.25) * 100) / 100;
  await priceInput.fill(String(afterPrice));
  const acceptedResponse = page.waitForResponse((response) => response.request().method() === "POST"
    && response.url().endsWith("/jobs/recalculate") && response.status() === 202, { timeout: 60_000 });
  await page.getByTestId("canonical-row-apply").nth(materialIndex).click();
  const accepted = await responseJson(await acceptedResponse);
  const job = await waitJob(apiRoot, String(accepted.jobId));
  const child = await api(apiRoot, `revisions/${job.resultRevisionId}`);
  const childRows = await api(apiRoot, `revisions/${job.resultRevisionId}/rows?limit=200`);
  await page.getByTestId(`canonical-estimate-history-revision-${child.revisionNumber}-${child.revisionId}`)
    .waitFor({ state: "visible", timeout: 60_000 });
  const physicalParity = JSON.stringify(parentRows.map((row) => [row.rowId, row.quantity]))
    === JSON.stringify((childRows.rows as Json[]).map((row) => [row.rowId, row.quantity]));
  const pdf = await buildArtifact(page, apiRoot, child.revisionId, "pdf");
  const procurement = await buildArtifact(page, apiRoot, child.revisionId, "procurement");
  const blockers = [
    child.parentRevisionId === opened.revision.revisionId ? "" : "CHILD_PARENT_RED",
    child.releaseId === releaseId ? "" : "CHILD_RELEASE_RED",
    physicalParity ? "" : "PRICE_EDIT_CHANGED_PHYSICAL_QUANTITIES",
    String(child.totals?.amount) !== String(opened.revision.totals?.amount) ? "" : "PRICE_EDIT_TOTAL_UNCHANGED",
    pdf.status === "ready" && pdf.revisionId === child.revisionId && pdf.releaseId === releaseId ? "" : "PDF_PARITY_RED",
    procurement.status === "ready" && procurement.revisionId === child.revisionId && procurement.releaseId === releaseId ? "" : "PROCUREMENT_PARITY_RED",
  ].filter(Boolean);
  return {
    role: "ESTIMATOR",
    catalogId,
    parentRevisionId: opened.revision.revisionId,
    childRevisionId: child.revisionId,
    priceEdit: { rowId: parentRows[materialIndex].rowId, before: beforePrice, after: afterPrice },
    physicalQuantitiesUnchanged: physicalParity,
    totalBefore: opened.revision.totals?.amount,
    totalAfter: child.totals?.amount,
    pdf: { artifactId: pdf.artifactId, sha256: pdf.sha256, revisionId: pdf.revisionId },
    procurement: { artifactId: procurement.artifactId, sha256: procurement.sha256, revisionId: procurement.revisionId },
    blockers,
    status: blockers.length === 0 ? "GREEN" : "RED",
  };
}

async function _engineerCase(page: Page, catalogId: string): Promise<Json> {
  const opened = await selectCatalog(page, catalogId);
  await exposeAllParameters(page);
  const toggle = page.getByTestId("canonical-estimate-parameter-truth-toggle-0");
  const panel = page.getByTestId("canonical-estimate-parameter-truth-0");
  if (!await panel.isVisible().catch(() => false)) await toggle.click();
  await panel.waitFor({ state: "visible", timeout: 30_000 });
  const truth = await panel.innerText();
  const label = await page.getByTestId("canonical-estimate-parameter-label-0").innerText();
  const guide = await page.getByTestId("canonical-estimate-parameter-guide-0").innerText();
  const rowSections = await page.getByTestId("foreman-ai-estimate-row").allInnerTexts();
  const blockers = [
    /[а-яё]/iu.test(label) && /[а-яё]/iu.test(guide) ? "" : "PARAMETER_LANGUAGE_RED",
    ["Путеводитель:", "Документ:", "Точный пункт/таблица/формула:", "Формулы:", "Ветви ресурсов:", "Проверено:"].every((token) => truth.includes(token)) ? "" : "ENGINEERING_TRUTH_FIELDS_MISSING",
    !/не подтвержден|ТРЕБУЕТСЯ УТОЧНИТЬ/iu.test(truth) ? "" : "ENGINEERING_TRUTH_UNCONFIRMED",
    rowSections.every((text) => !FORBIDDEN.test(text) && !MOJIBAKE.test(text)) ? "" : "ENGINEERING_ROW_NOISE_RED",
  ].filter(Boolean);
  return {
    role: "CONSTRUCTION_ENGINEER",
    catalogId,
    revisionId: opened.revision.revisionId,
    parameterLabel: label,
    parameterGuide: guide,
    engineeringTruthText: truth,
    visibleRowsReviewed: rowSections.length,
    blockers,
    status: blockers.length === 0 ? "GREEN" : "RED",
  };
}

async function exposeConsumerParameters(page: Page, expectedParameterIds: string[]): Promise<number> {
  const panel = page.getByTestId("request-estimate-parameter-panel");
  if (!await panel.isVisible().catch(() => false)) await page.getByTestId("request-estimate-parameters-toggle").click();
  await panel.waitFor({ state: "visible", timeout: 30_000 });
  const showMore = page.getByTestId("request-estimate-show-more-parameters");
  if (await showMore.isVisible().catch(() => false)) await showMore.click();
  const filledToggle = page.getByTestId("request-estimate-filled-parameters-toggle");
  if (await filledToggle.isVisible().catch(() => false) && /Показать/iu.test(await filledToggle.innerText())) await filledToggle.click();
  if (expectedParameterIds.length === 0) {
    await page.getByTestId("request-estimate-no-editable-parameters").waitFor({ state: "visible", timeout: 30_000 });
  } else {
    for (const parameterId of expectedParameterIds) {
      await page.getByTestId(`editable-param-chip-${parameterId}`).waitFor({ state: "visible", timeout: 30_000 });
    }
  }
  const cards = panel.locator('[data-testid^="editable-param-chip-"]');
  await page.waitForFunction(
    ({ expected }) => document.querySelectorAll('[data-testid^="editable-param-chip-"]').length === expected,
    { expected: expectedParameterIds.length },
    { timeout: 30_000 },
  );
  return cards.count();
}

async function openConsumerRevision(
  page: Page,
  baseUrl: string,
  apiRoot: string,
  catalogId: string,
  revisionId: string,
  caseId: string,
): Promise<{ catalog: Json; revision: Json; rows: Json[]; parameterSnapshot: Json }> {
  await page.goto(`${baseUrl}/request?canonicalRevisionId=${encodeURIComponent(revisionId)}&r4case=${encodeURIComponent(caseId)}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.getByTestId("consumer-repair-screen").waitFor({ state: "visible", timeout: 120_000 });
  await page.getByTestId(`request-estimate-selected-catalog-id-${catalogId}`).waitFor({ state: "visible", timeout: 60_000 });
  await page.getByTestId("request-estimate-positions-panel").waitFor({ state: "visible", timeout: 60_000 });
  await page.getByTestId("consumer-repair-status")
    .filter({ hasText: "Загружаем параметры выбранной версии сметы" })
    .waitFor({ state: "hidden", timeout: 30_000 });
  const statusTexts = await page.getByTestId("consumer-repair-status").allInnerTexts();
  invariant(
    statusTexts.every((text) => !/(?:не удалось|недоступ|не открыта|ошиб)/iu.test(text)),
    `BATCH002_R5_CONSUMER_READY_STATUS_RED:${revisionId}:${JSON.stringify(statusTexts)}`,
  );
  const [catalogResponse, revision, rowResponse, parameterSnapshot] = await Promise.all([
    api(apiRoot, `catalog/${catalogId}`),
    api(apiRoot, `revisions/${revisionId}`),
    api(apiRoot, `revisions/${revisionId}/rows?limit=200`),
    api(apiRoot, `revisions/${revisionId}/parameter-session`),
  ]);
  invariant(parameterSnapshot.revision?.revisionId === revisionId, `BATCH002_R5_PARAMETER_SESSION_REVISION_RED:${revisionId}`);
  invariant(parameterSnapshot.catalog?.catalogId === catalogId, `BATCH002_R5_PARAMETER_SESSION_CATALOG_RED:${catalogId}`);
  invariant(parameterSnapshot.catalog?.releaseId === revision.releaseId, `BATCH002_R5_PARAMETER_SESSION_RELEASE_RED:${catalogId}`);
  const rows = rowResponse.rows as Json[];
  await page.waitForFunction(({ expected, stableMs }) => {
    const selectors = [
      '[data-testid^="consumer-repair-item-consumer_item_"]',
      '[data-testid^="consumer-repair-item-quantity-input-"]',
      '[data-testid^="consumer-repair-item-unit-price-input-"]',
    ];
    const counts = selectors.map((selector) => document.querySelectorAll(selector).length);
    const signature = counts.join(":");
    const stateOwner = window as unknown as Record<string, { signature: string; since: number } | undefined>;
    const stateKey = "__batch001R56ExactRowReadiness";
    const previous = stateOwner[stateKey];
    if (!previous || previous.signature !== signature) {
      stateOwner[stateKey] = { signature, since: Date.now() };
      return false;
    }
    return counts.every((count) => count === expected) && Date.now() - previous.since >= stableMs;
  }, { expected: rows.length, stableMs: 750 }, { polling: 100, timeout: 30_000 });
  return { catalog: catalogResponse.item, revision, rows, parameterSnapshot };
}

async function consumerQuantityInputs(page: Page): Promise<{ label: string; quantity: number }[]> {
  return page.locator('[data-testid^="consumer-repair-item-quantity-input-"]').evaluateAll((nodes) => nodes.map((node) => ({
    label: String(node.getAttribute("aria-label") ?? ""),
    quantity: Number((node as HTMLInputElement).value),
  })));
}

function exactUiRowParity(rows: Json[], uiRows: { label: string; quantity: number }[]): boolean {
  if (rows.length === 0 || rows.length !== uiRows.length) return false;
  const unmatched = [...uiRows];
  for (const row of rows) {
    const index = unmatched.findIndex((candidate) => candidate.label.endsWith(String(row.titleRu))
      && candidate.quantity === Number(row.quantity));
    if (index < 0) return false;
    unmatched.splice(index, 1);
  }
  return unmatched.length === 0;
}

async function ordinaryConsumerCase(
  page: Page,
  baseUrl: string,
  apiRoot: string,
  catalogId: string,
  revisionId: string,
  releaseId: string,
  caseId: string,
): Promise<Json> {
  const opened = await openConsumerRevision(page, baseUrl, apiRoot, catalogId, revisionId, caseId);
  const rowCards = page.locator('[data-testid^="consumer-repair-item-consumer_item_"]');
  const titles = await rowCards.allInnerTexts();
  const uiRows = await consumerQuantityInputs(page);
  const visibleParameters = (opened.catalog.parameterSchema as Json[]).filter(isCanonicalEstimateUserEditableParameter);
  const parameterCount = await exposeConsumerParameters(page, visibleParameters.map((parameter) => String(parameter.parameterId)));
  const releaseText = await page.getByTestId("consumer-repair-draft-release-id").innerText();
  const blockers = [
    opened.revision.releaseId === releaseId ? "" : "RELEASE_ID_MISMATCH",
    opened.rows.length > 0 && titles.length === opened.rows.length && uiRows.length === opened.rows.length ? "" : "ROW_COUNT_MISMATCH",
    opened.rows.every((row) => titles.filter((title) => title.includes(String(row.titleRu))).length === 1)
      && exactUiRowParity(opened.rows, uiRows) ? "" : "ROW_UI_API_PARITY_RED",
    opened.rows.every((row) => /[а-яё]/iu.test(String(row.titleRu)) && !FORBIDDEN.test(String(row.titleRu)) && !MOJIBAKE.test(String(row.titleRu))) ? "" : "ROW_LANGUAGE_OR_NOISE_RED",
    parameterCount === visibleParameters.length && parameterCount <= 15 ? "" : `PARAMETER_COUNT_RED:${parameterCount}/${visibleParameters.length}`,
    releaseText.includes(revisionId) && releaseText.includes(releaseId) ? "" : "VISIBLE_REVISION_RELEASE_RED",
  ].filter(Boolean);
  return {
    role: "ORDINARY_USER",
    catalogId,
    revisionId,
    releaseId,
    visibleRows: titles.length,
    visibleQuantityInputs: uiRows.length,
    visibleParameters: parameterCount,
    backendUiRowParity: blockers.includes("ROW_UI_API_PARITY_RED") ? "RED" : "GREEN",
    simpleRussianContent: blockers.includes("ROW_LANGUAGE_OR_NOISE_RED") ? "RED" : "GREEN",
    blockers,
    status: blockers.length === 0 ? "GREEN" : "RED",
  };
}

async function buildConsumerArtifact(
  page: Page,
  apiRoot: string,
  revisionId: string,
  kind: "pdf" | "procurement",
): Promise<Json> {
  const acceptedResponse = page.waitForResponse((response) => response.request().method() === "POST"
    && new URL(response.url()).pathname.endsWith(`/revisions/${revisionId}/artifacts/${kind}`)
    && response.status() === 202, { timeout: 90_000 });
  try {
    await page.getByTestId(kind === "pdf" ? "consumer-estimate-make-pdf" : "consumer-estimate-open-procurement").first().click();
  } catch (error) {
    await acceptedResponse.catch(() => undefined);
    throw error;
  }
  const accepted = await responseJson(await acceptedResponse);
  if (accepted.jobId) {
    await waitJob(apiRoot, String(accepted.jobId));
  } else {
    invariant(accepted.artifactId && accepted.artifactStatus === "ready",
      `BATCH002_R52_ARTIFACT_ACCEPTANCE_IDENTITY_RED:${revisionId}:${kind}:${JSON.stringify(accepted)}`);
  }
  const readKind = kind === "pdf" ? "professional_pdf" : kind;
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const artifact = await api(apiRoot, `revisions/${revisionId}/artifacts/${readKind}`);
    if (artifact.status === "ready") return artifact;
    if (artifact.status === "failed") throw new Error(`BATCH002_R4_CONSUMER_ARTIFACT_FAILED:${revisionId}:${kind}`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
  }
  throw new Error(`BATCH002_R4_CONSUMER_ARTIFACT_TIMEOUT:${revisionId}:${kind}`);
}

async function estimatorConsumerCase(
  page: Page,
  baseUrl: string,
  apiRoot: string,
  catalogId: string,
  parentRevisionId: string,
  releaseId: string,
  caseId: string,
): Promise<Json> {
  const opened = await openConsumerRevision(page, baseUrl, apiRoot, catalogId, parentRevisionId, caseId);
  const materialIndex = opened.rows.findIndex((row) => row.category === "material");
  invariant(materialIndex >= 0, `BATCH002_R4_WEB_MATERIAL_ROW_MISSING:${catalogId}`);
  const priceInputs = page.locator('[data-testid^="consumer-repair-item-unit-price-input-"]');
  const priceLabels = await priceInputs.evaluateAll((nodes) => nodes.map((node) => String(node.getAttribute("aria-label") ?? "")));
  const materialUiIndex = priceLabels.findIndex((label) => label.endsWith(String(opened.rows[materialIndex].titleRu)));
  invariant(materialUiIndex >= 0, `BATCH002_R5_WEB_MATERIAL_UI_ROW_MISSING:${catalogId}`);
  const priceInput = priceInputs.nth(materialUiIndex);
  const beforePrice = Number(await priceInput.inputValue()) || 0;
  const afterPrice = Math.round((beforePrice + 7.25) * 100) / 100;
  const acceptedResponse = page.waitForResponse((response) => response.request().method() === "POST"
    && response.url().endsWith("/jobs/recalculate"), { timeout: 90_000 });
  await priceInput.fill(String(afterPrice));
  await priceInput.press("Tab");
  const acceptedHttp = await acceptedResponse;
  const accepted = await responseJson(acceptedHttp);
  invariant(acceptedHttp.status() === 202,
    `BATCH002_R52_RECALCULATE_HTTP_${acceptedHttp.status()}:${JSON.stringify(accepted.error ?? accepted)}`);
  const job = await waitJob(apiRoot, String(accepted.jobId));
  const childRevisionId = String(job.resultRevisionId);
  const child = await api(apiRoot, `revisions/${childRevisionId}`);
  const childRowsResponse = await api(apiRoot, `revisions/${childRevisionId}/rows?limit=200`);
  const childRows = childRowsResponse.rows as Json[];
  await page.getByTestId("consumer-repair-draft-release-id").filter({ hasText: childRevisionId })
    .waitFor({ state: "visible", timeout: 90_000 });
  const uiRows = await consumerQuantityInputs(page);
  const physicalParity = JSON.stringify(opened.rows.map((row) => [row.rowId, Number(row.quantity)]))
    === JSON.stringify(childRows.map((row) => [row.rowId, Number(row.quantity)]));
  const uiPhysicalParity = exactUiRowParity(childRows, uiRows);
  const procurement = await buildConsumerArtifact(page, apiRoot, childRevisionId, "procurement");
  await openConsumerRevision(page, baseUrl, apiRoot, catalogId, childRevisionId, `${caseId}-pdf`);
  const pdf = await buildConsumerArtifact(page, apiRoot, childRevisionId, "pdf");
  const blockers = [
    child.parentRevisionId === parentRevisionId ? "" : "CHILD_PARENT_RED",
    child.releaseId === releaseId ? "" : "CHILD_RELEASE_RED",
    physicalParity ? "" : "PRICE_EDIT_CHANGED_PHYSICAL_QUANTITIES",
    uiPhysicalParity ? "" : "PRICE_EDIT_UI_PHYSICAL_PARITY_RED",
    String(child.totals?.amount) !== String(opened.revision.totals?.amount) ? "" : "PRICE_EDIT_TOTAL_UNCHANGED",
    Number(childRows[materialIndex]?.unitPrice) === afterPrice ? "" : "PRICE_EDIT_NOT_PERSISTED",
    pdf.status === "ready" && pdf.revisionId === childRevisionId && pdf.releaseId === releaseId ? "" : "PDF_PARITY_RED",
    procurement.status === "ready" && procurement.revisionId === childRevisionId && procurement.releaseId === releaseId ? "" : "PROCUREMENT_PARITY_RED",
  ].filter(Boolean);
  return {
    role: "ESTIMATOR",
    catalogId,
    parentRevisionId,
    childRevisionId,
    priceEdit: { rowId: opened.rows[materialIndex].rowId, before: beforePrice, after: afterPrice },
    uiLogicalCommandCount: 1,
    physicalQuantitiesUnchanged: physicalParity,
    uiPhysicalQuantityParity: uiPhysicalParity,
    totalBefore: opened.revision.totals?.amount,
    totalAfter: child.totals?.amount,
    pdf: { artifactId: pdf.artifactId, sha256: pdf.sha256, revisionId: pdf.revisionId },
    procurement: { artifactId: procurement.artifactId, sha256: procurement.sha256, revisionId: procurement.revisionId },
    blockers,
    status: blockers.length === 0 ? "GREEN" : "RED",
  };
}

async function engineerConsumerCase(
  page: Page,
  baseUrl: string,
  apiRoot: string,
  catalogId: string,
  revisionId: string,
  caseId: string,
): Promise<Json> {
  const opened = await openConsumerRevision(page, baseUrl, apiRoot, catalogId, revisionId, caseId);
  const visibleParameters = (opened.catalog.parameterSchema as Json[]).filter(isCanonicalEstimateUserEditableParameter);
  const parameterCount = await exposeConsumerParameters(page, visibleParameters.map((parameter) => String(parameter.parameterId)));
  const firstParameter = visibleParameters[0];
  invariant(firstParameter?.parameterId, `BATCH002_R4_ENGINEER_PARAMETER_MISSING:${catalogId}`);
  const chip = page.getByTestId(`editable-param-chip-${firstParameter.parameterId}`);
  const guideToggle = page.getByTestId(`editable-param-guide-details-${firstParameter.parameterId}`);
  await guideToggle.click();
  const guideText = await chip.innerText();
  const normative = firstParameter.normativeLinks?.[0] as Json | undefined;
  const proofToggle = page.locator('[data-testid^="consumer-repair-item-professional-proof-"]').first();
  await proofToggle.click();
  const proofText = await page.locator('[data-testid^="consumer-repair-item-professional-proof-detail-"]').first().innerText();
  const rowTexts = await page.locator('[data-testid^="consumer-repair-item-consumer_item_"]').allInnerTexts();
  const blockers = [
    parameterCount > 0 && parameterCount <= 15 ? "" : `ENGINEERING_PARAMETER_COUNT_RED:${parameterCount}`,
    guideText.includes(String(firstParameter.titleRu)) ? "" : "ENGINEERING_PARAMETER_LABEL_MISSING",
    normative && guideText.includes(String(normative.documentTitleRu)) && guideText.includes(String(normative.locator)) ? "" : "ENGINEERING_NORMATIVE_SOURCE_MISSING",
    proofText.length > 30 && /формул|норм|источник/iu.test(proofText) ? "" : "ENGINEERING_ROW_PROOF_MISSING",
    rowTexts.every((text) => !FORBIDDEN.test(text) && !MOJIBAKE.test(text)) ? "" : "ENGINEERING_ROW_NOISE_RED",
  ].filter(Boolean);
  return {
    role: "CONSTRUCTION_ENGINEER",
    catalogId,
    revisionId,
    visibleParameters: parameterCount,
    inspectedParameterId: firstParameter.parameterId,
    engineeringGuideText: guideText,
    rowProfessionalProofText: proofText,
    visibleRowsReviewed: rowTexts.length,
    blockers,
    status: blockers.length === 0 ? "GREEN" : "RED",
  };
}

function nextNumericParameterValue(parameter: Json, current: number): number {
  const minimum = Number(parameter.constraints?.min);
  const maximum = Number(parameter.constraints?.max);
  const integer = parameter.valueType === "integer";
  const step = integer ? 1 : Math.max(0.5, Number(parameter.guide?.step) || 0.5);
  const increased = integer ? Math.ceil(current + step) : Math.round((current + step) * 1_000) / 1_000;
  if (!Number.isFinite(maximum) || increased <= maximum) return increased;
  const decreased = integer ? Math.floor(current - step) : Math.round((current - step) * 1_000) / 1_000;
  invariant(!Number.isFinite(minimum) || decreased >= minimum, `BATCH002_R52_SMOKE_PARAMETER_NO_ALTERNATE_VALUE:${parameter.parameterId}`);
  return decreased;
}

async function exactR52ContractJourney(
  page: Page,
  baseUrl: string,
  apiRoot: string,
  catalogId: string,
  parentRevisionId: string,
  releaseId: string,
  recalculateRequests: Json[],
): Promise<Json> {
  const traceStart = recalculateRequests.length;
  const opened = await openConsumerRevision(page, baseUrl, apiRoot, catalogId, parentRevisionId, "r52-contract-journey");
  const visibleParameters = (opened.catalog.parameterSchema as Json[]).filter(isCanonicalEstimateUserEditableParameter);
  const parameter = visibleParameters.find((candidate) =>
    ["decimal", "integer"].includes(String(candidate.valueType))
    && Number.isFinite(Number(opened.revision.parameters?.[candidate.parameterId]))
    && Array.isArray(candidate.formulaConsumers)
    && candidate.formulaConsumers.length > 0
  );
  invariant(parameter, `BATCH002_R52_SMOKE_EDITABLE_NUMERIC_PARAMETER_MISSING:${catalogId}`);
  await exposeConsumerParameters(page, visibleParameters.map((candidate) => String(candidate.parameterId)));
  const parameterId = String(parameter.parameterId);
  const parameterBefore = Number(opened.revision.parameters[parameterId]);
  const parameterAfter = nextNumericParameterValue(parameter, parameterBefore);
  invariant(parameterAfter !== parameterBefore, `BATCH002_R52_SMOKE_PARAMETER_VALUE_UNCHANGED:${parameterId}`);
  const parameterChip = page.getByTestId(`editable-param-chip-${parameterId}`);
  const parameterInput = parameterChip.getByTestId("editable-param-popover-input");
  await parameterInput.fill(String(parameterAfter));
  await page.getByTestId(`editable-param-dirty-${parameterId}`).waitFor({ state: "visible", timeout: 30_000 });
  const parameterAcceptedPromise = page.waitForResponse((response) => response.request().method() === "POST"
    && response.url().endsWith("/jobs/recalculate"), { timeout: 90_000 });
  await page.getByTestId("editable-param-batch-apply").click();
  const parameterAcceptedHttp = await parameterAcceptedPromise;
  const parameterAccepted = await responseJson(parameterAcceptedHttp);
  invariant(parameterAcceptedHttp.status() === 202,
    `BATCH002_R52_SMOKE_PARAMETER_RECALCULATE_${parameterAcceptedHttp.status()}:${JSON.stringify(parameterAccepted)}`);
  const parameterJob = await waitJob(apiRoot, String(parameterAccepted.jobId));
  const parameterChildRevisionId = String(parameterJob.resultRevisionId);
  const [parameterChild, parameterChildRowsResponse] = await Promise.all([
    api(apiRoot, `revisions/${parameterChildRevisionId}`),
    api(apiRoot, `revisions/${parameterChildRevisionId}/rows?limit=200`),
  ]);
  const parameterChildRows = parameterChildRowsResponse.rows as Json[];
  await page.getByTestId("consumer-repair-draft-release-id").filter({ hasText: parameterChildRevisionId })
    .waitFor({ state: "visible", timeout: 90_000 });
  await page.getByTestId(`estimate-revision-diff-param-${parameterId}`).waitFor({ state: "visible", timeout: 60_000 });
  await page.getByTestId("estimate-revision-timeline-r2").waitFor({ state: "visible", timeout: 60_000 });
  const changedQuantities = parameterChildRows.filter((row, index) =>
    Number(row.quantity) !== Number(opened.rows[index]?.quantity));
  invariant(parameterChild.parentRevisionId === parentRevisionId, "BATCH002_R52_SMOKE_PARAMETER_CHILD_PARENT_RED");
  invariant(parameterChild.releaseId === releaseId, "BATCH002_R52_SMOKE_PARAMETER_CHILD_RELEASE_RED");
  invariant(Number(parameterChild.parameters?.[parameterId]) === parameterAfter, "BATCH002_R52_SMOKE_PARAMETER_NOT_PERSISTED");
  invariant(changedQuantities.length > 0, "BATCH002_R52_SMOKE_PARAMETER_NO_PHYSICAL_DELTA");

  const materialRow = parameterChildRows.find((row) => row.category === "material");
  invariant(materialRow, `BATCH002_R52_SMOKE_MATERIAL_ROW_MISSING:${catalogId}`);
  const priceInputs = page.locator('[data-testid^="consumer-repair-item-unit-price-input-"]');
  const priceLabels = await priceInputs.evaluateAll((nodes) => nodes.map((node) => String(node.getAttribute("aria-label") ?? "")));
  const materialUiIndex = priceLabels.findIndex((label) => label.endsWith(String(materialRow.titleRu)));
  invariant(materialUiIndex >= 0, `BATCH002_R52_SMOKE_MATERIAL_UI_ROW_MISSING:${materialRow.rowId}`);
  const priceInput = priceInputs.nth(materialUiIndex);
  const priceBefore = Number(await priceInput.inputValue()) || 0;
  const priceAfter = Math.round((priceBefore + 4.25) * 100) / 100;
  const priceAcceptedPromise = page.waitForResponse((response) => response.request().method() === "POST"
    && response.url().endsWith("/jobs/recalculate"), { timeout: 90_000 });
  await priceInput.fill(String(priceAfter));
  await priceInput.press("Tab");
  const priceAcceptedHttp = await priceAcceptedPromise;
  const priceAccepted = await responseJson(priceAcceptedHttp);
  invariant(priceAcceptedHttp.status() === 202,
    `BATCH002_R52_SMOKE_PRICE_RECALCULATE_${priceAcceptedHttp.status()}:${JSON.stringify(priceAccepted)}`);
  const priceJob = await waitJob(apiRoot, String(priceAccepted.jobId));
  const priceChildRevisionId = String(priceJob.resultRevisionId);
  const [priceChild, priceChildRowsResponse] = await Promise.all([
    api(apiRoot, `revisions/${priceChildRevisionId}`),
    api(apiRoot, `revisions/${priceChildRevisionId}/rows?limit=200`),
  ]);
  const priceChildRows = priceChildRowsResponse.rows as Json[];
  const persistedPriceRow = priceChildRows.find((row) => row.rowId === materialRow.rowId);
  await page.getByTestId("consumer-repair-draft-release-id").filter({ hasText: priceChildRevisionId })
    .waitFor({ state: "visible", timeout: 90_000 });
  await page.getByTestId(`estimate-revision-diff-price-${materialRow.rowId}`).waitFor({ state: "visible", timeout: 60_000 });
  await page.getByTestId("estimate-revision-timeline-r3").waitFor({ state: "visible", timeout: 60_000 });
  invariant(priceChild.parentRevisionId === parameterChildRevisionId, "BATCH002_R52_SMOKE_PRICE_CHILD_PARENT_RED");
  invariant(priceChild.releaseId === releaseId, "BATCH002_R52_SMOKE_PRICE_CHILD_RELEASE_RED");
  invariant(Number(persistedPriceRow?.unitPrice) === priceAfter, "BATCH002_R52_SMOKE_PRICE_NOT_PERSISTED");
  invariant(exactUiRowParity(priceChildRows, await consumerQuantityInputs(page)), "BATCH002_R52_SMOKE_PRICE_CHILD_UI_API_RED");

  const revisionTimeline = page.getByTestId("estimate-revision-timeline");
  const editHistoryText = await revisionTimeline.innerText();
  invariant(["R1", "R2", "R3"].every((marker) => editHistoryText.includes(marker)),
    "BATCH002_R52_SMOKE_UI_HISTORY_TIMELINE_RED");
  const backendHistory = await api(apiRoot, `revisions?catalogId=${encodeURIComponent(catalogId)}&limit=100`);
  const historyIds = new Set((backendHistory.revisions as Json[]).map((revision) => String(revision.revisionId)));
  invariant([parentRevisionId, parameterChildRevisionId, priceChildRevisionId].every((id) => historyIds.has(id)),
    "BATCH002_R52_SMOKE_BACKEND_HISTORY_CHAIN_RED");

  await openConsumerRevision(page, baseUrl, apiRoot, catalogId, priceChildRevisionId, "r52-contract-pdf");
  const pdf = await buildConsumerArtifact(page, apiRoot, priceChildRevisionId, "pdf");
  await openConsumerRevision(page, baseUrl, apiRoot, catalogId, priceChildRevisionId, "r52-contract-procurement");
  const procurement = await buildConsumerArtifact(page, apiRoot, priceChildRevisionId, "procurement");
  invariant(procurement.revisionId === priceChildRevisionId && procurement.releaseId === releaseId,
    "BATCH002_R52_SMOKE_PROCUREMENT_REVISION_RED");
  invariant(pdf.revisionId === priceChildRevisionId && pdf.releaseId === releaseId,
    "BATCH002_R52_SMOKE_PDF_REVISION_RED");

  const journeyRequests = recalculateRequests.slice(traceStart);
  invariant(journeyRequests.length === 2, `BATCH002_R52_SMOKE_RECALCULATE_COUNT_${journeyRequests.length}_OF_2`);
  invariant(new Set(journeyRequests.map((request) => request.idempotencyKey)).size === 2,
    "BATCH002_R52_SMOKE_LOGICAL_COMMAND_IDENTITY_RED");
  return {
    status: "GREEN_R56_EXACT_CONTRACT_JOURNEY_NO_RELEASE",
    localAuthentication: "GREEN_INJECTED_LOOPBACK_SESSION_NO_EXTERNAL_IDP",
    catalogId,
    releaseId,
    parentRevisionId,
    parameterEdit: {
      parameterId,
      before: parameterBefore,
      after: parameterAfter,
      childRevisionId: parameterChildRevisionId,
      changedPhysicalRows: changedQuantities.length,
    },
    rowPriceEdit: {
      rowId: materialRow.rowId,
      before: priceBefore,
      after: priceAfter,
      childRevisionId: priceChildRevisionId,
    },
    history: { uiText: editHistoryText, exactBackendRevisionIds: [parentRevisionId, parameterChildRevisionId, priceChildRevisionId] },
    artifacts: {
      professionalPdf: { artifactId: pdf.artifactId, revisionId: pdf.revisionId, sha256: pdf.sha256 },
      procurement: { artifactId: procurement.artifactId, revisionId: procurement.revisionId, sha256: procurement.sha256 },
    },
    logicalRecalculateCommands: 2,
    physicalRecalculateRequests: journeyRequests.length,
    blockers: [],
  };
}

async function main(): Promise<void> {
  invariant(sha256(readFileSync(MASTER)) === MASTER_SHA256, "BATCH002_R4_WEB_MASTER_SHA_MISMATCH");
  const batch001Mode = argument("batch") === "BATCH-001";
  const batch003Mode = argument("batch") === "BATCH-003";
  const batch004Mode = argument("batch") === "BATCH-004";
  const matrix50Mode = batch001Mode || batch003Mode || batch004Mode;
  const baseUrl = argument("base-url", batch004Mode ? "http://127.0.0.1:8186"
    : batch003Mode ? "http://127.0.0.1:8184"
    : batch001Mode ? "http://127.0.0.1:8182" : "http://127.0.0.1:8172").replace(/\/+$/u, "");
  const apiRoot = argument("api-root", batch004Mode
    ? "http://127.0.0.1:8769/canonical-estimate"
    : batch003Mode
    ? "http://127.0.0.1:8768/canonical-estimate"
    : batch001Mode
    ? "http://127.0.0.1:8766/canonical-estimate"
    : "http://127.0.0.1:8767/canonical-estimate").replace(/\/+$/u, "");
  const localSupabaseRoot = argument("local-supabase-root", batch004Mode
    ? "http://127.0.0.1:8187"
    : batch003Mode
    ? "http://127.0.0.1:8185"
    : batch001Mode
    ? "http://127.0.0.1:8183"
    : "http://127.0.0.1:8173").replace(/\/+$/u, "");
  const backendPath = resolve(argument("backend", batch004Mode ? BATCH004_DEFAULT_BACKEND
    : batch003Mode ? BATCH003_DEFAULT_BACKEND
    : batch001Mode ? BATCH001_DEFAULT_BACKEND : DEFAULT_BACKEND));
  const bundleRoot = resolve(argument("bundle-root", batch004Mode
    ? ".release-runtime/real-professional-estimates-r4/runtime/batch004-r56-web"
    : batch003Mode
    ? ".release-runtime/real-professional-estimates-r4/runtime/batch003-r56-web"
    : batch001Mode
    ? ".release-runtime/real-professional-estimates-r4/runtime/batch001-r56-web"
    : ".release-runtime/real-professional-estimates-r4/runtime/batch002-web"));
  const smoke = argument("mode") === "smoke";
  invariant(!matrix50Mode || !smoke, "R56_WEB_SMOKE_CANNOT_REPLACE_50_DENOMINATOR");
  const output = resolve(argument("output", batch004Mode
    ? BATCH004_DEFAULT_OUTPUT
    : batch003Mode
    ? BATCH003_DEFAULT_OUTPUT
    : batch001Mode
    ? BATCH001_DEFAULT_OUTPUT
    : smoke ? join(DEFAULT_OUTPUT, "smoke") : DEFAULT_OUTPUT));
  const backend = JSON.parse(readFileSync(backendPath, "utf8")) as Json;
  const matrixManifestPath = resolve(argument("manifest", batch004Mode
    ? BATCH004_DEFAULT_MANIFEST : batch003Mode ? BATCH003_DEFAULT_MANIFEST : BATCH001_DEFAULT_MANIFEST));
  const finalBinding = matrix50Mode
    ? JSON.parse(readFileSync(matrixManifestPath, "utf8")) as Json
    : JSON.parse(readFileSync(FINAL_BINDING, "utf8")) as Json;
  const componentLedger = matrix50Mode ? null : JSON.parse(readFileSync(COMPONENT_LEDGER, "utf8")) as Json;
  if (matrix50Mode) {
    invariant(backend.status === (batch004Mode
      ? "GREEN_R56_BATCH004_ISOLATED_BACKEND_PARITY_NO_RELEASE"
      : batch003Mode
      ? "GREEN_R56_BATCH003_ISOLATED_BACKEND_PARITY_NO_RELEASE"
      : "GREEN_R56_BATCH001_ISOLATED_BACKEND_PARITY_NO_RELEASE"), "R56_WEB_BACKEND_INPUT_RED");
    invariant(backend.proofs?.length === (batch004Mode ? 393 : batch003Mode ? 36 : 16), "R56_WEB_BACKEND_DENOMINATOR_RED");
    invariant(finalBinding.masterSha256 === MASTER_SHA256
      && finalBinding.backendEvidence?.sha256 === sha256(readFileSync(backendPath))
      && finalBinding.definitionSetSha256 === backend.definitionSetSha256
      && finalBinding.releaseId === backend.releaseId,
    "R56_WEB_MATRIX_BINDING_RED");
    const plan = defineCanonicalEstimateHarnessWrapper(finalBinding.wrapper as CanonicalHarnessWrapper);
    invariant(plan.planIdentitySha256 === finalBinding.planIdentitySha256, "R56_WEB_MATRIX_PLAN_IDENTITY_RED");
  } else {
    invariant(backend.status === "GREEN_R55_BATCH002_ISOLATED_BACKEND_PARITY_NO_RELEASE", "BATCH002_R55_WEB_BACKEND_INPUT_RED");
    invariant(backend.proofs?.length === 55, "BATCH002_R4_WEB_BACKEND_DENOMINATOR_RED");
    invariant(finalBinding.contract_sha256 === MASTER_SHA256
      && finalBinding.status === "FROZEN_R56_FINAL_RELEASE_REVISION_BINDING_50_UNIQUE_NO_RELEASE"
      && finalBinding.backend_report_sha256 === sha256(readFileSync(backendPath))
      && finalBinding.definition_set_sha256 === backend.definitionSetSha256
      && finalBinding.release_id === backend.releaseId,
    "BATCH002_R56_WEB_FINAL_BINDING_RED");
    invariant(componentLedger?.contract_sha256 === MASTER_SHA256
      && componentLedger.release_id === backend.releaseId
      && componentLedger.definition_set_sha256 === backend.definitionSetSha256,
    "BATCH002_R56_WEB_COMPONENT_IDENTITY_RED");
  }
  const releaseId = String(backend.releaseId);
  const reachability = bundleReachability(bundleRoot);
  invariant(reachability.status === "GREEN", "BATCH002_R4_WEB_FRONTEND_COMPILER_REACHABLE");
  const localSupabaseHealth = await fetch(`${localSupabaseRoot}/health`, { signal: AbortSignal.timeout(5_000) });
  invariant(localSupabaseHealth.ok, "BATCH002_R4_WEB_LOCAL_SUPABASE_STUB_NOT_READY");
  mkdirSync(output, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  const session = proofSession();
  await context.addInitScript(({ keys, value }) => keys.forEach((key) => localStorage.setItem(key, JSON.stringify(value))), {
    keys: [`sb-${PROJECT_REF}-auth-token`, ...LOCAL_SUPABASE_STORAGE_KEYS], value: session,
  });
  const page = await context.newPage();
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const canonicalTrace: Json[] = [];
  const externalRequestAttempts: Json[] = [];
  const loopbackRewrites: Json[] = [];
  const unexpectedHttpResponses: Json[] = [];
  const recalculateRequests: Json[] = [];
  const responseTracePromises: Promise<void>[] = [];
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (["http:", "https:"].includes(url.protocol) && url.hostname === EMULATOR_LOOPBACK_HOST) {
      const from = url.toString();
      url.hostname = "127.0.0.1";
      const to = url.toString();
      loopbackRewrites.push({ method: route.request().method(), from, to });
      await route.continue({ url: to });
      return;
    }
    if (["http:", "https:"].includes(url.protocol) && !["127.0.0.1", "localhost"].includes(url.hostname)) {
      externalRequestAttempts.push({ method: route.request().method(), url: route.request().url() });
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("request", (request) => {
    if (request.method() !== "POST" || !request.url().endsWith("/jobs/recalculate")) return;
    const body = request.postDataJSON() as Json;
    recalculateRequests.push({
      requestTimestamp: new Date().toISOString(),
      logicalCommandId: body.idempotencyKey ?? null,
      idempotencyKey: body.idempotencyKey ?? null,
      revisionId: body.parentRevisionId ?? null,
      expectedParentRevisionId: body.parentRevisionId ?? null,
      payloadHash: sha256(JSON.stringify(body)),
      requestPayload: body,
      triggerSource: Object.keys(body.rowOverrides ?? {}).length > 0 ? "consumer_price_input_blur" : "consumer_parameter_apply",
      uiClickCount: 1,
      httpStatus: null,
      returnedJobId: null,
      createdChildRevisionId: null,
    });
  });
  page.on("response", (response) => {
    if (response.url().includes("/canonical-estimate/")) canonicalTrace.push({ method: response.request().method(), url: response.url(), status: response.status() });
    if (response.status() >= 400) unexpectedHttpResponses.push({ method: response.request().method(), url: response.url(), status: response.status() });
    if (response.request().method() === "POST" && response.url().endsWith("/jobs/recalculate")) {
      responseTracePromises.push((async () => {
        const body = response.request().postDataJSON() as Json;
        const trace = [...recalculateRequests].reverse().find((item) => item.idempotencyKey === body.idempotencyKey && item.httpStatus == null);
        if (!trace) return;
        const responseBody = await responseJson(response);
        trace.httpStatus = response.status();
        trace.returnedJobId = responseBody.jobId ?? null;
        trace.errorCode = responseBody.error?.code ?? null;
        trace.errorMessage = responseBody.error?.message ?? null;
      })());
    }
  });
  const cases: Json[] = [];
  const ordinaryCount = matrix50Mode ? 18 : smoke ? 1 : 55;
  const estimatorCount = matrix50Mode ? 16 : smoke ? 1 : 15;
  const engineerCount = matrix50Mode ? 16 : smoke ? 1 : 10;
  const expectedCaseCount = ordinaryCount + estimatorCount + engineerCount;
  let runnerError: string | null = null;
  let contractJourney: Json | null = null;
  let batch001HarnessResult: Awaited<ReturnType<typeof runCanonicalEstimateAcceptanceHarness>> | null = null;
  try {
    if (matrix50Mode) {
      let executed = 0;
      batch001HarnessResult = await runCanonicalEstimateAcceptanceHarness({
        wrapper: finalBinding.wrapper as CanonicalHarnessWrapper,
        adapter: {
          adapterId: batch004Mode ? "batch004-r56-playwright-real-web"
            : batch003Mode ? "batch003-r56-playwright-real-web" : "batch001-r56-playwright-real-web",
          oracle: {
            kind: "INDEPENDENT_BUSINESS_ORACLE",
            sourceIdentitySha256: String(finalBinding.independentOracle.sha256),
          },
          async execute(fixture) {
            const revisionId = String(fixture.payload.revisionId);
            const result = fixture.role === "ORDINARY_USER"
              ? await ordinaryConsumerCase(page, baseUrl, apiRoot, fixture.catalogId, revisionId, releaseId, fixture.caseId)
              : fixture.role === "ESTIMATOR"
                ? await estimatorConsumerCase(page, baseUrl, apiRoot, fixture.catalogId, revisionId, releaseId, fixture.caseId)
                : await engineerConsumerCase(page, baseUrl, apiRoot, fixture.catalogId, revisionId, fixture.caseId);
            executed += 1;
            if (executed % 10 === 0 || executed === expectedCaseCount) {
              await page.screenshot({ path: join(output, `${batch004Mode ? "batch004" : batch003Mode ? "batch003" : "batch001"}-r56-${String(executed).padStart(2, "0")}.png`), fullPage: true });
            }
            process.stdout.write(`${batch004Mode ? "BATCH004" : batch003Mode ? "BATCH003" : "BATCH001"} WEB ${executed}/${expectedCaseCount} ${fixture.role} ${result.status} ${JSON.stringify(result.blockers)}\n`);
            return {
              assertions: [
                { name: "ui_role_case_green", passed: result.status === "GREEN", details: result.blockers },
                { name: "exact_catalog_identity", passed: result.catalogId === fixture.catalogId },
                { name: "exact_release_identity", passed: result.releaseId == null || result.releaseId === releaseId },
              ],
              evidence: result,
            };
          },
        },
      });
      cases.push(...batch001HarnessResult.results.map((result, index) => ({
        case: index + 1,
        caseId: result.caseId,
        catalogId: result.catalogId,
        role: result.role,
        scenario: result.scenario,
        assertions: result.assertions,
        ...result.evidence,
        status: result.status,
      })));
    } else {
      for (let index = 0; index < ordinaryCount; index += 1) {
        const proof = backend.proofs[index] as Json;
        const result = await ordinaryConsumerCase(page, baseUrl, apiRoot, String(proof.catalogId), String(proof.finalRevisionId), releaseId, `ordinary-${index + 1}`);
        cases.push({ case: cases.length + 1, ...result });
        if ((index + 1) % 10 === 0 || index === 54) await page.screenshot({ path: join(output, `ordinary-${String(index + 1).padStart(2, "0")}.png`), fullPage: true });
        process.stdout.write(`BATCH002 WEB ordinary ${index + 1}/${ordinaryCount} ${result.status} ${JSON.stringify(result.blockers)}\n`);
      }
      for (let index = 0; index < estimatorCount; index += 1) {
        const proof = backend.proofs[index] as Json;
        const result = await estimatorConsumerCase(page, baseUrl, apiRoot, String(proof.catalogId), String(proof.finalRevisionId), releaseId, `estimator-${index + 1}`);
        cases.push({ case: cases.length + 1, ...result });
        if ((index + 1) % 5 === 0) await page.screenshot({ path: join(output, `estimator-${String(index + 1).padStart(2, "0")}.png`), fullPage: true });
        process.stdout.write(`BATCH002 WEB estimator ${index + 1}/${estimatorCount} ${result.status} ${JSON.stringify(result.blockers)}\n`);
      }
      for (let index = 0; index < engineerCount; index += 1) {
        const proof = backend.proofs[index] as Json;
        const result = await engineerConsumerCase(page, baseUrl, apiRoot, String(proof.catalogId), String(proof.finalRevisionId), `engineer-${index + 1}`);
        cases.push({ case: cases.length + 1, ...result });
        if ((index + 1) % 5 === 0) await page.screenshot({ path: join(output, `engineer-${String(index + 1).padStart(2, "0")}.png`), fullPage: true });
        process.stdout.write(`BATCH002 WEB engineer ${index + 1}/${engineerCount} ${result.status} ${JSON.stringify(result.blockers)}\n`);
      }
    }
    if (!matrix50Mode && smoke) {
      const proof = backend.proofs[0] as Json;
      contractJourney = await exactR52ContractJourney(
        page,
        baseUrl,
        apiRoot,
        String(proof.catalogId),
        String(proof.finalRevisionId),
        releaseId,
        recalculateRequests,
      );
      process.stdout.write(`BATCH002 R5.2 exact contract journey ${contractJourney.status}\n`);
    }
  } catch (error) {
    runnerError = error instanceof Error ? error.stack ?? error.message : String(error);
    await page.screenshot({ path: join(output, "diagnostic-failure.png"), fullPage: true }).catch(() => undefined);
  } finally {
    await browser.close();
  }
  await Promise.all(responseTracePromises);
  const runtimeConnectionAudit = await api(apiRoot, "connection-audit");
  const blockers = [
    ...(cases.length === expectedCaseCount ? [] : [`WEB_CASE_COUNT_${cases.length}_OF_${expectedCaseCount}`]),
    ...cases.filter((item) => item.status !== "GREEN").map((item) => `WEB_CASE_${item.case}_RED`),
    ...(matrix50Mode && batch001HarnessResult?.status !== "GREEN" ? ["R56_CANONICAL_HARNESS_RED"] : []),
    ...(smoke && contractJourney?.status !== "GREEN_R56_EXACT_CONTRACT_JOURNEY_NO_RELEASE"
      ? ["R56_EXACT_CONTRACT_JOURNEY_RED"] : []),
    ...(pageErrors.length ? [`WEB_PAGE_ERRORS_${pageErrors.length}`] : []),
    ...(consoleErrors.length ? [`WEB_CONSOLE_ERRORS_${consoleErrors.length}`] : []),
    ...(unexpectedHttpResponses.length ? [`WEB_UNEXPECTED_HTTP_RESPONSES_${unexpectedHttpResponses.length}`] : []),
    ...(externalRequestAttempts.length ? [`EXTERNAL_REQUEST_ATTEMPTS_${externalRequestAttempts.length}`] : []),
    ...(Number(runtimeConnectionAudit.poolMaximumPerDatabaseIdentity) <= 8
      && Number(runtimeConnectionAudit.maximumActiveCheckouts) <= Number(runtimeConnectionAudit.poolMaximumPerDatabaseIdentity)
      && runtimeConnectionAudit.burstConnections === false
      && (runtimeConnectionAudit.pools as Json[]).every((pool) => Number(pool.waiting) === 0)
      ? [] : ["WEB_DATABASE_CONNECTION_AUDIT_RED"]),
    ...(runnerError ? ["WEB_RUNNER_ERROR"] : []),
  ];
  const report = {
    contract: batch004Mode
      ? "real-professional-estimates-r5.6.batch004-real-web-role-matrix.v1"
      : batch003Mode
      ? "real-professional-estimates-r5.6.batch003-real-web-role-matrix.v1"
      : batch001Mode ? "real-professional-estimates-r5.6.batch001-real-web-role-matrix.v1"
      : "real-professional-estimates-r5.6.batch002-real-web-role-matrix.v1",
    mode: matrix50Mode ? "FULL_50_ROLE_MATRIX_R56"
      : smoke ? "R56_EXACT_CONTRACT_SMOKE_AND_THREE_ROLE_DIAGNOSTIC" : "FULL_80_ROLE_MATRIX_R56",
    generatedAt: new Date().toISOString(),
    masterSha256: MASTER_SHA256,
    source: matrix50Mode ? {
      sourceStateId: backend.sourceStateId,
      matrixPlanIdentitySha256: finalBinding.planIdentitySha256,
      productionCoreIdentitySha256: finalBinding.wrapper?.manifest?.productionCoreIdentitySha256,
    } : {
      head: git("rev-parse", "HEAD"),
      tree: git("rev-parse", "HEAD^{tree}"),
      workingTreeDiffSha256: sha256(git("diff", "--binary")),
    },
    backendEvidence: { path: backendPath.replaceAll("\\", "/"), sha256: sha256(readFileSync(backendPath)) },
    finalReleaseRevisionBinding: matrix50Mode ? {
      path: matrixManifestPath.replaceAll("\\", "/"),
      sha256: sha256(readFileSync(matrixManifestPath)),
    } : { path: FINAL_BINDING.replaceAll("\\", "/"), sha256: sha256(readFileSync(FINAL_BINDING)) },
    componentIdentityLedger: matrix50Mode ? {
      definitionSetSha256: backend.definitionSetSha256,
      sourceStateId: backend.sourceStateId,
      planIdentitySha256: finalBinding.planIdentitySha256,
    } : {
      path: COMPONENT_LEDGER.replaceAll("\\", "/"),
      sha256: sha256(readFileSync(COMPONENT_LEDGER)),
      definitionContentStateId: componentLedger?.components?.definition?.state_id,
      backendRuntimeStateId: componentLedger?.components?.backend?.state_id,
      appSourceComponentStateId: componentLedger?.components?.app?.state_id,
    },
    releaseId,
    browser: "PLAYWRIGHT_CHROMIUM_REAL_RENDERER",
    localSupabaseRoot,
    routeEquivalentClaimedAsRealBrowser: false,
    expected: expectedCaseCount,
    executed: cases.length,
    green: cases.filter((item) => item.status === "GREEN").length,
    roleCounts: Object.fromEntries(["ORDINARY_USER", "ESTIMATOR", "CONSTRUCTION_ENGINEER"].map((role) => [role, cases.filter((item) => item.role === role && item.status === "GREEN").length])),
    distinctCatalogIds: new Set(cases.map((item) => item.catalogId)).size,
    bundleReachability: reachability,
    canonicalRequestCount: canonicalTrace.length,
    runtimeConnectionAudit,
    networkBoundary: {
      allowedHosts: ["127.0.0.1", "localhost", EMULATOR_LOOPBACK_HOST],
      emulatorLoopbackRewrittenToBrowserLoopback: true,
      loopbackRewrites,
      externalRequestAttempts,
      externalRequestsSent: 0,
      status: externalRequestAttempts.length === 0 ? "GREEN_ZERO_EXTERNAL_REQUESTS" : "RED",
    },
    consoleErrors,
    pageErrors,
    unexpectedHttpResponses,
    recalculateRequests,
    canonicalHarness: batch001HarnessResult,
    runnerError,
    cases,
    contractJourney,
    blockers,
    overallBatch001008Status: "RED",
    releaseAllowed: false,
    status: blockers.length === 0
      ? batch004Mode ? "GREEN_R56_BATCH004_REAL_WEB_50_OF_50_NO_RELEASE"
        : batch003Mode ? "GREEN_R56_BATCH003_REAL_WEB_50_OF_50_NO_RELEASE"
        : batch001Mode ? "GREEN_R56_BATCH001_REAL_WEB_50_OF_50_NO_RELEASE"
        : smoke ? "GREEN_R56_BATCH002_EXACT_CONTRACT_SMOKE_3_OF_3_NO_RELEASE" : "GREEN_R56_REAL_WEB_80_OF_80_NO_RELEASE"
      : "RED",
  };
  atomicJson(join(output, batch004Mode ? "BATCH004_R56_WEB_50_RESULT.json"
    : batch003Mode ? "BATCH003_R56_WEB_50_RESULT.json"
    : batch001Mode ? "BATCH001_R56_WEB_50_RESULT.json"
    : smoke ? "BATCH002_R52_WEB_SMOKE_RESULT.json" : "BATCH002_WEB_80_RESULT.json"), { ...report, payloadSha256: sha256(JSON.stringify(report)) });
  writeFileSync(join(output, batch004Mode ? "batch004_r56_web_canonical_trace.jsonl"
    : batch003Mode ? "batch003_r56_web_canonical_trace.jsonl"
    : batch001Mode ? "batch001_r56_web_canonical_trace.jsonl" : "batch002_r4_web_canonical_trace.jsonl"), `${canonicalTrace.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ status: report.status, green: report.green, executed: report.executed, roleCounts: report.roleCounts, blockers }, null, 2)}\n`);
  if (!report.status.startsWith("GREEN_")) process.exitCode = 1;
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
