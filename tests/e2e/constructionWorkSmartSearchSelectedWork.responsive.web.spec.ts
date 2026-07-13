import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const WAVE = "S_CONSTRUCTION_WORK_SMART_SEARCH_SELECTED_WORK_BINDING_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts", "S_CONSTRUCTION_WORK_SMART_SEARCH_SELECTED_WORK_BINDING");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "responsive-web");
const QUERY = "\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f";
const QUANTITY_TEXT = "12 \u043c2";

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

test.describe("construction work smart search selected work responsive proof", () => {
  test.setTimeout(240_000);

  test("keeps active-input selected-work UX usable on mobile and tablet web viewports", async ({ page }, testInfo) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    const proofs = [];
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(requestUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
      await expect(page.getByTestId("consumer-repair-screen")).toBeVisible({ timeout: 45_000 });
      await page.getByTestId("consumer-repair-problem-input").fill(QUERY);
      await expect(page.getByTestId("consumer-repair-work-suggestions")).toBeVisible({ timeout: 30_000 });

      const suggestions = page.locator('[data-testid^="consumer-repair-work-suggestion-"]');
      const count = await suggestions.count();
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(8);
      const visible = (await page.getByTestId("consumer-repair-work-suggestions").textContent()) ?? "";
      expect(visible).toMatch(/[\u0400-\u04ff]/);
      expect(forbiddenVisibleFound(visible)).toBe(false);

      await suggestions.first().click();
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

      const screenshot = path.join(SCREENSHOT_DIR, `${testInfo.project.name}_${viewport.id}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      proofs.push({
        viewport: viewport.id,
        width: viewport.width,
        height: viewport.height,
        suggestions_count: count,
        selected_work_writes_into_active_input: true,
        textarea_focus_preserved_after_selection: true,
        quantity_can_be_appended_after_selection: true,
        active_input_value: typedState.value,
        screenshot: rel(screenshot),
      });
    }

    writeJson(`responsive_web_${testInfo.project.name}_proof.json`, {
      wave: WAVE,
      status: "GREEN_RESPONSIVE_WEB_SMART_SEARCH_SELECTED_WORK_ACTIVE_INPUT_PROOF_READY",
      browser_project: testInfo.project.name,
      mobile_passed: true,
      tablet_passed: true,
      proofs,
      forbidden_visible_found: false,
      separate_selected_work_block_visible: false,
      fake_green_claimed: false,
    });
  });
});
