import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page, type Response } from "playwright";

type Json = Record<string, any>;

const ORIGIN = "http://localhost:8081";
const BACKEND = "http://127.0.0.1:8765";
const CATALOG_ID = "canonical-work:expanded:strip_foundation";
const PROMPT = "устройство монолитного железобетонного ленточного фундамента длиной 150 метров шириной 0,7 метра высотой 1,2 метра";
const OUTPUT = resolve(".release-runtime/s27/acceptance/cross-family-pricing-web.json");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S271_CROSS_FAMILY_PRICE:${code}`);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function poll<T>(read: () => Promise<T | null>, timeoutMs = 180_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const value = await read();
      if (value != null) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error("S271_CROSS_FAMILY_PRICE:POLL_TIMEOUT");
}

async function api(authorization: string, path: string): Promise<Json> {
  const response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    headers: { accept: "application/json", authorization },
    signal: AbortSignal.timeout(180_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok, `API_${response.status}:${path}:${JSON.stringify(body).slice(0, 800)}`);
  return body;
}

async function waitJob(authorization: string, jobId: string): Promise<Json> {
  return poll(async () => {
    const job = await api(authorization, `jobs/${jobId}`);
    invariant(!["failed", "cancelled"].includes(String(job.status)),
      `JOB_${String(job.status)}:${JSON.stringify(job.error ?? {}).slice(0, 800)}`);
    return job.status === "succeeded" ? job : null;
  });
}

async function allRows(authorization: string, revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const body = await api(authorization, `revisions/${revisionId}/rows?${query}`);
    rows.push(...(Array.isArray(body.rows) ? body.rows : []));
    cursor = String(body.nextCursor ?? "");
  } while (cursor);
  return rows;
}

async function signIn(page: Page): Promise<void> {
  const email = String(process.env.S27_TEST_EMAIL ?? "").trim();
  const password = String(process.env.S27_TEST_PASSWORD ?? "");
  invariant(email && password, "TEST_CREDENTIALS_MISSING");
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await page.getByTestId("consumer-repair-problem-input").isVisible().catch(() => false)) return;
    const emailInput = page.getByTestId("auth.login.email");
    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill(email);
      await page.getByTestId("auth.login.password").fill(password);
      await page.getByTestId("auth.login.submit").click();
      await sleep(1_000);
      await page.goto(`${ORIGIN}/request?s271PriceLogin=1`, {
        waitUntil: "domcontentloaded",
        timeout: 180_000,
      });
      continue;
    }
    const login = page.getByTestId("protected-identity-login")
      .or(page.getByTestId("consumer-estimate-identity-login")).first();
    if (await login.isVisible().catch(() => false)) await login.click();
    await sleep(500);
  }
  throw new Error("S271_CROSS_FAMILY_PRICE:SIGN_IN_TIMEOUT");
}

async function openFullEstimateIfPreviewed(page: Page): Promise<void> {
  const preview = page.getByTestId("consumer-estimate-meaningful-preview");
  if (!await preview.isVisible().catch(() => false)) return;
  const open = page.getByTestId("consumer-estimate-open-full-estimate");
  await open.waitFor({ state: "visible", timeout: 60_000 });
  await poll(async () => await open.isEnabled().catch(() => false) ? true : null, 60_000);
  await open.click();
  await preview.waitFor({ state: "hidden", timeout: 60_000 });
}

async function main(): Promise<void> {
  const runId = randomUUID();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  const page = await context.newPage();
  let authorization = "";
  let matchingSearch: Json | null = null;
  const clientRevisionReads: Json[] = [];
  const pageErrors: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(`${BACKEND}/`)) return;
    const header = request.headers().authorization ?? "";
    if (header.startsWith("Bearer ")) authorization = header;
  });
  page.on("response", (response: Response) => {
    if (response.status() !== 200) return;
    if (response.url().startsWith(`${BACKEND}/search/catalog?`)) {
      void response.json().then((body: Json) => {
        if (Array.isArray(body.items) && body.items.some((item: Json) => item.catalogId === CATALOG_ID)) {
          matchingSearch = body;
        }
      }).catch(() => undefined);
      return;
    }
    if (/\/revisions\/[0-9a-f-]{36}$/iu.test(new URL(response.url()).pathname)
      && response.request().method() === "GET") {
      void response.json().then((body: Json) => clientRevisionReads.push(body)).catch(() => undefined);
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 1_000)));
  try {
    await page.goto(`${ORIGIN}/request?s271Price=${runId}`, {
      waitUntil: "domcontentloaded",
      timeout: 180_000,
    });
    await signIn(page);
    await page.getByTestId("consumer-repair-problem-input").fill(PROMPT);
    const search = await poll(async () => matchingSearch, 120_000);
    const selectedIndex = search.items.findIndex((item: Json) => item.catalogId === CATALOG_ID);
    invariant(selectedIndex >= 0, "CATALOG_RESULT_MISSING");
    await page.getByTestId(`consumer-repair-work-suggestion-${selectedIndex + 1}`).click();
    await poll(async () => authorization.startsWith("Bearer ") ? true : null, 30_000);

    const compileResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/jobs/compile") && response.request().method() === "POST",
    { timeout: 180_000 });
    await page.getByTestId("consumer-repair-prepare-draft").click();
    const compileResponse = await compileResponsePromise;
    const accepted = await compileResponse.json() as Json;
    invariant(compileResponse.status() === 202,
      `COMPILE_HTTP_${compileResponse.status()}:${JSON.stringify(accepted).slice(0, 1_200)}`);
    const job = await waitJob(authorization, String(accepted.jobId));
    const revisionId = String(job.resultRevisionId ?? "");
    invariant(/^[0-9a-f-]{36}$/iu.test(revisionId), "REVISION_ID");
    const revision = await api(authorization, `revisions/${revisionId}`);
    const rows = await allRows(authorization, revisionId);
    const pricedRows = rows.filter((row) => row.unitPrice != null);
    const unknownRows = rows.filter((row) => row.unitPrice == null);
    invariant(revision.catalogId === CATALOG_ID, `CATALOG_${String(revision.catalogId)}`);
    invariant(rows.length > 0, "NO_APPLICABLE_ROWS");
    invariant(pricedRows.length > 0, "NO_AUTOMATIC_COMPATIBLE_PRICES");
    invariant(unknownRows.length > 0, "PARTIAL_PRICE_STATE_NOT_REPRESENTED");
    invariant(pricedRows.every((row) => Number(row.unitPrice) >= 0 && row.amount != null),
      "PRICED_ROW_WITHOUT_AMOUNT");
    invariant(unknownRows.every((row) => row.unitPrice == null), "UNKNOWN_PRICE_COERCED_TO_ZERO");
    const selectedSnapshotIds = Array.isArray(revision.priceSnapshotIds) ? revision.priceSnapshotIds : [];
    invariant(selectedSnapshotIds.length > 0, "SELECTED_PRICE_SNAPSHOT_EVIDENCE_MISSING");
    invariant(pricedRows.every((row) =>
      row.priceSource?.kind === "AUTOMATIC_SNAPSHOT"
      && selectedSnapshotIds.includes(row.priceSource.snapshotId)
      && row.priceSource.unitId === row.unitId
      && Number(row.priceSource.unitPrice) === Number(row.unitPrice)
      && typeof row.priceSource.snapshotCapturedAt === "string"
      && typeof row.priceSource.routeSourceKind === "string"
      && row.priceSource.resolutionTrace?.resolved === true),
    "ACTUAL_AUTOMATIC_PRICE_TRACE_MISSING");
    invariant(unknownRows.every((row) => row.priceSource?.kind === "UNPRICED"
      && row.priceSource.snapshotId == null
      && row.priceSource.unitPrice == null),
    "UNKNOWN_PRICE_PROVENANCE_INCORRECT");

    await page.goto(`${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(revisionId)}&s272PriceOpen=${runId}`, {
      waitUntil: "domcontentloaded",
      timeout: 180_000,
    });
    await page.getByTestId("request-estimate-summary-card").waitFor({ state: "visible", timeout: 180_000 });
    await openFullEstimateIfPreviewed(page);
    const clientRevision = await poll(async () => clientRevisionReads
      .find((candidate) => candidate.revisionId === revisionId) ?? null, 60_000);
    invariant(JSON.stringify(clientRevision.priceSnapshotIds) === JSON.stringify(selectedSnapshotIds),
      "CLIENT_REVISION_SNAPSHOT_EVIDENCE_MISMATCH");
    const positionsToggle = page.getByTestId("request-estimate-positions-toggle");
    if (await positionsToggle.isVisible().catch(() => false)) await positionsToggle.click();
    invariant(await page.locator('[data-testid^="consumer-repair-item-unit-price-input-"]').count() > 0,
      "OPENED_REVISION_PRICE_EDITOR_MISSING");

    const evidence = {
      status: "GREEN_S271_CROSS_FAMILY_AUTOPRICE_WEB",
      generatedAt: new Date().toISOString(),
      runId,
      catalogId: CATALOG_ID,
      releaseId: revision.releaseId,
      revisionId,
      rowCount: rows.length,
      pricedRowCount: pricedRows.length,
      unknownPriceRowCount: unknownRows.length,
      priceSnapshotIds: selectedSnapshotIds,
      clientRevisionPriceSnapshotIds: clientRevision.priceSnapshotIds,
      openedRevisionInClient: true,
      samplePricedRows: pricedRows.slice(0, 8).map((row) => ({
        rowId: row.rowId,
        titleRu: row.titleRu,
        quantity: row.quantity,
        unitId: row.unitId,
        unitPrice: row.unitPrice,
        amount: row.amount,
        priceSource: row.priceSource,
      })),
      pageErrors,
    };
    mkdirSync(dirname(OUTPUT), { recursive: true });
    writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
