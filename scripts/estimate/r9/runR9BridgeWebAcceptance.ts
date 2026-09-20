import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page, type Response } from "playwright";
import { Client } from "pg";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.r9-bridge-web-acceptance.v1";
const ORIGIN = "http://localhost:8081";
const BACKEND = "http://127.0.0.1:8765";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CATALOG_ID = "canonical-work:expanded:bridge_asphalt";
const PROMPT = "асфальтирование моста 200 x 32 м";
const NORMALIZED_SEARCH = "асфальтирование моста";
const OUTPUT_ROOT = resolve(".release-runtime/r4a13-6/r9-complete-estimates");
const RELEASE_MANIFEST = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const FOCUS_PROBE_REVISION = String(process.env.R9_BRIDGE_FOCUS_PROBE_REVISION ?? "").trim();

const BRANCH_PARAMETERS = new Set([
  "waterproofing_repair_area_m2",
  "waterproofing_primer_rate_l_m2",
  "protective_layer_thickness_mm",
  "expansion_joint_length_m",
  "waterproofing_material_kg_m2",
  "protective_layer_density_t_m3",
  "expansion_joint_sealant_kg_m",
  "bridge_waterproofing_productivity_m2_per_man_hour",
  "bridge_waterproofing_machine_productivity_m2_per_machine_hour",
]);

const EXPECTED_QUANTITIES: Readonly<Record<string, number>> = {
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:1": 6400,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:2": 6400,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:3": 1920,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:4": 6400,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:5": 6400,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:6": 6400,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:7": 6400,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:8": 6400,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:9": 6400,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:10": 929.472,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:11": 6400,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:12": 6400,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:13": 6400,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:14": 6400,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:15": 6400,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:16": 774.56,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:17": 1920,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:18": 6400,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:19": 256,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:20": 12.8,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:21": 16,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:22": 21.3333333333333,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:23": 25.6,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:24": 25.6,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:25": 21.3333333333333,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:26": 25.6,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:27": 25.6,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:28": 9294.72,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:29": 47,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:30": 47,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:31": 7745.6,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:32": 39,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:33": 39,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:34": 13,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:35": 13,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:36": 13,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:37": 13,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:38": 18,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:39": 7,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:40": 13,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:41": 1,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:42": 1,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:43": 1,
  "bridge_asphalt_preliminary_boq_expanded_complex_v1:r555:44": 6400,
};

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`R9_BRIDGE_WEB:${code}`);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

async function responseJson(response: Response): Promise<Json> {
  return response.json().catch(() => ({})) as Promise<Json>;
}

async function api(authorization: string, path: string, init?: RequestInit): Promise<Json> {
  const response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      accept: "application/json",
      authorization,
      ...(init?.body == null ? {} : { "content-type": "application/json" }),
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(180_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.status >= 200 && response.status < 300,
    `API_${response.status}:${path}:${JSON.stringify(body).slice(0, 2_000)}`);
  return body;
}

async function waitJob(authorization: string, jobId: string): Promise<Json> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await api(authorization, `jobs/${jobId}`);
    if (job.status === "succeeded") return job;
    invariant(!["failed", "cancelled"].includes(String(job.status)),
      `JOB_${String(job.status)}:${jobId}:${JSON.stringify(job.error ?? {})}`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`R9_BRIDGE_WEB:JOB_TIMEOUT:${jobId}`);
}

async function allRows(authorization: string, revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const body = await api(authorization, `revisions/${revisionId}/rows?${query}`);
    rows.push(...(Array.isArray(body.rows) ? body.rows as Json[] : []));
    cursor = String(body.nextCursor ?? "");
  } while (cursor);
  return rows;
}

async function enterConsumer(page: Page): Promise<void> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (await page.getByTestId("consumer-repair-problem-input").isVisible().catch(() => false)) return;
    const login = page.getByTestId("auth.login.local-consumer")
      .or(page.getByTestId("protected-identity-local-consumer-login")).first();
    if (await login.isVisible().catch(() => false) && await login.isEnabled().catch(() => false)) {
      await login.click().catch(() => undefined);
    }
    await page.waitForTimeout(500);
  }
  const diagnostic = await page.evaluate(() => ({
    url: location.href,
    body: document.body.innerText.slice(0, 4_000),
    testIds: Array.from(document.querySelectorAll("[data-testid]"), (node) => node.getAttribute("data-testid")).slice(0, 200),
  }));
  throw new Error(`R9_BRIDGE_WEB:LOCAL_CONSUMER_LOGIN_RED:${JSON.stringify(diagnostic)}`);
}

async function identity(page: Page): Promise<{ revisionId: string; releaseId: string; catalogId: string }> {
  const row = page.locator('[id^="canonical-estimate-row-identity|"]').first();
  await row.waitFor({ state: "visible", timeout: 180_000 });
  const id = await row.getAttribute("id") ?? "";
  const parts = id.split("|");
  invariant(/^[0-9a-f-]{36}$/iu.test(parts[1] ?? ""), `REVISION_IDENTITY_RED:${id}`);
  return { revisionId: parts[1]!, releaseId: parts[2] ?? "", catalogId: parts[3] ?? "" };
}

