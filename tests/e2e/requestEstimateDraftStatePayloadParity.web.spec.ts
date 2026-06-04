import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "request-estimate-state-payload");
const PREFIX = "S_REQUEST_ESTIMATE_DRAFT_STATE_PAYLOAD";
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

test.describe("request estimate draft state payload parity", () => {
  test("keeps request draft, catalog selection and PDF action coherent in live web", async ({ page }) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    await page.goto(requestUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("consumer-estimate-make-pdf")).toBeVisible({ timeout: 20_000 });

    await page.getByTestId("consumer-repair-add-manual-item").click();
    await expect(page.getByTestId("request-catalog-item-picker")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("request-catalog-picker-search").fill("бетон");
    await page.getByTestId("request-catalog-picker-submit").click();
    const rows = page.locator("[data-testid^='request-catalog-picker-row-']");
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    await rows.first().click();
    await expect(page.locator("[data-testid^='consumer-repair-item-catalog-']").last()).toBeVisible({ timeout: 15_000 });
    const beforePdfText = (await page.locator("body").textContent({ timeout: 15_000 })) ?? "";
    expect(beforePdfText).not.toContain("catalogItemId:");
    expect(beforePdfText).not.toMatch(/Backend global estimate|Grand total|Human confirmation/i);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "draft_catalog_payload.png"), fullPage: true });

    await page.getByTestId("consumer-estimate-make-pdf").click();
    await page.waitForURL(/pdf-viewer/, { timeout: 30_000 });
    expect(page.url()).toContain("pdf-viewer");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "pdf_viewer_payload.png"), fullPage: true });

    writeJson(`${PREFIX}_web_screenshots.json`, {
      web_playwright_passed: true,
      screenshots: {
        draft_catalog_payload: "artifacts/screenshots/request-estimate-state-payload/draft_catalog_payload.png",
        pdf_viewer_payload: "artifacts/screenshots/request-estimate-state-payload/pdf_viewer_payload.png",
      },
      fake_green_claimed: false,
    });
    writeJson(`${PREFIX}_web_transcripts.json`, {
      route: "/request",
      prompt: PROMPT,
      catalog_item_visible_before_pdf: await page.locator("[data-testid^='consumer-repair-item-catalog-']").last().isVisible(),
      raw_catalog_item_id_visible_before_pdf: beforePdfText.includes("catalogItemId:"),
      pdf_viewer_opened: true,
      textSample: beforePdfText.slice(0, 1500),
      fake_green_claimed: false,
    });
  });
});
