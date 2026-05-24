import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import {
  BUILT_IN_AI_50000_FULL_CASES,
  BUILT_IN_AI_50000_PHASE3_WAVE,
  planBuiltInAi50000Phase3ProductSearchSample,
  validateBuiltInAi50000RuntimeResult,
} from "../../src/lib/ai/builtInAi50000";
import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "built-in-ai-50000-phase3", "product-search");

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test.describe("built-in AI 50000 Phase 3 product search sample", () => {
  test.setTimeout(900_000);

  test("validates 100 product search cases without fake stock or availability", async ({ page }) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const sample = planBuiltInAi50000Phase3ProductSearchSample();
    await page.goto(new URL("/product/search?prompt=арматура%20Ø14&autoSend=1", BASE_URL).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expect(page.locator("body")).toBeVisible({ timeout: 30_000 });
    const screenshotPath = path.join(SCREENSHOT_DIR, "product_search_rebar_d14.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const results = sample.map((item) => {
      const testCase = BUILT_IN_AI_50000_FULL_CASES.find((candidate) => candidate.id === item.caseId);
      if (!testCase) throw new Error(`Missing product sample case: ${item.caseId}`);
      const answer = answerBuiltInAi({
        text: item.prompt,
        route: "/product/search",
        screenContext: "marketplace",
        role: "buyer",
        userId: "built-in-ai-50000-phase3-product-user",
        countryCode: "KG",
        cityOrRegion: "Bishkek",
      });
      const validation = validateBuiltInAi50000RuntimeResult(testCase, answer);
      return {
        ...validation,
        route: item.route,
        prompt: item.prompt,
        candidateCount: answer.toolResult.productSearch?.candidates.length ?? 0,
        sourceStatusVisible: validation.productSourceEvidencePresent,
      };
    });
    const failures = results.filter((item) => !item.passed || item.fakeStockFound || item.fakeSupplierFound || item.fakeAvailabilityFound);
    writeJson("S_BUILT_IN_AI_50000_PHASE3_product_results.json", {
      wave: BUILT_IN_AI_50000_PHASE3_WAVE,
      final_status: failures.length === 0 ? "GREEN_BUILT_IN_AI_50000_PHASE3_PRODUCT_SEARCH_SAMPLE_READY" : "BLOCKED_PRODUCT_SEARCH_SAMPLE_FAILED",
      product_search_cases_total: sample.length,
      product_search_cases_passed: sample.length - failures.length,
      fake_stock_found: results.some((item) => item.fakeStockFound),
      fake_supplier_found: results.some((item) => item.fakeSupplierFound),
      fake_availability_found: results.some((item) => item.fakeAvailabilityFound),
      screenshots: [path.relative(process.cwd(), screenshotPath).replace(/\\/g, "/")],
      results,
      failures,
      fake_green_claimed: false,
    });
    expect(sample).toHaveLength(100);
    expect(failures).toEqual([]);
  });
});
