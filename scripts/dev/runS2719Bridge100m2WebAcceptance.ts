import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page } from "playwright";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.s27-19.bridge-100m2-web-acceptance.v1";
const ORIGIN = process.env.S2719_WEB_ORIGIN ?? "http://127.0.0.1:8081";
const BACKEND = process.env.S2719_BACKEND_ORIGIN ?? "http://127.0.0.1:8765";
const RELEASE_ID = "890b3fff-6372-57e8-8c36-1e09672489a0";
const SEARCH_RELEASE_ID = "8cb0714d-3c6d-5ea5-9fd5-2a45971d7f99";
const AUTH_STORAGE_KEY = "sb-127-auth-token";
const BACKEND_RECEIPT = resolve(
  ".release-runtime/r568/s27-19/acceptance/bridge-100m2-backend/acceptance.json",
);
const OUTPUT_ROOT = resolve(
  ".release-runtime/r568/s27-19/acceptance/bridge-100m2-web",
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S27_19_BRIDGE_WEB:${code}`);
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

async function authorization(page: Page): Promise<string> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const bearer = await page.evaluate((storageKey) => {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return "";
      try {
        const session = JSON.parse(raw) as Json;
        return session?.user?.app_metadata?.role === "consumer"
          ? `Bearer ${String(session?.access_token ?? "")}`
          : "";
      } catch {
        return "";
      }
    }, AUTH_STORAGE_KEY);
    if (bearer.length > 27) return bearer;
    await page.waitForTimeout(100);
  }
  throw new Error("S27_19_BRIDGE_WEB:AUTHORIZATION_MISSING");
}

async function login(page: Page): Promise<string> {
  const url = new URL("/auth/login", ORIGIN);
  url.searchParams.set("returnTo", "/request");
  await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
  await page.getByTestId("auth.login.local-consumer").click();
  await page.waitForURL(new URL("/request", ORIGIN).toString(), { timeout: 60_000 });
  return authorization(page);
}

async function api(bearer: string, route: string): Promise<Json> {
  const response = await fetch(`${BACKEND}/canonical-estimate/${route}`, {
    headers: { Authorization: bearer },
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok, `API_${response.status}:${route}`);
  return body;
}

async function openRevision(page: Page, revisionId: string): Promise<void> {
  const url = new URL("/request", ORIGIN);
  url.searchParams.set("canonicalRevisionId", revisionId);
  await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
  const preview = page.getByTestId("consumer-estimate-meaningful-preview");
  await preview.waitFor({ state: "visible", timeout: 120_000 }).catch(() => undefined);
  if (await preview.isVisible().catch(() => false)) {
    await page.getByTestId("consumer-estimate-open-full-estimate").click();
    await preview.waitFor({ state: "detached", timeout: 60_000 });
  }
  const count = page.getByTestId("request-estimate-items-total-count");
  if (!await count.isVisible().catch(() => false)) {
    await page.getByTestId("request-estimate-positions-toggle").click();
  }
  await count.waitFor({ state: "visible", timeout: 60_000 });
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const backend = JSON.parse(readFileSync(BACKEND_RECEIPT, "utf8")) as Json;
  invariant(backend.definitionReleaseId === RELEASE_ID
    && backend.searchReleaseId === SEARCH_RELEASE_ID, "BACKEND_RECEIPT_PAIR_RED");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1_000 } });
  const page = await context.newPage();
  const backendResponses: Json[] = [];
  const pageErrors: string[] = [];
  page.on("response", (response) => {
    if (response.url().startsWith(BACKEND)) {
      backendResponses.push({
        method: response.request().method(),
        path: new URL(response.url()).pathname,
        status: response.status(),
      });
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    const bearer = await login(page);
    const runtime = await api(bearer, "runtime-manifest");
    invariant(runtime.compatibilityTuple?.definitionReleaseId === RELEASE_ID
      && runtime.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID,
    "RUNTIME_PAIR_RED");

    await openRevision(page, String(backend.revisions.originalRevisionId));
    const countText = await page.getByTestId("request-estimate-items-total-count").innerText();
    const titles = await page.locator('[data-testid^="consumer-repair-item-title-"]').allInnerTexts();
    invariant(countText.includes("194") && titles.length === 103,
      `ORIGINAL_ROWS_RED:${countText}:${titles.length}`);
    for (const fragment of [
      "Плёнка полиэтиленовая для ухода за бетоном, не менее 150 мкм",
      "ТЕХНОЭЛАСТМОСТ Б, рулон 1×8 м",
      "Сетка сварная А500С Ø6 мм, 100×100 мм, карта 2×3 м",
      "Фиксаторы арматуры «стойка» h=15 мм, упаковка 500 шт.",
      "Саморезы конструкционные оцинкованные 6×80 мм",
      "Эмульсия битумная катионная для двух сплошных слоёв сцепления",
      "Водоотводные трубки мостовой плиты",
      "ТЕХНОНИКОЛЬ СОТА 75, коробка 14 кг",
      "ППЭ-шнур Ø25 мм, бухта 50 м",
    ]) invariant(titles.some((title) => title.includes(fragment)), `TITLE_MISSING:${fragment}`);
    invariant(await page.getByTestId("estimate-revision-timeline").isVisible(), "HISTORY_RED");
    const originalScreenshot = resolve(OUTPUT_ROOT, "01-bridge-100m2-full-estimate.png");
    await page.screenshot({ path: originalScreenshot, fullPage: true });

    const technicalToggle = page.getByTestId("request-estimate-technical-details-toggle");
    invariant((await technicalToggle.innerText()).includes("91"), "TECHNICAL_DETAIL_COUNT_RED");
    await technicalToggle.click();
    const expandedTitles = await page.locator('[data-testid^="consumer-repair-item-title-"]').allInnerTexts();
    const priceInputs = await page.locator('[data-testid^="consumer-repair-item-unit-price-input-"]').count();
    invariant(expandedTitles.length === 194 && priceInputs === 103,
      `TECHNICAL_DETAIL_EXPANSION_RED:${expandedTitles.length}:${priceInputs}`);
    const compatibilityRow = page.locator('[id$="|bridge:screed:mesh-cover-compatibility"]');
    invariant(await compatibilityRow.locator('[data-testid^="consumer-repair-item-unit-price-input-"]').count() === 0,
      "TECHNICAL_COMPATIBILITY_PRICE_INPUT_RED");
    const technicalScreenshot = resolve(OUTPUT_ROOT, "01b-bridge-100m2-technical-details.png");
    await page.screenshot({ path: technicalScreenshot, fullPage: true });

    await page.getByTestId("consumer-estimate-open-procurement").click();
    const procurement = page.getByTestId("consumer-estimate-procurement-list");
    await procurement.waitFor({ state: "visible", timeout: 60_000 });
    const procurementText = await procurement.innerText();
    for (const fragment of ["ТЕХНОЭЛАСТМОСТ Б", "А500С Ø6 мм", "СОТА 75", "ППЭ-шнур Ø25 мм"]) {
      invariant(procurementText.includes(fragment), `PROCUREMENT_MISSING:${fragment}`);
    }
    const procurementScreenshot = resolve(OUTPUT_ROOT, "02-bridge-100m2-procurement.png");
    await page.screenshot({ path: procurementScreenshot, fullPage: true });

    await openRevision(page, String(backend.revisions.pricedRevisionId));
    const reopenedCount = await page.getByTestId("request-estimate-items-total-count").innerText();
    invariant(reopenedCount.includes("194"), `COLD_REOPEN_ROWS_RED:${reopenedCount}`);
    const price = page.locator('[id$="|bridge:binder:asphalt:material:hot-dense-fine-mix"]')
      .locator('[data-testid^="consumer-repair-item-unit-price-input-"]');
    invariant(Number(await price.inputValue()) === 5_000, "COLD_REOPEN_PRICE_RED");
    const reopenedScreenshot = resolve(OUTPUT_ROOT, "03-bridge-resized-priced-cold-reopen.png");
    await page.screenshot({ path: reopenedScreenshot, fullPage: true });

    invariant(pageErrors.length === 0, `PAGE_ERRORS:${pageErrors.join("|")}`);
    invariant(!backendResponses.some((entry) => Number(entry.status) >= 500),
      "BACKEND_5XX_RED");
    const screenshots = [originalScreenshot, technicalScreenshot, procurementScreenshot, reopenedScreenshot]
      .map((path) => ({ path, sha256: sha256(readFileSync(path)) }));
    const unsigned = {
      schemaVersion: `${CONTRACT}.receipt.v1`,
      status: "GREEN_S27_19_BRIDGE_100M2_WEB",
      capturedAt: new Date().toISOString(),
      definitionReleaseId: RELEASE_ID,
      searchReleaseId: SEARCH_RELEASE_ID,
      originalRevisionId: backend.revisions.originalRevisionId,
      pricedRevisionId: backend.revisions.pricedRevisionId,
      rowCount: 194,
      payableRowCount: 103,
      technicalDetailRowCount: 91,
      namedProcurementVerified: true,
      historyVisible: true,
      coldReopenPricePreserved: true,
      backendResponses,
      screenshots,
      productionAccessed: false,
    };
    const receipt = { ...unsigned, sha256: sha256(JSON.stringify(unsigned)) };
    const output = resolve(OUTPUT_ROOT, "acceptance.json");
    atomicJson(output, receipt);
    process.stdout.write(`${JSON.stringify({ ...receipt, output }, null, 2)}\n`);
  } finally {
    await browser.close();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
