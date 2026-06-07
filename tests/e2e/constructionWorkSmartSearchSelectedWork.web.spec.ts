import fs from "node:fs";
import path from "node:path";

import { expect, test } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const WAVE = "S_CONSTRUCTION_WORK_SMART_SEARCH_SELECTED_WORK_BINDING_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts", "S_CONSTRUCTION_WORK_SMART_SEARCH_SELECTED_WORK_BINDING");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "web");
const BROAD_QUERY = "\u043c\u043e\u043d\u0442\u0430\u0436";
const ELECTRICAL_TYPO_QUERY =
  "\u044d\u043b\u0435\u0442\u043a\u0440\u043e\u043c\u043e\u043d\u0442\u0430\u0436 18 \u0448\u0442";

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

test.describe("construction work smart search selected work web proof", () => {
  test.setTimeout(240_000);

  test("shows smart-search suggestions, persists selected work and opens request PDF", async ({ page }, testInfo) => {
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

    await expect(page.getByTestId("consumer-repair-selected-work")).toBeVisible({ timeout: 30_000 });
    const selectedTitle = (await page.getByTestId("consumer-repair-selected-work-title").textContent()) ?? "";
    expect(selectedTitle).toMatch(/[\u0400-\u04ff]/);
    expect(forbiddenVisibleFound(selectedTitle)).toBe(false);

    await page.getByTestId("consumer-repair-prepare-draft").click();
    await expect(page.getByTestId("consumer-repair-draft")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("consumer-repair-selected-work")).toBeVisible({ timeout: 30_000 });
    const draftText = [
      (await page.getByTestId("consumer-repair-selected-work").textContent()) ?? "",
      (await page.getByTestId("consumer-repair-draft").textContent()) ?? "",
    ].join("\n");
    expect(forbiddenVisibleFound(draftText)).toBe(false);

    const draftScreenshot = path.join(SCREENSHOT_DIR, `${testInfo.project.name}_selected_work_draft.png`);
    await page.screenshot({ path: draftScreenshot, fullPage: true });

    await page.getByTestId("consumer-estimate-make-pdf").first().click();
    await page.waitForURL(/pdf-viewer/, { timeout: 45_000 });
    await expect(page.locator("body")).toContainText(/PDF|Document/i, { timeout: 30_000 });
    const pdfScreenshot = path.join(SCREENSHOT_DIR, `${testInfo.project.name}_selected_work_pdf.png`);
    await page.screenshot({ path: pdfScreenshot, fullPage: true });

    writeJson(`web_${testInfo.project.name}_proof.json`, {
      wave: WAVE,
      status: "GREEN_WEB_SMART_SEARCH_SELECTED_WORK_PROOF_READY",
      browser_project: testInfo.project.name,
      dropdown_visible: true,
      broad_query_suggestions_count: broadCount,
      typo_query_suggestions_count: typoCount,
      selected_work_visible: true,
      selected_work_title: selectedTitle,
      selected_work_key_visible: false,
      forbidden_visible_found: false,
      draft_visible: true,
      pdf_viewer_opened: /pdf-viewer/.test(page.url()),
      screenshots: [rel(draftScreenshot), rel(pdfScreenshot)],
      fake_green_claimed: false,
    });
  });
});
