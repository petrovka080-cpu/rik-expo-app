import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page } from "playwright";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.s27-17.two-examples-web-acceptance.v2";
const ORIGIN = process.env.S2716_WEB_ORIGIN ?? "http://127.0.0.1:8081";
const BACKEND = process.env.S2716_BACKEND_ORIGIN ?? "http://127.0.0.1:8765";
const RELEASE_ID = "ffcdae54-0746-526a-aa43-b78e46c06ece";
const SEARCH_RELEASE_ID = "f2ea9ecd-598c-5fea-a894-a573c74d4829";
const AUTH_STORAGE_KEY = "sb-127-auth-token";
const BACKEND_RECEIPT = resolve(
  ".release-runtime/r568/s27-17/acceptance/two-examples-backend/acceptance.json",
);
const OUTPUT_ROOT = resolve(
  ".release-runtime/r568/s27-17/acceptance/two-examples-web",
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S27_16_TWO_EXAMPLES_WEB:${code}`);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

async function browserAuthorization(page: Page): Promise<string> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const authorization = await page.evaluate((storageKey) => {
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
    if (authorization.length > 27) return authorization;
    await page.waitForTimeout(100);
  }
  throw new Error("S27_16_TWO_EXAMPLES_WEB:CONSUMER_AUTHORIZATION_MISSING");
}

async function loginConsumer(page: Page): Promise<string> {
  const login = new URL("/auth/login", ORIGIN);
  login.searchParams.set("returnTo", "/request");
  await page.goto(login.toString(), { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
  await page.getByTestId("auth.login.local-consumer").click();
  await page.waitForURL(new URL("/request", ORIGIN).toString(), { timeout: 60_000 });
  return browserAuthorization(page);
}

async function api(authorization: string, route: string): Promise<Json> {
  const response = await fetch(`${BACKEND}/canonical-estimate/${route}`, {
    headers: { Authorization: authorization },
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok, `API_${response.status}:${route}:${JSON.stringify(body).slice(0, 1_000)}`);
  return body;
}

async function dismissPreview(page: Page): Promise<void> {
  const preview = page.getByTestId("consumer-estimate-meaningful-preview");
  await preview.waitFor({ state: "visible", timeout: 120_000 }).catch(() => undefined);
  if (!await preview.isVisible().catch(() => false)) return;
  await page.getByTestId("consumer-estimate-open-full-estimate").click();
  await preview.waitFor({ state: "detached", timeout: 60_000 });
}

async function expandPositions(page: Page): Promise<void> {
  const count = page.getByTestId("request-estimate-items-total-count");
  if (await count.isVisible().catch(() => false)) return;
  await page.getByTestId("request-estimate-positions-toggle").click();
  await count.waitFor({ state: "visible", timeout: 60_000 });
}

async function openRevision(page: Page, revisionId: string): Promise<void> {
  const url = new URL("/request", ORIGIN);
  url.searchParams.set("canonicalRevisionId", revisionId);
  await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
  await dismissPreview(page);
  await expandPositions(page);
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const backend = JSON.parse(readFileSync(BACKEND_RECEIPT, "utf8")) as Json;
  invariant(backend.status === "GREEN_S27_17_TWO_EXAMPLES_BACKEND", "BACKEND_RECEIPT_RED");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1_000 } });
  const page = await context.newPage();
  const backendResponses: Json[] = [];
  const consoleErrors: string[] = [];
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
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 2_000));
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    const authorization = await loginConsumer(page);
    const runtime = await api(authorization, "runtime-manifest");
    invariant(runtime.compatibilityTuple?.definitionReleaseId === RELEASE_ID
      && runtime.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID,
    "RUNTIME_RELEASE_PAIR_RED");

    await openRevision(page, String(backend.asphalt.pricedRevisionId));
    const asphaltCount = await page.getByTestId("request-estimate-items-total-count").innerText();
    const asphaltTitles = await page
      .locator('[data-testid^="consumer-repair-item-title-"]')
      .allInnerTexts();
    invariant(asphaltCount.includes("57") && asphaltTitles.length === 57,
      `ASPHALT_ROWS_RED:${asphaltCount}:${asphaltTitles.length}`);
    invariant(asphaltTitles.some((title) => title.includes("Геометрический объём уплотнённого"))
      && asphaltTitles.some((title) => title.includes("горячая плотная мелкозернистая")),
    "ASPHALT_NAMES_RED");
    const mixPrice = page.locator('[id$="|asphalt:material:hot-dense-fine-mix"]')
      .locator('[data-testid^="consumer-repair-item-unit-price-input-"]');
    invariant(Number(await mixPrice.inputValue()) === 5_000, "ASPHALT_COLD_REOPEN_PRICE_RED");
    invariant(await page.getByTestId("estimate-revision-timeline").isVisible(),
      "ASPHALT_HISTORY_RED");
    const asphaltScreenshot = resolve(OUTPUT_ROOT, "01-asphalt-57-rows.png");
    await page.screenshot({ path: asphaltScreenshot, fullPage: true });

    await openRevision(page, String(backend.slab.revisionId));
    const slabCount = await page.getByTestId("request-estimate-items-total-count").innerText();
    const slabTitles = await page
      .locator('[data-testid^="consumer-repair-item-title-"]')
      .allInnerTexts();
    invariant(slabCount.includes("21") && slabTitles.length === 21,
      `SLAB_ROWS_RED:${slabCount}:${slabTitles.length}`);
    invariant(slabTitles.some((title) => title.includes("Sika MonoTop-4012")
      && title.includes("мешок 25 кг"))
      && slabTitles.some((title) => title.includes("Sika Antisol A")
        && title.includes("без разбавления"))
      && slabTitles.some((title) => title.includes("Удаление непрочного материала")),
    "SLAB_REPAIR_OR_CURING_NAMES_RED");

    await page.getByTestId("consumer-estimate-open-procurement").click();
    const procurement = page.getByTestId("consumer-estimate-procurement-list");
    await procurement.waitFor({ state: "visible", timeout: 60_000 });
    const procurementText = await procurement.innerText();
    invariant(procurementText.includes("Sika MonoTop-4012")
      && procurementText.includes("Sika Antisol A")
      && procurementText.includes("Товарный бетон"),
    "SLAB_PROCUREMENT_RED");
    const slabScreenshot = resolve(OUTPUT_ROOT, "02-slab-procurement.png");
    await page.screenshot({ path: slabScreenshot, fullPage: true });

    const pdfResponsePromise = page.waitForResponse((response) =>
      response.url().startsWith(`${BACKEND}/canonical-estimate/artifact-files/`)
        && response.status() === 200,
    { timeout: 180_000 });
    await page.getByTestId("request-estimate-progressive-actions")
      .getByTestId("consumer-estimate-make-pdf")
      .click();
    await page.waitForURL(/\/pdf-viewer\?sessionId=/u, { timeout: 180_000 });
    const pdfResponse = await pdfResponsePromise;
    invariant(String(pdfResponse.headers()["content-type"]).includes("application/pdf"),
      "SLAB_PDF_CONTENT_TYPE_RED");
    await page.getByTestId("pdf-viewer-web-iframe")
      .waitFor({ state: "visible", timeout: 120_000 });
    const pdfScreenshot = resolve(OUTPUT_ROOT, "03-slab-pdf.png");
    await page.screenshot({ path: pdfScreenshot, fullPage: true });

    invariant(pageErrors.length === 0, `PAGE_ERRORS:${pageErrors.join("|")}`);
    const receipt = {
      schemaVersion: `${CONTRACT}.receipt.v1`,
      status: "GREEN_S27_17_TWO_EXAMPLES_WEB",
      capturedAt: new Date().toISOString(),
      runtime: { origin: ORIGIN, backend: BACKEND, definitionReleaseId: RELEASE_ID, searchReleaseId: SEARCH_RELEASE_ID },
      asphalt: { revisionId: backend.asphalt.pricedRevisionId, rowCount: 57, restoredUnitPrice: 5_000 },
      slab: { revisionId: backend.slab.revisionId, rowCount: 21, procurement: "GREEN", pdf: "GREEN" },
      screenshots: { asphaltScreenshot, slabScreenshot, pdfScreenshot },
      backendResponses,
      consoleErrors,
      pageErrors,
      productionAccessed: false,
      activationPerformed: false,
      deployPerformed: false,
    };
    const sealed = { ...receipt, sha256: sha256(JSON.stringify(receipt)) };
    atomicJson(resolve(OUTPUT_ROOT, "acceptance.json"), sealed);
    process.stdout.write(`${JSON.stringify(sealed, null, 2)}\n`);
  } finally {
    await context.close();
    await browser.close();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
