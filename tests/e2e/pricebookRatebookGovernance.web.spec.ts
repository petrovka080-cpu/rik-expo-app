import path from "node:path";

import { expect, test, type Page } from "playwright/test";

import {
  readPricebookWaveJson,
  writePricebookWaveJson,
} from "../../scripts/e2e/pricebookRatebookGovernance.shared";
import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const QUERY = "\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f \u043a\u0440\u044b\u0448\u0438";
const QUANTITY_TEXT = " 120 \u043c2";

function requestUrl(): string {
  return new URL("/request", BASE_URL).toString();
}

function artifactName(projectName: string): string {
  if (projectName === "chromium") return "web_chromium_results.json";
  if (projectName === "firefox") return "web_firefox_results.json";
  return "web_webkit_results.json";
}

function projectPassedStatus(projectName: string): string {
  if (projectName === "chromium") return "GREEN_PRICEBOOK_GOVERNANCE_WEB_CHROMIUM_READY";
  if (projectName === "firefox") return "GREEN_PRICEBOOK_GOVERNANCE_WEB_FIREFOX_READY";
  return "GREEN_PRICEBOOK_GOVERNANCE_WEB_WEBKIT_READY";
}

function cleanVisibleText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function forbiddenVisibleFound(text: string): boolean {
  const withoutAllowedStatus = text.replace(/PRICE_MISSING|PARTIAL_PRICE_MISSING/g, "");
  return /\b(?:work_key|material_id|rateKey|materialKey|dynamic_universal|roof_waterproofing|undefined|NaN)\b/i.test(withoutAllowedStatus) ||
    /\b(?:fake|mock|demo|random)\s+(?:price|supplier|catalog|ratebook)\b/i.test(withoutAllowedStatus) ||
    /\uFFFD/.test(withoutAllowedStatus);
}

async function selectRoofWaterproofing(page: Page): Promise<void> {
  await page.goto(requestUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page.getByTestId("consumer-repair-screen")).toBeVisible({ timeout: 45_000 });
  await page.getByTestId("consumer-repair-problem-input").fill(QUERY);
  await expect(page.getByTestId("consumer-repair-work-suggestions")).toBeVisible({ timeout: 30_000 });
  const suggestions = page.locator('[data-testid^="consumer-repair-work-suggestion-"]');
  const suggestionTexts = await suggestions.evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ""));
  const selectedIndex = suggestionTexts.findIndex((text) => /roof_waterproofing|\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b|\u043a\u0440\u043e\u0432|\u043a\u0440\u044b\u0448/i.test(text));
  expect(selectedIndex).toBeGreaterThanOrEqual(0);
  await suggestions.nth(selectedIndex).click();
  await page.getByTestId("consumer-repair-problem-input").type(QUANTITY_TEXT);
}

async function buildGovernedEstimate(page: Page): Promise<string> {
  await selectRoofWaterproofing(page);
  await page.getByTestId("consumer-repair-prepare-draft").click();
  await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("request-estimate-items-editor")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("consumer-estimate-make-pdf")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-testid^='consumer-repair-item-catalog-']").first()).toBeVisible({ timeout: 30_000 });
  return cleanVisibleText([
    await page.getByTestId("request-estimate-summary-card").textContent(),
    await page.getByTestId("request-estimate-items-editor").textContent(),
  ].filter(Boolean).join(" "));
}

function writeWebAggregate(): void {
  const chromium = readPricebookWaveJson("web_chromium_results.json") as Record<string, unknown> | null;
  const firefox = readPricebookWaveJson("web_firefox_results.json") as Record<string, unknown> | null;
  const webkit = readPricebookWaveJson("web_webkit_results.json") as Record<string, unknown> | null;
  const chromiumPassed = chromium?.final_status === "GREEN_PRICEBOOK_GOVERNANCE_WEB_CHROMIUM_READY";
  const firefoxPassed = firefox?.final_status === "GREEN_PRICEBOOK_GOVERNANCE_WEB_FIREFOX_READY";
  const webkitPassed = webkit?.final_status === "GREEN_PRICEBOOK_GOVERNANCE_WEB_WEBKIT_READY";
  writePricebookWaveJson("web_results.json", {
    final_status: chromiumPassed && firefoxPassed && webkitPassed
      ? "GREEN_PRICEBOOK_GOVERNANCE_WEB_ALL_BROWSERS_READY"
      : "PARTIAL_PRICEBOOK_GOVERNANCE_WEB_BROWSER_PROOF",
    web_chromium_passed: chromiumPassed,
    web_firefox_passed: firefoxPassed,
    web_webkit_passed: webkitPassed,
    fake_green_claimed: false,
    failures: [],
  });
}

test.describe("pricebook ratebook governance web proof", () => {
  test.setTimeout(420_000);

  test("builds governed estimate with visible price source status", async ({ page }, testInfo) => {
    await ensureLiveWebApp();
    const visible = await buildGovernedEstimate(page);

    expect(visible).toMatch(/\u043f\u0440\u0430\u0439\u043c\u0435\u0440/i);
    expect(visible).toMatch(/\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b/i);
    expect(visible).toContain("PRICE_MISSING");
    expect(visible).toMatch(/seeded ratebook|price date|governed ratebook/i);
    expect(forbiddenVisibleFound(visible)).toBe(false);

    const screenshotPath = path.join("artifacts", "S_PRICEBOOK_RATEBOOK_GOVERNANCE_IMPORT_VALIDATION", `web_${testInfo.project.name}.png`).replace(/\\/g, "/");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    writePricebookWaveJson(artifactName(testInfo.project.name), {
      final_status: projectPassedStatus(testInfo.project.name),
      browser_project: testInfo.project.name,
      request_route_opens: true,
      governed_estimate_builds: true,
      price_source_visible: true,
      missing_price_visible_when_needed: true,
      supplier_or_source_visible: true,
      pdf_action_visible: true,
      catalog_binding_visible: true,
      internal_keys_visible: 0,
      mojibake_found: 0,
      fake_price_claimed: false,
      fake_supplier_claimed: false,
      screenshot_path: screenshotPath,
      failures: [],
    });
    writeWebAggregate();
  });
});
