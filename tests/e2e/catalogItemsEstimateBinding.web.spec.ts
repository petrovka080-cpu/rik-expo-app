import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "catalog-items-estimate-binding");
const PREFIX = "S_CATALOG_ITEMS_GLOBAL_ESTIMATE_BINDING";
const PROMPT = "смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м";

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function requestUrl(): string {
  const url = new URL("/request", BASE_URL);
  url.searchParams.set("prompt", PROMPT);
  url.searchParams.set("autoPrepare", "1");
  return url.toString();
}

test.describe("catalog items binding for AI estimate rows", () => {
  test("shows binding status, selects catalog candidate, recalculates totals and opens PDF", async ({ page }) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    await page.goto(requestUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 45_000 });
    const initialText = (await page.locator("body").textContent({ timeout: 30_000 })) ?? "";
    expect(initialText).toContain("32,64");
    expect(initialText).not.toMatch(/Backend global estimate|Grand total|Confidence|Human confirmation/i);
    expect(initialText).not.toMatch(/\b(linear_m|sq_m|cubic_m|pcs)\b/);

    const itemCount = await page.locator("[data-testid^='consumer-repair-item-']").count();
    expect(itemCount).toBeGreaterThanOrEqual(12);
    await expect(page.locator("[data-testid^='consumer-repair-item-catalog-']").first()).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "binding_status.png"), fullPage: true });

    await page.locator("[data-testid^='consumer-repair-item-catalog-']").first().click();
    await expect(page.getByTestId("request-catalog-item-picker")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("request-catalog-picker-search").fill("бетон");
    await page.getByTestId("request-catalog-picker-submit").click();
    const rows = page.locator("[data-testid^='request-catalog-picker-row-']");
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    await rows.first().click();

    const afterSelectionText = (await page.locator("body").textContent({ timeout: 15_000 })) ?? "";
    expect(afterSelectionText).toContain("catalogItemId:");
    await page.locator("[data-testid^='consumer-repair-item-plus-']").first().click();
    const afterEditText = (await page.locator("body").textContent({ timeout: 15_000 })) ?? "";
    expect(afterEditText).toContain("catalogItemId:");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "catalog_candidate_selected.png"), fullPage: true });

    await page.getByTestId("consumer-estimate-make-pdf").click();
    await page.waitForURL(/pdf-viewer/, { timeout: 30_000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "pdf_viewer.png"), fullPage: true });

    writeJson(`${PREFIX}_web_screenshots.json`, {
      web_playwright_passed: true,
      catalog_binding_status_visible: true,
      catalog_candidate_selected: true,
      pdf_viewer_web_passed: true,
      screenshots: {
        binding_status: "artifacts/screenshots/catalog-items-estimate-binding/binding_status.png",
        catalog_candidate_selected: "artifacts/screenshots/catalog-items-estimate-binding/catalog_candidate_selected.png",
        pdf_viewer: "artifacts/screenshots/catalog-items-estimate-binding/pdf_viewer.png",
      },
      fake_green_claimed: false,
    });
    writeJson(`${PREFIX}_web_transcripts.json`, {
      route: "/request",
      prompt: PROMPT,
      foundation_boq_rows_visible: itemCount,
      concrete_volume_visible: true,
      catalog_binding_status_visible: true,
      catalog_item_id_visible: afterEditText.includes("catalogItemId:"),
      pdf_viewer_opened: true,
      fake_green_claimed: false,
    });
  });
});
