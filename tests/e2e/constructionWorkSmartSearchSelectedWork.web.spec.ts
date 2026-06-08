import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const WAVE = "S_CONSTRUCTION_WORK_SMART_SEARCH_SELECTED_WORK_BINDING_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts", "S_CONSTRUCTION_WORK_SMART_SEARCH_SELECTED_WORK_BINDING");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "web");
const BROAD_QUERY = "\u043c\u043e\u043d\u0442\u0430\u0436";
const ELECTRICAL_TYPO_QUERY =
  "\u044d\u043b\u0435\u0442\u043a\u0440\u043e\u043c\u043e\u043d\u0442\u0430\u0436 18 \u0448\u0442";
const QUANTITY_TEXT = "18 \u0448\u0442";

type TextInputState = {
  value: string;
  focused: boolean;
  selectionStart: number | null;
  selectionEnd: number | null;
};

function rel(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function requestUrl(): string {
  return new URL("/request", BASE_URL).toString();
}

function forbiddenVisibleFound(text: string): boolean {
  return /foundation_system|foundation_concrete|\bwarning\b|[a-z][a-z0-9]+(?:_[a-z0-9]+)+/i.test(text);
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

test.describe("construction work smart search selected work web proof", () => {
  test.setTimeout(240_000);

  test("writes selected work into the active input, preserves typing and opens request PDF", async ({ page }, testInfo) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    await page.goto(requestUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByTestId("consumer-repair-screen")).toBeVisible({ timeout: 45_000 });

    await page.getByTestId("consumer-repair-problem-input").fill(BROAD_QUERY);
    await expect(page.getByTestId("consumer-repair-work-suggestions")).toBeVisible({ timeout: 30_000 });
    const broadSuggestions = page.locator('[data-testid^="consumer-repair-work-suggestion-"]');
    const broadCount = await broadSuggestions.count();
    expect(broadCount).toBeGreaterThanOrEqual(3);
    expect(broadCount).toBeLessThanOrEqual(8);
    const broadVisible = (await page.getByTestId("consumer-repair-work-suggestions").textContent()) ?? "";
    expect(broadVisible).toMatch(/[\u0400-\u04ff]/);
    expect(forbiddenVisibleFound(broadVisible)).toBe(false);

    await page.getByTestId("consumer-repair-problem-input").fill(ELECTRICAL_TYPO_QUERY);
    await expect(page.getByTestId("consumer-repair-work-suggestions")).toBeVisible({ timeout: 30_000 });
    const typoSuggestions = page.locator('[data-testid^="consumer-repair-work-suggestion-"]');
    const typoCount = await typoSuggestions.count();
    expect(typoCount).toBeGreaterThanOrEqual(3);
    expect(typoCount).toBeLessThanOrEqual(8);
    const electricalSuggestion = typoSuggestions
      .filter({ hasText: /\u0440\u043e\u0437\u0435\u0442|\u043a\u0430\u0431\u0435\u043b|\u0441\u0432\u0435\u0442|\u0449\u0438\u0442/i })
      .first();
    await expect(electricalSuggestion).toBeVisible({ timeout: 30_000 });
    await electricalSuggestion.click();

    await expect(page.getByTestId("consumer-repair-selected-work")).toHaveCount(0);
    await expect.poll(async () => (await activeInputState(page)).focused, { timeout: 10_000 }).toBe(true);
    const selectedState = await activeInputState(page);
    expect(selectedState.value).toMatch(/[\u0400-\u04ff]\s$/);
    expect(selectedState.selectionStart).toBe(selectedState.value.length);
    expect(selectedState.selectionEnd).toBe(selectedState.value.length);
    expect(forbiddenVisibleFound(selectedState.value)).toBe(false);

    await page.getByTestId("consumer-repair-problem-input").type(QUANTITY_TEXT);
    const typedState = await activeInputState(page);
    expect(typedState.value).toContain(selectedState.value.trim());
    expect(typedState.value).toContain(QUANTITY_TEXT);

    await page.getByTestId("consumer-repair-prepare-draft").click();
    await expect(page.getByTestId("consumer-repair-draft")).toBeVisible({ timeout: 45_000 });
    const draftText = (await page.getByTestId("consumer-repair-draft").textContent()) ?? "";
    expect(draftText).toContain(selectedState.value.trim());
    expect(draftText).toContain(QUANTITY_TEXT);
    expect(forbiddenVisibleFound(draftText)).toBe(false);

    const draftScreenshot = path.join(SCREENSHOT_DIR, `${testInfo.project.name}_selected_work_active_input_draft.png`);
    await page.screenshot({ path: draftScreenshot, fullPage: true });

    await page.getByTestId("consumer-estimate-make-pdf").first().click();
    await page.waitForURL(/pdf-viewer/, { timeout: 45_000 });
    await expect(page.locator("body")).toContainText(/PDF|Document/i, { timeout: 30_000 });
    const pdfScreenshot = path.join(SCREENSHOT_DIR, `${testInfo.project.name}_selected_work_active_input_pdf.png`);
    await page.screenshot({ path: pdfScreenshot, fullPage: true });

    writeJson(`web_${testInfo.project.name}_proof.json`, {
      wave: WAVE,
      status: "GREEN_WEB_SMART_SEARCH_SELECTED_WORK_ACTIVE_INPUT_PROOF_READY",
      browser_project: testInfo.project.name,
      dropdown_visible: true,
      broad_query_suggestions_count: broadCount,
      typo_query_suggestions_count: typoCount,
      selected_work_writes_into_active_input: true,
      textarea_focus_preserved_after_selection: true,
      quantity_can_be_appended_after_selection: true,
      selected_work_key_visible: false,
      separate_selected_work_block_visible: false,
      forbidden_visible_found: false,
      draft_visible: true,
      pdf_viewer_opened: /pdf-viewer/.test(page.url()),
      screenshots: [rel(draftScreenshot), rel(pdfScreenshot)],
      fake_green_claimed: false,
    });
  });
});
