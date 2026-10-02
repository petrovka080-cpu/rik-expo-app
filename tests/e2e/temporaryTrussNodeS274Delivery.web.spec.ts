import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page, type Response } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

type Json = Record<string, any>;

const BACKEND_ORIGIN = process.env.LIVE_CANONICAL_BACKEND_ORIGIN ?? "http://127.0.0.1:8765";
const AUTH_STORAGE_KEY = "sb-127-auth-token";
const DEFINITION_RELEASE_ID = process.env.LIVE_DEFINITION_RELEASE_ID
  ?? "3d6b14f3-8f38-578f-b795-064203971f50";
const SEARCH_RELEASE_ID = process.env.LIVE_SEARCH_RELEASE_ID
  ?? "0dbab532-8d66-525e-92ed-50efb894bd41";
const CATALOG_ID = "canonical-work:master:temporary_truss_node_strengthening_devices_wet_zone";
const PROFILE_ID = "KRER_46_05_004_01_TRUSS_NODE_ACCESS_AND_RIGGING_DEVICES";
const SOURCE_PROMPT = [
  "Установка временных устройств при усилении узлов ферм во влажной зоне",
  "КРЕР 46-05-004-01",
  "количество узлов ферм 3",
  "таблица и применение временных устройств подтверждены проектом",
].join(". ");
const EXPECTED_THREE_NODE_QUANTITIES = [
  3, 106.92, 0.12, 0.12, 10.44, 0.21, 0.01545, 0.00018, 0.00012, 0.00036, 1.47,
];
const EVIDENCE_ROOT = path.resolve(process.env.S277_TRUSS_EVIDENCE_ROOT
  ?? ".release-runtime/r568/s27-4/delivery-first/acceptance/web-krer-46-05-004-01");

async function enterConsumer(page: Page): Promise<string> {
  const loginUrl = new URL("/auth/login", BASE_URL);
  loginUrl.searchParams.set("returnTo", "/request");
  await page.goto(loginUrl.toString(), { waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page.getByTestId("local-developer-review-banner")).toBeVisible({ timeout: 120_000 });
  await page.getByTestId("auth.login.local-consumer").click();
  await page.waitForURL(new URL("/request", BASE_URL).toString(), { timeout: 60_000 });
  await expect.poll(() => page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return false;
    try {
      const session = JSON.parse(raw) as Json;
      return session?.user?.app_metadata?.role === "consumer"
        && typeof session?.access_token === "string";
    } catch {
      return false;
    }
  }, AUTH_STORAGE_KEY), { timeout: 30_000 }).toBe(true);
  const token = await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? String((JSON.parse(raw) as Json)?.access_token ?? "") : "";
  }, AUTH_STORAGE_KEY);
  if (!token) throw new Error("S27_4_TRUSS_WEB_AUTH_MISSING");
  return `Bearer ${token}`;
}

async function api(authorization: string, route: string, init: RequestInit = {}): Promise<Json> {
  const response = await fetch(`${BACKEND_ORIGIN}/canonical-estimate/${route.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      Authorization: authorization,
      ...(init.body == null ? {} : { "Content-Type": "application/json" }),
      ...init.headers,
    },
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  if (!response.ok) {
    throw new Error(`S27_4_TRUSS_WEB_API_${response.status}:${route}:${JSON.stringify(body)}`);
  }
  return body;
}

async function waitForRevision(authorization: string, accepted: Json): Promise<Json> {
  const jobId = String(accepted.jobId ?? "");
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await api(authorization, `jobs/${jobId}`);
    if (job.status === "succeeded" && job.resultRevisionId) {
      return api(authorization, `revisions/${job.resultRevisionId}`);
    }
    if (["failed", "cancelled"].includes(String(job.status))) {
      throw new Error(`S27_4_TRUSS_WEB_JOB_${job.status}:${job.errorCode ?? "UNKNOWN"}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`S27_4_TRUSS_WEB_JOB_TIMEOUT:${jobId}`);
}