async function waitForDifferentIdentity(page: Page, parentRevisionId: string): Promise<ReturnType<typeof identity>> {
  await page.waitForFunction((parent) => {
    const node = document.querySelector('[id^="canonical-estimate-row-identity|"]');
    return Boolean(node?.id && !node.id.startsWith(`canonical-estimate-row-identity|${parent}|`));
  }, parentRevisionId, { timeout: 180_000 });
  return identity(page);
}

async function openParameterPanel(page: Page): Promise<void> {
  const panel = page.getByTestId("request-estimate-parameter-panel");
  if (!await panel.isVisible().catch(() => false)) {
    const toggle = page.getByTestId("request-estimate-parameters-toggle");
    await toggle.waitFor({ state: "visible", timeout: 60_000 });
    await toggle.click();
    await panel.waitFor({ state: "visible", timeout: 60_000 });
  }
}

async function fillParameter(page: Page, key: string, value: string): Promise<void> {
  await openParameterPanel(page);
  let editor = page.getByTestId(`editable-param-inline-editor-${key}`).filter({ visible: true }).first();
  for (let attempt = 0; attempt < 30 && await editor.count() === 0; attempt += 1) {
    const more = page.getByTestId("request-estimate-show-more-parameters").filter({ visible: true });
    if (await more.count() > 0) {
      await more.first().click();
      await page.waitForTimeout(50);
    } else {
      const filled = page.getByTestId("request-estimate-filled-parameters-toggle").filter({ visible: true });
      if (await filled.count() > 0) await filled.first().click();
      await page.waitForTimeout(50);
    }
    editor = page.getByTestId(`editable-param-inline-editor-${key}`).filter({ visible: true }).first();
  }
  await editor.waitFor({ state: "visible", timeout: 30_000 });
  await editor.scrollIntoViewIfNeeded();
  const option = page.getByTestId(`editable-param-option-${key}-${value}`).filter({ visible: true });
  if (await option.count() > 0) {
    await option.first().click();
    return;
  }
  const input = editor.getByTestId("editable-param-popover-input");
  await input.fill(value);
  invariant(await input.inputValue() === value, `PARAMETER_VALUE_REJECTED:${key}:${value}`);
}

async function openPositions(page: Page): Promise<void> {
  const panel = page.getByTestId("request-estimate-positions-panel");
  if (await panel.isVisible().catch(() => false)) return;
  const toggle = page.getByTestId("request-estimate-positions-toggle");
  await toggle.waitFor({ state: "visible", timeout: 60_000 });
  await toggle.click();
  await panel.waitFor({ state: "visible", timeout: 60_000 });
}

async function visibleRows(page: Page): Promise<Json[]> {
  await openPositions(page);
  return page.locator('[id^="canonical-estimate-row-identity|"]').evaluateAll((nodes) => nodes.map((node) => {
    const id = node.getAttribute("id") ?? "";
    const input = node.querySelector('[data-testid^="consumer-repair-item-quantity-input-"]') as HTMLInputElement | null;
    const price = node.querySelector('[data-testid^="consumer-repair-item-unit-price-input-"]') as HTMLInputElement | null;
    return {
      nativeIdentity: id,
      rowId: id.split("|").slice(7).join("|"),
      text: (node as HTMLElement).innerText,
      quantityInput: input?.value ?? null,
      hasPriceInput: Boolean(price),
    };
  }));
}

