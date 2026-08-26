import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page, type Request, type Response } from "playwright";

type Json = Record<string, unknown>;
type CaseSpec = { id: string; query: string; expectedCatalogId?: string };

const ORIGIN = "http://localhost:8081";
const R555_SUCCESSOR_GATE_B_MODE = process.env.R555_SUCCESSOR_ABC_GATE_B === "true";
const R555_SUCCESSOR_GATE_A_MODE = process.env.R555_SUCCESSOR_ABC_GATE_A === "true";
const R555_FULL_CUMULATIVE_MODE = process.env.R555_FULL_CUMULATIVE_GATE === "true";
const R555_ASPHALT_MODE = process.env.R555_ASPHALT_SENTINEL_GATE === "true";
const R555_MODE = process.env.R555_REGRESSION_GATE === "true" || R555_ASPHALT_MODE || R555_FULL_CUMULATIVE_MODE || R555_SUCCESSOR_GATE_A_MODE || R555_SUCCESSOR_GATE_B_MODE;
const OUTPUT = resolve(R555_SUCCESSOR_GATE_B_MODE
  ? ".release-runtime/r555/evidence/22C_R555_SUCCESSOR_GATE_B_10_OF_10.json"
  : R555_SUCCESSOR_GATE_A_MODE
  ? ".release-runtime/r555/evidence/22B_R555_SUCCESSOR_GATE_A_2_OF_2.json"
  : R555_FULL_CUMULATIVE_MODE
  ? ".release-runtime/r555/evidence/21D_R555_FULL_CUMULATIVE_CONTROL_COMPILE_GATE.json"
  : R555_ASPHALT_MODE
  ? ".release-runtime/r555/evidence/14_R555_ASPHALT_SENTINEL_GATE.json"
  : R555_MODE
    ? ".release-runtime/r555/evidence/09_R555_MATERIAL_FIRST_GATE_A.json"
  : ".release-runtime/r553/evidence/11_R553_CONSUMER_ESTIMATE_CREATE_GATE_A.json");
const MASTER_SHA256 = R555_MODE
  ? "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007"
  : "5a9e373f94441c8e39d6f0feff7a2ba8e7773a95d0807aff6c89f6535bde11ee";
const MATERIAL_CASES: readonly CaseSpec[] = [
  {
    id: "GATE_A_CONCRETE_ANCHOR_GROUP",
    query: "бетонирование анкерной группы для высокой нагрузки",
    ...(R555_MODE ? { expectedCatalogId: "concrete_foundation_interior_anchor_group_pour_high_load" } : {}),
  },
  {
    id: "GATE_A_CONCRETE_MONOLITHIC_BELT_REPAIR",
    query: "бетонирование монолитного пояса с локальным ремонтом основания 100 кв. метров",
    ...(R555_MODE ? { expectedCatalogId: "concrete_foundation_interior_belt_pour_repair" } : {}),
  },
];
const ASPHALT_CASES: readonly CaseSpec[] = [
  {
    id: "ASPHALT_PAVEMENT",
    query: "дорожное покрытие",
    expectedCatalogId: "asphalt_concrete_pavement_preliminary_boq_expanded_complex_v1",
  },
  { id: "ASPHALT_PARKING", query: "парковка", expectedCatalogId: "built-in-ai-1000:0702" },
  { id: "ASPHALT_DEMOLITION", query: "демонтаж асфальта", expectedCatalogId: "built-in-ai-1000:0670" },
  { id: "ASPHALT_MILLING", query: "фрезерование", expectedCatalogId: "built-in-ai-1000:0705" },
  { id: "ASPHALT_PATCH_REPAIR", query: "ямочный ремонт", expectedCatalogId: "built-in-ai-1000:0704" },
];
const ASPHALT_CASE_FILTER = String(process.env.R555_ASPHALT_CASE_ID ?? "").trim();
const FULL_CUMULATIVE_CASES: readonly CaseSpec[] = [
  { id: "FULL_CUMULATIVE_ASPHALT_CONTROL", query: "асф", expectedCatalogId: "built-in-ai-1000:0703" },
];
const SUCCESSOR_GATE_A_CASES: readonly CaseSpec[] = [
  {
    id: "SUCCESSOR_GATE_A_CONCRETE_ANCHOR_GROUP",
    query: "Бетонирование анкерной группы для высокой нагрузки",
    expectedCatalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_pour_high_load",
  },
  {
    id: "SUCCESSOR_GATE_A_CONCRETE_MONOLITHIC_BELT_REPAIR",
    query: "Бетонирование монолитного пояса с локальным ремонтом основания 100 кв. метров",
    expectedCatalogId: "canonical-work:base:concrete_foundation_interior_belt_pour_repair",
  },
];
const SUCCESSOR_GATE_B_MANIFEST = R555_SUCCESSOR_GATE_B_MODE
  ? JSON.parse(readFileSync(resolve(".release-runtime/r555/evidence/22A_R555_SUCCESSOR_ABC_SEED_MANIFEST.json"), "utf8")) as Json
  : null;
