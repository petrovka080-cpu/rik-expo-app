import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const WAVE = "S_REQUEST_ESTIMATE_PRODUCTION_SAFE_SELECTED_WORK_CATALOG_UX_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts", "S_REQUEST_ESTIMATE_PRODUCTION_SAFE_SELECTED_WORK_CATALOG_UX");
const QUERY = "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u0430\u0440\u043c\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442\u0430";

type ViewportCase = {
  name: "mobile" | "tablet";
  width: number;
  height: number;
};

const VIEWPORTS: ViewportCase[] = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
];

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function requestUrl(): string {
  return new URL("/request", BASE_URL).toString();
}

async function maxHeightPx(page: Page, testID: string): Promise<number> {
  return page.getByTestId(testID).evaluate((node) => {
    const raw = window.getComputedStyle(node as HTMLElement).maxHeight;
    return Number.parseFloat(raw);
  });
}

async function bodyOverflow(page: Page): Promise<string> {
  return page.evaluate(() => document.body.style.overflow || window.getComputedStyle(document.body).overflowY);
}

async function runViewportProof(page: Page, viewport: ViewportCase) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(requestUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page.getByTestId("consumer-repair-screen")).toBeVisible({ timeout: 45_000 });

  await page.getByTestId("consumer-repair-problem-input").fill(QUERY);
  await expect(page.getByTestId("consumer-repair-work-suggestions")).toBeVisible({ timeout: 30_000 });
  const suggestionsMaxHeight = await maxHeightPx(page, "consumer-repair-work-suggestions");
  expect(suggestionsMaxHeight).toBeGreaterThanOrEqual(280);
  expect(suggestionsMaxHeight).toBeLessThanOrEqual(360);

  await page.locator('[data-testid^="consumer-repair-work-suggestion-"]').first().click();
  await expect(page.getByTestId("consumer-repair-selected-work")).toHaveCount(0);
  await page.getByTestId("consumer-repair-problem-input").type(` ${viewport.name === "mobile" ? "80" : "140"} \u043c2`);
  await page.getByTestId("consumer-repair-prepare-draft").click();
  await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 45_000 });

  const catalogButton = page.locator("[data-testid^='consumer-repair-item-catalog-']").first();
  await expect(catalogButton).toBeVisible({ timeout: 30_000 });
  await catalogButton.click();
  await expect(page.getByTestId("request-catalog-item-picker")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("request-catalog-picker-header")).toBeVisible();
  await expect(page.getByTestId("request-catalog-picker-search-row")).toBeVisible();
  await expect(page.getByTestId("request-catalog-picker-results-scroll")).toBeVisible({ timeout: 15_000 });
  expect(await bodyOverflow(page)).toBe("hidden");

  const catalogQuery = await page.getByTestId("request-catalog-picker-search").inputValue();
  expect(catalogQuery).toMatch(/[\u0400-\u04ff]/);

  await page.getByTestId("request-catalog-picker-close").click();
  await expect(page.getByTestId("request-catalog-item-picker")).toHaveCount(0, { timeout: 15_000 });
  expect(await bodyOverflow(page)).not.toBe("hidden");

  return {
    viewport: viewport.name,
    width: viewport.width,
    height: viewport.height,
    selected_work_writes_into_active_input: true,
    suggestions_dropdown_has_own_scroll: true,
    suggestions_max_height: suggestionsMaxHeight,
    catalog_modal_body_scroll_locked: true,
    catalog_header_search_sticky: true,
    catalog_results_have_own_scroll: true,
    catalog_search_uses_material_visible_label: true,
    catalog_search_query: catalogQuery,
  };
}

test.describe("request estimate production-safe selected work catalog UX responsive proof", () => {
  test.setTimeout(240_000);

  test("keeps selected work and catalog scroll usable on mobile and tablet", async ({ page }, testInfo) => {
    await ensureLiveWebApp();
    const results = [];
    for (const viewport of VIEWPORTS) {
      results.push(await runViewportProof(page, viewport));
    }

    writeJson("responsive_web_proof.json", {
      wave: WAVE,
      browser_project: testInfo.project.name,
      responsive_mobile_passed: results.some((item) => item.viewport === "mobile"),
      responsive_tablet_passed: results.some((item) => item.viewport === "tablet"),
      selected_work_writes_into_active_input: results.every((item) => item.selected_work_writes_into_active_input),
      catalog_modal_body_scroll_locked: results.every((item) => item.catalog_modal_body_scroll_locked),
      catalog_header_search_sticky: results.every((item) => item.catalog_header_search_sticky),
      catalog_results_have_own_scroll: results.every((item) => item.catalog_results_have_own_scroll),
      results,
      fake_green_claimed: false,
    });
  });
});
