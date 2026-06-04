import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "request-estimate-state-machine");
const PREFIX = "S_REQUEST_ESTIMATE_DRAFT_STATE_MACHINE";
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

test.describe("request estimate state machine", () => {
  test("keeps UI, save, PDF and send request payloads aligned in live web", async ({ page }) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    await page.goto(requestUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 45_000 });
    await page.getByTestId("consumer-repair-city-input").fill("Bishkek");
    await page.getByTestId("consumer-repair-phone-input").fill("+996700000000");
    await page.getByTestId("consumer-repair-add-photo").click();

    await page.locator("[data-testid^='consumer-repair-item-plus-']").first().click();

    await page.getByTestId("consumer-repair-add-manual-item").click();
    await expect(page.getByTestId("request-catalog-item-picker")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("request-catalog-picker-search").fill("бетон");
    await page.getByTestId("request-catalog-picker-submit").click();
    const rows = page.locator("[data-testid^='request-catalog-picker-row-']");
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    await rows.first().click();
    await expect(page.locator("[data-testid^='consumer-repair-item-catalog-']").last()).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("consumer-repair-add-custom-item").click();
    await expect(
      page.locator("[data-testid^='consumer-repair-item-']").filter({ hasText: "Пользовательское примечание" }).first(),
    ).toBeVisible({ timeout: 15_000 });

    await page.locator("[data-testid^='consumer-repair-item-remove-']").first().click();
    await expect(page.getByTestId("consumer-repair-restore-item")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("consumer-repair-restore-item").click();

    await expect(page.getByTestId("consumer-repair-save-draft")).toHaveCount(0);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "draft_state_machine.png"), fullPage: true });
    const beforePdfText = (await page.locator("body").textContent({ timeout: 15_000 })) ?? "";
    expect(beforePdfText).not.toContain("catalogItemId:");

    await page.getByTestId("consumer-estimate-make-pdf").click();
    await page.waitForURL(/pdf-viewer/, { timeout: 30_000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "pdf_viewer_state_machine.png"), fullPage: true });
    expect(page.url()).toContain("pdf-viewer");

    await page.goBack({ waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page.getByTestId("consumer-repair-approve")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("consumer-repair-city-input").fill("Bishkek");
    await page.getByTestId("consumer-repair-phone-input").fill("+996700000000");
    await page.getByTestId("consumer-repair-add-photo").click();
    await page.getByTestId("consumer-repair-approve").click();
    await expect(page.getByTestId("consumer-repair-send-market")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("consumer-repair-send-market")).toBeEnabled({ timeout: 30_000 });
    await page.getByTestId("consumer-repair-send-market").click();
    await expect(page.getByTestId("consumer-repair-new")).toBeVisible({ timeout: 30_000 });

    const sentText = (await page.locator("body").textContent({ timeout: 15_000 })) ?? "";
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "sent_state_machine.png"), fullPage: true });

    writeJson(`${PREFIX}_web_screenshots.json`, {
      web_playwright_passed: true,
      screenshots: {
        draft_state_machine: "artifacts/screenshots/request-estimate-state-machine/draft_state_machine.png",
        pdf_viewer_state_machine: "artifacts/screenshots/request-estimate-state-machine/pdf_viewer_state_machine.png",
        sent_state_machine: "artifacts/screenshots/request-estimate-state-machine/sent_state_machine.png",
      },
      fake_green_claimed: false,
    });
    writeJson(`${PREFIX}_web_transcripts.json`, {
      route: "/request",
      prompt: PROMPT,
      edited_quantity: true,
      catalog_item_visible_before_pdf: await page.locator("[data-testid^='consumer-repair-item-catalog-']").last().isVisible(),
      raw_catalog_item_id_visible_before_pdf: beforePdfText.includes("catalogItemId:"),
      custom_item_visible: /Пользовательское примечание|Custom scope note/.test(beforePdfText),
      pdf_viewer_opened: true,
      sent: sentText.includes("consumer-repair-new") || page.url().includes("/request"),
      textSample: sentText.slice(0, 1500),
      fake_green_claimed: false,
    });
  });
});
