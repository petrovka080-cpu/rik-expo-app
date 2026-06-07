import fs from "node:fs";
import path from "node:path";

import { expect, test } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const WAVE = "S_CONSTRUCTION_WORK_SMART_SEARCH_SELECTED_WORK_BINDING_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts", "S_CONSTRUCTION_WORK_SMART_SEARCH_SELECTED_WORK_BINDING");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "responsive-web");
const QUERY = "\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f";

const VIEWPORTS = [
  { id: "mobile", width: 390, height: 844 },
  { id: "tablet", width: 834, height: 1112 },
] as const;

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

test.describe("construction work smart search selected work responsive proof", () => {
  test.setTimeout(240_000);

  test("keeps dropdown usable on mobile and tablet web viewports", async ({ page }, testInfo) => {
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
      await expect(page.getByTestId("consumer-repair-selected-work")).toBeVisible({ timeout: 30_000 });
      const selectedTitle = (await page.getByTestId("consumer-repair-selected-work-title").textContent()) ?? "";
      expect(selectedTitle).toMatch(/[\u0400-\u04ff]/);
      expect(forbiddenVisibleFound(selectedTitle)).toBe(false);

      const screenshot = path.join(SCREENSHOT_DIR, `${testInfo.project.name}_${viewport.id}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      proofs.push({
        viewport: viewport.id,
        width: viewport.width,
        height: viewport.height,
        suggestions_count: count,
        selected_work_visible: true,
        selected_work_title: selectedTitle,
        screenshot: rel(screenshot),
      });
    }

    writeJson(`responsive_web_${testInfo.project.name}_proof.json`, {
      wave: WAVE,
      status: "GREEN_RESPONSIVE_WEB_SMART_SEARCH_SELECTED_WORK_PROOF_READY",
      browser_project: testInfo.project.name,
      mobile_passed: true,
      tablet_passed: true,
      proofs,
      forbidden_visible_found: false,
      fake_green_claimed: false,
    });
  });
});