async function revisionRows(authorization: string, revisionId: string): Promise<Json[]> {
  const payload = await api(authorization, `revisions/${revisionId}/rows?limit=100`);
  return Array.isArray(payload.rows) ? payload.rows : [];
}

async function responseJson(response: Response): Promise<Json> {
  return response.json().catch(() => ({})) as Promise<Json>;
}

async function dismissPreview(page: Page): Promise<void> {
  const preview = page.getByTestId("consumer-estimate-meaningful-preview");
  await preview.waitFor({ state: "visible", timeout: 120_000 }).catch(() => undefined);
  if (!await preview.isVisible().catch(() => false)) return;
  await page.getByTestId("consumer-estimate-open-full-estimate").click();
  await expect(preview).toHaveCount(0, { timeout: 60_000 });
}

async function expandPositions(page: Page): Promise<void> {
  const count = page.getByTestId("request-estimate-items-total-count");
  if (await count.isVisible().catch(() => false)) return;
  await page.getByTestId("request-estimate-positions-toggle").click();
  await expect(count).toBeVisible({ timeout: 120_000 });
}

test.beforeAll(async () => {
  await ensureLiveWebApp();
  fs.mkdirSync(EVIDENCE_ROOT, { recursive: true });
});

test("46-05-004-01 is searchable, calculated, editable and approved by an ordinary Web consumer", async ({ page }) => {
  test.setTimeout(600_000);
  const authorization = await enterConsumer(page);
  const manifest = await api(authorization, "runtime-manifest");
  expect(manifest.compatibilityTuple).toMatchObject({
    definitionReleaseId: DEFINITION_RELEASE_ID,
    searchReleaseId: SEARCH_RELEASE_ID,
  });

  const search = await api(authorization, `search/catalog?query=${encodeURIComponent("46-05-004-01")}`);
  expect(search.searchIndexReleaseId).toBe(SEARCH_RELEASE_ID);
  const searchItems = Array.isArray(search.items) ? search.items as Json[] : [];
  const selected = searchItems.find((item) => item.catalogId === CATALOG_ID);
  expect(selected).toMatchObject({ catalogId: CATALOG_ID, estimateReady: true });
  expect(String(selected?.canonicalNameRu)).toMatch(/узлов ферм.*влажная зона/iu);

  const accepted = await api(authorization, "jobs/compile", {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: `s27-4-web-46-05-004-01-${Date.now()}`,
      catalogId: CATALOG_ID,
      parameters: {
        truss_node_count: 3,
        truss_node_strengthening_devices_profile: PROFILE_ID,
        truss_node_strengthening_devices_confirmed: true,
      },
      currencyCode: "KGS",
      sourceRequestText: SOURCE_PROMPT,
      primaryMeasureParameterId: "truss_node_count",
    }),
  });
  const initialRevision = await waitForRevision(authorization, accepted);
  const initialRows = await revisionRows(authorization, String(initialRevision.revisionId));
  expect(initialRevision).toMatchObject({
    releaseId: DEFINITION_RELEASE_ID,
    catalogId: CATALOG_ID,
    preliminaryNeeds: [],
    rowCount: 11,
  });
  expect(initialRows.map((row) => Number(row.quantity))).toEqual(EXPECTED_THREE_NODE_QUANTITIES);
  expect(initialRows.some((row) => row.unitPrice == null)).toBe(true);

  const revisionUrl = new URL("/request", BASE_URL);
  revisionUrl.searchParams.set("canonicalRevisionId", String(initialRevision.revisionId));
  await page.goto(revisionUrl.toString(), { waitUntil: "domcontentloaded", timeout: 120_000 });
  await dismissPreview(page);
  await expandPositions(page);
  await expect(page.getByTestId("request-estimate-items-total-count")).toContainText("11");
  await expect(page.locator("body")).toContainText("КРЕР 46-05-004-01");
  await expect(page.locator("body")).toContainText("Щиты настила");
  await expect(page.getByTestId("request-estimate-visible-missing-parameters")).toHaveCount(0);

  const parametersToggle = page.getByTestId("request-estimate-parameters-toggle");
  if (await parametersToggle.isVisible().catch(() => false)) await parametersToggle.click();
  const countInput = page.getByTestId("editable-param-chip-truss_node_count")
    .getByTestId("editable-param-popover-input");
  await expect(countInput).toBeVisible({ timeout: 60_000 });
  await countInput.fill("4");
  const recalculatePromise = page.waitForResponse((response) =>
    response.url().endsWith("/jobs/recalculate") && response.request().method() === "POST", {
    timeout: 120_000,
  });
  const [recalculateResponse] = await Promise.all([
    recalculatePromise,
    page.getByTestId("editable-param-batch-apply").click(),
  ]);
  expect(recalculateResponse.status()).toBe(202);
  const editedRevision = await waitForRevision(authorization, await responseJson(recalculateResponse));
  const editedRows = await revisionRows(authorization, String(editedRevision.revisionId));
  expect(editedRevision.parentRevisionId).toBe(initialRevision.revisionId);
  expect(Number(editedRevision.parameters.truss_node_count)).toBe(4);
  expect(editedRows.map((row) => Number(row.quantity))).toEqual(
    EXPECTED_THREE_NODE_QUANTITIES.map((quantity) => Number((quantity * 4 / 3).toFixed(8))),
  );
  await dismissPreview(page);
  await expandPositions(page);

  const draftUrl = page.url();
  const pdfResponsePromise = page.waitForResponse((response) =>
    response.url().startsWith(`${BACKEND_ORIGIN}/canonical-estimate/artifact-files/`)
      && response.status() === 200, { timeout: 180_000 });
  await page.getByTestId("request-estimate-progressive-actions")
    .getByTestId("consumer-estimate-make-pdf")
    .click();
  await page.waitForURL(/\/pdf-viewer\?sessionId=/u, { timeout: 180_000 });
  const pdfResponse = await pdfResponsePromise;
  expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
  await page.goBack({ waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page).toHaveURL(draftUrl);

  const approve = page.getByTestId("consumer-repair-approve").last();
  await expect(approve).toBeEnabled({ timeout: 120_000 });
  await approve.click();
  await expect(page.getByTestId("consumer-repair-problem-input")).toHaveValue("", { timeout: 240_000 });
  await page.getByTestId("consumer-repair-history-button").click();
  await expect(page.getByTestId(`consumer-repair-history-revision-${editedRevision.revisionId}`))
    .toBeVisible({ timeout: 60_000 });

  const screenshot = path.join(EVIDENCE_ROOT, "approved-history.png");
  await page.screenshot({ path: screenshot, fullPage: true });
  fs.writeFileSync(path.join(EVIDENCE_ROOT, "acceptance.json"), `${JSON.stringify({
    capturedAt: new Date().toISOString(),
    status: "GREEN_S27_4_WEB_KRER_46_05_004_01",
    runtime: { definitionReleaseId: DEFINITION_RELEASE_ID, searchReleaseId: SEARCH_RELEASE_ID },
    search: { query: "46-05-004-01", catalogId: CATALOG_ID, exactWetZoneResult: true },
    initialRevisionId: initialRevision.revisionId,
    initialQuantities: initialRows.map((row) => row.quantity),
    editedRevisionId: editedRevision.revisionId,
    editedParentRevisionId: editedRevision.parentRevisionId,
    editedNodeCount: editedRevision.parameters.truss_node_count,
    editedQuantities: editedRows.map((row) => row.quantity),
    rowCount: editedRows.length,
    unknownPriceCount: editedRows.filter((row) => row.unitPrice == null).length,
    pricedRowCount: editedRows.filter((row) => row.unitPrice != null).length,
    oneApplyOneChildRevision: true,
    pdfContentType: pdfResponse.headers()["content-type"],
    approvalAllowedWithoutFabricatedPrices: true,
    historyBindsExactRevision: true,
    screenshot,
    productionAccessed: false,
  }, null, 2)}\n`, "utf8");
});
