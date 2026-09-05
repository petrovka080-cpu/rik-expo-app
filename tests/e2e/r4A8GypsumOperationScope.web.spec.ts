import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page, type Response } from "playwright/test";

import { buildBatch003R56CanonicalSuccessorDefinition } from "../../scripts/estimate/r5/batch003R56SharedCoreProjection";
import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const STORE_KEY = "rik.consumer_repair.request_bundles.v1";
const BACKEND_ORIGIN = "http://127.0.0.1:8765";
const CURRENT_RELEASE = JSON.parse(fs.readFileSync(
  path.resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  "utf8",
)) as { definitionReleaseId: string; searchReleaseId: string };
const EVIDENCE_ROOT = path.resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a8-developer-estimate-recovery-1/16_web",
);

type Scenario = {
  id: "W3" | "W4";
  sourceCatalogId: string;
  catalogId: string;
  prompt: string;
  quantity: number;
  expectedRows: number;
};

const SCENARIOS: readonly Scenario[] = [
  {
    id: "W3",
    sourceCatalogId: "drywall_ceiling_interior_drywall_ceiling_align_large_area",
    catalogId: "canonical-work:base:drywall_ceiling_interior_drywall_ceiling_align_large_area",
    prompt: "выравнивание потолка из гипсокартона на большой площади 500 кв метров",
    quantity: 500,
    expectedRows: 9,
  },
  {
    id: "W4",
    sourceCatalogId: "drywall_ceiling_interior_drywall_ceiling_frame_standard",
    catalogId: "canonical-work:base:drywall_ceiling_interior_drywall_ceiling_frame_standard",
    prompt: "устройство каркаса потолка из гипсокартона в стандартной зоне 50 кв метров",
    quantity: 50,
    expectedRows: 20,
  },
] as const;

function currentHead(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
}

async function json(response: Response): Promise<Record<string, any>> {
  return await response.json().catch(() => ({})) as Record<string, any>;
}

async function openAuthenticatedRequest(page: Page): Promise<void> {
  await page.goto(new URL("/request", BASE_URL).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await expect(page.getByTestId("local-developer-review-banner")).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId("local-developer-active-role")).toContainText("Директор");
  await expect(page.getByTestId("consumer-repair-screen")).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId("auth.login.screen")).toHaveCount(0);
}

async function resetRequest(page: Page): Promise<void> {
  await openAuthenticatedRequest(page);
  await page.evaluate((key) => window.localStorage.removeItem(key), STORE_KEY);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page.getByTestId("consumer-repair-problem-input")).toBeVisible({ timeout: 120_000 });
}

async function selectExactCatalog(page: Page, scenario: Scenario): Promise<{
  selectedText: string;
  searchRequestId: string | null;
}> {
  const searchResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "GET"
      && response.url().startsWith(`${BACKEND_ORIGIN}/search/catalog?`)
      && response.status() === 200,
  { timeout: 120_000 });
  await page.getByTestId("consumer-repair-problem-input").fill(scenario.prompt);
  const response = await searchResponsePromise;
  const body = await json(response);
  const items = Array.isArray(body.items) ? body.items as Record<string, unknown>[] : [];
  const index = items.findIndex((item) => String(item.catalogId ?? item.id ?? "") === scenario.catalogId);
  expect(index).toBeGreaterThanOrEqual(0);
  const suggestion = page.getByTestId(`consumer-repair-work-suggestion-${index + 1}`);
  await expect(suggestion).toBeVisible({ timeout: 120_000 });
  const selectedText = (await suggestion.innerText()).trim();
  await suggestion.click();
  return { selectedText, searchRequestId: response.headers()["x-request-id"] ?? null };
}

