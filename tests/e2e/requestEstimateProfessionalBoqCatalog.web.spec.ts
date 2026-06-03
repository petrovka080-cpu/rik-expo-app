import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "request-estimate-boq-catalog");
const PREFIX = "S_REQUEST_AI_ESTIMATE_BOQ_CATALOG";
const PROMPT = "смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м";

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function requestUrl(prompt = PROMPT, autoPdf = false): string {
  const url = new URL("/request", BASE_URL);
  url.searchParams.set("prompt", prompt);
  url.searchParams.set(autoPdf ? "autoPdf" : "autoPrepare", "1");
  return url.toString();
}

test.describe("request AI estimate professional BOQ catalog integration", () => {
  test("validates foundation BOQ localization, manual catalog item and PDF viewer", async ({ page }) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    await page.goto(requestUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 45_000 });

    const bodyText = (await page.locator("body").textContent({ timeout: 30_000 })) ?? "";
    expect(bodyText).toContain("Коротко:");
    expect(bodyText).not.toContain("Черновик сметы");
    expect(bodyText).toContain("Ориентировочный объём бетона: 32,64 м³");
    expect(bodyText).toContain("Материалы");
    expect(bodyText).toContain("Работы");
    expect(bodyText).toContain("Оборудование / доставка");
    expect(bodyText).not.toMatch(/Backend global estimate|Grand total|Confidence|Human confirmation/i);
    expect(bodyText).not.toMatch(/\b(linear_m|sq_m|cubic_m|pcs)\b/);
    expect(bodyText).not.toContain("Строительные работы");

    const itemCount = await page.locator("[data-testid^='consumer-repair-item-']").count();
    expect(itemCount).toBeGreaterThanOrEqual(12);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "foundation_boq.png"), fullPage: true });

    await page.getByTestId("consumer-repair-add-manual-item").click();
    await expect(page.getByTestId("request-catalog-item-picker")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("request-catalog-picker-search").fill("бетон");
    await page.getByTestId("request-catalog-picker-submit").click();
    const rows = page.locator("[data-testid^='request-catalog-picker-row-']");
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    await rows.first().click();

    await expect(page.getByText(/catalogItemId:/)).toBeVisible({ timeout: 15_000 });
    const plusButtons = page.locator("[data-testid^='consumer-repair-item-plus-']");
    await plusButtons.last().click();
    const afterCatalogText = (await page.locator("body").textContent({ timeout: 15_000 })) ?? "";
    expect(afterCatalogText).toContain("catalogItemId:");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "manual_catalog_item.png"), fullPage: true });

    await page.getByTestId("consumer-estimate-make-pdf").click();
    await page.waitForURL(/pdf-viewer/, { timeout: 30_000 });
    expect(page.url()).toContain("pdf-viewer");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "pdf_viewer.png"), fullPage: true });

    writeJson(`${PREFIX}_web_screenshots.json`, {
      web_playwright_passed: true,
      pdf_viewer_web_passed: true,
      screenshots: {
        foundation_boq: "artifacts/screenshots/request-estimate-boq-catalog/foundation_boq.png",
        manual_catalog_item: "artifacts/screenshots/request-estimate-boq-catalog/manual_catalog_item.png",
        pdf_viewer: "artifacts/screenshots/request-estimate-boq-catalog/pdf_viewer.png",
      },
      fake_green_claimed: false,
    });
    writeJson(`${PREFIX}_web_transcripts.json`, {
      route: "/request",
      prompt: PROMPT,
      russian_summary_visible: true,
      english_debug_text_found: false,
      raw_unit_labels_found: false,
      foundation_boq_rows_visible: itemCount,
      manual_catalog_item_selected: true,
      pdf_viewer_opened: true,
      textSample: afterCatalogText.slice(0, 1500),
      fake_green_claimed: false,
    });
  });
});
