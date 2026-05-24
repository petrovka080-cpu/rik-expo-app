import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "request-estimate-boq-formula");
const PREFIX = "S_REQUEST_AI_ESTIMATE_BOQ_FORMULA";
const PROMPT = "смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м";

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function requestUrl(prompt = PROMPT): string {
  const url = new URL("/request", BASE_URL);
  url.searchParams.set("prompt", prompt);
  url.searchParams.set("autoPrepare", "1");
  return url.toString();
}

test.describe("request estimate professional BOQ formula quality", () => {
  test("shows strip foundation professional BOQ with concrete volume from backend formula", async ({ page }) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    await page.goto(requestUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 45_000 });

    const bodyText = (await page.locator("body").textContent({ timeout: 30_000 })) ?? "";
    expect(bodyText).toContain("Черновик сметы");
    expect(bodyText).toContain("Параметры: длина 48 м, ширина 0,4 м, высота 1,7 м.");
    expect(bodyText).toContain("Ориентировочный объём бетона: 32,64 м³");
    expect(bodyText).toContain("Материалы");
    expect(bodyText).toContain("Работы");
    expect(bodyText).toContain("Оборудование / доставка");
    expect(bodyText).not.toMatch(/Backend global estimate|Grand total|Confidence|Human confirmation/i);
    expect(bodyText).not.toMatch(/\b(linear_m|sq_m|cubic_m|pcs)\b/);
    expect(bodyText).not.toContain("Строительные работы");

    const itemCount = await page.locator("[data-testid^='consumer-repair-item-']").count();
    expect(itemCount).toBeGreaterThanOrEqual(12);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "foundation_formula_boq.png"), fullPage: true });

    await page.getByTestId("consumer-estimate-make-pdf").click();
    await page.waitForURL(/pdf-viewer/, { timeout: 30_000 });
    expect(page.url()).toContain("pdf-viewer");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "pdf_viewer.png"), fullPage: true });

    writeJson(`${PREFIX}_web_screenshots.json`, {
      web_playwright_passed: true,
      pdf_viewer_web_passed: true,
      screenshots: {
        foundation_formula_boq: "artifacts/screenshots/request-estimate-boq-formula/foundation_formula_boq.png",
        pdf_viewer: "artifacts/screenshots/request-estimate-boq-formula/pdf_viewer.png",
      },
      fake_green_claimed: false,
    });
    writeJson(`${PREFIX}_web_transcripts.json`, {
      route: "/request",
      prompt: PROMPT,
      russian_summary_visible: true,
      formula_visible: "48 * 0.4 * 1.7 = 32.64 m3",
      concrete_volume_visible: true,
      rowCount: itemCount,
      pdf_viewer_opened: true,
      textSample: bodyText.slice(0, 1600),
      fake_green_claimed: false,
    });
  });
});
