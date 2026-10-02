import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

type Json = Record<string, any>;

const BACKEND_ORIGIN = process.env.LIVE_CANONICAL_BACKEND_ORIGIN ?? "http://127.0.0.1:8765";
const PARENT_REVISION_ID = "496a2e27-5004-4fe8-83ba-4d0c6a6c80c2";
const DEFINITION_RELEASE_ID = process.env.LIVE_DEFINITION_RELEASE_ID
  ?? "3d6b14f3-8f38-578f-b795-064203971f50";
const SEARCH_RELEASE_ID = process.env.LIVE_SEARCH_RELEASE_ID
  ?? "0dbab532-8d66-525e-92ed-50efb894bd41";
const PRICE_SNAPSHOT_ID = "325c8e7b-714c-43e8-a55b-fec21e5d0314";
const IDEMPOTENCY_KEY = process.env.S277_S273_IDEMPOTENCY_KEY
  ?? "s27-6-current-legacy-safe-conditional-defaults-496a2e27";
const LOCAL_DEVELOPER_AUTH_STORAGE_KEY = "sb-127-auth-token";
const EVIDENCE_ROOT = path.resolve(process.env.S277_S273_EVIDENCE_ROOT
  ?? ".release-runtime/r568/s27-6/current-source/acceptance/web-foundation-150-legacy-conditional-defaults");

async function loginConsumer(page: Page): Promise<string> {
  const loginUrl = new URL("/auth/login", BASE_URL);
  loginUrl.searchParams.set("returnTo", "/request");
  await page.goto(loginUrl.toString(), { waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page.getByTestId("local-developer-review-banner")).toBeVisible({ timeout: 120_000 });
  await page.getByTestId("auth.login.local-consumer").click();
  await page.waitForURL(new URL("/request", BASE_URL).toString(), { timeout: 60_000 });
  await expect.poll(
    () => page.evaluate((storageKey) => {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return false;
      try {
        const session = JSON.parse(raw) as Json;
        return session?.user?.app_metadata?.role === "consumer"
          && typeof session?.access_token === "string"
          && session.access_token.length > 20;
      } catch {
        return false;
      }
    }, LOCAL_DEVELOPER_AUTH_STORAGE_KEY),
    { timeout: 30_000 },
  ).toBe(true);
  const accessToken = await page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    try {
      const session = JSON.parse(raw) as Json;
      return session?.user?.app_metadata?.role === "consumer"
        ? String(session?.access_token ?? "")
        : null;
    } catch {
      return null;
    }
  }, LOCAL_DEVELOPER_AUTH_STORAGE_KEY);
  if (!accessToken) throw new Error("S27_3_BROWSER_AUTHORIZATION_MISSING");
  return `Bearer ${accessToken}`;
}

async function api(
  authorization: string,
  route: string,
  init: RequestInit = {},
): Promise<Json> {
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
  if (!response.ok) throw new Error(`S27_3_API_${response.status}:${route}:${JSON.stringify(body)}`);
  return body;
}

