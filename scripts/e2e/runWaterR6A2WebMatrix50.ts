import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { chromium, type Page, type Response } from "playwright";

type Json = Record<string, any>;
type WowCase = Json & { catalog_id: string; child_revision_id: string };

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_REF = "nxrnjywzxxfdpqmzjorh";
const UUID_PATH = /\/revisions\/([0-9a-f-]{36})$/i;

function argument(name: string, fallback = ""): string {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function base64Url(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function proofSession(): Record<string, unknown> {
  const issuedAt = Math.floor(Date.now() / 1_000) - 60;
  const expiresAt = issuedAt + 86_400;
  const accessToken = `${base64Url({ alg: "none", typ: "JWT" })}.${base64Url({
    aud: "authenticated", exp: expiresAt, iat: issuedAt, sub: OWNER_ID, role: "authenticated",
    email: "water-r6-a2-web-matrix@example.invalid",
  })}.proof`;
  return {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 86_400,
    expires_at: expiresAt,
    refresh_token: "proof-refresh-disabled",
    user: {
      id: OWNER_ID, aud: "authenticated", role: "authenticated",
      email: "water-r6-a2-web-matrix@example.invalid",
      email_confirmed_at: new Date(issuedAt * 1_000).toISOString(), phone: "",
      app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, identities: [],
      created_at: new Date(issuedAt * 1_000).toISOString(), updated_at: new Date(issuedAt * 1_000).toISOString(),
    },
  };
}

function jsonl(path: string): Json[] {
  return readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as Json);
}

function allFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? allFiles(path) : [path];
  });
}

function bundleReachability(bundleRoot: string): Json {
  const ownerTokens = ["waterSupplySewerageComplete", "waterSewerStorm", "WATER_SEWER_COMPLETE_DOMAIN"];
  const compilerTokens = [
    "evaluateFormulaGraph", "calculateGlobalConstructionEstimate", "calculateGlobalConstructionEstimateSync",
    "compileProductionExpandedEstimate10000", "buildProfessionalExpandedGlobalEstimate", "productionFormulaDsl",
  ];
  const corpusTokens = ["batch006-water-backend-r3.r5", "batch006-water-backend-r3.r6-a2", "WATER_BACKEND_BOQ_ROW_LEDGER", "A2_07_WATER_BACKEND_BOQ_ROW_LEDGER"];
  const tokens = [...new Set([...ownerTokens, ...compilerTokens, ...corpusTokens])];
  const counts = Object.fromEntries(tokens.map((token) => [token, 0]));
  const javascript = allFiles(bundleRoot).filter((path) => /\.(?:js|mjs)$/i.test(path));
  let totalBytes = 0;
  for (const path of javascript) {
    const body = readFileSync(path, "utf8");
    totalBytes += statSync(path).size;
    for (const token of tokens) counts[token] += body.split(token).length - 1;
  }
  const tokenCount = (selected: string[]) => selected.reduce((sum, token) => sum + Number(counts[token]), 0);
  const result = {
    javascriptFiles: javascript.length,
    totalBytes,
    counts,
    FRONTEND_WATER_OWNER: tokenCount(ownerTokens),
    CLIENT_WATER_COMPILER_REACHABILITY: tokenCount(compilerTokens),
    WATER_CORPUS_IN_WEB_BUNDLE: tokenCount(corpusTokens),
  };
  return { ...result, status: Object.values(result).slice(-3).every((value) => value === 0) ? "GREEN" : "RED" };
}

async function responseJson(response: Response): Promise<Json> {
  try { return await response.json() as Json; } catch { return {}; }
}

function changedNumericValue(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new Error(`WEB_MATRIX_FIRST_PARAMETER_NOT_NUMERIC:${value}`);
  const delta = Math.max(Math.abs(numeric) * 0.01, 0.001);
  return String(Math.round((numeric + delta) * 1_000_000) / 1_000_000);
}

async function selectExactCatalog(page: Page, catalogId: string, backendWowRevisionId: string, releaseId: string): Promise<{ backendWow: Json; latest: Json }> {
  const input = page.getByTestId("foreman-ai-estimate-input");
  await input.scrollIntoViewIfNeeded();
  await input.fill(catalogId);
  const suggestion = page.locator('[data-testid^="foreman-ai-estimate-work-suggestion-"]').filter({ hasText: catalogId }).first();
  await suggestion.waitFor({ state: "visible", timeout: 30_000 });
  const historyPromise = page.waitForResponse((response) => response.request().method() === "GET"
    && response.url().includes(`/revisions?catalogId=${encodeURIComponent(catalogId)}`)
    && response.status() === 200, { timeout: 60_000 });
  await suggestion.click();
  const history = await responseJson(await historyPromise);
  await page.getByTestId("canonical-estimate-parameter-form").waitFor({ state: "visible", timeout: 30_000 });
  const revisions = Array.isArray(history.revisions) ? history.revisions as Json[] : [];
  const backendWow = revisions.find((entry) => entry.revisionId === backendWowRevisionId);
  const latest = revisions.filter((entry) => entry.releaseId === releaseId)
    .sort((left, right) => Number(right.revisionNumber) - Number(left.revisionNumber))[0];
  if (!backendWow) throw new Error(`WEB_MATRIX_BACKEND_WOW_LINEAGE_MISSING:${catalogId}:${backendWowRevisionId}`);
  if (!latest) throw new Error(`WEB_MATRIX_LATEST_RELEASE_REVISION_MISSING:${catalogId}:${releaseId}`);
  return { backendWow, latest };
}