const SUCCESSOR_GATE_B_CASES: readonly CaseSpec[] = R555_SUCCESSOR_GATE_B_MODE
  ? ((SUCCESSOR_GATE_B_MANIFEST?.gate_b as Json)?.cases as Json[]).map((entry: Json, index: number) => ({
      id: `SUCCESSOR_GATE_B_${String(index + 1).padStart(2, "0")}_${String(entry.domain).toUpperCase()}`,
      query: String(entry.titleRu),
      expectedCatalogId: String(entry.catalogId),
    }))
  : [];
const CASES: readonly CaseSpec[] = R555_SUCCESSOR_GATE_B_MODE
  ? SUCCESSOR_GATE_B_CASES
  : R555_SUCCESSOR_GATE_A_MODE
  ? SUCCESSOR_GATE_A_CASES
  : R555_FULL_CUMULATIVE_MODE
  ? FULL_CUMULATIVE_CASES
  : R555_ASPHALT_MODE
  ? ASPHALT_CASE_FILTER
    ? ASPHALT_CASES.filter((entry) => entry.id === ASPHALT_CASE_FILTER)
    : ASPHALT_CASES
  : MATERIAL_CASES;
if (R555_ASPHALT_MODE && CASES.length === 0) throw new Error(`R555_ASPHALT_CASE_FILTER_UNKNOWN:${ASPHALT_CASE_FILTER}`);

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function safeUrl(raw: string): string {
  const url = new URL(raw);
  for (const key of [...url.searchParams.keys()]) {
    if (/signature|token|secret|key/iu.test(key)) url.searchParams.set(key, "REDACTED");
  }
  return `${url.origin}${url.pathname}${url.search}`;
}

function sanitizeEvidenceValue(value: unknown, key = ""): unknown {
  if (/access.?token|refresh.?token|authorization|signed.?url|signature|secret/iu.test(key)) {
    return "REDACTED";
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeEvidenceValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Json).map(([childKey, childValue]) => [
        childKey,
        sanitizeEvidenceValue(childValue, childKey),
      ]),
    );
  }
  return value;
}

async function safeResponseBody(response: Response): Promise<unknown> {
  const raw = await response.text().catch(() => "");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return raw.slice(0, 5_000);
  }
}

async function authenticatedBackendJson(
  path: string,
  authorization: string,
): Promise<{ status: number; body: Json }> {
  const response = await fetch(`http://127.0.0.1:8765/${path.replace(/^\/+/, "")}`, {
    headers: { Authorization: authorization },
  });
  const body = await response.json().catch(() => ({})) as Json;
  return { status: response.status, body };
}

async function enterConsumer(page: Page): Promise<void> {
  if (await page.getByTestId("consumer-repair-problem-input").isVisible().catch(() => false)) return;
  const consumerLogin = page
    .getByTestId("auth.login.local-consumer")
    .or(page.getByTestId("protected-identity-local-consumer-login"));
  await consumerLogin.first().waitFor({ timeout: 180_000 });
  await consumerLogin.first().click();
  await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 180_000 });
}