async function waitForRevision(authorization: string, jobId: string): Promise<Json> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await api(authorization, `jobs/${jobId}`);
    if (job.status === "succeeded" && job.resultRevisionId) {
      return api(authorization, `revisions/${job.resultRevisionId}`);
    }
    if (["failed", "cancelled"].includes(String(job.status))) {
      throw new Error(`S27_3_JOB_${job.status}:${job.errorCode ?? "UNKNOWN"}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`S27_3_JOB_TIMEOUT:${jobId}`);
}

test.beforeAll(async () => {
  await ensureLiveWebApp();
  fs.mkdirSync(EVIDENCE_ROOT, { recursive: true });
});

test("reopens a saved 150 m estimate on v14 without new conditional blockers", async ({ page }) => {
  test.setTimeout(360_000);
  const authorization = await loginConsumer(page);
  const runtimeManifest = await api(authorization, "runtime-manifest");
  expect(runtimeManifest.compatibilityTuple).toMatchObject({
    definitionReleaseId: DEFINITION_RELEASE_ID,
    searchReleaseId: SEARCH_RELEASE_ID,
  });
  const parent = await api(authorization, `revisions/${PARENT_REVISION_ID}`);
  expect(parent.revisionId).toBe(PARENT_REVISION_ID);

  const history = await api(
    authorization,
    `revisions?catalogId=${encodeURIComponent(String(parent.catalogId))}&limit=100`,
  );
  const durableSuccessor = (Array.isArray(history.revisions) ? history.revisions : []).find(
    (candidate: Json) => candidate.parentRevisionId === PARENT_REVISION_ID
      && candidate.releaseId === DEFINITION_RELEASE_ID,
  );
  const revision = durableSuccessor?.revisionId
    ? await api(authorization, `revisions/${durableSuccessor.revisionId}`)
    : await (async () => {
        const accepted = await api(authorization, "jobs/recalculate", {
          method: "POST",
          body: JSON.stringify({
            idempotencyKey: IDEMPOTENCY_KEY,
            catalogId: parent.catalogId,
            parentRevisionId: PARENT_REVISION_ID,
            sourceRequestText: parent.sourceRequestText,
            primaryMeasureParameterId: parent.primaryMeasureParameterId,
            parameters: parent.parameters,
            currencyCode: parent.currencyCode,
            rowOverrides: parent.amendmentContract?.rowOverrides ?? {},
            customRows: parent.amendmentContract?.customRows ?? [],
            releaseMigration: {
              contractVersion: "canonical_revision_release_migration.r2",
              acknowledged: true,
              fromReleaseId: parent.releaseId,
              toReleaseId: DEFINITION_RELEASE_ID,
            },
          }),
        });
        return waitForRevision(authorization, String(accepted.jobId ?? ""));
      })();
  const rowPayload = await api(authorization, `revisions/${revision.revisionId}/rows?limit=200`);
  const rows = Array.isArray(rowPayload.rows) ? rowPayload.rows as Json[] : [];

  expect(revision).toMatchObject({
    parentRevisionId: PARENT_REVISION_ID,
    releaseId: DEFINITION_RELEASE_ID,
  });
  expect(revision.preliminaryNeeds ?? []).toEqual([]);
  expect(revision.parameters).toMatchObject({
    formwork_supply_mode: "contractor_owned",
    as_built_survey_included: false,
    horizontal_cutoff_waterproofing_included: false,
    formwork_tie_consumables_required: false,
    excavation_support_required: false,
    excavation_dewatering_required: false,
    site_cleanup_cost_mode: "included_in_primary_works",
    non_soil_waste_handling_mode: "included_in_primary_works",
  });
  expect(rows.length).toBeGreaterThan(0);
  expect(rows).toHaveLength(Number(revision.rowCount));
  expect(rows.every((row) => Number(row.quantity) > 0)).toBe(true);
  expect(revision.priceSnapshotIds).toEqual([PRICE_SNAPSHOT_ID]);
  const pricedRows = rows.filter((row) => row.unitPrice != null);
  const unknownPriceRows = rows.filter((row) => row.unitPrice == null);
  expect(pricedRows.length).toBeGreaterThan(0);
  expect(unknownPriceRows.length).toBeGreaterThan(0);
  expect(pricedRows.every((row) => row.priceSource != null)).toBe(true);
  expect(
    pricedRows
      .filter((row) => row.priceSource?.kind === "AUTOMATIC_SNAPSHOT")
      .every((row) => row.priceSource.snapshotId === PRICE_SNAPSHOT_ID),
  ).toBe(true);

  const revisionUrl = new URL("/request", BASE_URL);
  revisionUrl.searchParams.set("canonicalRevisionId", String(revision.revisionId));
  await page.goto(revisionUrl.toString(), { waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page.getByTestId("local-developer-review-banner")).toBeVisible({ timeout: 120_000 });
  const preview = page.getByTestId("consumer-estimate-meaningful-preview");
  await preview.waitFor({ state: "visible", timeout: 120_000 }).catch(() => undefined);
  if (await preview.isVisible().catch(() => false)) {
    const openFullEstimate = page.getByTestId("consumer-estimate-open-full-estimate");
    await expect(openFullEstimate).toBeEnabled({ timeout: 120_000 });
    await openFullEstimate.click();
    await expect(preview).toHaveCount(0, { timeout: 60_000 });
  }
  const positionCount = page.getByTestId("request-estimate-items-total-count");
  if (!await positionCount.isVisible().catch(() => false)) {
    await page.getByTestId("request-estimate-positions-toggle").click();
  }
  await expect(positionCount).toContainText(String(rows.length), { timeout: 120_000 });
  await expect(page.getByTestId("request-estimate-visible-missing-parameters")).toHaveCount(0);
  await expect(page.getByTestId("consumer-repair-approve").last()).toBeEnabled();
  const pageText = await page.locator("body").innerText();
  expect(pageText).not.toMatch(/дочерн(?:яя|ей|ю)|родительск(?:ая|ой|ую)/iu);

  const screenshot = path.join(EVIDENCE_ROOT, "saved-150m-v14-no-new-blockers.png");
  await page.screenshot({ path: screenshot, fullPage: true });
  fs.writeFileSync(path.join(EVIDENCE_ROOT, "acceptance.json"), `${JSON.stringify({
    capturedAt: new Date().toISOString(),
    status: "GREEN_S27_6_CURRENT_WEB_LEGACY_SAFE_CONDITIONAL_DEFAULTS",
    definitionReleaseId: DEFINITION_RELEASE_ID,
    searchReleaseId: SEARCH_RELEASE_ID,
    parentRevisionId: PARENT_REVISION_ID,
    resultRevisionId: revision.revisionId,
    preliminaryNeedCount: 0,
    rowCount: rows.length,
    allQuantitiesPositive: true,
    priceSnapshotIds: revision.priceSnapshotIds,
    pricedRowCount: pricedRows.length,
    pricedRowSourceCount: pricedRows.filter((row) => row.priceSource != null).length,
    unknownPriceRowCount: unknownPriceRows.length,
    approvalEnabledWithoutAllPrices: true,
    screenshot,
    productionAccessed: false,
  }, null, 2)}\n`, "utf8");
});
