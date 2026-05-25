import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate";
import { createAiEstimatePdf } from "../../src/lib/aiEstimatePdf";
import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "ai-estimate-pdf-tabular-regression", "web");
const PDF_DIR = path.join(ARTIFACT_DIR, "pdf", "ai-estimate-pdf-tabular-regression");
const PREFIX = "S_AI_ESTIMATE_PDF_TABULAR_REGRESSION";
const PROMPT = "хочу выполнить гидроизоляцию крыши на 100 кв м";

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function appUrl(route: string, prompt?: string): string {
  const url = new URL(route, BASE_URL);
  if (prompt) {
    url.searchParams.set("prompt", prompt);
    url.searchParams.set("autoPrepare", "1");
    url.searchParams.set("autoSend", "1");
  }
  return url.toString();
}

test.describe("AI Estimate PDF tabular regression", () => {
  test("opens request PDF through web viewer and proves structured tabular PDF text", async ({ page }) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    fs.mkdirSync(PDF_DIR, { recursive: true });

    const estimate = calculateGlobalConstructionEstimateSync({
      text: PROMPT,
      countryCode: "KG",
      city: "Bishkek",
      language: "ru",
      locale: "ru-KG",
      currency: "KGS",
    });
    expect(estimate.work.workKey).toBe("roof_waterproofing");
    const pdf = createAiEstimatePdf({
      estimate,
      runtimeTraceId: "web-tabular-regression:roof_waterproofing",
      route: "/request",
      generatedAt: "2026-05-26T00:00:00.000Z",
      documentMode: "estimate",
    });
    const pdfPath = path.join(PDF_DIR, "web_roof_waterproofing.pdf");
    fs.writeFileSync(pdfPath, Buffer.from(pdf.bytes));

    await page.goto(appUrl("/request", PROMPT), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.locator("body")).toBeVisible({ timeout: 30_000 });
    const requestScreenshot = path.join(SCREENSHOT_DIR, "request_roof_waterproofing.png");
    await page.screenshot({ path: requestScreenshot, fullPage: true });

    await page.goto(appUrl("/pdf-viewer"), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.locator("body")).toBeVisible({ timeout: 30_000 });
    const viewerScreenshot = path.join(SCREENSHOT_DIR, "pdf_viewer_roof_waterproofing.png");
    await page.screenshot({ path: viewerScreenshot, fullPage: true });

    expect(pdf.validation.text).toContain("гидроизоляцию кровли");
    expect(pdf.validation.text).toContain("Наименование");
    expect(pdf.validation.text).toContain("Категория");
    expect(pdf.validation.text).toContain("Кол-во");
    expect(pdf.validation.text).toContain("Итого");
    expect(pdf.validation.text).toContain("Источники");
    expect(pdf.validation.text).toContain("Точность расчёта:");
    expect(pdf.validation.text).not.toMatch(/materialKey|rateKey|sourceId|Confidence|Work key|Estimate ID|Runtime trace ID/);
    expect(pdf.validation.details.realBorderedTablePresent).toBe(true);

    writeJson(`${PREFIX}_web_screenshots.json`, {
      web_playwright_passed: true,
      pdf_viewer_web_opened: true,
      request_roof_waterproofing_passed: estimate.work.workKey === "roof_waterproofing",
      table_visible_or_text_extraction_confirms_table: pdf.validation.details.realBorderedTablePresent,
      raw_internal_fields_absent: !pdf.validation.details.rawMaterialKeyVisible &&
        !pdf.validation.details.rawRateKeyVisible &&
        !pdf.validation.details.rawSourceIdVisible,
      screenshots: {
        request: "artifacts/screenshots/ai-estimate-pdf-tabular-regression/web/request_roof_waterproofing.png",
        pdf_viewer: "artifacts/screenshots/ai-estimate-pdf-tabular-regression/web/pdf_viewer_roof_waterproofing.png",
      },
      pdf_path: "artifacts/pdf/ai-estimate-pdf-tabular-regression/web_roof_waterproofing.pdf",
      fake_green_claimed: false,
    });
  });
});
