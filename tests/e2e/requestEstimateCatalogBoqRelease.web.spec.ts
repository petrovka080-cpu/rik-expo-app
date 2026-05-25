import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

import {
  calculateGlobalConstructionEstimateSync,
  validateEstimateBoqDepth,
  validateProfessionalEstimateFormulaQuality,
} from "../../src/lib/ai/globalEstimate";
import { BASE_URL, REALITY_CASES, assertRealityCase, ensureLiveWebApp } from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "request-estimate-catalog-boq-release");
const PREFIX = "S_REQUEST_ESTIMATE_CATALOG_BOQ_RELEASE";
const FOUNDATION_PROMPT =
  "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u043b\u0435\u043d\u0442\u043e\u0447\u043d\u044b\u0439 \u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442 \u0434\u043b\u0438\u043d 48 \u043c\u0435\u0442\u0440\u043e\u0432 \u0448\u0438\u0440\u0438\u043d\u0430 0,4 \u043c, \u0438 \u0432\u044b\u0441\u043e\u0442\u0430 1.7 \u043c";
const TILE_PROMPT =
  "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u0443\u043a\u043b\u0430\u0434\u043a\u0443 \u043a\u0430\u0444\u0435\u043b\u044c\u043d\u043e\u0439 \u043f\u043b\u0438\u0442\u043a\u0438 174 \u043c2";
const PRODUCT_SEARCH_PROMPT = "material rebar D14";

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function appUrl(route: string, prompt?: string): string {
  const url = new URL(route, BASE_URL);
  if (prompt) {
    url.searchParams.set("prompt", prompt);
    url.searchParams.set("autoPrepare", "1");
    url.searchParams.set("autoSend", "1");
  }
  return url.toString();
}

function validateBackendAcceptance(workKey: string, volume: number, minimumRows: number, unit = "sq_m") {
  const estimate = calculateGlobalConstructionEstimateSync({
    explicitWorkKey: workKey,
    volume,
    unit,
    language: "ru",
    countryCode: "KG",
    city: "Bishkek",
  });
  const depth = validateEstimateBoqDepth(estimate);
  const formula = validateProfessionalEstimateFormulaQuality(estimate);
  expect(depth.actualRows).toBeGreaterThanOrEqual(minimumRows);
  expect(depth.passed).toBe(true);
  expect(formula.passed).toBe(true);
  return { workKey: estimate.work.workKey, rows: depth.actualRows };
}

test.describe("request estimate catalog BOQ live release gate", () => {
  test("runs release acceptance across request, estimate, product and PDF live surfaces", async ({ page }) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    const foundation = calculateGlobalConstructionEstimateSync({
      text: FOUNDATION_PROMPT,
      language: "ru",
      countryCode: "KG",
      city: "Bishkek",
    });
    expect(foundation.work.workKey).toBe("strip_foundation");
    expect(foundation.input.dimensions?.concreteVolumeM3).toBe(32.64);
    expect(validateEstimateBoqDepth(foundation).actualRows).toBeGreaterThanOrEqual(12);

    await page.goto(appUrl("/request", FOUNDATION_PROMPT), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 45_000 });
    await expect(page.locator("[data-testid^='consumer-repair-item-']").first()).toBeVisible({ timeout: 30_000 });
    const foundationText = (await page.locator("body").textContent({ timeout: 30_000 })) ?? "";
    expect(foundationText).toContain("32,64");
    expect(foundationText).not.toMatch(/Backend global estimate|Grand total|Confidence|Human confirmation/i);
    expect(foundationText).not.toMatch(/\b(linear_m|sq_m|cubic_m|pcs)\b/);
    const foundationRows = await page.locator("[data-testid^='consumer-repair-item-']").count();
    expect(foundationRows).toBeGreaterThanOrEqual(12);

    await page.getByTestId("consumer-repair-add-manual-item").click();
    await expect(page.getByTestId("request-catalog-item-picker")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("request-catalog-picker-search").fill("\u0431\u0435\u0442\u043e\u043d");
    await page.getByTestId("request-catalog-picker-submit").click();
    const candidateRows = page.locator("[data-testid^='request-catalog-picker-row-']");
    await expect(candidateRows.first()).toBeVisible({ timeout: 30_000 });
    await candidateRows.first().click();
    const catalogText = (await page.locator("body").textContent({ timeout: 15_000 })) ?? "";
    expect(catalogText).toContain("catalogItemId:");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "foundation_manual_catalog.png"), fullPage: true });

    await page.getByTestId("consumer-estimate-make-pdf").click();
    await page.waitForURL(/pdf-viewer/, { timeout: 30_000 });
    expect(page.url()).toContain("pdf-viewer");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "request_pdf_viewer.png"), fullPage: true });

    const liveTranscripts = [
      await assertRealityCase(page, REALITY_CASES.brick_masonry),
      await assertRealityCase(page, REALITY_CASES.gable_roof_installation),
      await assertRealityCase(page, REALITY_CASES.asphalt_paving),
      await assertRealityCase(page, REALITY_CASES.carpet_laying),
      await assertRealityCase(page, REALITY_CASES.drywall_gkl),
    ];

    await page.goto(appUrl("/request", TILE_PROMPT), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 45_000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "request_tile.png"), fullPage: true });

    await page.goto(appUrl("/product/search", PRODUCT_SEARCH_PROMPT), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "product_rebar_d14.png"), fullPage: true });
    const productText = (await page.locator("body").textContent({ timeout: 30_000 })) ?? "";
    expect(productText).not.toMatch(/fake_stock|fake_availability|fake_supplier/i);

    const backendAcceptance = {
      brick: validateBackendAcceptance("brick_masonry", 74, 8),
      roof: validateBackendAcceptance("gable_roof_installation", 100, 10),
      asphalt: validateBackendAcceptance("asphalt_paving", 1000, 10),
      carpet: validateBackendAcceptance("carpet_laying", 100, 6),
      tile: validateBackendAcceptance("ceramic_tile_floor_laying", 174, 8),
      gkl: validateBackendAcceptance("drywall_partition", 352, 8),
    };

    writeJson(`${PREFIX}_web_screenshots.json`, {
      web_playwright_passed: true,
      screenshots: {
        foundation_manual_catalog: "artifacts/screenshots/request-estimate-catalog-boq-release/foundation_manual_catalog.png",
        request_pdf_viewer: "artifacts/screenshots/request-estimate-catalog-boq-release/request_pdf_viewer.png",
        request_tile: "artifacts/screenshots/request-estimate-catalog-boq-release/request_tile.png",
        product_rebar_d14: "artifacts/screenshots/request-estimate-catalog-boq-release/product_rebar_d14.png",
        live_routes: liveTranscripts.map((item) => item.screenshotPath),
      },
      fake_green_claimed: false,
    });
    writeJson(`${PREFIX}_web_transcripts.json`, {
      web_playwright_passed: true,
      acceptance_cases_total: 10,
      foundation_rows: foundationRows,
      foundation_concrete_volume_m3: foundation.input.dimensions?.concreteVolumeM3,
      manual_catalog_item_add_passed: catalogText.includes("catalogItemId:"),
      pdf_viewer_opened: true,
      product_search_rebar_passed: !/fake_stock|fake_availability|fake_supplier/i.test(productText),
      liveTranscripts,
      backendAcceptance,
      fake_green_claimed: false,
    });
  });
});
