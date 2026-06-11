import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const WAVE = "S_ESTIMATE_TO_PROJECT_EXECUTION_PROCUREMENT_HANDOFF";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts", WAVE);
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "web");
const QUERY = "\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f \u043a\u0440\u043e\u0432\u043b\u0438";
const QUANTITY_TEXT = "120 \u043c2";

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

async function prepareSelectedWorkDraft(page: Page): Promise<void> {
  await page.goto(requestUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page.getByTestId("consumer-repair-screen")).toBeVisible({ timeout: 45_000 });

  await page.getByTestId("consumer-repair-problem-input").fill(QUERY);
  await expect(page.getByTestId("consumer-repair-work-suggestions")).toBeVisible({ timeout: 30_000 });
  const suggestions = page.locator('[data-testid^="consumer-repair-work-suggestion-"]');
  await expect(suggestions.first()).toBeVisible({ timeout: 30_000 });
  await suggestions.first().click();
  await expect(page.getByTestId("consumer-repair-selected-work")).toHaveCount(0);

  await page.getByTestId("consumer-repair-problem-input").type(QUANTITY_TEXT);
  await page.getByTestId("consumer-repair-prepare-draft").click();
  await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("estimate-project-handoff-actions")).toBeVisible({ timeout: 30_000 });
}

async function previewText(page: Page): Promise<string> {
  return (await page.getByTestId("project-execution-preview").textContent({ timeout: 30_000 })) ?? "";
}

test.describe("estimate to project execution procurement handoff web proof", () => {
  test.setTimeout(240_000);

  test("creates a project preview and opens procurement material handoff from a structured request estimate", async ({ page }, testInfo) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    await prepareSelectedWorkDraft(page);
    await expect(page.getByTestId("project-execution-preview")).toHaveCount(0);

    await page.getByTestId("consumer-estimate-create-project").click();
    await expect(page.getByTestId("project-execution-preview")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("project-execution-work-packages")).toBeVisible();
    await expect(page.getByTestId("project-execution-tasks")).toBeVisible();
    await expect(page.getByTestId("project-execution-procurement-items")).toBeVisible();

    const createdPreview = await previewText(page);
    expect(createdPreview).toMatch(/[\u0400-\u04ff]/);
    expect(createdPreview).toContain("\u0417\u0430\u043a\u0443\u043f\u043a\u0430");
    expect(hasInternalKey(createdPreview)).toBe(false);
    expect(hasMojibake(createdPreview)).toBe(false);

    await page.getByTestId("consumer-estimate-send-procurement").click();
    await expect(page.getByTestId("project-execution-procurement-items")).toBeVisible({ timeout: 30_000 });
    const procurementText = (await page.getByTestId("project-execution-procurement-items").textContent()) ?? "";
    expect(procurementText).toMatch(/[\u0400-\u04ff]/);
    expect(hasInternalKey(procurementText)).toBe(false);
    expect(hasMojibake(procurementText)).toBe(false);

    await page.getByTestId("consumer-estimate-open-material-list").click();
    await expect(page.getByTestId("project-execution-procurement-items")).toBeVisible({ timeout: 30_000 });

    const screenshot = path.join(SCREENSHOT_DIR, `${testInfo.project.name}_project_execution_handoff.png`);
    await page.screenshot({ path: screenshot, fullPage: true });

    writeJson("web_results.json", {
      wave: WAVE,
      final_status: "GREEN_WEB_ESTIMATE_TO_PROJECT_EXECUTION_PROCUREMENT_HANDOFF_READY",
      browser_project: testInfo.project.name,
      route: "/request",
      selected_work_smart_search_used: true,
      structured_estimate_actions_visible: true,
      create_project_clicked: true,
      project_execution_preview_visible: true,
      work_packages_visible: true,
      tasks_visible: true,
      procurement_items_visible: true,
      send_to_procurement_clicked: true,
      material_list_opened: true,
      no_internal_keys: true,
      no_mojibake: true,
      screenshot: rel(screenshot),
      fake_green_claimed: false,
    });
  });
});
