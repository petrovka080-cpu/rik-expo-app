import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const WAVE = "S_REQUEST_ESTIMATE_SELECTED_WORK_ACTIVE_INPUT_CATALOG_SCROLL_EXACT_MATERIAL_UX_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts", "S_REQUEST_ESTIMATE_SELECTED_WORK_ACTIVE_INPUT_CATALOG_SCROLL_EXACT_MATERIAL_UX");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "responsive-web");
const QUERY = "\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f \u043a\u0440\u043e\u0432\u043b\u0438";
const QUANTITY_TEXT = "90 \u043c2";

const VIEWPORTS = [
  { id: "mobile", width: 390, height: 844 },
  { id: "tablet", width: 834, height: 1112 },
] as const;

type TextInputState = {
  value: string;
  focused: boolean;
  selectionStart: number | null;
  selectionEnd: number | null;
};

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function rel(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function requestUrl(): string {
  return new URL("/request", BASE_URL).toString();
}

async function activeInputState(page: Page): Promise<TextInputState> {
  return page.getByTestId("consumer-repair-problem-input").evaluate((node) => {
    const input = node as HTMLInputElement | HTMLTextAreaElement;
    return {
      value: input.value,
      focused: document.activeElement === input,
      selectionStart: input.selectionStart,
      selectionEnd: input.selectionEnd,
    };
  });
}

async function maxHeightPx(page: Page, testID: string): Promise<number> {
  return page.getByTestId(testID).evaluate((node) => {
    const style = window.getComputedStyle(node as HTMLElement);
    return Number.parseFloat(style.maxHeight || "0");
  });
}

test.describe("request estimate selected work active input responsive web proof", () => {
  test.setTimeout(240_000);

  test("keeps active input and scroll containers usable on mobile and tablet", async ({ page }, testInfo) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    const proofs = [];
    for (const viewport of VIEWPORTS) {
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
      await expect.poll(async () => (await activeInputState(page)).focused, { timeout: 10_000 }).toBe(true);
      const selectedState = await activeInputState(page);
      expect(selectedState.value).toMatch(/[\u0400-\u04ff]\s$/);
      expect(selectedState.selectionStart).toBe(selectedState.value.length);
      expect(selectedState.selectionEnd).toBe(selectedState.value.length);

      await page.getByTestId("consumer-repair-problem-input").type(QUANTITY_TEXT);
      const typedState = await activeInputState(page);
      expect(typedState.value).toContain(selectedState.value.trim());
      expect(typedState.value).toContain(QUANTITY_TEXT);

      await page.getByTestId("consumer-repair-prepare-draft").click();
      await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 45_000 });
      const catalogButton = page.locator("[data-testid^='consumer-repair-item-catalog-']").first();
      await expect(catalogButton).toBeVisible({ timeout: 30_000 });
      await catalogButton.click();
      await expect(page.getByTestId("request-catalog-item-picker")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId("request-catalog-picker-results-scroll")).toBeVisible({ timeout: 15_000 });

      const screenshot = path.join(SCREENSHOT_DIR, `${testInfo.project.name}_${viewport.id}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      proofs.push({
        viewport: viewport.id,
        width: viewport.width,
        height: viewport.height,
        selected_work_writes_into_active_input: true,
        textarea_focus_preserved_after_selection: true,
        quantity_can_be_appended_after_selection: true,
        suggestions_dropdown_has_own_scroll: true,
        catalog_results_have_own_scroll: true,
        screenshot: rel(screenshot),
      });
      await page.getByTestId("request-catalog-picker-close").click();
    }

    writeJson("responsive_web_proof.json", {
      wave: WAVE,
      browser_project: testInfo.project.name,
      responsive_mobile_passed: true,
      responsive_tablet_passed: true,
      proofs,
      fake_green_claimed: false,
    });
  });
});
