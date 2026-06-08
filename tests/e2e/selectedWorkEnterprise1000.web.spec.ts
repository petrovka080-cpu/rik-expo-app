import fs from "node:fs";
import path from "node:path";

import { expect, test } from "playwright/test";

import { SELECTED_WORK_ENTERPRISE_1000_CASES } from "../../scripts/e2e/selectedWorkEnterprise1000Cases";
import { normalizeRuText } from "../../src/lib/text/encoding";
import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const WAVE = "S_SELECTED_WORK_ENTERPRISE_VISIBLE_1000_REAL_INPUT_ESTIMATE_ACCEPTANCE_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts", "S_SELECTED_WORK_ENTERPRISE_VISIBLE_1000_REAL_INPUT_ESTIMATE_ACCEPTANCE");
const CASE_COUNTS: Record<string, number> = {
  chromium: 100,
  firefox: 50,
  webkit: 50,
};

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function requestUrl(): string {
  return new URL("/request", BASE_URL).toString();
}

function artifactName(projectName: string): string {
  if (projectName === "chromium") return "web_chromium_typing_proof.json";
  if (projectName === "firefox") return "web_firefox_typing_proof.json";
  return "web_webkit_typing_proof.json";
}

function forbiddenVisibleFound(text: string): boolean {
  return /foundation_system|foundation_concrete|\bwarning\b|\bdebug\b|\bfallback\b|[a-z][a-z0-9]+(?:_[a-z0-9]+)+|\uFFFD/i.test(text);
}

function visibleText(value: string): string {
  return String(normalizeRuText(value) ?? "").replace(/\s+/g, " ").trim();
}

test.describe("selected work enterprise 1000 web typing proof", () => {
  test.setTimeout(600_000);

  test("types real selected-work inputs and binds selected suggestions", async ({ page }, testInfo) => {
    await ensureLiveWebApp();
    const requiredCases = CASE_COUNTS[testInfo.project.name] ?? 50;
    const cases = SELECTED_WORK_ENTERPRISE_1000_CASES.slice(0, requiredCases);
    const rows = [];

    await page.goto(requestUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByTestId("consumer-repair-screen")).toBeVisible({ timeout: 45_000 });

    for (const testCase of cases) {
      await page.getByTestId("consumer-repair-problem-input").fill(testCase.smartSearchInput);
      await expect(page.getByTestId("consumer-repair-work-suggestions")).toBeVisible({ timeout: 30_000 });
      const suggestions = page.locator('[data-testid^="consumer-repair-work-suggestion-"]');
      const count = await suggestions.count();
      const suggestionsText = visibleText((await page.getByTestId("consumer-repair-work-suggestions").textContent()) ?? "");
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(8);
      expect(suggestionsText).toMatch(/[\u0400-\u04ff]/);
      expect(forbiddenVisibleFound(suggestionsText)).toBe(false);

      const suggestionTexts = await suggestions.evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ""));
      const selectedIndex = suggestionTexts.findIndex((text) => visibleText(text).includes(testCase.selectedTitleRu));
      expect(selectedIndex).toBeGreaterThanOrEqual(0);
      await suggestions.nth(selectedIndex).click();
      await expect(page.getByTestId("consumer-repair-selected-work")).toBeVisible({ timeout: 30_000 });
      const selectedTitle = visibleText((await page.getByTestId("consumer-repair-selected-work-title").textContent()) ?? "");
      expect(selectedTitle).toContain(testCase.selectedTitleRu);
      expect(forbiddenVisibleFound(selectedTitle)).toBe(false);

      rows.push({
        id: testCase.id,
        scenario: testCase.scenario,
        input: testCase.smartSearchInput,
        selectedWorkKey: testCase.selectedWorkKey,
        selectedTitleRu: selectedTitle,
        suggestionsCount: count,
        realUiTyping: true,
        selectedSuggestionClicked: true,
      });
      await page.getByTestId("consumer-repair-clear-selected-work").click();
    }

    writeJson(artifactName(testInfo.project.name), {
      wave: WAVE,
      final_status: "GREEN_WEB_SELECTED_WORK_ENTERPRISE_1000_TYPING_READY",
      browser_project: testInfo.project.name,
      real_ui_typing_cases: rows.length,
      expected_real_ui_typing_cases: requiredCases,
      selected_work_clicks: rows.length,
      rows,
      fake_green_claimed: false,
    });
  });
});
