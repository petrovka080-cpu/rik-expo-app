import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { chromium, type Page, type Response } from "playwright";
import { Client } from "pg";

type Json = Record<string, any>;

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const ORGANIZATION_ID = "22222222-2222-4222-8222-222222222222";
const PROJECT_REF = "nxrnjywzxxfdpqmzjorh";
const SPEC_PATH = resolve(
  "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (11).md",
);
const SPEC_SHA256 = "21bdd2cf79185cbcf2a6621005f32d6eaf47e653dd88e5b006fcdc6797854138";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";

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
  const email = "p0-r58-web-matrix50@example.invalid";
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

async function selectAndBuildBaseline(page: Page, catalogId: string): Promise<void> {
  const input = page.getByTestId("consumer-repair-problem-input");
  await input.fill(catalogId);
  const identity = page.locator('[data-testid^="consumer-repair-work-suggestion-catalog-"]')
    .filter({ hasText: catalogId }).first();
  await identity.waitFor({ state: "visible", timeout: 60_000 });
  const identityTestId = await identity.getAttribute("data-testid");
  const suggestionIndex = Number(identityTestId?.match(/-(\d+)$/u)?.[1] ?? 0);
  if (suggestionIndex <= 0 || (await identity.innerText()).trim() !== catalogId) {
    throw new Error(`R58_WEB50_EXACT_SUGGESTION_RED:${catalogId}`);
  }
  await page.getByTestId(`consumer-repair-work-suggestion-${suggestionIndex}`).click();
  const button = page.getByTestId("consumer-repair-prepare-draft");
  await button.waitFor({ state: "visible", timeout: 30_000 });
  await button.click();
  await page.getByTestId("consumer-repair-draft").waitFor({ state: "visible", timeout: 120_000 });
}