async function openHistoryRevision(page: Page, revision: Json): Promise<Json> {
  const rowPagePromise = page.waitForResponse((response) => response.request().method() === "GET"
    && new URL(response.url()).pathname.endsWith(`/revisions/${revision.revisionId}/rows`)
    && response.status() === 200, { timeout: 60_000 });
  const entry = page.getByTestId("canonical-estimate-history")
    .getByText(String(revision.revisionId), { exact: false }).first();
  await entry.waitFor({ state: "visible", timeout: 60_000 });
  await entry.click();
  await rowPagePromise;
  await page.getByTestId("canonical-estimate-release-id").filter({ hasText: String(revision.releaseId) })
    .waitFor({ state: "visible", timeout: 60_000 });
  return revision;
}

async function buildArtifact(page: Page, revisionId: string, kind: "pdf" | "procurement"): Promise<Json> {
  const readyPromise = page.waitForResponse((response) => response.request().method() === "GET"
    && response.url().endsWith(`/revisions/${revisionId}/artifacts/${kind}`) && response.status() === 200, { timeout: 120_000 });
  await page.getByTestId(`canonical-estimate-artifact-${kind}`).click();
  const artifact = await responseJson(await readyPromise);
  if (artifact.status !== "ready" || artifact.revisionId !== revisionId) {
    throw new Error(`WEB_MATRIX_${kind.toUpperCase()}_NOT_READY:${revisionId}`);
  }
  return artifact;
}

