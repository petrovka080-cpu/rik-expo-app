import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { chromium, type Page, type Response } from "playwright";
import { Client } from "pg";

type Json = Record<string, any>;

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const CONTROL_72 = String(process.env.R6_CONTROL72_GATE ?? "").trim() === "true";
const ORGANIZATION_ID = CONTROL_72
  ? "66666666-6666-4666-8666-666666666666"
  : "22222222-2222-4222-8222-222222222222";
const PROJECT_REF = "nxrnjywzxxfdpqmzjorh";
const SPEC_PATH = resolve(CONTROL_72
  ? "C:/Users/User/Downloads/ONE_CANONICAL_ESTIMATE_PRODUCTION_TZ_R6.md"
  : "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (11).md");
const SPEC_SHA256 = CONTROL_72
  ? "4ffc00413c14458730823a90950b80d5191073e26f3bea4201f665953ed1eefa"
  : "21bdd2cf79185cbcf2a6621005f32d6eaf47e653dd88e5b006fcdc6797854138";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const ARTIFACT_ROOT = resolve(".release-runtime/master11610-backend-canonical-r1/05-runtime/local-artifacts");

function argument(name: string, fallback = ""): string {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}
function git(args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000,
  }).trim();
}
function base64Url(value: unknown): string { return Buffer.from(JSON.stringify(value), "utf8").toString("base64url"); }
function proofSession(): Json {
  const issuedAt = Math.floor(Date.now() / 1_000) - 60;
  const expiresAt = issuedAt + 86_400;
  const email = CONTROL_72 ? "one-canonical-r6-web72@example.invalid" : "p0-r58-web-matrix50@example.invalid";
  return {
    access_token: `${base64Url({ alg: "none", typ: "JWT" })}.${base64Url({ aud: "authenticated", exp: expiresAt,
      iat: issuedAt, sub: OWNER_ID, role: "authenticated", email })}.proof`,
    token_type: "bearer", expires_in: 86_400, expires_at: expiresAt, refresh_token: "proof-refresh-disabled",
    user: { id: OWNER_ID, aud: "authenticated", role: "authenticated", email,
      email_confirmed_at: new Date(issuedAt * 1_000).toISOString(), phone: "",
      app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, identities: [],
      created_at: new Date(issuedAt * 1_000).toISOString(), updated_at: new Date(issuedAt * 1_000).toISOString() },
  };
}
function jsonl(file: string): Json[] {
  return readFileSync(file, "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
}
function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, file);
}
function artifactPath(storageKey: string): string {
  const safe = storageKey.replace(/[^a-zA-Z0-9._/-]+/gu, "_").replace(/^[/\\]+/u, "");
  const path = resolve(ARTIFACT_ROOT, safe);
  if (path === ARTIFACT_ROOT || (!path.startsWith(`${ARTIFACT_ROOT}\\`) && !path.startsWith(`${ARTIFACT_ROOT}/`))) {
    throw new Error(`R6_WEB72_ARTIFACT_PATH_ESCAPE:${storageKey}`);
  }
  return path;
}
async function responseJson(response: Response): Promise<Json> {
  try { return await response.json() as Json; } catch { return {}; }
}
async function api(path: string, apiRoot: string): Promise<Json> {
  const response = await fetch(`${apiRoot}/${path.replace(/^\/+/, "")}`, {
    headers: { Accept: "application/json", Authorization: "Bearer local-r58-cumulative-proof" },
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json().catch(() => null) as Json | null;
  if (!response.ok) throw new Error(`R58_WEB50_API_${response.status}:${path}:${JSON.stringify(body)}`);
  return body ?? {};
}

async function exactSuggestion(page: Page, catalogId: string): Promise<ReturnType<Page["locator"]>> {
  const identity = page.locator('[data-testid^="consumer-repair-work-suggestion-catalog-"]')
    .filter({ hasText: catalogId }).first();
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (await identity.isVisible().catch(() => false)) return identity;
    const more = page.getByTestId("consumer-repair-work-search-load-more");
    if (await more.isVisible().catch(() => false)) {
      await more.click();
      await page.waitForTimeout(250);
      continue;
    }
    await identity.waitFor({ state: "visible", timeout: attempt === 0 ? 60_000 : 5_000 }).catch(() => undefined);
  }
  throw new Error(`R6_WEB72_EXACT_SUGGESTION_NOT_FOUND:${catalogId}`);
}

async function verifyNaturalSearch(page: Page, catalogId: string, query: string): Promise<number> {
  const input = page.getByTestId("consumer-repair-problem-input");
  await input.fill("");
  await page.locator('[data-testid^="consumer-repair-work-suggestion-catalog-"]').first()
    .waitFor({ state: "hidden", timeout: 10_000 }).catch(() => undefined);
  const searched = page.waitForResponse((response) => response.request().method() === "GET"
    && response.url().includes("/canonical-estimate/search/catalog?") && response.status() === 200,
  { timeout: 60_000 });
  await input.fill(query);
  await searched;
  const exactMatches = page.locator('[data-testid^="consumer-repair-work-suggestion-catalog-"]')
    .filter({ hasText: catalogId });
  const identity = await exactSuggestion(page, catalogId);
  const identityTestId = await identity.getAttribute("data-testid");
  const suggestionIndex = Number(identityTestId?.match(/-(\d+)$/u)?.[1] ?? 0);
  if (suggestionIndex <= 0 || (await identity.innerText()).trim() !== catalogId) {
    throw new Error(`R6_WEB72_EXACT_SUGGESTION_RED:${catalogId}:${query}`);
  }
  if (await exactMatches.count() !== 1) throw new Error(`R6_WEB72_DUPLICATE_SEARCH_RESULT:${catalogId}:${query}`);
  return suggestionIndex;
}

async function selectAndBuildBaseline(page: Page, item: Json): Promise<Json> {
  const catalogId = String(item.catalogId);
  const input = page.getByTestId("consumer-repair-problem-input");
  const searchEvidence: Json = {};
  if (CONTROL_72) {
    searchEvidence.searchQueryRank = await verifyNaturalSearch(page, catalogId, String(item.searchQuery));
    searchEvidence.synonymQueryRank = await verifyNaturalSearch(page, catalogId, String(item.synonymQuery));
    searchEvidence.promptRank = await verifyNaturalSearch(page, catalogId, String(item.prompt));
  } else {
    await input.fill(catalogId);
  }
  const identity = await exactSuggestion(page, catalogId);
  const identityTestId = await identity.getAttribute("data-testid");
  const suggestionIndex = Number(identityTestId?.match(/-(\d+)$/u)?.[1] ?? 0);
  await page.getByTestId(`consumer-repair-work-suggestion-${suggestionIndex}`).click();
  const button = page.getByTestId("consumer-repair-prepare-draft");
  await button.waitFor({ state: "visible", timeout: 30_000 });
  await button.click();
  await page.getByTestId("consumer-repair-draft").waitFor({ state: "visible", timeout: 120_000 });
  return searchEvidence;
}

function displayedCount(value: string): number {
  return Number(value.match(/\b(\d+)\b/u)?.[1] ?? 0);
}

function hasUtf8Mojibake(value: string): boolean {
  return /(?:\uFFFD|[\u0420\u0421][\u0080-\u00BF\u0400-\u040F\u0450-\u045F\u2010-\u203A])/u.test(value);
}

async function buildArtifact(page: Page, revisionId: string, kind: "pdf" | "procurement"): Promise<Json> {
  const ready = page.waitForResponse((response) => response.request().method() === "GET"
    && response.url().endsWith(`/revisions/${revisionId}/artifacts/${kind}`) && response.status() === 200,
  { timeout: 120_000 });
  await page.getByTestId(`canonical-estimate-artifact-${kind}`).click();
  const artifact = await responseJson(await ready);
  if (artifact.status !== "ready" || artifact.revisionId !== revisionId) {
    throw new Error(`R58_WEB50_ARTIFACT_${kind.toUpperCase()}_RED:${revisionId}`);
  }
  return artifact;
}

async function addRealCatalogItem(page: Page): Promise<Json> {
  const query = "цемент";
  await page.getByTestId("request-estimate-items-search").first().fill(query);
  await page.getByTestId("request-estimate-add-from-catalog").first().click();
  const picker = page.getByTestId("request-catalog-item-picker");
  await picker.waitFor({ state: "visible", timeout: 30_000 });
  const search = page.getByTestId("request-catalog-picker-search");
  await search.fill(query);
  const rows = page.locator('[data-testid^="request-catalog-picker-row-"]');
  await rows.first().waitFor({ state: "visible", timeout: 60_000 });
  const resultCount = await rows.count();
  const resultText = await rows.allInnerTexts();
  const accepted = page.waitForResponse((response) => response.request().method() === "POST"
    && response.url().endsWith("/jobs/recalculate") && response.status() === 202, { timeout: 60_000 });
  const selectedTestId = await rows.first().getAttribute("data-testid");
  await rows.first().click();
  const acceptedBody = await responseJson(await accepted);
  await picker.waitFor({ state: "hidden", timeout: 120_000 });
  return {
    query,
    resultCount,
    selectedTestId,
    sources: [...new Set(resultText.flatMap((text) => [
      text.includes("catalog_items") ? "catalog_items" : null,
      text.includes("RIK catalog") ? "rik_items" : null,
    ]).filter(Boolean))],
    acceptedJobId: acceptedBody.jobId ?? null,
  };
}

async function verifyPhotoAndNoteActions(page: Page): Promise<Json> {
  await page.getByTestId("consumer-repair-add-photo-draft").first().click();
  const photoFlow = page.getByTestId("mobile-photo-capture-flow");
  await photoFlow.waitFor({ state: "visible", timeout: 30_000 });
  const photoSurface = page.getByTestId("mobile-photo-capture-overlay");
  const permissionSurface = page.getByTestId("mobile-photo-permission-gate");
  if (!await photoSurface.isVisible().catch(() => false)
    && !await permissionSurface.isVisible().catch(() => false)) {
    throw new Error("R6_WEB72_PHOTO_FLOW_NOT_ACTIONABLE");
  }
  const gallery = await page.getByTestId("mobile-photo-gallery").isVisible().catch(() => false)
    ? page.getByTestId("mobile-photo-gallery")
    : page.getByTestId("mobile-photo-pick-library");
  const chooser = page.waitForEvent("filechooser", { timeout: 30_000 });
  await gallery.click();
  await (await chooser).setFiles(resolve("assets/market-categories/materials_3d.jpg"));
  await page.getByTestId("mobile-photo-review-screen").waitFor({ state: "visible", timeout: 60_000 });
  await page.getByTestId("mobile-photo-use").click();
  await photoFlow.waitFor({ state: "hidden", timeout: 15_000 });
  const photoStatus = await page.getByTestId("consumer-repair-status").innerText();
  if (!/Фото (?:прикреплено|сохранено)/iu.test(photoStatus)) {
    throw new Error(`R6_WEB72_PHOTO_NOT_ATTACHED:${photoStatus}`);
  }
  const before = displayedCount(await page.getByTestId("request-estimate-row-count").innerText());
  await page.getByTestId("consumer-repair-add-custom-item").first().click();
  const after = displayedCount(await page.getByTestId("request-estimate-row-count").innerText());
  if (after <= before) throw new Error(`R6_WEB72_NOTE_NOT_ADDED:${before}:${after}`);
  return { photoFlowOpened: true, photoAttached: true, photoStatus, noteRowsBefore: before, noteRowsAfter: after };
}

async function openProductPdf(page: Page, revisionId: string, expectedColdMs = 3_000): Promise<Json> {
  const started = Date.now();
  const artifactReady = page.waitForResponse((response) => response.request().method() === "GET"
    && response.url().endsWith(`/revisions/${revisionId}/artifacts/pdf`) && response.status() === 200,
  { timeout: 120_000 });
  await page.getByTestId("consumer-estimate-make-pdf").first().click();
  const artifact = await responseJson(await artifactReady);
  await page.waitForURL((url) => url.pathname === "/pdf-viewer", { timeout: 120_000 });
  const viewerUrl = page.url();
  if (viewerUrl.includes("/canonical-estimate/artifact-files/") || viewerUrl.includes("127.0.0.1:8777")) {
    throw new Error(`R6_WEB72_RAW_PDF_ROUTE_EXPOSED:${viewerUrl}`);
  }
  const iframe = page.getByTestId("pdf-viewer-web-iframe");
  await iframe.waitFor({ state: "visible", timeout: 30_000 });
  const durationMs = Date.now() - started;
  await page.goBack({ waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.getByTestId("consumer-repair-screen").waitFor({ state: "visible", timeout: 120_000 });
  return {
    revisionId,
    artifactId: artifact.artifactId ?? null,
    artifactRevisionId: artifact.revisionId ?? null,
    artifactReleaseId: artifact.releaseId ?? null,
    sha256: artifact.sha256 ?? null,
    viewerUrl: viewerUrl.replace(/openToken=[^&]+/u, "openToken=[redacted]"),
    durationMs,
    sloMs: expectedColdMs,
    status: artifact.revisionId === revisionId && durationMs <= expectedColdMs ? "GREEN" : "RED",
  };
}

async function main(): Promise<void> {
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  if (branch !== EXPECTED_BRANCH || git(["status", "--porcelain=v1"]) !== ""
    || createHash("sha256").update(readFileSync(SPEC_PATH)).digest("hex") !== SPEC_SHA256) {
    throw new Error("R58_WEB50_SOURCE_IDENTITY_RED");
  }
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);
  const baseUrl = argument("base-url", "http://127.0.0.1:8188").replace(/\/+$/u, "");
  const apiRoot = argument("api-root", "http://127.0.0.1:8777/canonical-estimate").replace(/\/+$/u, "");
  const releaseId = argument("release-id", CONTROL_72
    ? "4c5affaf-5f63-5d04-b036-875c684f8c45"
    : "94443669-8f5b-5cc7-b364-2f8e9f9e3506");
  const manifestPath = resolve(argument("manifest",
    CONTROL_72
      ? ".release-runtime/one-canonical-estimate-r6/evidence/09-control-72/CONTROL_72_MANIFEST.json"
      : ".release-runtime/p0-one-monolith-r58/evidence/12-representative/R58_REPRESENTATIVE_50_MANIFEST.json"));
  const backendLedgerPath = resolve(argument("backend-ledger",
    CONTROL_72
      ? ".release-runtime/one-canonical-estimate-r6/evidence/09-control-72/backend/"
        + `R6_CONTROL_72_BACKEND_CONTROL72_${head.slice(0, 8)}.jsonl`
      : ".release-runtime/p0-one-monolith-r58/evidence/06-backend/"
        + `BATCH001_008_BACKEND_ADMISSION_4272_REPRESENTATIVE50_${head.slice(0, 8)}.jsonl`));
  const outputRoot = resolve(argument("output",
    CONTROL_72
      ? ".release-runtime/one-canonical-estimate-r6/evidence/09-control-72/web"
      : ".release-runtime/p0-one-monolith-r58/evidence/11-web-android/R58_WEB_MATRIX_50_DIAGNOSTIC"));
  const databaseUrl = argument("database-url", "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Json;
  const backend = jsonl(backendLedgerPath);
  const cases: Json[] = CONTROL_72
    ? manifest.cases
    : (manifest.catalogIds as string[]).map((catalogId, index) => ({ caseId: `R58-${index + 1}`, catalogId }));
  const expected = CONTROL_72 ? 72 : 50;
  const limit = Math.max(1, Math.min(expected, Number(argument("limit", String(expected))) || expected));
  const runCases = cases.slice(0, limit);
  const expectedBackend = CONTROL_72 ? Number(manifest.uniqueCatalogIds) : 50;
  if (cases.length !== expected || backend.length !== expectedBackend) throw new Error("R6_WEB_INPUT_DENOMINATOR_RED");
  if (manifest.specSha256 !== SPEC_SHA256 || manifest.source?.head !== head || manifest.source?.tree !== tree
    || backend.some((row) => row.head !== head)) throw new Error("R58_WEB50_INPUT_SOURCE_DRIFT");
  const mutationByCatalog = new Map(backend.map((row) => [String(row.catalogId), row.recalculate?.mutation as Json]));
  if (backend.some((row) => row.status !== "GREEN" || !row.recalculate?.mutation)) throw new Error("R58_WEB50_BACKEND_INPUT_RED");
  mkdirSync(outputRoot, { recursive: true });

  const runtime = await api("runtime-manifest", apiRoot);
  if (runtime.sourceHead !== head || runtime.sourceTree !== tree || runtime.specSha256 !== SPEC_SHA256
    || runtime.workingDirectory !== process.cwd()) {
    throw new Error(`R58_WEB50_RUNTIME_IDENTITY_RED:${runtime.sourceHead}:${runtime.workingDirectory}`);
  }
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  const session = proofSession();
  await context.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: `sb-${PROJECT_REF}-auth-token`, value: session });
  await context.route("**/auth/v1/user", (route) => route.fulfill({ status: 200,
    contentType: "application/json; charset=utf-8", body: JSON.stringify(session.user) }));
  await context.route("**/rest/v1/rpc/get_my_role", (route) => route.fulfill({ status: 200,
    contentType: "application/json; charset=utf-8", body: JSON.stringify("consumer") }));
  await context.route("**/rest/v1/rpc/ensure_my_profile", (route) => route.fulfill({ status: 200,
    contentType: "application/json; charset=utf-8", body: "null" }));
  if (CONTROL_72) {
    await context.route("**/canonical-estimate/jobs/**", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        await route.continue();
        return;
      }
      const body = request.postDataJSON() as Json | null;
      if (!body || typeof body.idempotencyKey !== "string") {
        await route.continue();
        return;
      }
      const rewritten = {
        ...body,
        idempotencyKey: `r6-control72-web-${body.idempotencyKey}`.slice(0, 200),
      };
      await route.continue({
        postData: JSON.stringify(rewritten),
        headers: { ...request.headers(), "content-type": "application/json" },
      });
    });
  }
  const page = await context.newPage();
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedCanonical: Json[] = [];
  const canonicalRequests: Json[] = [];
  const failedCanonicalPending: Promise<void>[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("response", (response) => {
    if (response.url().includes("/canonical-estimate/")) {
      canonicalRequests.push({
        method: response.request().method(),
        url: response.url(),
        status: response.status(),
      });
    }
    if (response.url().includes("/canonical-estimate/") && response.status() >= 400) {
      failedCanonicalPending.push((async () => {
        failedCanonical.push({
          method: response.request().method(),
          url: response.url(),
          status: response.status(),
          requestBody: response.request().postDataJSON() ?? null,
          responseBody: await response.json().catch(() => null),
        });
      })());
    }
  });
  context.on("page", (opened) => { if (opened !== page) void opened.close().catch(() => undefined); });
  const rows: Json[] = [];
  let frontendRuntime: Json | null = null;
  try {
    for (let index = 0; index < runCases.length; index += 1) {
      const matrixCase = runCases[index];
      const catalogId = String(matrixCase.catalogId);
      const mutation = mutationByCatalog.get(catalogId)!;
      const blockers: string[] = [];
      const started = Date.now();
      try {
        await page.goto(`${baseUrl}/request?r58Web50=${index}-${Date.now()}`,
          { waitUntil: "domcontentloaded", timeout: 120_000 });
        await page.getByTestId("consumer-repair-screen").waitFor({ state: "visible", timeout: 120_000 });
        if (CONTROL_72 && index === 0) {
          frontendRuntime = await page.evaluate(async () => {
            const root = globalThis as typeof globalThis & {
              __RIK_R45_RUNTIME_MANIFEST_READY__?: Promise<Json>;
            };
            return await root.__RIK_R45_RUNTIME_MANIFEST_READY__ ?? null;
          });
          if (frontendRuntime?.sourceHead !== head || frontendRuntime?.sourceTree !== tree
            || frontendRuntime?.specSha256 !== SPEC_SHA256
            || frontendRuntime?.workingDirectory !== process.cwd()
            || frontendRuntime?.backendUrl !== apiRoot
            || frontendRuntime?.backendManifestStatus !== "READY") {
            throw new Error(`R6_WEB72_FRONTEND_RUNTIME_IDENTITY_RED:${JSON.stringify(frontendRuntime)}`);
          }
        }
        const searchEvidence = await selectAndBuildBaseline(page, matrixCase);
        const baselineReleaseText = await page.getByTestId("consumer-repair-draft-release-id").innerText();
        const baselineRowsText = await page.getByTestId("request-estimate-row-count").innerText();
        const baselineRevisionId = String(baselineReleaseText.match(/Backend revision\s+([0-9a-f-]{36})/iu)?.[1] ?? "");
        const baselineRevision = baselineRevisionId ? await api(`revisions/${baselineRevisionId}`, apiRoot) : null;
        const launchPromptText = await page.getByTestId("request-estimate-current-launch-prompt-text").innerText();
        const displayTitleText = await page.getByTestId("request-estimate-selected-work-title").innerText();
        const promptMeasure = String(matrixCase.prompt ?? "").match(/\b\d+(?:[.,]\d+)?\b/u)?.[0] ?? "";
        if (!baselineReleaseText.includes(releaseId)) blockers.push("BASELINE_RELEASE_RED");
        if (displayedCount(baselineRowsText) <= 0) blockers.push("BASELINE_EMPTY");
        if (!baselineRevision || baselineRevision.revisionId !== baselineRevisionId
          || baselineRevision.catalogId !== catalogId || baselineRevision.releaseId !== releaseId
          || Number(baselineRevision.rowCount) !== displayedCount(baselineRowsText)) {
          blockers.push("BASELINE_BACKEND_IDENTITY_RED");
        }
        if (hasUtf8Mojibake(await page.getByTestId("consumer-repair-draft").innerText())) blockers.push("BASELINE_UTF8_RED");
        if (CONTROL_72 && launchPromptText.trim() !== String(matrixCase.prompt).trim()) blockers.push("SOURCE_REQUEST_TEXT_RED");
        if (CONTROL_72 && promptMeasure && !displayTitleText.includes(promptMeasure)) blockers.push("DISPLAY_TITLE_MEASURE_RED");
        if (CONTROL_72) {
          for (const testId of [
            "consumer-repair-add-manual-item",
            "consumer-repair-add-photo-draft",
            "consumer-repair-add-custom-item",
            "request-estimate-items-search",
            "request-estimate-add-from-catalog",
            "consumer-estimate-make-pdf",
          ]) {
            const control = page.getByTestId(testId).first();
            await control.waitFor({ state: "visible", timeout: 15_000 });
            if (!await control.isEnabled()) blockers.push(`ACTION_DISABLED:${testId}`);
          }
          const draftText = await page.getByTestId("consumer-repair-draft").innerText();
          if (/(?:Уч[её]т технологических обрезков|Механизированное выполнение|Трудо[её]мкость на единицу)\s*:/iu.test(draftText)) {
            blockers.push("TECHNICAL_ROW_PREFIX_VISIBLE");
          }
        }
        const catalogAddition = CONTROL_72 ? await addRealCatalogItem(page) : null;
        if (CONTROL_72 && (!catalogAddition?.acceptedJobId || catalogAddition.resultCount <= 0)) {
          blockers.push("CATALOG_SEARCH_OR_ADD_RED");
        }
        await page.getByTestId("request-estimate-parameters-toggle").click();
        await page.getByTestId("canonical-estimate-parameter-form").waitFor({ state: "visible", timeout: 60_000 });
        const history = page.locator('[data-testid^="canonical-estimate-history-revision-"]');
        await history.first().waitFor({ state: "visible", timeout: 60_000 });
        const baselineHistoryCount = await history.count();
        const catalogResponse = await api(`catalog/${encodeURIComponent(catalogId)}`, apiRoot);
        const catalog = catalogResponse.item ?? catalogResponse;
        const parameter = (catalog.parameterSchema as Json[]).find((row) => row.parameterId === mutation.parameterId);
        if (!parameter) throw new Error(`R58_WEB50_MUTATION_PARAMETER_MISSING:${catalogId}:${mutation.parameterId}`);
        await page.getByTestId("canonical-estimate-refine-parameters").click();
        const expandParameters = page.getByTestId("canonical-estimate-expand-parameters");
        if (await expandParameters.isVisible().catch(() => false)) await expandParameters.click();
        const truthToggles = page.locator('[data-testid^="canonical-estimate-parameter-truth-toggle-"]');
        await truthToggles.first().waitFor({ state: "visible", timeout: 60_000 });
        const parameterCount = await truthToggles.count();
        const guideCount = await page.locator('[data-testid^="canonical-estimate-parameter-guide-"]').count();
        const input = page.getByTestId(`canonical-estimate-parameter-${parameter.ordinal}`);
        await input.waitFor({ state: "visible", timeout: 30_000 });
        const parameterLabel = await page.getByTestId(`canonical-estimate-parameter-label-${parameter.ordinal}`).innerText();
        const guide = page.getByTestId(`canonical-estimate-parameter-guide-${parameter.ordinal}`);
        const parameterGuide = await guide.isVisible().catch(() => false) ? await guide.innerText() : null;
        const rawParameterTitle = String(parameter.titleRu);
        const expectedParameterTitle = CONTROL_72 && rawParameterTitle.includes(":")
          ? rawParameterTitle.slice(rawParameterTitle.indexOf(":") + 1).trim()
          : rawParameterTitle;
        if (!parameterLabel.includes(expectedParameterTitle)
          || (!CONTROL_72 && parameter.unitId && !parameterLabel.includes(String(parameter.unitId)))) {
          blockers.push("PARAMETER_TITLE_OR_UOM_RED");
        }
        if (CONTROL_72 && /\b(?:man_hour|machine_hour|t_km|sq_m|m2|m3|pcs|test|set|item)\b/u.test(parameterLabel)) {
          blockers.push("PARAMETER_RAW_UOM_VISIBLE");
        }
        if (CONTROL_72 && rawParameterTitle.includes(":")
          && parameterLabel.includes(rawParameterTitle.slice(0, rawParameterTitle.indexOf(":")))) {
          blockers.push("PARAMETER_TECHNICAL_PREFIX_VISIBLE");
        }
        if (parameterGuide !== null && parameterGuide !== String(parameter.guide?.guideShortRu ?? "")) {
          blockers.push("PARAMETER_INLINE_GUIDE_RED");
        }
        if (CONTROL_72) {
          await page.getByTestId("canonical-estimate-refine-parameters").click();
          if (await input.isVisible().catch(() => false)) blockers.push("PARAMETER_PANEL_DID_NOT_HIDE");
          await page.getByTestId("canonical-estimate-refine-parameters").click();
          await input.waitFor({ state: "visible", timeout: 10_000 });
        }
        await input.fill(String(mutation.changedValue));
        const accepted = page.waitForResponse((response) => response.request().method() === "POST"
          && response.url().endsWith("/jobs/recalculate") && response.status() === 202, { timeout: 60_000 });
        await page.getByTestId("foreman-ai-estimate-generate").click();
        const acceptedBody = await responseJson(await accepted);
        await page.waitForFunction((count) => document.querySelectorAll('[data-testid^="canonical-estimate-history-revision-"]').length > count,
          baselineHistoryCount, { timeout: 120_000 });
        const childHistory = page.locator('[data-testid^="canonical-estimate-history-revision-"]');
        const childHistoryCount = await childHistory.count();
        const childTestId = await childHistory.first().getAttribute("data-testid");
        const revisionId = String(childTestId?.match(/([0-9a-f-]{36})$/iu)?.[1] ?? "");
        if (!revisionId) blockers.push("CHILD_REVISION_ID_MISSING");
        const visibleRelease = await page.getByTestId("canonical-estimate-release-id").innerText();
        const visibleRows = await page.getByTestId("foreman-ai-estimate-row-count").innerText();
        if (!visibleRelease.includes(releaseId)) blockers.push("CHILD_RELEASE_RED");
        if (displayedCount(visibleRows) <= 0) blockers.push("CHILD_EMPTY");
        if (!(await page.getByTestId("canonical-estimate-selected-catalog-id").innerText()).includes(catalogId)) {
          blockers.push("CHILD_EXACT_CATALOG_RED");
        }
        if (childHistoryCount <= baselineHistoryCount) blockers.push("CHILD_HISTORY_NOT_APPENDED");
        let coldReopen: Json | null = null;
        if (revisionId) {
          const rowsResponse = page.waitForResponse((response) => response.request().method() === "GET"
            && response.url().includes(`/revisions/${revisionId}/rows`) && response.status() === 200,
          { timeout: 60_000 });
          await childHistory.first().click();
          await rowsResponse;
          const pdf = await buildArtifact(page, revisionId, "pdf");
          const procurement = await buildArtifact(page, revisionId, "procurement");
          if (pdf.releaseId !== releaseId || procurement.releaseId !== releaseId) blockers.push("ARTIFACT_RELEASE_RED");
          let currentProductPdf: Json | null = null;
          let parentProductPdf: Json | null = null;
          let parentRevisionId = "";
          if (CONTROL_72) {
            currentProductPdf = await openProductPdf(page, revisionId, 1_500);
            if (currentProductPdf.status !== "GREEN") blockers.push("CURRENT_PRODUCT_PDF_RED");
            await page.getByTestId("request-estimate-parameters-toggle").click();
            await page.getByTestId("professional-estimate-composer").waitFor({ state: "visible", timeout: 60_000 });
            const reopenedHistory = page.locator('[data-testid^="canonical-estimate-history-revision-"]');
            await reopenedHistory.nth(1).waitFor({ state: "visible", timeout: 60_000 });
            const parentTestId = await reopenedHistory.nth(1).getAttribute("data-testid");
            parentRevisionId = String(parentTestId?.match(/([0-9a-f-]{36})$/iu)?.[1] ?? "");
            if (!parentRevisionId || parentRevisionId === revisionId) {
              blockers.push("PARENT_REVISION_ID_RED");
            } else {
              const parentRows = page.waitForResponse((response) => response.request().method() === "GET"
                && response.url().includes(`/revisions/${parentRevisionId}/rows`) && response.status() === 200,
              { timeout: 60_000 });
              await reopenedHistory.nth(1).click();
              await parentRows;
              parentProductPdf = await openProductPdf(page, parentRevisionId);
              if (parentProductPdf.status !== "GREEN") blockers.push("PARENT_PRODUCT_PDF_RED");
              if (parentProductPdf.sha256 && parentProductPdf.sha256 === currentProductPdf.sha256) {
                blockers.push("PARENT_CHILD_PDF_HASH_NOT_DISTINCT");
              }
              await page.getByTestId("request-estimate-parameters-toggle").click();
              await page.getByTestId("professional-estimate-composer").waitFor({ state: "visible", timeout: 60_000 });
              const latestHistory = page.locator('[data-testid^="canonical-estimate-history-revision-"]');
              const childRows = page.waitForResponse((response) => response.request().method() === "GET"
                && response.url().includes(`/revisions/${revisionId}/rows`) && response.status() === 200,
              { timeout: 60_000 });
              await latestHistory.first().click();
              await childRows;
            }
          }
          const requestsBeforeCold = canonicalRequests.length;
          const exactRevisionResponse = page.waitForResponse((response) => response.request().method() === "GET"
            && response.url().endsWith(`/revisions/${revisionId}`) && response.status() === 200,
          { timeout: 120_000 });
          const exactRowsResponse = page.waitForResponse((response) => response.request().method() === "GET"
            && response.url().includes(`/revisions/${revisionId}/rows`) && response.status() === 200,
          { timeout: 120_000 });
          const exactCatalogResponse = page.waitForResponse((response) => response.request().method() === "GET"
            && response.url().includes(`/catalog/${encodeURIComponent(catalogId)}`) && response.status() === 200,
          { timeout: 120_000 });
          const exactHistoryResponse = page.waitForResponse((response) => response.request().method() === "GET"
            && response.url().includes(`/revisions?catalogId=${encodeURIComponent(catalogId)}`) && response.status() === 200,
          { timeout: 120_000 });
          const coldUrl = `${baseUrl}/request?canonicalRevisionId=${encodeURIComponent(revisionId)}&r58WebCold=${index}-${Date.now()}`;
          await page.goto(coldUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
          await Promise.all([exactRevisionResponse, exactRowsResponse, exactCatalogResponse, exactHistoryResponse]);
          await page.getByTestId("professional-estimate-composer").waitFor({ state: "visible", timeout: 60_000 });
          await page.getByTestId("canonical-estimate-native-quick-actions").waitFor({ state: "visible", timeout: 120_000 });
          const coldCatalog = await page.getByTestId("canonical-estimate-selected-catalog-id").innerText();
          const coldRelease = await page.getByTestId("canonical-estimate-release-id-top").innerText();
          const coldRows = await page.getByTestId("canonical-estimate-row-count-top").innerText();
          const coldRequests = canonicalRequests.slice(requestsBeforeCold);
          const coldMutationPosts = coldRequests.filter((request) => request.method === "POST");
          if (!coldCatalog.includes(catalogId)) blockers.push("COLD_CATALOG_IDENTITY_RED");
          if (!coldRelease.includes(releaseId)) blockers.push("COLD_RELEASE_IDENTITY_RED");
          if (coldRows !== visibleRows) blockers.push("COLD_ROW_COUNT_IDENTITY_RED");
          if (coldMutationPosts.length > 0) blockers.push("COLD_CREATED_NEW_REVISION");
          if (hasUtf8Mojibake(await page.getByTestId("professional-estimate-composer").innerText())) {
            blockers.push("COLD_UTF8_RED");
          }
          coldReopen = { coldUrl, revisionId, parentRevisionId, currentProductPdf, parentProductPdf,
            catalogId, coldCatalog, coldRelease, coldRows,
            requestRows: coldRequests, mutationPosts: coldMutationPosts.length, status: coldMutationPosts.length === 0 ? "GREEN" : "RED" };
        }
        const supplementalActions = CONTROL_72 ? await verifyPhotoAndNoteActions(page) : null;
        if (parameterCount <= 0 || guideCount > parameterCount) blockers.push("PARAMETER_GUIDE_RED");
        rows.push({ ordinal: index + 1, caseId: matrixCase.caseId, allocationGroup: matrixCase.allocationGroup ?? null,
          catalogId, prompt: matrixCase.prompt ?? null, searchEvidence, mutation, baselineReleaseText, baselineRowsText,
          baselineRevisionId, baselineRevision, launchPromptText, displayTitleText, catalogAddition,
          baselineHistoryCount, childHistoryCount, revisionId, visibleRelease, visibleRows,
          parameterCount, guideCount, acceptedJobId: acceptedBody.jobId ?? null,
          coldReopen, supplementalActions,
          durationMs: Date.now() - started, blockers, status: blockers.length === 0 ? "GREEN" : "RED" });
      } catch (error) {
        blockers.push(error instanceof Error ? error.message : String(error));
        rows.push({ ordinal: index + 1, caseId: matrixCase.caseId, allocationGroup: matrixCase.allocationGroup ?? null,
          catalogId, prompt: matrixCase.prompt ?? null, mutation, durationMs: Date.now() - started,
          blockers, status: "RED" });
      }
      if ((index + 1) % 10 === 0 || rows.at(-1)?.status === "RED") {
        await page.screenshot({ path: join(outputRoot, `web50-${String(index + 1).padStart(2, "0")}.png`), fullPage: true })
          .catch(() => undefined);
      }
      writeJson(join(outputRoot, "checkpoint.json"), { rows, completed: rows.length, expected });
      process.stdout.write(`[${new Date().toISOString()}] ${CONTROL_72 ? "R6 Web" : "R58 Web"} ${index + 1}/${expected} ${catalogId} ${rows.at(-1)?.status}\n`);
      if (rows.at(-1)?.status === "RED") break;
    }
  } finally {
    await browser.close();
  }
  await Promise.all(failedCanonicalPending);
  const client = new Client({ connectionString: databaseUrl, application_name: "r58-web50-cleanup" });
  await client.connect();
  let cleanup: Json;
  try {
    const storageKeys = CONTROL_72 ? (await client.query(`
      select artifact.storage_key from public.estimate_revision_artifact artifact
      join public.estimate_revision revision on revision.id=artifact.revision_id
      where revision.release_id=$1 and revision.owner_user_id=$2 and revision.organization_id=$3
        and artifact.storage_key is not null
    `, [releaseId, OWNER_ID, ORGANIZATION_ID])).rows.map((row) => String(row.storage_key)) : [];
    cleanup = (await client.query(CONTROL_72
      ? "select * from public.estimate_cleanup_r6_control_runtime($1,$2,$3,$4)"
      : "select * from public.estimate_cleanup_cumulative_admission_runtime_r58($1,$2,$3)",
    CONTROL_72
      ? [releaseId, OWNER_ID, ORGANIZATION_ID, "r6-control72-%"]
      : [releaseId, OWNER_ID, ORGANIZATION_ID])).rows[0] as Json;
    let artifactFilesDeleted = 0;
    for (const storageKey of storageKeys) {
      const path = artifactPath(storageKey);
      if (existsSync(path)) {
        unlinkSync(path);
        artifactFilesDeleted += 1;
      }
    }
    cleanup.artifactFilesDeleted = artifactFilesDeleted;
  } finally { await client.end(); }
  const blockers = rows.flatMap((row) => row.blockers.map((blocker: string) => `${row.catalogId}:${blocker}`));
  blockers.push(...pageErrors.map((error) => `PAGE_ERROR:${error}`));
  blockers.push(...consoleErrors.map((error) => `CONSOLE_ERROR:${error}`));
  blockers.push(...failedCanonical.map((item) => `CANONICAL_${item.status}:${item.url}`));
  if (Number(cleanup.residue) !== 0) blockers.push(`CLEANUP_RESIDUE:${cleanup.residue}`);
  const catalogSources = [...new Set(rows.flatMap((row) => row.catalogAddition?.sources ?? []))];
  if (CONTROL_72 && limit === expected && !catalogSources.includes("catalog_items")) {
    blockers.push("CATALOG_ITEMS_SOURCE_NOT_OBSERVED");
  }
  if (CONTROL_72 && limit === expected && !catalogSources.includes("rik_items")) {
    blockers.push("RIK_ITEMS_SOURCE_NOT_OBSERVED");
  }
  const currentPdfExact = rows.filter((row) => row.coldReopen?.currentProductPdf?.status === "GREEN").length;
  const parentPdfExact = rows.filter((row) => row.coldReopen?.parentProductPdf?.status === "GREEN").length;
  const report = {
    schemaVersion: CONTROL_72 ? "one-canonical-estimate-r6-web-matrix-72.v1" : "p0-one-monolith-r58-web-matrix-50.v1",
    capturedAt: new Date().toISOString(),
    specSha256: SPEC_SHA256, source: { branch, head, tree, descendantOf691acb78: true },
    baseUrl, apiRoot, runtime, frontendRuntime, releaseId, inputs: { manifestPath, backendLedgerPath },
    manifestCatalogSetSha256: manifest.catalogSetSha256 ?? manifest.manifestSha256,
    expected, executed: rows.length, green: rows.filter((row) => row.status === "GREEN").length,
    red: rows.filter((row) => row.status !== "GREEN").length, distinctCatalogIds: new Set(rows.map((row) => row.catalogId)).size,
    lifecycle: { requestSearchExactSelection: expected, preliminaryEstimate: expected, parameterRefinement: expected,
      childRevision: expected, historyReopen: expected, pdf: expected, procurement: expected, coldExactRevisionReopen: expected },
    catalogSources,
    pdf: { currentExact: currentPdfExact, parentExact: parentPdfExact, totalExact: currentPdfExact + parentPdfExact },
    rows, pageErrors, consoleErrors, failedCanonical, cleanup, blockers,
    activeRuntime8081Switched: false, diagnosticOnly: true, terminalGreenClaimed: false,
    diagnosticLimit: limit,
    fullRunComplete: limit === expected && rows.length === expected,
    status: blockers.length === 0 && rows.length === expected
      ? (CONTROL_72 ? "GREEN_R6_WEB_MATRIX_72_NOT_ACTIVE" : "GREEN_R58_WEB_MATRIX_50_DIAGNOSTIC_NOT_ACTIVE")
      : blockers.length === 0 && rows.length === limit && limit < expected
        ? (CONTROL_72 ? "GREEN_R6_WEB_DIAGNOSTIC_PARTIAL_NOT_ACCEPTANCE" : "GREEN_R58_WEB_DIAGNOSTIC_PARTIAL_NOT_ACCEPTANCE")
        : (CONTROL_72 ? "RED_R6_WEB_MATRIX_72_REPAIR_QUEUE" : "RED_R58_WEB_MATRIX_50_REPAIR_QUEUE"),
  };
  const reportPath = join(outputRoot, "summary.json");
  writeJson(reportPath, report);
  const sha = createHash("sha256").update(readFileSync(reportPath)).digest("hex");
  process.stdout.write(`${JSON.stringify({ status: report.status, reportPath, sha256: sha,
    executed: report.executed, green: report.green, red: report.red, blockers }, null, 2)}\n`);
  if (!report.status.startsWith("GREEN")) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
