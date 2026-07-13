import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const WAVE = "S_ESTIMATE_TO_PROJECT_EXECUTION_PROCUREMENT_HANDOFF";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts", WAVE);
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "responsive");
const QUERY = "\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f \u043a\u0440\u043e\u0432\u043b\u0438";

const VIEWPORTS = [
  { id: "mobile", width: 390, height: 844, quantity: "80 \u043c2" },
  { id: "tablet", width: 834, height: 1112, quantity: "120 \u043c2" },
  { id: "desktop", width: 1366, height: 900, quantity: "160 \u043c2" },
] as const;

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function requestUrl(): string {
  return new URL("/request", BASE_URL).toString();
}

function rel(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function hasInternalKey(text: string): boolean {
  return /\b(?:project_task|project_work_package|procurement_item|sourcePayloadHash|catalogItemId|selectedWorkKey|workKey|materialKey|rowId|price_required|known_catalog_price)\b|[a-z][a-z0-9]+(?:_[a-z0-9]+)+/i.test(text);
}

function hasMojibake(text: string): boolean {
  return /[\uFFFD]|\u00d0|\u00d1|[\u0420\u0421][\u0402-\u040f\u0452-\u045f\u00a0-\u00ff]/.test(text);
}

async function runViewport(page: Page, viewport: (typeof VIEWPORTS)[number], browserProject: string) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(requestUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page.getByTestId("consumer-repair-screen")).toBeVisible({ timeout: 45_000 });

  await page.getByTestId("consumer-repair-problem-input").fill(QUERY);
  await expect(page.getByTestId("consumer-repair-work-suggestions")).toBeVisible({ timeout: 30_000 });
  await page.locator('[data-testid^="consumer-repair-work-suggestion-"]').first().click();
  await page.getByTestId("consumer-repair-problem-input").type(viewport.quantity);
  await page.getByTestId("consumer-repair-prepare-draft").click();
  await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("estimate-project-handoff-actions")).toBeVisible({ timeout: 30_000 });

  await page.getByTestId("consumer-estimate-create-project").click();
  await expect(page.getByTestId("project-execution-preview")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("project-execution-work-packages")).toBeVisible();
  await expect(page.getByTestId("project-execution-tasks")).toBeVisible();
  await expect(page.getByTestId("project-execution-procurement-items")).toBeVisible();

  const preview = (await page.getByTestId("project-execution-preview").textContent({ timeout: 30_000 })) ?? "";
  expect(preview).toMatch(/[\u0400-\u04ff]/);
  expect(hasInternalKey(preview)).toBe(false);
  expect(hasMojibake(preview)).toBe(false);

  const screenshot = path.join(SCREENSHOT_DIR, `${browserProject}_${viewport.id}_project_execution_preview.png`);
  await page.screenshot({ path: screenshot, fullPage: true });

  return {
    viewport: viewport.id,
    width: viewport.width,
    height: viewport.height,
    selected_work_smart_search_used: true,
    project_execution_preview_visible: true,
    work_packages_visible: true,
    tasks_visible: true,
    procurement_items_visible: true,
    no_internal_keys: true,
    no_mojibake: true,
    screenshot: rel(screenshot),
  };
}

test.describe("estimate to project execution procurement handoff responsive proof", () => {
  test.setTimeout(300_000);

  test("keeps the project execution preview usable across responsive request viewports", async ({ page }, testInfo) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    const results = [];
    for (const viewport of VIEWPORTS) {
      results.push(await runViewport(page, viewport, testInfo.project.name));
    }

    writeJson("responsive_results.json", {
      wave: WAVE,
      final_status: "GREEN_RESPONSIVE_ESTIMATE_TO_PROJECT_EXECUTION_PROCUREMENT_HANDOFF_READY",
      browser_project: testInfo.project.name,
      viewports_checked: results.length,
      mobile_passed: results.some((result) => result.viewport === "mobile"),
      tablet_passed: results.some((result) => result.viewport === "tablet"),
      desktop_passed: results.some((result) => result.viewport === "desktop"),
      no_internal_keys: results.every((result) => result.no_internal_keys),
      no_mojibake: results.every((result) => result.no_mojibake),
      results,
      fake_green_claimed: false,
    });
  });
});
