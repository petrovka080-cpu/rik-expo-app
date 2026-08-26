import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page, type Response } from "playwright";

type Json = Record<string, any>;

const ORIGIN = "http://localhost:8081";
const BACKEND = "http://127.0.0.1:8765";
const MASTER_SHA256 = "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const FULL_CUMULATIVE_MODE = process.env.R555_FULL_CUMULATIVE_GATE === "true";
const runtimeTarget = FULL_CUMULATIVE_MODE
  ? JSON.parse(readFileSync(resolve(".release-runtime/r555/evidence/21B_R555_FULL_CUMULATIVE_STRICT_BACKEND_RESTART.json"), "utf8")) as Json
  : null;
const TARGET_RELEASE_ID = FULL_CUMULATIVE_MODE
  ? String(runtimeTarget?.backend?.target_release_id ?? "")
  : "fe1357b1-d031-5011-8016-f03cb77916ab";
const TARGET_SEARCH_RELEASE_ID = FULL_CUMULATIVE_MODE
  ? String(runtimeTarget?.backend?.search_release_id ?? "")
  : "a5314296-c402-5c8e-9a30-883b1a1fac18";
const OUTPUT = resolve(FULL_CUMULATIVE_MODE
  ? ".release-runtime/r555/evidence/21C_R555_FULL_CUMULATIVE_BACKEND_WEB_SEARCH_GATE.json"
  : ".release-runtime/r555/evidence/13_R555_ASPHALT_BACKEND_WEB_SEARCH_GATE.json");
const SCREENSHOT = resolve(FULL_CUMULATIVE_MODE
  ? ".release-runtime/r555/evidence/21C_R555_FULL_CUMULATIVE_WEB_ASF_RESULTS.png"
  : ".release-runtime/r555/evidence/13A_R555_WEB_ASF_RESULTS.png");
const QUERIES = [
  "асф",
  "асфа",
  "асфальт",
  "асфальтобетон",
  "дорожное покрытие",
  "парковка",
  "демонтаж асфальта",
  "фрезерование",
  "ямочный ремонт",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`R555_ASPHALT_SEARCH_GATE:${code}`);
}

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

