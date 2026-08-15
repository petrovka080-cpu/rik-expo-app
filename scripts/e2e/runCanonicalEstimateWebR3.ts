import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { chromium } from "playwright";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_REF = "nxrnjywzxxfdpqmzjorh";
const EXPECTED_CATALOG_ID = argument("catalog-id", "work_catalog_roadworks_paving_roads_landscape_interior_asphalt_drain_standard_professional_expanded_v1");
const SEARCH_TEXT = argument("search-text", "водоотвод для асфальтового покрытия в стандартной зоне");

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
    email: "canonical-r3-proof@example.invalid",
  })}.proof`;
  const user = {
    id: OWNER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "canonical-r3-proof@example.invalid",
    email_confirmed_at: new Date(issuedAt * 1_000).toISOString(),
    phone: "",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    identities: [],
    created_at: new Date(issuedAt * 1_000).toISOString(),
    updated_at: new Date(issuedAt * 1_000).toISOString(),
  };
  return { access_token: accessToken, token_type: "bearer", expires_in: 86_400, expires_at: expiresAt, refresh_token: "proof-refresh-disabled", user };
}

function files(directory: string): string[] {
  const result: string[] = [];
  const visit = (path: string) => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) visit(child);
      else result.push(child);
    }
  };
  visit(directory);
  return result;
}

function productionReachability(bundleRoot: string) {
  const frontendOwnerTokens = ["waterSupplySewerageComplete", "waterSewerStorm", "WATER_SEWER_COMPLETE_DOMAIN"];
  const clientCompilerTokens = [
    "evaluateFormulaGraph", "calculateGlobalConstructionEstimate", "calculateGlobalConstructionEstimateSync",
    "compileProductionExpandedEstimate10000", "buildProfessionalExpandedGlobalEstimate", "productionFormulaDsl",
  ];
  const waterCorpusTokens = ["batch006-water-backend-r3.r5", "batch006-water-backend-r3.r6-a2", "WATER_BACKEND_BOQ_ROW_LEDGER", "A2_07_WATER_BACKEND_BOQ_ROW_LEDGER"];
  const forbidden = [...new Set([
    "buildConsumerRepairSelectedWorkDraftBundle",
    "requestEstimateLegacyTestActions",
    "consumerRequestLegacyPdfMigrationReader",
    "generateConsumerRepairRequestPdfForDraft",
    "ensureConsumerRepairRequestPdfAvailable",
    "createEstimateDraftRevision",
    "calculateGlobalConstructionEstimate",
    "compileAsphaltProfessionalEstimateV4",
    "compileProductionExpandedEstimate10000",
    "buildExactMaterialPriceEstimate",
    "evaluateFormulaGraph",
    "runWorldConstructionEstimateEngine",
    "calculateGlobalConstructionEstimateSync",
    "buildProfessionalExpandedGlobalEstimate",
    "productionFormulaDsl",
    "waterSupplySewerageComplete",
    "waterSewerStorm",
    "WATER_SEWER_COMPLETE_DOMAIN",
    "dev-bearer",
    "r2-disposable-test-tenant",
    "EXPO_PUBLIC_PROOF_RUNNER",
    ...frontendOwnerTokens,
    ...clientCompilerTokens,
    ...waterCorpusTokens,
  ])];
  const javascript = files(bundleRoot).filter((path) => /\.(?:js|mjs)$/i.test(path));
  const counts = Object.fromEntries(forbidden.map((token) => [token, 0]));
  let totalBytes = 0;
  for (const path of javascript) {
    const body = readFileSync(path, "utf8");
    totalBytes += statSync(path).size;
    for (const token of forbidden) counts[token] += body.split(token).length - 1;
  }
  const violations = Object.entries(counts).filter(([, count]) => count !== 0).map(([token, count]) => ({ token, count }));
  const tokenCount = (tokens: string[]) => tokens.reduce((sum, token) => sum + counts[token], 0);
  return {
    javascriptFiles: javascript.length,
    totalBytes,
    counts,
    violations,
    legacyReachability: violations.length,
    FRONTEND_WATER_OWNER: tokenCount(frontendOwnerTokens),
    CLIENT_WATER_COMPILER_REACHABILITY: tokenCount(clientCompilerTokens),
    WATER_CORPUS_IN_WEB_BUNDLE: tokenCount(waterCorpusTokens),
  };
}

async function main(): Promise<void> {
  const baseUrl = argument("base-url", "http://127.0.0.1:8170").replace(/\/+$/, "");
  const releaseId = argument("release-id");
  const expectedHead = argument("expected-head");
  const expectedTree = argument("expected-tree");
  const output = resolve(argument("output", ".release-runtime/master11610-backend-canonical-r2/evidence/web-r3"));
  const bundleRoot = resolve(argument("bundle-root"));
  if (!/^[0-9a-f-]{36}$/i.test(releaseId) || !/^[0-9a-f]{40}$/i.test(expectedHead)
    || !/^[0-9a-f]{40}$/i.test(expectedTree) || !bundleRoot) throw new Error("WEB_R3_EXPECTED_IDENTITY_REQUIRED");
  mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.addInitScript(({ key, session }) => {
    localStorage.setItem(key, JSON.stringify(session));
  }, { key: `sb-${PROJECT_REF}-auth-token`, session: proofSession() });
  const page = await context.newPage();
  const responses: Array<{ method: string; url: string; status: number }> = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/canonical-estimate/")) responses.push({ method: response.request().method(), url: response.url(), status: response.status() });
  });
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const blockers: string[] = [];
  try {
    await page.goto(`${baseUrl}/request?prompt=${encodeURIComponent(SEARCH_TEXT)}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.getByTestId("consumer-repair-screen").waitFor({ state: "visible", timeout: 120_000 });
    await page.getByTestId("professional-estimate-composer").waitFor({ state: "visible", timeout: 45_000 });
    await page.getByTestId("foreman-ai-estimate-work-suggestion-1").waitFor({ state: "visible", timeout: 90_000 });
    const promptIngressAutoOpened = true;
    await page.getByTestId("foreman-ai-estimate-back").click();
    await page.getByTestId("professional-estimate-composer").waitFor({ state: "detached", timeout: 45_000 });
    await page.getByTestId("consumer-repair-open-canonical-estimate").click();
    await page.getByTestId("professional-estimate-composer").waitFor({ state: "visible", timeout: 45_000 });
    const suggestion = page.getByTestId("foreman-ai-estimate-work-suggestion-1");
    await suggestion.waitFor({ state: "visible", timeout: 90_000 });
    if (!(await suggestion.innerText()).includes(EXPECTED_CATALOG_ID)) blockers.push("WEB_CATALOG_ID_MISMATCH");
    await suggestion.click();
    await page.getByTestId("canonical-estimate-parameter-form").waitFor({ state: "visible", timeout: 45_000 });
    const inputs = page.locator('input[data-testid^="canonical-estimate-parameter-"]');
    const inputCount = await inputs.count();
    if (inputCount !== 7) blockers.push(`WEB_PARAMETER_COUNT_EXPECTED_7_RECEIVED_${inputCount}`);
    for (let index = 0; index < inputCount; index += 1) await inputs.nth(index).fill("10");
    await page.getByTestId("foreman-ai-estimate-generate").click();
    const release = page.getByTestId("canonical-estimate-release-id");
    await release.waitFor({ state: "visible", timeout: 150_000 });
    const releaseText = await release.innerText();
    if (!releaseText.includes(releaseId)) blockers.push("WEB_RELEASE_ID_MISMATCH");
    const rowCountText = await page.getByTestId("foreman-ai-estimate-row-count").innerText();
    const historyText = await page.getByTestId("canonical-estimate-history").innerText();
    if (!historyText.includes(releaseId)) blockers.push("WEB_HISTORY_RELEASE_ID_MISSING");

    await context.setOffline(true);
    await inputs.nth(0).fill("11");
    await page.getByTestId("foreman-ai-estimate-generate").click();
    await page.getByText(/PENDING_SERVER_ADMISSION/).waitFor({ state: "visible", timeout: 45_000 });
    const offlineAdmissionProven = true;
    await context.setOffline(false);
    await Promise.all([
      page.waitForResponse((response) => response.request().method() === "POST"
        && response.url().endsWith("/jobs/recalculate")
        && response.status() === 202, { timeout: 150_000 }),
      page.getByTestId("foreman-ai-estimate-generate").click(),
    ]);
    await page.getByTestId("canonical-estimate-release-id").waitFor({ state: "visible", timeout: 150_000 });
    const reconnectReleaseText = await page.getByTestId("canonical-estimate-release-id").innerText();
    if (!reconnectReleaseText.includes(releaseId)) blockers.push("WEB_RECONNECT_RELEASE_ID_MISMATCH");

    const api = {
      catalogSearch: responses.some((row) => row.status < 300 && /\/catalog\?/.test(row.url)),
      catalogDetail: responses.some((row) => row.status < 300 && row.url.includes(`/catalog/${EXPECTED_CATALOG_ID}`)),
      compile: responses.some((row) => row.method === "POST" && row.status === 202 && row.url.endsWith("/jobs/compile")),
      recalculate: responses.some((row) => row.method === "POST" && row.status === 202 && row.url.endsWith("/jobs/recalculate")),
      jobPoll: responses.some((row) => row.method === "GET" && row.status < 300 && /\/jobs\/[0-9a-f-]+$/i.test(row.url)),
      revision: responses.some((row) => row.method === "GET" && row.status < 300 && /\/revisions\/[0-9a-f-]+$/i.test(row.url)),
      rows: responses.some((row) => row.method === "GET" && row.status < 300 && /\/revisions\/[0-9a-f-]+\/rows\?/i.test(row.url)),
    };
    for (const [name, passed] of Object.entries(api)) if (!passed) blockers.push(`WEB_API_EVIDENCE_MISSING:${name}`);
    const screenshot = resolve(output, "canonical-r3-web.png");
    await page.screenshot({ path: screenshot, fullPage: true });
    const reachability = productionReachability(bundleRoot);
    if (reachability.legacyReachability !== 0) blockers.push(`PRODUCTION_LEGACY_REACHABILITY_${reachability.legacyReachability}`);
    if (reachability.FRONTEND_WATER_OWNER !== 0) blockers.push(`FRONTEND_WATER_OWNER_${reachability.FRONTEND_WATER_OWNER}`);
    if (reachability.CLIENT_WATER_COMPILER_REACHABILITY !== 0) blockers.push(`CLIENT_WATER_COMPILER_REACHABILITY_${reachability.CLIENT_WATER_COMPILER_REACHABILITY}`);
    if (reachability.WATER_CORPUS_IN_WEB_BUNDLE !== 0) blockers.push(`WATER_CORPUS_IN_WEB_BUNDLE_${reachability.WATER_CORPUS_IN_WEB_BUNDLE}`);
    if (pageErrors.length) blockers.push(`WEB_PAGE_ERRORS_${pageErrors.length}`);
    const proof = {
      schemaVersion: "web-backend-cutover-proof.r3",
      generatedAt: new Date().toISOString(),
      source: { head: expectedHead, tree: expectedTree },
      releaseId,
      catalogId: EXPECTED_CATALOG_ID,
      releaseText,
      reconnectReleaseText,
      rowCountText,
      historyReleaseIdVisible: historyText.includes(releaseId),
      promptIngressAutoOpened,
      manualBackendActionOpened: true,
      offlineAdmissionProven,
      reconnectServerRecalculationProven: api.recalculate,
      api,
      responses,
      consoleErrors,
      pageErrors,
      productionBundleReachability: reachability,
      screenshot,
      blockers,
      status: blockers.length === 0 ? "GREEN" : "RED",
    };
    const reportPath = resolve(output, "WEB_BACKEND_CUTOVER_PROOF.json");
    writeFileSync(reportPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
    writeFileSync(resolve(output, "PRODUCTION_BUNDLE_REACHABILITY_PROOF.json"), `${JSON.stringify({
      schemaVersion: "production-bundle-reachability-proof.r3", generatedAt: proof.generatedAt,
      source: proof.source, bundleRoot, ...reachability, status: reachability.legacyReachability === 0 ? "GREEN" : "RED",
    }, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({ status: proof.status, reportPath, releaseId, api, reachability, blockers }, null, 2)}\n`);
    if (blockers.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