test.describe("R4-A8 W3/W4 exact gypsum operation scope", () => {
  test.setTimeout(600_000);

  test("renders, persists, approves, reopens, exports PDF and hands off procurement for both exact variants", async ({ page }) => {
    await ensureLiveWebApp();
    const results: Record<string, unknown>[] = [];
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const productionOrigins = new Set<string>();
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text().slice(0, 800));
    });
    page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 800)));
    page.on("request", (request) => {
      if (/\.supabase\.co|nxrnjywzxxfdpqmzjorh/iu.test(request.url())) {
        productionOrigins.add(new URL(request.url()).origin);
      }
    });

    fs.mkdirSync(EVIDENCE_ROOT, { recursive: true });
    for (const scenario of SCENARIOS) {
      await resetRequest(page);
      const selection = await selectExactCatalog(page, scenario);
      const compileResponsePromise = page.waitForResponse((response) =>
        response.request().method() === "POST" && response.url() === `${BACKEND_ORIGIN}/jobs/compile`,
      { timeout: 180_000 });
      await page.getByTestId("consumer-repair-prepare-draft").click();
      const compileResponse = await compileResponsePromise;
      const compileBody = await json(compileResponse);
      expect(compileResponse.status()).toBe(202);
      await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 180_000 });
      const anchors = page.locator("[data-testid^='request-estimate-item-anchor-']");
      await expect(anchors).toHaveCount(scenario.expectedRows, { timeout: 180_000 });
      await expect(page.getByTestId("request-estimate-items-total-count")).toContainText(String(scenario.expectedRows));
      await expect(page.getByTestId("request-estimate-summary-card")).toContainText(String(scenario.quantity));

      const rowIdentity = await page.locator('[id^="canonical-estimate-row-identity|"]').first().getAttribute("id");
      const identityParts = String(rowIdentity ?? "").split("|");
      expect(identityParts[2]).toBe(CURRENT_RELEASE.definitionReleaseId);
      expect(identityParts[3]).toBe(scenario.catalogId);
      const revisionId = identityParts[1];
      expect(revisionId).toBeTruthy();

      const expectedDefinition = buildBatch003R56CanonicalSuccessorDefinition(scenario.sourceCatalogId);
      const expectedTitles = expectedDefinition.resources.map((resource) => resource.titleRu).sort();
      const visibleTitles = (await page.locator('[data-testid^="consumer-repair-item-title-"]').allTextContents())
        .map((title) => title.trim()).sort();
      expect(visibleTitles).toEqual(expectedTitles);
      const visibleText = visibleTitles.join("\n");
      if (scenario.id === "W4") {
        expect(visibleText).not.toMatch(/(?:лист.*гипс|изоляц|шпаклев|лент.*шв|обшив|заделк.*шв|шлифов)/iu);
        expect(visibleText).toContain("Монтаж несущего каркаса плоского потолка");
      }

      const firstAnchorId = String(await anchors.first().getAttribute("data-testid"))
        .replace("request-estimate-item-anchor-", "");
      await page.getByTestId(`consumer-repair-item-specification-edit-${firstAnchorId}`).click();
      await expect(page.getByTestId(`consumer-repair-item-specification-input-${firstAnchorId}`)).toBeVisible();
      await page.getByTestId(`consumer-repair-item-specification-save-${firstAnchorId}`).click();
      await expect(page.getByTestId(`consumer-repair-item-title-${firstAnchorId}`)).toBeVisible();

      await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
      await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 120_000 });
      await expect(page.locator("[data-testid^='request-estimate-item-anchor-']")).toHaveCount(scenario.expectedRows);

      await page.getByTestId("consumer-repair-city-input").fill("Бишкек");
      await page.getByTestId("consumer-repair-address-input").fill("проспект Манаса, 64");
      await page.getByTestId("consumer-repair-phone-input").fill("+996700000000");
      await page.getByTestId("consumer-repair-approve").last().click();
      await expect(page.getByTestId("consumer-repair-history-approved-count")).toHaveText("1", { timeout: 180_000 });
      await page.getByTestId("consumer-repair-history-button").click();
      await expect(page.getByTestId("consumer-repair-history-modal")).toBeVisible({ timeout: 60_000 });
      await page.getByTestId("consumer-repair-history-main").first().click();
      await expect(page.getByTestId("consumer-repair-history-readonly-snapshot")).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("consumer-repair-history-readonly-item")).toHaveCount(scenario.expectedRows);
      await expect(page.getByTestId("consumer-repair-history-snapshot-release-id")).toContainText(
        CURRENT_RELEASE.definitionReleaseId,
      );
      await expect(page.getByTestId("consumer-repair-history-backend-pdf-artifact")).toHaveCount(1);
      await page.getByTestId("consumer-repair-history-send-market").click();
      await expect(page.getByTestId("consumer-repair-history-backend-procurement-artifact")).toHaveCount(1, {
        timeout: 180_000,
      });

      const screenshot = path.join(EVIDENCE_ROOT, `${scenario.id.toLowerCase()}-approved.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      results.push({
        id: scenario.id,
        prompt: scenario.prompt,
        selectedText: selection.selectedText,
        catalogId: scenario.catalogId,
        quantity: scenario.quantity,
        compileHttpStatus: compileResponse.status(),
        compileRequestId: compileResponse.headers()["x-request-id"] ?? null,
        compileJobId: compileBody.jobId ?? null,
        revisionId,
        releaseId: identityParts[2],
        rowCount: visibleTitles.length,
        rowTitles: visibleTitles,
        operationScopeExact: true,
        persistedAfterReload: true,
        editModeRoundTrip: true,
        approvedHistoryRows: scenario.expectedRows,
        pdfArtifactReady: true,
        procurementArtifactReady: true,
        screenshot: path.relative(process.cwd(), screenshot).replace(/\\/gu, "/"),
        searchRequestId: selection.searchRequestId,
      });
    }

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect([...productionOrigins]).toEqual([]);
    const head = currentHead();
    const body = {
      schemaVersion: "r568-r4-a8-w3-w4-gypsum-operation-scope-web.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_R4_A8_W3_W4_WEB_OPERATION_SCOPE_LIFECYCLE",
      sourceHead: head,
      definitionReleaseId: CURRENT_RELEASE.definitionReleaseId,
      searchReleaseId: CURRENT_RELEASE.searchReleaseId,
      results,
      consoleErrors,
      pageErrors,
      productionOrigins: [...productionOrigins],
      deployReleaseOta: "NOT_RUN",
      globalStatus: "RED_NOT_PRODUCTION_READY",
    };
    fs.writeFileSync(path.join(EVIDENCE_ROOT, `w3-w4-${head}.json`), `${JSON.stringify(body, null, 2)}\n`, "utf8");
  });
});
