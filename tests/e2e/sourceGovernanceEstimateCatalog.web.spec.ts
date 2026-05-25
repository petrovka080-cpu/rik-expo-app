import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate/globalEstimateCalculator";
import {
  formatSourceWarnings,
  mapEstimateRowEvidenceToRateSourceEvidence,
  validatePricedRateSourceEvidence,
} from "../../src/lib/ai/globalEstimate/sourceGovernance";
import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "source-governance");
const PREFIX = "S_RATEBOOK_CATALOG_SOURCE_GOVERNANCE";
const FOUNDATION_PROMPT = "смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м";
const BRICK_PROMPT = "смета на кладку кирпича 74 м2";
const ROOF_PROMPT = "смета на двускатную кровлю 100 м2";

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function appUrl(route: string, prompt: string): string {
  const url = new URL(route, BASE_URL);
  url.searchParams.set("prompt", prompt);
  url.searchParams.set(route === "/request" ? "autoPrepare" : "autoSend", "1");
  return url.toString();
}

function backendGovernance(prompt: string) {
  const estimate = calculateGlobalConstructionEstimateSync({
    text: prompt,
    language: "ru",
    countryCode: "KG",
    city: "Bishkek",
  });
  const validations = estimate.sections.flatMap((section) =>
    section.rows.map((row) => validatePricedRateSourceEvidence({
      path: `${estimate.work.workKey}.${section.type}.${row.rowNumber}`,
      unitPrice: row.unitPrice,
      sourceId: row.sourceId,
      sourceLabel: row.sourceEvidence[0]?.label,
      sourceType: "configured_reference",
      confidence: row.confidence,
      evidence: row.sourceEvidence.map(mapEstimateRowEvidenceToRateSourceEvidence),
      availabilityStatus: "unknown",
      stockStatus: "unknown",
    })),
  );
  return {
    workKey: estimate.work.workKey,
    rowCount: estimate.sections.flatMap((section) => section.rows).length,
    sourceEvidencePresent: validations.every((item) => item.ok),
    priceWithoutSourceFound: validations.some((item) => item.priceWithoutSourceFound),
    fakeAvailabilityFound: validations.some((item) => item.fakeAvailabilityFound),
    fakeStockFound: validations.some((item) => item.fakeStockFound),
    fakeSupplierFound: validations.some((item) => item.fakeSupplierFound),
    failures: validations.flatMap((item) => item.failures),
  };
}

test.describe("ratebook and catalog source governance live web", () => {
  test("verifies estimates, product search, catalog selection and stale-source warnings", async ({ page }) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    const foundation = backendGovernance(FOUNDATION_PROMPT);
    const brick = backendGovernance(BRICK_PROMPT);
    const roof = backendGovernance(ROOF_PROMPT);
    const staleWarnings = formatSourceWarnings([{
      code: "HIGH_CONFIDENCE_STALE_SOURCE",
      path: "fixture.source",
      message: "stale",
    }]);

    await page.goto(appUrl("/request", FOUNDATION_PROMPT), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 45_000 });
    const requestText = (await page.locator("body").textContent({ timeout: 30_000 })) ?? "";
    expect(requestText).not.toMatch(/fake supplier|in_stock|available without|supplier found/i);
    await page.locator("[data-testid^='consumer-repair-item-catalog-']").first().click();
    await expect(page.getByTestId("request-catalog-item-picker")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("request-catalog-picker-search").fill("бетон");
    await page.getByTestId("request-catalog-picker-submit").click();
    const rows = page.locator("[data-testid^='request-catalog-picker-row-']");
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    await rows.first().click();
    const afterSelectionText = (await page.locator("body").textContent({ timeout: 15_000 })) ?? "";
    expect(afterSelectionText).toContain("catalogItemId:");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "request_foundation_catalog_selection.png"), fullPage: true });

    await page.goto(appUrl("/chat", BRICK_PROMPT), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.locator("body")).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "chat_brick.png"), fullPage: true });

    await page.goto(appUrl("/chat", ROOF_PROMPT), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.locator("body")).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "chat_roof.png"), fullPage: true });

    await page.goto(appUrl("/product/search", "арматура Ø14"), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.locator("body")).toBeVisible({ timeout: 30_000 });
    const productText = (await page.locator("body").textContent({ timeout: 30_000 })) ?? "";
    expect(productText).not.toMatch(/fake supplier|fake stock|fake availability|supplier found/i);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "product_rebar_d14.png"), fullPage: true });

    const failures = [foundation, brick, roof].flatMap((item) => item.failures);
    writeJson(`${PREFIX}_web_screenshots.json`, {
      web_playwright_passed: failures.length === 0,
      screenshots: {
        request_foundation_catalog_selection: "artifacts/screenshots/source-governance/request_foundation_catalog_selection.png",
        chat_brick: "artifacts/screenshots/source-governance/chat_brick.png",
        chat_roof: "artifacts/screenshots/source-governance/chat_roof.png",
        product_rebar_d14: "artifacts/screenshots/source-governance/product_rebar_d14.png",
      },
      fake_green_claimed: false,
    });
    writeJson(`${PREFIX}_web_transcripts.json`, {
      foundation,
      brick,
      roof,
      product_search_rebar_opened: true,
      catalog_item_selection_visible: afterSelectionText.includes("catalogItemId:"),
      stale_source_warning_fixture: staleWarnings,
      fake_stock_found: productText.includes("fake stock"),
      fake_supplier_found: productText.includes("fake supplier"),
      fake_availability_found: productText.includes("fake availability"),
      failures,
      fake_green_claimed: false,
    });

    expect(foundation.priceWithoutSourceFound).toBe(false);
    expect(brick.priceWithoutSourceFound).toBe(false);
    expect(roof.priceWithoutSourceFound).toBe(false);
    expect(failures).toEqual([]);
    expect(staleWarnings.length).toBeGreaterThan(0);
  });
});