async function responseJson(response: Response): Promise<Json> {
  return await response.json().catch(() => ({})) as Json;
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

async function fullBackendSearch(query: string, authorization: string) {
  const all: Json[] = [];
  const cursors = new Set<string>();
  let cursor = "";
  let first: Json | null = null;
  do {
    const params = new URLSearchParams({ query, pageSize: "100", auditInventory: "true" });
    if (cursor) params.set("cursor", cursor);
    const response = await fetch(`${BACKEND}/search/catalog?${params.toString()}`, {
      headers: { Authorization: authorization },
    });
    const body = await response.json().catch(() => ({})) as Json;
    invariant(response.status === 200, `BACKEND_HTTP_${query}:${response.status}:${String(body.error?.code ?? "")}`);
    invariant(body.searchIndexReleaseId === TARGET_SEARCH_RELEASE_ID, `BACKEND_SEARCH_RELEASE_${query}:${body.searchIndexReleaseId}`);
    if (!first) first = body;
    const items = Array.isArray(body.items) ? body.items as Json[] : [];
    all.push(...items);
    cursor = String(body.nextCursor ?? "");
    if (cursor) {
      invariant(!cursors.has(cursor), `CURSOR_LOOP_${query}`);
      cursors.add(cursor);
    }
  } while (cursor);

  invariant(first, `BACKEND_EMPTY_ENVELOPE_${query}`);
  invariant(all.length > 0, `BACKEND_ZERO_${query}`);
  const ids = all.map((item) => String(item.catalogId ?? ""));
  invariant(ids.every(Boolean), `BACKEND_EMPTY_CATALOG_ID_${query}`);
  invariant(new Set(ids).size === ids.length, `BACKEND_DUPLICATES_${query}`);
  invariant(all.every((item) => item.definitionReleaseId === TARGET_RELEASE_ID), `BACKEND_DEFINITION_RELEASE_${query}`);
  invariant(all.every((item) => item.estimateReady === true), `BACKEND_NOT_ESTIMATE_READY_${query}`);
  invariant(all.every((item) => !/[A-Za-z]{2,}/u.test(String(item.canonicalNameRu ?? ""))), `BACKEND_PUBLIC_ENGLISH_${query}`);
  invariant(Number(first.literalTotalCount ?? 0) + Number(first.fuzzyTotalCount ?? 0) === all.length,
    `BACKEND_PAGINATION_TOTAL_${query}:${first.literalTotalCount}:${first.fuzzyTotalCount}:${all.length}`);
  return {
    query,
    search_release_id: first.searchIndexReleaseId,
    result_level: first.resultLevel,
    literal_total_count: Number(first.literalTotalCount ?? 0),
    fuzzy_total_count: Number(first.fuzzyTotalCount ?? 0),
    inventory_literal_total_count: Number(first.inventoryLiteralTotalCount ?? 0),
    fully_paginated_count: all.length,
    unique_catalog_count: new Set(ids).size,
    all_estimate_ready: true,
    catalog_ids: ids,
    titles_ru: all.map((item) => String(item.canonicalNameRu ?? "")),
    result_sha256: sha256(all.map((item) => [item.catalogId, item.definitionVersionId, item.canonicalNameRu])),
  };
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const authEvents: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  let authorization = "";
  page.on("console", (message) => {
    const text = message.text();
    if (text.includes("[RootLayout] onAuthStateChange:")) authEvents.push(text.slice(0, 500));
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => requestFailures.push(`${request.method()} ${new URL(request.url()).pathname}`));
  page.on("request", (request) => {
    if (!request.url().startsWith(`${BACKEND}/`)) return;
    const header = request.headers().authorization ?? "";
    if (header.startsWith("Bearer ")) authorization = header;
  });

  const browserCases: Json[] = [];
  const backendCases: Json[] = [];
  try {
    await page.goto(`${ORIGIN}/request`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
    await enterConsumer(page);
    const identityText = (await page.getByTestId("verified-identity-summary").innerText()).trim();
    invariant(identityText.length > 0, "CONSUMER_IDENTITY_MISSING");
    const input = page.getByTestId("consumer-repair-problem-input");

    for (const query of QUERIES) {
      const responsePromise = page.waitForResponse((response) => {
        if (!response.url().startsWith(`${BACKEND}/search/catalog?`) || response.status() !== 200) return false;
        return new URL(response.url()).searchParams.get("query") === query;
      }, { timeout: 120_000 });
      await input.fill("");
      await input.fill(query);
      const response = await responsePromise;
      const body = await responseJson(response);
      const items = Array.isArray(body.items) ? body.items as Json[] : [];
      invariant(body.searchIndexReleaseId === TARGET_SEARCH_RELEASE_ID, `WEB_SEARCH_RELEASE_${query}:${body.searchIndexReleaseId}`);
      invariant(items.length > 0, `WEB_ZERO_${query}`);
      const suggestion = page.getByTestId("consumer-repair-work-suggestion-1");
      await suggestion.waitFor({ timeout: 120_000 });
      const visibleText = (await suggestion.innerText()).trim();
      invariant(visibleText.length > 0, `WEB_VISIBLE_RESULT_EMPTY_${query}`);
      browserCases.push({
        query,
        http_status: response.status(),
        request_id: response.headers()["x-request-id"] ?? null,
        search_release_id: body.searchIndexReleaseId,
        response_item_count: items.length,
        literal_total_count: Number(body.literalTotalCount ?? 0),
        fuzzy_total_count: Number(body.fuzzyTotalCount ?? 0),
        first_visible_result_ru: visibleText,
        first_catalog_id: String(items[0]?.catalogId ?? ""),
        first_estimate_ready: items[0]?.estimateReady === true,
      });
      invariant(authorization.startsWith("Bearer "), `WEB_AUTHORIZATION_NOT_CAPTURED_${query}`);
      backendCases.push(await fullBackendSearch(query, authorization));
      if (query === "асф") {
        mkdirSync(dirname(SCREENSHOT), { recursive: true });
        await page.screenshot({ path: SCREENSHOT, fullPage: true });
      }
    }

    await page.waitForTimeout(30_000);
    const tokenRefreshed = authEvents.filter((event) => event.includes("TOKEN_REFRESHED"));
    invariant(tokenRefreshed.length === 0, `TOKEN_REFRESHED_STORM:${tokenRefreshed.length}`);
    invariant(pageErrors.length === 0, `PAGE_ERRORS:${pageErrors.join("|")}`);
    invariant(requestFailures.length === 0, `REQUEST_FAILURES:${requestFailures.join("|")}`);
    const receipt = {
      schema_version: "r555.asphalt-backend-web-search-gate.v1",
      generated_utc: new Date().toISOString(),
      status: FULL_CUMULATIVE_MODE
        ? "GREEN_R555_FULL_CUMULATIVE_BACKEND_WEB_SEARCH_9_OF_9"
        : "GREEN_R555_ASPHALT_BACKEND_WEB_SEARCH_9_OF_9",
      master_sha256: MASTER_SHA256,
      target_release_id: TARGET_RELEASE_ID,
      target_search_release_id: TARGET_SEARCH_RELEASE_ID,
      browser_origin: ORIGIN,
      backend_origin: BACKEND,
      browser_cases: browserCases,
      backend_cases: backendCases,
      browser_green: browserCases.length === QUERIES.length,
      backend_green: backendCases.length === QUERIES.length,
      fully_paginated_without_duplicates: backendCases.every((entry) => entry.fully_paginated_count === entry.unique_catalog_count),
      auth_event_count: authEvents.length,
      token_refreshed_count: tokenRefreshed.length,
      page_errors: pageErrors,
      request_failures: requestFailures,
      screenshot: SCREENSHOT.replaceAll("\\", "/"),
      production_accessed: false,
      deployed: false,
      merged: false,
      released: false,
      ota: false,
      secrets_captured: false,
    };
    atomicJson(OUTPUT, receipt);
    process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
  } finally {
    await context.close();
    await browser.close();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