async function runCase(browser: Awaited<ReturnType<typeof chromium.launch>>, spec: CaseSpec) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleEvents: Array<{ type: string; text: string }> = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  const backend: Json[] = [];
  const authEvents: string[] = [];
  let backendAuthorization = "";

  page.on("console", (message) => {
    const text = message.text();
    if (text.includes("[RootLayout] onAuthStateChange:")) authEvents.push(text.slice(0, 500));
    if (["error", "warning"].includes(message.type())) {
      consoleEvents.push({ type: message.type(), text: text.slice(0, 1_000) });
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) =>
    requestFailures.push(`${request.method()} ${safeUrl(request.url())} ${request.failure()?.errorText ?? ""}`),
  );
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:8765/")) return;
    const authorization = request.headers()["authorization"] ?? "";
    if (authorization.startsWith("Bearer ")) backendAuthorization = authorization;
  });
  page.on("response", async (response: Response) => {
    if (!response.url().startsWith("http://127.0.0.1:8765/")) return;
    const request: Request = response.request();
    const body = await safeResponseBody(response);
    let requestBody: unknown = null;
    try {
      requestBody = request.postData() ? JSON.parse(request.postData()!) : null;
    } catch {
      requestBody = "NON_JSON_BODY_REDACTED";
    }
    backend.push({
      method: request.method(),
      url: safeUrl(response.url()),
      status: response.status(),
      request_body: sanitizeEvidenceValue(requestBody),
      response_body: sanitizeEvidenceValue(body),
      request_id: response.headers()["x-request-id"] ??
        (body && typeof body === "object" ? (body as Json).requestId ?? null : null),
    });
  });

  try {
    await page.goto(`${ORIGIN}/request`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
    await enterConsumer(page);
    const identityText = (await page.getByTestId("verified-identity-summary").innerText()).trim();
    const searchResponsePromise = page.waitForResponse(
      (response) => response.url().startsWith("http://127.0.0.1:8765/search/catalog?")
        && response.status() === 200,
      { timeout: 120_000 },
    );
    await page.getByTestId("consumer-repair-problem-input").fill(spec.query);
    const searchResponse = await searchResponsePromise;
    const searchBody = await safeResponseBody(searchResponse) as Json;
    const searchItems = Array.isArray(searchBody.items) ? searchBody.items as Json[] : [];
    const selectedIndex = spec.expectedCatalogId == null
      ? 0
      : searchItems.findIndex((item) =>
        String(item.catalogId ?? item.id ?? "") === spec.expectedCatalogId
      );
    if (selectedIndex < 0) {
      throw new Error(`GATE_A_EXPECTED_CATALOG_NOT_FOUND:${spec.expectedCatalogId}`);
    }
    const suggestion = page.getByTestId(`consumer-repair-work-suggestion-${selectedIndex + 1}`);
    await suggestion.waitFor({ timeout: 120_000 });
    const selectedWorkText = (await suggestion.innerText()).trim();
    const catalogId = String(
      searchItems[selectedIndex]?.catalogId ?? searchItems[selectedIndex]?.id ?? "",
    );
    await suggestion.click();
    if (!catalogId || !backendAuthorization) throw new Error("GATE_A_CATALOG_OR_AUTHORIZATION_MISSING");
    const historyBefore = await authenticatedBackendJson(
      `revisions?catalogId=${encodeURIComponent(catalogId)}&limit=100`,
      backendAuthorization,
    );
    const historyBeforeRows = Array.isArray(historyBefore.body.revisions)
      ? historyBefore.body.revisions as Json[]
      : [];
    const compileResponse = page.waitForResponse(
      (response) => response.url().includes("/jobs/compile") && response.request().method() === "POST",
      { timeout: 180_000 },
    );
    await page.getByTestId("consumer-repair-prepare-draft").click();
    const compile = await compileResponse;
    if (!compile.ok()) {
      const failedCompileBody = sanitizeEvidenceValue(await safeResponseBody(compile));
      throw new Error(`GATE_A_COMPILE_HTTP_${compile.status()}:${JSON.stringify(failedCompileBody)}`);
    }
    await page.locator('[id^="canonical-estimate-row-identity|"]').first().waitFor({ timeout: 180_000 });
    const requestUrl = page.url();
    const dom = await page.evaluate(() => ({
      pathname: window.location.pathname,
      body_text: document.body.innerText.slice(0, 20_000),
      release_marker_present: Boolean(document.querySelector('[data-testid="consumer-repair-draft-release-id"]')),
      canonical_row_identities: Array.from(
        document.querySelectorAll('[id^="canonical-estimate-row-identity|"]'),
        (node) => node.id,
      ),
      revision_history_markers: Array.from(
        document.querySelectorAll('[data-testid^="consumer-estimate-edit-history-"]'),
        (node) => node.getAttribute("data-testid") ?? "",
      ),
      history_count_text: document.querySelector('[data-testid="consumer-repair-history-loaded-count"]')?.textContent ?? "",
      pdf_enabled: Boolean(document.querySelector('[data-testid="consumer-estimate-make-pdf"]:not([aria-disabled="true"])')),
      procurement_action_enabled: Boolean(document.querySelector('[data-testid="consumer-estimate-open-procurement"]:not([aria-disabled="true"])')),
      procurement_present: Boolean(
        document.querySelector('[data-testid="consumer-estimate-procurement-list"]') ||
        document.querySelector('[data-testid="request-estimate-procurement-not-applicable-zero-items"]'),
      ),
      red_overlay: Boolean(
        document.querySelector('[data-testid="redbox"]') ||
        document.querySelector('[data-testid="error-overlay"]'),
      ),
    }));
    const firstIdentity = String(dom.canonical_row_identities[0] ?? "").split("|");
    const revisionId = firstIdentity[1] ?? "";
    const releaseId = firstIdentity[2] ?? "";
    const identityCatalogId = firstIdentity[3] ?? "";
    const historyAfter = await authenticatedBackendJson(
      `revisions?catalogId=${encodeURIComponent(catalogId)}&limit=100`,
      backendAuthorization,
    );
    const historyAfterRows = Array.isArray(historyAfter.body.revisions)
      ? historyAfter.body.revisions as Json[]
      : [];
    const historyContainsRevision = historyAfterRows.some((revision) =>
      revision.revisionId === revisionId && revision.releaseId === releaseId
    );

    let procurementArtifactReady = false;
    if (dom.procurement_action_enabled) {
      const procurementReady = page.waitForResponse(
        (response) => response.request().method() === "GET"
          && response.url().includes(`/revisions/${revisionId}/artifacts/procurement`)
          && response.status() === 200,
        { timeout: 180_000 },
      );
      await page.getByTestId("consumer-estimate-open-procurement").click();
      procurementArtifactReady = (await procurementReady).ok();
    }

    let pdfArtifactReady = false;
    if (dom.pdf_enabled) {
      const pdfReady = page.waitForResponse(
        (response) => response.request().method() === "GET"
          && response.url().includes(`/revisions/${revisionId}/artifacts/pdf`)
          && response.status() === 200,
        { timeout: 180_000 },
      );
      const pdfFileReady = page.waitForResponse(
        (response) => response.url().includes("/canonical-estimate/artifact-files/")
          && [200, 206].includes(response.status()),
        { timeout: 180_000 },
      );
      await page.getByTestId("consumer-estimate-make-pdf").first().click();
      const [pdfMetadataResponse, pdfFileResponse] = await Promise.all([
        pdfReady,
        pdfFileReady,
      ]);
      await page.getByTestId("pdf-viewer-web-iframe").waitFor({ timeout: 180_000 });
      pdfArtifactReady = pdfMetadataResponse.ok() && [200, 206].includes(pdfFileResponse.status());
    }

    await page.goto(requestUrl, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.locator(`[id^="canonical-estimate-row-identity|${revisionId}|${releaseId}|${catalogId}|"]`)
      .first().waitFor({ timeout: 180_000 });
    const coldRestartIdentity = await page.locator('[id^="canonical-estimate-row-identity|"]')
      .first().getAttribute("id") ?? "";
    await page.waitForTimeout(30_000);
    const compileBody = await safeResponseBody(compile);
    const compileRequestId = compile.headers()["x-request-id"] ??
      (compileBody && typeof compileBody === "object" ? (compileBody as Json).requestId ?? null : null);
    const tokenRefreshEvents = authEvents.filter((event) => event.includes("TOKEN_REFRESHED"));
    const expectedGateNavigationAborts = requestFailures.filter((failure) =>
      failure.includes("/canonical-estimate/artifact-files/")
      && failure.includes("net::ERR_ABORTED")
      && pdfArtifactReady
    );
    const unexpectedRequestFailures = requestFailures.filter(
      (failure) => !expectedGateNavigationAborts.includes(failure),
    );
    const green =
      compile.ok() &&
      identityText.toLowerCase().includes("consumer") &&
      (spec.expectedCatalogId == null || catalogId === spec.expectedCatalogId) &&
      revisionId.length > 0 &&
      releaseId.length > 0 &&
      identityCatalogId === catalogId &&
      dom.release_marker_present &&
      dom.canonical_row_identities.length > 0 &&
      /показано\s+[1-9]\d*\s+из\s+[1-9]\d*/iu.test(dom.history_count_text) &&
      historyAfter.status === 200 &&
      historyAfterRows.length === historyBeforeRows.length + 1 &&
      historyContainsRevision &&
      dom.pdf_enabled &&
      dom.procurement_present &&
      dom.procurement_action_enabled &&
      procurementArtifactReady &&
      pdfArtifactReady &&
      coldRestartIdentity.startsWith(`canonical-estimate-row-identity|${revisionId}|${releaseId}|${catalogId}|`) &&
      !dom.red_overlay &&
      tokenRefreshEvents.length <= (R555_ASPHALT_MODE || R555_FULL_CUMULATIVE_MODE || R555_SUCCESSOR_GATE_A_MODE || R555_SUCCESSOR_GATE_B_MODE ? 0 : 1) &&
      pageErrors.length === 0 &&
      unexpectedRequestFailures.length === 0;
    return {
      id: spec.id,
      query: spec.query,
      status: green ? "GREEN" : "RED",
      selected_work_text: selectedWorkText,
      provider_principal_role: identityText.toLowerCase().includes("consumer") ? "consumer" : "UNEXPECTED",
      catalog_id: catalogId,
      revision_id: revisionId,
      release_id: releaseId,
      compile: { status: compile.status(), request_id: compileRequestId, response_body: compileBody },
      history: {
        before: historyBeforeRows.length,
        after: historyAfterRows.length,
        delta: historyAfterRows.length - historyBeforeRows.length,
        contains_revision: historyContainsRevision,
      },
      artifacts: {
        pdf_ready: pdfArtifactReady,
        procurement_ready: procurementArtifactReady,
      },
      cold_restart: {
        request_url: safeUrl(requestUrl),
        row_identity_matches: coldRestartIdentity.startsWith(
          `canonical-estimate-row-identity|${revisionId}|${releaseId}|${catalogId}|`,
        ),
      },
      backend,
      auth_events: authEvents,
      auth_event_count: authEvents.length,
      token_refreshed_count: tokenRefreshEvents.length,
      auth_refresh_storm: tokenRefreshEvents.length > 1,
      console_events: consoleEvents,
      page_errors: pageErrors,
      request_failures: requestFailures,
      expected_gate_navigation_aborts: expectedGateNavigationAborts,
      unexpected_request_failures: unexpectedRequestFailures,
      dom,
    };
  } finally {
    await context.close();
  }
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const cases = [];
  try {
    for (const spec of CASES) cases.push(await runCase(browser, spec));
  } finally {
    await browser.close();
  }
  const green = cases.filter((item) => item.status === "GREEN").length;
  const receiptBase = {
    schema_version: R555_SUCCESSOR_GATE_B_MODE
      ? "rik-expo-app-r555.successor-gate-b.v1"
      : R555_SUCCESSOR_GATE_A_MODE
      ? "rik-expo-app-r555.successor-gate-a.v1"
      : R555_FULL_CUMULATIVE_MODE
      ? "rik-expo-app-r555.full-cumulative-control-compile-gate.v1"
      : R555_ASPHALT_MODE
      ? "rik-expo-app-r555.asphalt-sentinel-gate.v1"
      : R555_MODE
        ? "rik-expo-app-r555.material-first-gate-a.v1"
      : "rik-expo-app-r553.consumer-estimate-create-gate-a.v1",
    generated_utc: new Date().toISOString(),
    master_sha256: MASTER_SHA256,
    status: green === CASES.length
      ? R555_SUCCESSOR_GATE_B_MODE
        ? "GREEN_R555_SUCCESSOR_GATE_B_FULL_PATH_10_OF_10"
        : R555_SUCCESSOR_GATE_A_MODE
        ? "GREEN_R555_SUCCESSOR_GATE_A_FULL_PATH_2_OF_2"
        : R555_FULL_CUMULATIVE_MODE
        ? "GREEN_R555_FULL_CUMULATIVE_CONTROL_COMPILE_FULL_PATH_1_OF_1"
        : R555_ASPHALT_MODE
        ? `GREEN_R555_ASPHALT_SENTINEL_FULL_PATH_${CASES.length}_OF_${CASES.length}`
        : R555_MODE
          ? "GREEN_R555_MATERIAL_FIRST_FUNCTIONAL_AND_CONTENT_2_OF_2"
        : "GREEN_R553_CONSUMER_ESTIMATE_CREATE_GATE_A_2_OF_2"
      : R555_SUCCESSOR_GATE_B_MODE
        ? "RED_R555_SUCCESSOR_GATE_B"
        : R555_SUCCESSOR_GATE_A_MODE
        ? "RED_R555_SUCCESSOR_GATE_A"
        : R555_FULL_CUMULATIVE_MODE
        ? "RED_R555_FULL_CUMULATIVE_CONTROL_COMPILE_GATE"
        : R555_ASPHALT_MODE
        ? "RED_R555_ASPHALT_SENTINEL_GATE"
        : R555_MODE
          ? "RED_R555_MATERIAL_FIRST_GATE_A"
        : "RED_R553_CONSUMER_ESTIMATE_CREATE_GATE_A",
    green,
    denominator: CASES.length,
    cases,
    secrets_captured: false,
    request_headers_captured: false,
    production_requests: 0,
  };
  const receipt = { ...receiptBase, payload_sha256: sha256(JSON.stringify(receiptBase)) };
  const attemptOutput = OUTPUT.replace(
    /\.json$/u,
    `.attempt-${receiptBase.generated_utc.replace(/[^0-9]/gu, "")}.json`,
  );
  atomicJson(attemptOutput, receipt);
  atomicJson(OUTPUT, receipt);
  process.stdout.write(`${JSON.stringify({
    status: receiptBase.status,
    green,
    denominator: CASES.length,
    cases: cases.map((item) => ({
    id: item.id,
      status: item.status,
      query: item.query,
      selected_work_text: item.selected_work_text,
      provider_principal_role: item.provider_principal_role,
      compile_status: item.compile.status,
      compile_request_id: item.compile.request_id,
    canonical_rows: item.dom.canonical_row_identities.length,
    history_count_text: item.dom.history_count_text,
    history_delta: item.history.delta,
    pdf_enabled: item.dom.pdf_enabled,
    procurement_present: item.dom.procurement_present,
      auth_event_count: item.auth_event_count,
      page_errors: item.page_errors.length,
      request_failures: item.unexpected_request_failures.length,
    })),
  })}\n`);
  if (green !== CASES.length) process.exitCode = 1;
}

void main().then(
  () => setImmediate(() => process.exit(process.exitCode ?? 0)),
  (error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    setImmediate(() => process.exit(1));
  },
);