async function main(): Promise<void> {
  const baseUrl = argument("base-url", "http://127.0.0.1:8170").replace(/\/+$/, "");
  const releaseId = argument("release-id");
  const expectedHead = argument("expected-head");
  const expectedTree = argument("expected-tree");
  const evidenceRoot = resolve(argument("evidence-root", ".release-runtime/batch006-water-backend-r3/evidence-a2"));
  const bundleRoot = resolve(argument("bundle-root"));
  const output = resolve(argument("output", join(evidenceRoot, "A2_11_WEB_RUNTIME")));
  if (!/^[0-9a-f-]{36}$/i.test(releaseId) || !/^[0-9a-f]{40}$/i.test(expectedHead)
    || !/^[0-9a-f]{40}$/i.test(expectedTree) || !bundleRoot) throw new Error("WATER_R6_A2_WEB_MATRIX_IDENTITY_REQUIRED");

  const wow = jsonl(join(evidenceRoot, "A2_10_WOW_50_CASES.jsonl")) as WowCase[];
  if (wow.length !== 50 || new Set(wow.map((row) => row.catalog_id)).size !== 50
    || wow.some((row) => row.status !== "GREEN" || !row.child_revision_id)) throw new Error("WATER_R6_A2_WEB_MATRIX_INPUT_RED");

  mkdirSync(output, { recursive: true });
  const reachability = bundleReachability(bundleRoot);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  await context.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), {
    key: `sb-${PROJECT_REF}-auth-token`, session: proofSession(),
  });
  const page = await context.newPage();
  const requestTrace: Json[] = [];
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/canonical-estimate/")) requestTrace.push({
      at: new Date().toISOString(), method: response.request().method(), url: response.url(), status: response.status(),
    });
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  context.on("page", (opened) => { if (opened !== page) void opened.close().catch(() => undefined); });

  const rows: Json[] = [];
  try {
    await page.goto(`${baseUrl}/request`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.getByTestId("consumer-repair-screen").waitFor({ state: "visible", timeout: 120_000 });
    await page.getByTestId("consumer-repair-open-canonical-estimate").click();
    await page.getByTestId("professional-estimate-composer").waitFor({ state: "visible", timeout: 45_000 });

    for (let index = 0; index < wow.length; index += 1) {
      const item = wow[index];
      const started = Date.now();
      const blockers: string[] = [];
      const history = await selectExactCatalog(page, item.catalog_id, item.child_revision_id, releaseId);
      const parent = await openHistoryRevision(page, history.latest);
      if (history.backendWow.releaseId !== releaseId || parent.releaseId !== releaseId) blockers.push("PARENT_IDENTITY_MISMATCH");

      const parameter = page.getByTestId("canonical-estimate-parameter-0");
      await parameter.scrollIntoViewIfNeeded();
      const beforeValue = await parameter.inputValue();
      const afterValue = changedNumericValue(beforeValue);
      await parameter.fill(afterValue);

      const acceptedPromise = page.waitForResponse((response) => response.request().method() === "POST"
        && response.url().endsWith("/jobs/recalculate") && response.status() === 202, { timeout: 60_000 });
      const childPromise = page.waitForResponse((response) => response.request().method() === "GET"
        && UUID_PATH.test(new URL(response.url()).pathname) && !response.url().endsWith(`/revisions/${item.child_revision_id}`)
        && response.status() === 200, { timeout: 120_000 });
      await page.getByTestId("foreman-ai-estimate-generate").click();
      const accepted = await responseJson(await acceptedPromise);
      const child = await responseJson(await childPromise);
      if (child.releaseId !== releaseId || child.parentRevisionId !== parent.revisionId
        || !child.revisionId || child.checksumSha256 === parent.checksumSha256) blockers.push("CHILD_REVISION_PARITY_RED");
      await page.getByTestId("canonical-estimate-release-id").waitFor({ state: "visible", timeout: 60_000 });
      const releaseText = await page.getByTestId("canonical-estimate-release-id").innerText();
      if (!releaseText.includes(releaseId)) blockers.push("VISIBLE_RELEASE_ID_RED");

      const reopened = await openHistoryRevision(page, child);
      if (reopened.checksumSha256 !== child.checksumSha256 || reopened.parentRevisionId !== parent.revisionId) blockers.push("HISTORY_REOPEN_RED");
      const pdf = await buildArtifact(page, String(child.revisionId), "pdf");
      const procurement = await buildArtifact(page, String(child.revisionId), "procurement");
      if (pdf.releaseId !== releaseId || procurement.releaseId !== releaseId) blockers.push("ARTIFACT_RELEASE_PARITY_RED");

      if ((index + 1) % 10 === 0 || index === wow.length - 1) {
        await page.screenshot({ path: join(output, `water-web-${String(index + 1).padStart(2, "0")}.png`), fullPage: true });
      }
      rows.push({
        case: index + 1,
        catalogId: item.catalog_id,
        backendWowParentRevisionId: item.child_revision_id,
        webParentRevisionId: parent.revisionId,
        webChildRevisionId: child.revisionId,
        releaseId: child.releaseId,
        parameterEdit: { ordinal: 0, before: beforeValue, after: afterValue },
        parent: { rowCount: parent.rowCount, totals: parent.totals, checksumSha256: parent.checksumSha256 },
        child: { rowCount: child.rowCount, totals: child.totals, checksumSha256: child.checksumSha256, parentRevisionId: child.parentRevisionId },
        reopenedChecksumSha256: reopened.checksumSha256,
        acceptedJobId: accepted.jobId,
        pdf: { artifactId: pdf.artifactId, revisionId: pdf.revisionId, releaseId: pdf.releaseId, sha256: pdf.sha256 },
        procurement: { artifactId: procurement.artifactId, revisionId: procurement.revisionId, releaseId: procurement.releaseId, sha256: procurement.sha256 },
        uiRoute: "REAL_PLAYWRIGHT_CHROMIUM_RENDERED_WEB_UI",
        helperBypass: false,
        durationMs: Date.now() - started,
        blockers,
        status: blockers.length === 0 ? "GREEN" : "RED",
      });
      process.stdout.write(`[${new Date().toISOString()}] Water Web ${index + 1}/50 ${item.catalog_id} ${rows.at(-1)!.status}${blockers.length ? ` ${blockers.join(",")}` : ""}\n`);
    }
  } finally {
    await browser.close();
  }

  const blockers = [
    ...(reachability.status === "GREEN" ? [] : ["WEB_BUNDLE_OWNERSHIP_RED"]),
    ...(pageErrors.length ? [`WEB_PAGE_ERRORS_${pageErrors.length}`] : []),
    ...rows.flatMap((row) => row.status === "GREEN" ? [] : [`WEB_CASE_${row.case}_RED`]),
  ];
  const report = {
    schemaVersion: "water-r6-a2-web-real-browser-matrix.v1",
    generatedAt: new Date().toISOString(),
    source: { head: expectedHead, tree: expectedTree },
    releaseId,
    browser: "PLAYWRIGHT_CHROMIUM_REAL_RENDERER",
    routeEquivalentClaimedAsRealBrowser: false,
    expected: 50,
    executed: rows.length,
    green: rows.filter((row) => row.status === "GREEN").length,
    distinctCatalogIds: new Set(rows.map((row) => row.catalogId)).size,
    lifecycle: { backendWowHistoryLineage: 50, openLatestExactRevision: 50, editParameters: 50, serverRecalculate: 50, immutableChild: 50, historyReopen: 50, pdf: 50, procurement: 50 },
    productionBundleReachability: reachability,
    consoleErrors,
    pageErrors,
    requestTrace,
    cases: rows,
    blockers,
    productionDeployed: false,
    batch007Started: false,
    status: blockers.length === 0 && rows.length === 50 ? "GREEN" : "RED",
  };
  const reportPath = resolve(evidenceRoot, "A2_11_WEB_MATRIX_50.json");
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(join(output, "REQUEST_TRACE.jsonl"), `${requestTrace.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ status: report.status, reportPath, green: report.green, blockers }, null, 2)}\n`);
  if (report.status !== "GREEN") process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