function assertBridgeRows(rows: Json[]): void {
  invariant(rows.length === 44, `ROW_COUNT_${rows.length}_EXPECTED_44`);
  invariant(Object.keys(EXPECTED_QUANTITIES).length === 44, "EXPECTED_QUANTITY_CONTRACT_DRIFT");
  for (const row of rows) {
    const expected = EXPECTED_QUANTITIES[String(row.rowId)];
    invariant(expected != null, `UNEXPECTED_ROW:${String(row.rowId)}`);
    invariant(Math.abs(Number(row.quantity) - expected) < 1e-8,
      `QUANTITY_RED:${String(row.rowId)}:${String(row.quantity)}:${expected}`);
    invariant(typeof row.titleRu === "string" && /[А-Яа-яЁё]/u.test(row.titleRu),
      `RUSSIAN_TITLE_RED:${String(row.rowId)}:${String(row.titleRu)}`);
    invariant(Array.isArray(row.normativeTrace) && row.normativeTrace.length >= 2,
      `NORMATIVE_TRACE_RED:${String(row.rowId)}`);
  }
  invariant(!rows.some((row) => /:r555:(?:4[5-9]|5[01])$/u.test(String(row.rowId))),
    "INACTIVE_WATERPROOFING_REPAIR_ROWS_VISIBLE");
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const manifest = JSON.parse(readFileSync(RELEASE_MANIFEST, "utf8")) as Json;
  invariant(manifest.owner === "R4_A13_6_R9_BRIDGE_ASPHALT_COMPLETION_OWNER", "RELEASE_OWNER_RED");
  invariant(manifest.productionAccessed === false, "PRODUCTION_ACCESS_FLAG_RED");
  const releaseId = String(manifest.definitionReleaseId);
  const searchReleaseId = String(manifest.searchReleaseId);
  const runId = randomUUID();
  const outputPath = resolve(OUTPUT_ROOT, `03_R9_BRIDGE_WEB_ACCEPTANCE_${runId}.json`);
  const pdfPath = resolve(OUTPUT_ROOT, `R9_BRIDGE_6400_${runId}.pdf`);
  const screenshotPaths = {
    preliminary: resolve(OUTPUT_ROOT, `r9-bridge-${runId}-01-preliminary.png`),
    complete: resolve(OUTPUT_ROOT, `r9-bridge-${runId}-02-complete.png`),
    deleted: resolve(OUTPUT_ROOT, `r9-bridge-${runId}-03-row-deleted.png`),
    restored: resolve(OUTPUT_ROOT, `r9-bridge-${runId}-04-row-restored.png`),
    priced: resolve(OUTPUT_ROOT, `r9-bridge-${runId}-05-priced.png`),
    approved: resolve(OUTPUT_ROOT, `r9-bridge-${runId}-06-approved.png`),
    cold: resolve(OUTPUT_ROOT, `r9-bridge-${runId}-07-cold-reopen.png`),
  };
  const client = new Client({ connectionString: DATABASE_URL, application_name: "r9-bridge-web-acceptance" });
  await client.connect();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  const page = await context.newPage();
  const requests: Json[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  let authorization = "";
  page.on("request", (request) => {
    if (request.url().startsWith(`${BACKEND}/`)) {
      const header = request.headers().authorization ?? "";
      if (header.startsWith("Bearer ")) authorization = header;
    }
  });
  page.on("response", (response) => {
    if (!response.url().startsWith(`${BACKEND}/`)) return;
    requests.push({ at: new Date().toISOString(), method: response.request().method(),
      path: new URL(response.url()).pathname, query: new URL(response.url()).search,
      status: response.status(), requestId: response.headers()["x-request-id"] ?? null });
  });
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text().slice(0, 2_000)); });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => requestFailures.push(
    `${request.method()} ${new URL(request.url()).pathname} ${request.failure()?.errorText ?? ""}`,
  ));
  context.on("page", (opened) => { if (opened !== page) void opened.close().catch(() => undefined); });
  try {
    await page.goto(`${ORIGIN}/request?r9Bridge=${runId}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.getByTestId("local-developer-review-banner").waitFor({ state: "visible", timeout: 180_000 });
    await enterConsumer(page);
    if (FOCUS_PROBE_REVISION) {
      await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(FOCUS_PROBE_REVISION)}&focusProbe=${runId}`,
        { waitUntil: "domcontentloaded", timeout: 180_000 });
      await identity(page);
      await page.waitForTimeout(5_000);
      await openParameterPanel(page);
      const approveProbe = page.getByTestId("consumer-repair-approve");
      const parameterDiagnostics = {
        approveVisible: await approveProbe.isVisible().catch(() => false),
        approveEnabled: await approveProbe.isEnabled().catch(() => false),
        approveLabel: await approveProbe.getAttribute("aria-label").catch(() => null),
        parameterPanelText: await page.getByTestId("request-estimate-parameter-panel")
          .innerText().catch(() => ""),
        inlineEditorIds: await page.locator('[data-testid^="editable-param-inline-editor-"]')
          .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-testid"))),
      };
      await openPositions(page);
      await page.waitForTimeout(2_000);
      const probeInput = page.locator('[data-testid^="consumer-repair-item-unit-price-input-"]').first();
      await probeInput.waitFor({ state: "visible", timeout: 60_000 });
      await probeInput.scrollIntoViewIfNeeded();
      await probeInput.click();
      await probeInput.fill("");
      await page.evaluate(() => {
        const node = document.activeElement as HTMLElement | null;
        const events: Json[] = [];
        (window as typeof window & { __r9FocusEvents?: Json[] }).__r9FocusEvents = events;
        for (const name of ["beforeinput", "input", "change", "focus", "blur", "focusin", "focusout"]) {
          node?.addEventListener(name, (event) => events.push({
            name,
            at: performance.now(),
            value: (event.target as HTMLInputElement | null)?.value ?? null,
            activeTestId: document.activeElement?.getAttribute("data-testid") ?? null,
            connected: node?.isConnected ?? null,
          }));
        }
      });
      const steps: Json[] = [];
      for (const digit of ["1", "5", "0"]) {
        await page.keyboard.press(digit);
        await page.waitForTimeout(100);
        steps.push({ digit, value: await probeInput.inputValue(),
          focused: await probeInput.evaluate((node) => document.activeElement === node),
          activeTestId: await page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? null) });
      }
      const events = await page.evaluate(() =>
        (window as typeof window & { __r9FocusEvents?: Json[] }).__r9FocusEvents ?? []);
      process.stdout.write(`${JSON.stringify({ status: "R9_FOCUS_PROBE", revisionId: FOCUS_PROBE_REVISION,
        parameterDiagnostics, steps, events }, null, 2)}\n`);
      return;
    }
    const requestInput = page.getByTestId("consumer-repair-problem-input");
    const searchPromise = page.waitForResponse((response) => response.url().startsWith(`${BACKEND}/search/catalog?`)
      && new URL(response.url()).searchParams.get("query") === NORMALIZED_SEARCH && response.status() === 200,
    { timeout: 120_000 });
    const [searchResponse] = await Promise.all([searchPromise, requestInput.fill(PROMPT)]);
    const search = await responseJson(searchResponse);
    invariant(search.searchIndexReleaseId === searchReleaseId, "SEARCH_RELEASE_DRIFT");
    invariant(search.rawQuery === NORMALIZED_SEARCH && search.parsedQuantity == null
      && search.parsedDimensions == null, `CLIENT_SEARCH_NORMALIZATION_RED:${JSON.stringify(search)}`);
    const results = Array.isArray(search.items) ? search.items as Json[] : [];
    const selectedIndex = results.findIndex((item) => item.catalogId === CATALOG_ID);
    invariant(selectedIndex >= 0, "BRIDGE_SEARCH_RESULT_MISSING");
    await page.getByTestId(`consumer-repair-work-suggestion-${selectedIndex + 1}`).click();
    invariant(authorization.startsWith("Bearer "), "AUTHORIZATION_MISSING");
    const serverGeometrySearch = await api(authorization,
      `search/catalog?query=${encodeURIComponent(PROMPT)}&limit=20&scope=WORKS`);
    invariant(Number(serverGeometrySearch.parsedQuantity) === 6400 && serverGeometrySearch.parsedUnit === "м²"
      && Number(serverGeometrySearch.parsedDimensions?.lengthM) === 200
      && Number(serverGeometrySearch.parsedDimensions?.widthM) === 32
      && Number(serverGeometrySearch.parsedDimensions?.areaM2) === 6400,
    `SERVER_SEARCH_GEOMETRY_RED:${JSON.stringify(serverGeometrySearch)}`);

    const compileResponsePromise = page.waitForResponse((response) => response.url().endsWith("/jobs/compile")
      && response.request().method() === "POST", { timeout: 180_000 });
    const [compileResponse] = await Promise.all([
      compileResponsePromise,
      page.getByTestId("consumer-repair-prepare-draft").click(),
    ]);
    const compile = await responseJson(compileResponse);
    invariant(compileResponse.status() === 202, `COMPILE_HTTP_${compileResponse.status()}:${JSON.stringify(compile)}`);
    const preliminaryIdentity = await identity(page);
    invariant(preliminaryIdentity.releaseId === releaseId && preliminaryIdentity.catalogId === CATALOG_ID,
      "PRELIMINARY_TUPLE_RED");
    const preliminary = await api(authorization, `revisions/${preliminaryIdentity.revisionId}`);
    const preliminaryRows = await allRows(authorization, preliminaryIdentity.revisionId);
    invariant(preliminaryRows.length === 14, `PRELIMINARY_ROW_COUNT_${preliminaryRows.length}_EXPECTED_14`);
    invariant(Number(preliminary.parameters?.area_m2) === 6400
      && Number(preliminary.parameters?.length_m) === 200
      && Number(preliminary.parameters?.width_m) === 32, `PRELIMINARY_PARAMETERS_RED:${JSON.stringify(preliminary.parameters)}`);
    invariant(preliminaryRows.every((row) => Number(row.quantity) === 6400), "PRELIMINARY_INDEPENDENT_QUANTITIES_RED");
    await page.screenshot({ path: screenshotPaths.preliminary, fullPage: true });

    const baseline = (await client.query(`select baseline.input_values
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_approved_template_baseline baseline on baseline.id=manifest.approved_template_baseline_id
      where manifest.release_id=$1 and manifest.catalog_id=$2`, [releaseId, CATALOG_ID])).rows[0] as Json;
    invariant(baseline?.input_values && typeof baseline.input_values === "object", "BASELINE_FIXTURE_MISSING");
    const baselineUiInputs = Object.fromEntries(Object.entries(baseline.input_values as Json)
      .filter(([parameterId]) => parameterId !== "area_m2" && !BRANCH_PARAMETERS.has(parameterId)));
    const explicitUiInputs = { ...baselineUiInputs };
    invariant(Object.keys(baselineUiInputs).length === 28,
      `BASELINE_ACTIVE_INPUT_COUNT_${Object.keys(baselineUiInputs).length}_EXPECTED_28`);
    invariant(Object.keys(explicitUiInputs).length === 28, `ACTIVE_INPUT_COUNT_${Object.keys(explicitUiInputs).length}_EXPECTED_28`);
    for (const [parameterId, value] of Object.entries(baselineUiInputs)) {
      await fillParameter(page, parameterId, String(value));
    }
    const formulaRecalculatePromise = page.waitForResponse((response) => response.url().endsWith("/jobs/recalculate")
      && response.request().method() === "POST", { timeout: 180_000 });
    const [formulaRecalculateResponse] = await Promise.all([
      formulaRecalculatePromise,
      page.getByTestId("editable-param-batch-apply").filter({ visible: true }).first().click(),
    ]);
    const formulaRecalculate = await responseJson(formulaRecalculateResponse);
    invariant(formulaRecalculateResponse.status() === 202,
      `FORMULA_RECALCULATE_HTTP_${formulaRecalculateResponse.status()}:${JSON.stringify(formulaRecalculate)}`);
    const formulaIdentity = await waitForDifferentIdentity(page, preliminaryIdentity.revisionId);
    const formulaRevision = await api(authorization, `revisions/${formulaIdentity.revisionId}`);
    const formulaRows = await allRows(authorization, formulaIdentity.revisionId);
    invariant(formulaRevision.parentRevisionId === preliminaryIdentity.revisionId, "FORMULA_PARENT_RED");
    const completeIdentity = formulaIdentity;
    const complete = formulaRevision;
    const completeRows = formulaRows;
    invariant(complete.status === "ready" && (complete.preliminaryNeeds ?? []).length === 0,
      `COMPLETE_READINESS_RED:${complete.status}:${(complete.preliminaryNeeds ?? []).length}`);
    assertBridgeRows(completeRows);
    const visualCompleteRows = await visibleRows(page);
    invariant(visualCompleteRows.length === 44, `VISIBLE_COMPLETE_ROW_COUNT_${visualCompleteRows.length}`);
    invariant(visualCompleteRows.every((row) => typeof row.text === "string" && row.text.length > 5), "VISIBLE_ROW_TEXT_RED");
    await page.screenshot({ path: screenshotPaths.complete, fullPage: true });

    const amendedRowId = String(visualCompleteRows[0]?.rowId ?? "");
    invariant(amendedRowId.length > 0, "ROW_DELETE_TARGET_MISSING");
    const deleteResponsePromise = page.waitForResponse((response) => response.url().endsWith("/jobs/recalculate")
      && response.request().method() === "POST", { timeout: 180_000 });
    const firstRemove = page.locator('[data-testid^="consumer-repair-item-remove-"]').first();
    await firstRemove.waitFor({ state: "visible", timeout: 60_000 });
    const [deleteResponse] = await Promise.all([deleteResponsePromise, firstRemove.click()]);
    invariant(deleteResponse.status() === 202, `ROW_DELETE_HTTP_${deleteResponse.status()}`);
    const deletedIdentity = await waitForDifferentIdentity(page, completeIdentity.revisionId);
    const deletedRevision = await api(authorization, `revisions/${deletedIdentity.revisionId}`);
    const deletedRows = await allRows(authorization, deletedIdentity.revisionId);
    const deletedTarget = deletedRows.find((row) => String(row.rowId) === amendedRowId);
    invariant(deletedRevision.parentRevisionId === completeIdentity.revisionId, "ROW_DELETE_PARENT_RED");
    invariant(!deletedTarget || deletedTarget.includedInEstimate === false, "ROW_DELETE_PERSISTENCE_RED");
    const deletedVisualRows = await visibleRows(page);
    invariant(deletedVisualRows.length === 43 && !deletedVisualRows.some((row) => String(row.rowId) === amendedRowId),
      `ROW_DELETE_UI_RED:${deletedVisualRows.length}:${amendedRowId}`);
    await page.screenshot({ path: screenshotPaths.deleted, fullPage: true });

    const restoreResponsePromise = page.waitForResponse((response) => response.url().endsWith("/jobs/recalculate")
      && response.request().method() === "POST", { timeout: 180_000 });
    const restore = page.getByTestId("consumer-repair-restore-item");
    await restore.waitFor({ state: "visible", timeout: 60_000 });
    const [restoreResponse] = await Promise.all([restoreResponsePromise, restore.click()]);
    invariant(restoreResponse.status() === 202, `ROW_RESTORE_HTTP_${restoreResponse.status()}`);
    const restoredIdentity = await waitForDifferentIdentity(page, deletedIdentity.revisionId);
    const restoredRevision = await api(authorization, `revisions/${restoredIdentity.revisionId}`);
    const restoredRows = await allRows(authorization, restoredIdentity.revisionId);
    const restoredTarget = restoredRows.find((row) => String(row.rowId) === amendedRowId);
    invariant(restoredRevision.parentRevisionId === deletedIdentity.revisionId, "ROW_RESTORE_PARENT_RED");
    invariant(restoredTarget?.includedInEstimate !== false, "ROW_RESTORE_PERSISTENCE_RED");
    assertBridgeRows(restoredRows);
    const restoredVisualRows = await visibleRows(page);
    invariant(restoredVisualRows.length === 44 && restoredVisualRows.some((row) => String(row.rowId) === amendedRowId),
      `ROW_RESTORE_UI_RED:${restoredVisualRows.length}:${amendedRowId}`);
    await page.screenshot({ path: screenshotPaths.restored, fullPage: true });
    // Let the saved-revision status paint finish before measuring input focus;
    // this mirrors a user opening the ready positions editor, not typing into
    // the transient node that is being replaced by the completed job result.
    await page.waitForTimeout(1_500);

    const firstPriceInput = page.locator('[data-testid^="consumer-repair-item-unit-price-input-"]').first();
    await firstPriceInput.waitFor({ state: "visible", timeout: 60_000 });
    await firstPriceInput.scrollIntoViewIfNeeded();
    await firstPriceInput.click();
    await firstPriceInput.fill("");
    const continuousInput: Json[] = [];
    for (const digit of ["1", "5", "0"]) {
      const before = await firstPriceInput.inputValue();
      await page.keyboard.press(digit);
      await page.waitForTimeout(50);
      const value = await firstPriceInput.inputValue();
      const focused = await firstPriceInput.evaluate((node) => document.activeElement === node);
      const activeTestId = await page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? null);
      continuousInput.push({ digit, before, value, focused, activeTestId });
    }
    invariant(JSON.stringify(continuousInput.map((step) => [step.value, step.focused]))
      === JSON.stringify([["1", true], ["15", true], ["150", true]]),
    `CONTINUOUS_INPUT_RED:${JSON.stringify(continuousInput)}`);
    const firstPriceParent = restoredIdentity.revisionId;
    const priceResponsePromise = page.waitForResponse((response) => response.url().endsWith("/jobs/recalculate")
      && response.request().method() === "POST", { timeout: 180_000 });
    await firstPriceInput.blur();
    const priceResponse = await priceResponsePromise;
    invariant(priceResponse.status() === 202, `FIRST_PRICE_HTTP_${priceResponse.status()}`);
    const firstPriceIdentity = await waitForDifferentIdentity(page, firstPriceParent);
    const firstPriceRevision = await api(authorization, `revisions/${firstPriceIdentity.revisionId}`);
    invariant(firstPriceRevision.parentRevisionId === firstPriceParent, "FIRST_PRICE_PARENT_RED");
    const priceRows = (await visibleRows(page)).filter((row) => row.hasPriceInput).map((row) => String(row.rowId));
    invariant(priceRows.length > 0 && priceRows.length <= 44, `PRICEABLE_ROW_COUNT_RED:${priceRows.length}`);
    const rowOverrides: Json = { ...(firstPriceRevision.amendmentContract?.rowOverrides ?? {}) };
    for (const rowId of priceRows) {
      rowOverrides[rowId] = { ...(rowOverrides[rowId] ?? {}), unitPrice: 150,
        provenance: { kind: "manual", reason: "r9_bridge_web_acceptance_price" } };
    }
    const directPricePayload = {
      idempotencyKey: `r9-bridge-price-${sha256(JSON.stringify(stable({
        parentRevisionId: firstPriceIdentity.revisionId, rowOverrides,
      }))).slice(0, 32)}`,
      catalogId: CATALOG_ID,
      parentRevisionId: firstPriceIdentity.revisionId,
      sourceRequestText: firstPriceRevision.sourceRequestText || PROMPT,
      primaryMeasureParameterId: firstPriceRevision.primaryMeasureParameterId || "area_m2",
      parameters: firstPriceRevision.parameters,
      currencyCode: firstPriceRevision.currencyCode || "KGS",
      priceSnapshotIds: firstPriceRevision.priceSnapshotIds ?? [],
      rowOverrides,
      customRows: firstPriceRevision.amendmentContract?.customRows ?? [],
    };
    const directPriceAccepted = await api(authorization, "jobs/recalculate", {
      method: "POST", body: JSON.stringify(directPricePayload),
    });
    const directPriceJob = await waitJob(authorization, String(directPriceAccepted.jobId));
    const pricedRevisionId = String(directPriceJob.resultRevisionId ?? "");
    invariant(/^[0-9a-f-]{36}$/iu.test(pricedRevisionId), `PRICED_REVISION_ID_RED:${pricedRevisionId}`);
    const priced = await api(authorization, `revisions/${pricedRevisionId}`);
    const pricedRows = await allRows(authorization, pricedRevisionId);
    assertBridgeRows(pricedRows);
    invariant(priced.parentRevisionId === firstPriceIdentity.revisionId, "PRICED_PARENT_RED");
    invariant(pricedRows.filter((row) => priceRows.includes(String(row.rowId)))
      .every((row) => Number(row.unitPrice) === 150
        && Math.abs(Number(row.amount) - Math.round(Number(row.quantity) * 150 * 100) / 100) < 1e-8),
    "PRICED_PAYABLE_ROWS_RED");

    await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(pricedRevisionId)}&r9Priced=${runId}`,
      { waitUntil: "domcontentloaded", timeout: 180_000 });
    const pricedUiIdentity = await identity(page);
    invariant(pricedUiIdentity.revisionId === pricedRevisionId && pricedUiIdentity.releaseId === releaseId,
      "PRICED_UI_IDENTITY_RED");
    const pricedVisualRows = await visibleRows(page);
    invariant(pricedVisualRows.length === 44, `PRICED_VISIBLE_ROW_COUNT_${pricedVisualRows.length}`);
    const approve = page.getByTestId("consumer-repair-approve");
    await approve.waitFor({ state: "visible", timeout: 60_000 });
    const approvalReadinessDeadline = Date.now() + 60_000;
    while (!await approve.isEnabled() && Date.now() < approvalReadinessDeadline) {
      await page.waitForTimeout(100);
    }
    invariant(await approve.isEnabled(), `APPROVE_DISABLED:${await approve.getAttribute("aria-label")}`);
    await page.screenshot({ path: screenshotPaths.priced, fullPage: true });

    const approvalArtifactPromise = page.waitForResponse((response) => response.request().method() === "POST"
      && response.url().includes(`/revisions/${pricedRevisionId}/artifacts/pdf`), { timeout: 180_000 });
    const [approvalArtifactResponse] = await Promise.all([approvalArtifactPromise, approve.click()]);
    invariant(approvalArtifactResponse.status() === 202, `APPROVAL_ARTIFACT_HTTP_${approvalArtifactResponse.status()}`);
    await page.getByText(/Заявка утверждена/u).waitFor({ state: "visible", timeout: 180_000 });
    await page.screenshot({ path: screenshotPaths.approved, fullPage: true });
    const archivalPdf = await api(authorization, `revisions/${pricedRevisionId}/artifacts/pdf`);
    invariant(archivalPdf.status === "ready" && archivalPdf.revisionId === pricedRevisionId
      && archivalPdf.releaseId === releaseId, `ARCHIVAL_PDF_IDENTITY_RED:${JSON.stringify(archivalPdf)}`);

    const postCountBeforeCold = requests.filter((request) => request.method === "POST").length;
    await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(pricedRevisionId)}&r9Cold=${runId}`,
      { waitUntil: "domcontentloaded", timeout: 180_000 });
    const coldIdentity = await identity(page);
    invariant(coldIdentity.revisionId === pricedRevisionId && coldIdentity.releaseId === releaseId
      && coldIdentity.catalogId === CATALOG_ID, "COLD_IDENTITY_RED");
    const postCountAfterCold = requests.filter((request) => request.method === "POST").length;
    invariant(postCountAfterCold === postCountBeforeCold, "COLD_REOPEN_CREATED_MUTATION");
    const coldRevision = await api(authorization, `revisions/${pricedRevisionId}`);
    invariant(Number(coldRevision.parameters?.area_m2) === 6400
      && Number(coldRevision.parameters?.length_m) === 200
      && Number(coldRevision.parameters?.width_m) === 32
      && Object.entries(explicitUiInputs).every(([key, value]) => String(coldRevision.parameters?.[key]) === String(value)),
    "COLD_PARAMETERS_NOT_PRESERVED");
    const coldRows = await allRows(authorization, pricedRevisionId);
    assertBridgeRows(coldRows);
    const coldVisualRows = await visibleRows(page);
    invariant(coldVisualRows.length === 44, `COLD_VISIBLE_ROW_COUNT_${coldVisualRows.length}`);

    const procurementPromise = page.waitForResponse((response) => response.request().method() === "GET"
      && response.url().includes(`/revisions/${pricedRevisionId}/artifacts/procurement`) && response.status() === 200,
    { timeout: 180_000 });
    const procurementAction = page.getByTestId("consumer-estimate-open-procurement").first();
    await procurementAction.waitFor({ state: "visible", timeout: 60_000 });
    const [procurementResponse] = await Promise.all([procurementPromise, procurementAction.click()]);
    const procurement = await responseJson(procurementResponse);
    const selectedProcurementRowCount = Number(
      procurement.selectedRowCount ?? procurement.metadata?.selectedProcurementRowCount,
    );
    invariant(procurement.status === "ready" && procurement.revisionId === pricedRevisionId
      && procurement.releaseId === releaseId && selectedProcurementRowCount > 0,
    `PROCUREMENT_IDENTITY_RED:${JSON.stringify(procurement)}`);

    const pdfMetadataPromise = page.waitForResponse((response) => response.request().method() === "GET"
      && response.url().includes(`/revisions/${pricedRevisionId}/artifacts/pdf`) && response.status() === 200,
    { timeout: 180_000 });
    const [pdfMetadataResponse] = await Promise.all([
      pdfMetadataPromise,
      page.getByTestId("consumer-estimate-make-pdf").first().click(),
    ]);
    const professionalPdf = await responseJson(pdfMetadataResponse);
    invariant(typeof professionalPdf.signedUrl === "string" && professionalPdf.signedUrl.length > 0,
      "PROFESSIONAL_PDF_SIGNED_URL_MISSING");
    const pdfDownload = await fetch(professionalPdf.signedUrl, { signal: AbortSignal.timeout(180_000) });
    invariant(pdfDownload.ok, `PROFESSIONAL_PDF_DOWNLOAD_HTTP_${pdfDownload.status}`);
    const pdfBytes = Buffer.from(await pdfDownload.arrayBuffer());
    invariant(pdfBytes.subarray(0, 4).toString("ascii") === "%PDF", "PDF_MAGIC_RED");
    invariant(professionalPdf.status === "ready" && professionalPdf.revisionId === pricedRevisionId
      && professionalPdf.releaseId === releaseId && professionalPdf.sha256 === sha256(pdfBytes),
    `PROFESSIONAL_PDF_IDENTITY_RED:${JSON.stringify(professionalPdf)}`);
    writeFileSync(pdfPath, pdfBytes);
    await page.getByTestId("pdf-viewer-web-iframe").waitFor({ state: "visible", timeout: 180_000 });
    await page.screenshot({ path: screenshotPaths.cold, fullPage: true });

    const dbAudit = (await client.query(`select revision.id,revision.parent_revision_id,revision.release_id,
        revision.catalog_id,revision.status,revision.user_input_snapshot,revision.input_parameters,
        revision.row_count,revision.checksum_sha256,
        count(row.row_id)::int persisted_rows,
        count(*) filter(where row.included_in_estimate)::int included_rows,
        count(*) filter(where row.procurement_eligible)::int procurement_eligible_rows,
        count(*) filter(where row.unit_price=150)::int rows_priced_150
      from public.estimate_revision revision
      join public.estimate_revision_row row on row.revision_id=revision.id
      where revision.id=$1
      group by revision.id`, [pricedRevisionId])).rows[0] as Json;
    invariant(dbAudit.release_id === releaseId && dbAudit.catalog_id === CATALOG_ID
      && Number(dbAudit.persisted_rows) === 44 && Number(dbAudit.row_count) === 44,
    `DB_AUDIT_RED:${JSON.stringify(dbAudit)}`);

    const expectedBrowserLifecycleAborts = requestFailures.filter((failure) =>
      failure.includes("ERR_ABORTED") && (
        failure.includes("/artifact-files/")
        || failure.startsWith("POST /auth/v1/logout ")
      )
    );
    const unexpectedFailures = requestFailures.filter((failure) =>
      !expectedBrowserLifecycleAborts.includes(failure)
    );
    invariant(pageErrors.length === 0, `PAGE_ERRORS:${pageErrors.join("|")}`);
    invariant(consoleErrors.length === 0, `CONSOLE_ERRORS:${consoleErrors.join("|")}`);
    invariant(unexpectedFailures.length === 0, `REQUEST_FAILURES:${unexpectedFailures.join("|")}`);
    const reportUnsigned = {
      contract: CONTRACT,
      runId,
      generatedAt: new Date().toISOString(),
      status: "GREEN_R9_BRIDGE_200_X_32_FULL_WEB_APPROVAL_PDF_PROCUREMENT",
      productionAccessed: false,
      prompt: PROMPT,
      normalizedSearch: NORMALIZED_SEARCH,
      definitionReleaseId: releaseId,
      searchReleaseId,
      search: { clientRankingQuery: search.rawQuery, clientParsedQuantity: search.parsedQuantity,
        serverQuantity: serverGeometrySearch.parsedQuantity, serverUnit: serverGeometrySearch.parsedUnit,
        serverDimensions: serverGeometrySearch.parsedDimensions, exactCatalogId: CATALOG_ID,
        requestPath: new URL(searchResponse.url()).pathname + new URL(searchResponse.url()).search },
      preliminary: { jobId: compile.jobId, revisionId: preliminaryIdentity.revisionId,
        rowCount: preliminaryRows.length, parameters: preliminary.parameters,
        rows: preliminaryRows.map((row) => ({ rowId: row.rowId, titleRu: row.titleRu, quantity: row.quantity, unitId: row.unitId })) },
      complete: { formulaJobId: formulaRecalculate.jobId, formulaRevisionId: formulaIdentity.revisionId,
        revisionId: completeIdentity.revisionId,
        parentRevisionId: complete.parentRevisionId, status: complete.status,
        activeInputCount: Object.keys(explicitUiInputs).length, explicitUiInputs,
        rowCount: completeRows.length, remainingNeeds: (complete.preliminaryNeeds ?? []).length,
        rows: completeRows.map((row) => ({ rowId: row.rowId, titleRu: row.titleRu,
          unitId: row.unitId, quantity: row.quantity, procurementEligible: row.procurementEligible })) },
      rowAmendment: { rowId: amendedRowId, deleteRevisionId: deletedIdentity.revisionId,
        deleteParentRevisionId: deletedRevision.parentRevisionId, visibleRowsAfterDelete: deletedVisualRows.length,
        restoreRevisionId: restoredIdentity.revisionId, restoreParentRevisionId: restoredRevision.parentRevisionId,
        visibleRowsAfterRestore: restoredVisualRows.length, persistedAcrossBothChildRevisions: true },
      continuousInput,
      pricing: { firstUiRevisionId: firstPriceIdentity.revisionId, pricedRevisionId,
        pricedParentRevisionId: priced.parentRevisionId, priceableRowCount: priceRows.length,
        unitPriceKgs: 150, allPayableAmountsMatch: true },
      approval: { approved: true, revisionId: pricedRevisionId,
        archivalPdfArtifactId: archivalPdf.artifactId, archivalPdfSha256: archivalPdf.sha256 },
      reload: { exactRevisionPreserved: true, mutationPosts: postCountAfterCold - postCountBeforeCold,
        parametersPreserved: true, visibleRowCount: coldVisualRows.length },
      procurement: { artifactId: procurement.artifactId, revisionId: procurement.revisionId,
        releaseId: procurement.releaseId, selectedRowCount: selectedProcurementRowCount },
      pdf: { artifactId: professionalPdf.artifactId, revisionId: professionalPdf.revisionId,
        releaseId: professionalPdf.releaseId, sha256: professionalPdf.sha256,
        bytes: pdfBytes.length, path: pdfPath },
      dbAudit,
      requests,
      consoleErrors,
      pageErrors,
      requestFailures: unexpectedFailures,
      screenshots: screenshotPaths,
    };
    const report = { ...reportUnsigned, sha256: sha256(JSON.stringify(stable(reportUnsigned))) };
    atomicJson(outputPath, report);
    process.stdout.write(`${JSON.stringify({ status: report.status, outputPath, pdfPath,
      preliminaryRevisionId: preliminaryIdentity.revisionId, completeRevisionId: completeIdentity.revisionId,
      pricedAndApprovedRevisionId: pricedRevisionId, rowCount: completeRows.length,
      pdfSha256: professionalPdf.sha256 }, null, 2)}\n`);
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
