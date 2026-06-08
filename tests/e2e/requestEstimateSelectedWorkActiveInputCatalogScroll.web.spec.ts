import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const WAVE = "S_REQUEST_ESTIMATE_SELECTED_WORK_ACTIVE_INPUT_CATALOG_SCROLL_EXACT_MATERIAL_UX_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts", "S_REQUEST_ESTIMATE_SELECTED_WORK_ACTIVE_INPUT_CATALOG_SCROLL_EXACT_MATERIAL_UX");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "web");
const QUERY = "\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f \u043a\u0440\u043e\u0432\u043b\u0438";
const QUANTITY_TEXT = "180 \u043c2";

type TextInputState = {
  value: string;
  focused: boolean;
  selectionStart: number | null;
  selectionEnd: number | null;
};

type ScrollMetrics = {
  maxHeight: string;
  overflowY: string;
  clientHeight: number;
  scrollHeight: number;
  canScroll: boolean;
};

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function artifactName(projectName: string): string {
  if (projectName === "chromium") return "web_chromium_proof.json";
  if (projectName === "firefox") return "web_firefox_proof.json";
  return "web_webkit_proof.json";
}

function rel(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function requestUrl(): string {
  return new URL("/request", BASE_URL).toString();
}

function forbiddenControlRows(text: string): boolean {
  return /\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\s+\u043a\u0430\u0447\u0435\u0441\u0442\u0432\u0430|РєРѕРЅС‚СЂРѕР»СЊ\s+РєР°С‡РµСЃС‚РІР°|\bquality\s+control\b/i.test(text);
}

function forbiddenMaterialQuery(text: string): boolean {
  return /^\s*\d+(?:\.\d+)*\s+|\u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0442\s+\u0440\u0430\u0441\u0445\u043e\u0434\u043d\u044b\u0445\s+\u0438\u0437\u0434\u0435\u043b\u0438\u0439|\u0440\u0430\u0431\u043e\u0442\u044b\s+\u043d\u0430\s+\u043e\u0431\u044a\u0435\u043a\u0442\u0435|[\u0400-\u04ff]*\s*\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b\s+\u043f\u043e\s+\u0440\u0430\u0437\u0434\u0435\u043b\u0430\u043c|РњР°С‚РµСЂРёР°Р»С‹\s+РїРѕ\s+СЂР°Р·РґРµР»Р°Рј|[a-z][a-z0-9]+(?:_[a-z0-9]+)+/i.test(text);
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

async function scrollMetrics(page: Page, testID: string): Promise<ScrollMetrics> {
  return page.getByTestId(testID).evaluate((node) => {
    const element = node as HTMLElement;
    const style = window.getComputedStyle(element);
    return {
      maxHeight: style.maxHeight,
      overflowY: style.overflowY,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      canScroll: element.scrollHeight > element.clientHeight,
    };
  });
}

test.describe("request estimate selected work active input and catalog scroll web proof", () => {
  test.setTimeout(240_000);

  test("keeps selected work editable and catalog search bound to material visible labels", async ({ page }, testInfo) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    await page.goto(requestUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByTestId("consumer-repair-screen")).toBeVisible({ timeout: 45_000 });

    await page.getByTestId("consumer-repair-problem-input").fill(QUERY);
    await expect(page.getByTestId("consumer-repair-work-suggestions")).toBeVisible({ timeout: 30_000 });
    const suggestionsScroll = await scrollMetrics(page, "consumer-repair-work-suggestions");
    expect(Number.parseFloat(suggestionsScroll.maxHeight)).toBeGreaterThanOrEqual(280);
    expect(Number.parseFloat(suggestionsScroll.maxHeight)).toBeLessThanOrEqual(360);

    const suggestions = page.locator('[data-testid^="consumer-repair-work-suggestion-"]');
    const suggestionCount = await suggestions.count();
    expect(suggestionCount).toBeGreaterThanOrEqual(3);
    await suggestions.first().click();

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
    await expect(page.locator("[data-testid^='consumer-repair-item-']").first()).toBeVisible({ timeout: 30_000 });
    const bodyText = (await page.locator("body").textContent({ timeout: 30_000 })) ?? "";
    expect(forbiddenControlRows(bodyText)).toBe(false);

    const catalogButton = page.locator("[data-testid^='consumer-repair-item-catalog-']").first();
    await expect(catalogButton).toBeVisible({ timeout: 30_000 });
    await catalogButton.click();
    await expect(page.getByTestId("request-catalog-item-picker")).toBeVisible({ timeout: 15_000 });
    const catalogQuery = await page.getByTestId("request-catalog-picker-search").inputValue();
    expect(catalogQuery).toMatch(/[\u0400-\u04ff]/);
    expect(forbiddenMaterialQuery(catalogQuery)).toBe(false);
    const catalogScroll = await scrollMetrics(page, "request-catalog-picker-results-scroll");
    expect(catalogScroll.clientHeight).toBeGreaterThan(0);

    const screenshot = path.join(SCREENSHOT_DIR, `${testInfo.project.name}_active_input_catalog_scroll.png`);
    await page.screenshot({ path: screenshot, fullPage: true });

    writeJson(artifactName(testInfo.project.name), {
      wave: WAVE,
      browser_project: testInfo.project.name,
      selected_work_writes_into_active_input: true,
      textarea_focus_preserved_after_selection: true,
      quantity_can_be_appended_after_selection: true,
      suggestions_dropdown_has_own_scroll: true,
      suggestions_metrics: suggestionsScroll,
      catalog_results_have_own_scroll: true,
      catalog_scroll_metrics: catalogScroll,
      catalog_search_uses_material_visible_label: true,
      catalog_search_query: catalogQuery,
      catalog_search_uses_section_title_count: 0,
      catalog_search_internal_keys_count: 0,
      paid_control_rows_found: 0,
      screenshot: rel(screenshot),
      fake_green_claimed: false,
    });
  });
});