function displayedCount(value: string): number {
  return Number(value.match(/(\d+)\s*$/u)?.[1] ?? 0);
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
  const releaseId = argument("release-id", "94443669-8f5b-5cc7-b364-2f8e9f9e3506");
  const manifestPath = resolve(argument("manifest",
    ".release-runtime/p0-one-monolith-r58/evidence/12-representative/R58_REPRESENTATIVE_50_MANIFEST.json"));
  const backendLedgerPath = resolve(argument("backend-ledger",
    ".release-runtime/p0-one-monolith-r58/evidence/06-backend/"
      + `BATCH001_008_BACKEND_ADMISSION_4272_REPRESENTATIVE50_${head.slice(0, 8)}.jsonl`));
  const outputRoot = resolve(argument("output",
    ".release-runtime/p0-one-monolith-r58/evidence/11-web-android/R58_WEB_MATRIX_50_DIAGNOSTIC"));
  const databaseUrl = argument("database-url", "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Json;
  const backend = jsonl(backendLedgerPath);
  if (manifest.catalogIds?.length !== 50 || backend.length !== 50) throw new Error("R58_WEB50_INPUT_DENOMINATOR_RED");
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
  try {
    for (let index = 0; index < manifest.catalogIds.length; index += 1) {
      const catalogId = String(manifest.catalogIds[index]);
      const mutation = mutationByCatalog.get(catalogId)!;
      const blockers: string[] = [];
      const started = Date.now();
      try {
        await page.goto(`${baseUrl}/request?r58Web50=${index}-${Date.now()}`,
          { waitUntil: "domcontentloaded", timeout: 120_000 });
        await page.getByTestId("consumer-repair-screen").waitFor({ state: "visible", timeout: 120_000 });
        await selectAndBuildBaseline(page, catalogId);
        const baselineReleaseText = await page.getByTestId("consumer-repair-draft-release-id").innerText();
        const baselineRowsText = await page.getByTestId("request-estimate-row-count").innerText();
        if (!baselineReleaseText.includes(releaseId)) blockers.push("BASELINE_RELEASE_RED");
        if (displayedCount(baselineRowsText) <= 0) blockers.push("BASELINE_EMPTY");
        if (hasUtf8Mojibake(await page.getByTestId("consumer-repair-draft").innerText())) blockers.push("BASELINE_UTF8_RED");
        await page.getByTestId("request-estimate-parameters-toggle").click();
        await page.getByTestId("professional-estimate-composer").waitFor({ state: "visible", timeout: 60_000 });
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
        const parameterGuide = await page.getByTestId(`canonical-estimate-parameter-guide-${parameter.ordinal}`).innerText();
        if (!parameterLabel.includes(String(parameter.titleRu)) || !parameterLabel.includes(String(parameter.unitId))) {
          blockers.push("PARAMETER_TITLE_OR_UOM_RED");
        }
        if (parameterGuide !== String(parameter.guide?.guideShortRu ?? "")) blockers.push("PARAMETER_INLINE_GUIDE_RED");
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
          coldReopen = { coldUrl, revisionId, catalogId, coldCatalog, coldRelease, coldRows,
            requestRows: coldRequests, mutationPosts: coldMutationPosts.length, status: coldMutationPosts.length === 0 ? "GREEN" : "RED" };
        }
        if (parameterCount <= 0 || guideCount <= 0 || guideCount > parameterCount) blockers.push("PARAMETER_GUIDE_RED");
        rows.push({ ordinal: index + 1, catalogId, mutation, baselineReleaseText, baselineRowsText,
          baselineHistoryCount, childHistoryCount, revisionId, visibleRelease, visibleRows,
          parameterCount, guideCount, acceptedJobId: acceptedBody.jobId ?? null,
          coldReopen,
          durationMs: Date.now() - started, blockers, status: blockers.length === 0 ? "GREEN" : "RED" });
      } catch (error) {
        blockers.push(error instanceof Error ? error.message : String(error));
        rows.push({ ordinal: index + 1, catalogId, mutation, durationMs: Date.now() - started,
          blockers, status: "RED" });
      }
      if ((index + 1) % 10 === 0 || rows.at(-1)?.status === "RED") {
        await page.screenshot({ path: join(outputRoot, `web50-${String(index + 1).padStart(2, "0")}.png`), fullPage: true })
          .catch(() => undefined);
      }
      writeJson(join(outputRoot, "checkpoint.json"), { rows, completed: rows.length, expected: 50 });
      process.stdout.write(`[${new Date().toISOString()}] R58 Web ${index + 1}/50 ${catalogId} ${rows.at(-1)?.status}\n`);
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
    cleanup = (await client.query("select * from public.estimate_cleanup_cumulative_admission_runtime_r58($1,$2,$3)",
      [releaseId, OWNER_ID, ORGANIZATION_ID])).rows[0] as Json;
  } finally { await client.end(); }
  const blockers = rows.flatMap((row) => row.blockers.map((blocker: string) => `${row.catalogId}:${blocker}`));
  blockers.push(...pageErrors.map((error) => `PAGE_ERROR:${error}`));
  blockers.push(...consoleErrors.map((error) => `CONSOLE_ERROR:${error}`));
  blockers.push(...failedCanonical.map((item) => `CANONICAL_${item.status}:${item.url}`));
  if (Number(cleanup.residue) !== 0) blockers.push(`CLEANUP_RESIDUE:${cleanup.residue}`);
  const report = {
    schemaVersion: "p0-one-monolith-r58-web-matrix-50.v1", capturedAt: new Date().toISOString(),
    specSha256: SPEC_SHA256, source: { branch, head, tree, descendantOf691acb78: true },
    baseUrl, apiRoot, runtime, releaseId, inputs: { manifestPath, backendLedgerPath },
    manifestCatalogSetSha256: manifest.catalogSetSha256,
    expected: 50, executed: rows.length, green: rows.filter((row) => row.status === "GREEN").length,
    red: rows.filter((row) => row.status !== "GREEN").length, distinctCatalogIds: new Set(rows.map((row) => row.catalogId)).size,
    lifecycle: { requestSearchExactSelection: 50, preliminaryEstimate: 50, parameterRefinement: 50,
      childRevision: 50, historyReopen: 50, pdf: 50, procurement: 50, coldExactRevisionReopen: 50 },
    rows, pageErrors, consoleErrors, failedCanonical, cleanup, blockers,
    activeRuntime8081Switched: false, diagnosticOnly: true, terminalGreenClaimed: false,
    status: blockers.length === 0 && rows.length === 50 ? "GREEN_R58_WEB_MATRIX_50_DIAGNOSTIC_NOT_ACTIVE" : "RED_R58_WEB_MATRIX_50_REPAIR_QUEUE",
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
