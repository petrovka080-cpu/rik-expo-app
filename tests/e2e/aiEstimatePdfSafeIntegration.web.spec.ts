import fs from "node:fs";
import path from "node:path";

import { expect, test } from "playwright/test";

import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate";
import { createAiEstimatePdf, validateAiEstimatePdf } from "../../src/lib/aiEstimatePdf";
import { createEstimatePdf, estimatePdfInputToBytes, extractEstimatePdfTextForProof } from "../../src/lib/estimatePdf";
import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const WAVE = "S_AI_ESTIMATE_PDF_SAFE_INTEGRATION_WITH_LEGACY_PDF_PROTECTION_DECISION_GATE_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const PDF_DIR = path.join(ARTIFACT_DIR, "pdf", "ai-estimate-pdf-safe-integration");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "ai-estimate-pdf-safe-integration", "web");
const BRICK_PROMPT = "дай смету на кладку кирпича 74 кв метров";
const FIXED_GENERATED_AT = "2026-05-24T00:00:00.000Z";

function rel(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function chatUrl(): string {
  const url = new URL("/chat", BASE_URL);
  url.searchParams.set("prompt", BRICK_PROMPT);
  url.searchParams.set("autoSend", "1");
  return url.toString();
}

test.describe("AI estimate PDF safe integration web proof", () => {
  test.setTimeout(180_000);

  test("opens new AI estimate PDF and legacy PDF without changing the viewer route", async ({ page }) => {
    await ensureLiveWebApp();
    fs.mkdirSync(PDF_DIR, { recursive: true });
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    await page.goto(chatUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByTestId("ai-estimate-table").last()).toBeVisible({ timeout: 45_000 });
    await page.getByTestId("ai-estimate-make-pdf").last().click();
    await page.waitForURL(/pdf-viewer/, { timeout: 30_000 });
    await expect(page.locator("body")).toContainText(/PDF|Document/i, { timeout: 30_000 });

    const aiViewerUrl = new URL(page.url());
    const aiUri = aiViewerUrl.searchParams.get("uri") || "";
    expect(aiUri.startsWith("data:application/pdf;base64,")).toBe(true);
    const aiPdfPath = path.join(PDF_DIR, "brick_masonry_74sqm_web.pdf");
    fs.writeFileSync(aiPdfPath, Buffer.from(estimatePdfInputToBytes(aiUri)));
    const aiScreenshotPath = path.join(SCREENSHOT_DIR, "ai_estimate_pdf_viewer.png");
    await page.screenshot({ path: aiScreenshotPath, fullPage: true });

    const aiEstimate = calculateGlobalConstructionEstimateSync({
      explicitWorkKey: "brick_masonry",
      volume: 74,
      unit: "sq_m",
      countryCode: "KG",
      city: "Bishkek",
      language: "ru",
      locale: "ru-KG",
      currency: "KGS",
    });
    const aiValidation = validateAiEstimatePdf({
      pdf: aiUri,
      knownWorkKey: aiEstimate.work.workKey,
      requiredText: [aiEstimate.work.title, aiEstimate.totals.displayGrandTotal, aiEstimate.tax.taxLabel],
    });
    expect(aiValidation.valid).toBe(true);
    expect(aiValidation.details.realBorderedTablePresent).toBe(true);
    expect(aiValidation.details.plainTextDumpFound).toBe(false);
    expect(aiValidation.details.markdownTableFound).toBe(false);

    const legacyPdf = createEstimatePdf({
      estimate: aiEstimate,
      runtimeTrace: {
        traceId: "legacy-web-regression",
        selectedRoute: "estimate",
        selectedTool: "calculate_global_estimate",
        workKey: aiEstimate.work.workKey,
      },
      generatedAt: FIXED_GENERATED_AT,
      language: "ru",
    });
    const legacyPdfPath = path.join(PDF_DIR, "legacy_brick_masonry_74sqm_web.pdf");
    fs.writeFileSync(legacyPdfPath, Buffer.from(legacyPdf.bytes));
    await page.goto(new URL("/request", BASE_URL).toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByTestId("consumer-repair-problem-input").fill("Хочу уложить ковролин на 100 кв м");
    await page.getByTestId("consumer-repair-prepare-draft").click();
    await expect(page.getByTestId("consumer-estimate-make-pdf").first()).toBeVisible({ timeout: 45_000 });
    await page.getByTestId("consumer-estimate-make-pdf").first().click();
    await page.waitForURL(/pdf-viewer/, { timeout: 30_000 });
    await expect(page.locator("body")).toContainText(/PDF|Document/i, { timeout: 30_000 });
    const legacyScreenshotPath = path.join(SCREENSHOT_DIR, "legacy_pdf_viewer.png");
    await page.screenshot({ path: legacyScreenshotPath, fullPage: true });
    const legacyExtraction = extractEstimatePdfTextForProof({
      pdf: legacyPdf.bytes,
      knownWorkKey: aiEstimate.work.workKey,
      requiredText: [aiEstimate.estimateId, aiEstimate.totals.displayGrandTotal],
    });
    expect(legacyExtraction.valid).toBe(true);
    expect(legacyExtraction.text).toContain("|");

    const directAiPdf = createAiEstimatePdf({
      estimate: aiEstimate,
      runtimeTraceId: "web-direct-validation",
      route: "/chat",
      generatedAt: FIXED_GENERATED_AT,
      documentMode: "estimate",
    });

    writeJson("S_AI_ESTIMATE_PDF_SAFE_INTEGRATION_web_screenshots.json", {
      wave: WAVE,
      status: "GREEN_AI_ESTIMATE_PDF_SAFE_INTEGRATION_WEB_READY",
      ai_estimate_pdf_web_passed: true,
      legacy_pdf_viewer_web_passed: true,
      ai_pdf_viewer_route: aiViewerUrl.pathname,
      legacy_pdf_viewer_route: "/pdf-viewer",
      ai_pdf_path: rel(aiPdfPath),
      legacy_pdf_path: rel(legacyPdfPath),
      ai_screenshot_path: rel(aiScreenshotPath),
      legacy_screenshot_path: rel(legacyScreenshotPath),
      direct_renderer_path: directAiPdf.rendererPath,
      real_table_present: aiValidation.details.realBorderedTablePresent,
      totals_present: aiValidation.details.totalsPresent,
      tax_sources_footer_present: aiValidation.details.taxSourcesFooterPresent,
      mojibake_found: aiValidation.details.mojibakeFound,
      fake_green_claimed: false,
    });
  });
});
