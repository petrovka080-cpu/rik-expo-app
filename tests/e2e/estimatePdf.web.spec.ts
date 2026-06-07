import fs from "node:fs";
import path from "node:path";
import { test, expect } from "playwright/test";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { P0_UNFINISHED_AI_ESTIMATE_CASES } from "../../src/lib/ai/globalEstimate";
import { estimatePdfInputToBytes, extractEstimatePdfTextForProof } from "../../src/lib/estimatePdf";
import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const PDF_DIR = path.join(ARTIFACT_DIR, "pdf", "estimate-pdf-reality");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "estimate-pdf-reality");
const BRICK_CASE = P0_UNFINISHED_AI_ESTIMATE_CASES.find((testCase) => testCase.expectedWorkKey === "brick_masonry");
if (!BRICK_CASE) throw new Error("ESTIMATE_PDF_WEB_BRICK_CASE_MISSING");
const PROMPT = BRICK_CASE.promptRu;

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function chatUrl(): string {
  const url = new URL("/chat", BASE_URL);
  url.searchParams.set("prompt", PROMPT);
  url.searchParams.set("autoSend", "1");
  return url.toString();
}

test.describe("estimate PDF real binary web flow", () => {
  test.setTimeout(180_000);

  test("opens PDF viewer and extracts readable structured estimate text", async ({ page }) => {
    await ensureLiveWebApp();
    const expectedAnswer = answerBuiltInAi({
      text: PROMPT,
      screenContext: "chat",
      route: "/chat",
      role: "foreman",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    const estimate = expectedAnswer.toolResult.estimate;
    if (!estimate) throw new Error("ESTIMATE_PDF_WEB_EXPECTED_ESTIMATE_MISSING");
    const normalizeRequiredText = (value: string) => value.replace(/\u00A0/g, " ").replace(/\u00C2\s/g, " ");
    const requiredText = [
      estimate.work.title,
      estimate.sections.find((section) => section.type === "materials")?.rows[0]?.name ?? "",
      estimate.sections.find((section) => section.type === "labor")?.rows[0]?.name ?? "",
      estimate.totals.displayGrandTotal,
      estimate.tax.taxLabel,
      estimate.sources[0]?.label ?? "",
      estimate.confidence,
    ].filter(Boolean).map(normalizeRequiredText);

    await page.goto(chatUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByTestId("ai-estimate-table").last()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(estimate.sections[0].rows[0].name, { exact: false }).first()).toBeVisible();

    await page.getByTestId("ai-estimate-make-pdf").last().click();
    await page.waitForURL(/pdf-viewer/, { timeout: 30_000 });
    await expect(page.locator("body")).toContainText(/PDF|Document|СЃРјРµС‚|РЎРјРµС‚/i, { timeout: 30_000 });

    const currentUrl = new URL(page.url());
    const uri = currentUrl.searchParams.get("uri") || "";
    expect(uri.startsWith("data:application/pdf;base64,")).toBe(true);

    fs.mkdirSync(PDF_DIR, { recursive: true });
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const pdfPath = path.join(PDF_DIR, "brick_masonry_74sqm.pdf");
    fs.writeFileSync(pdfPath, Buffer.from(estimatePdfInputToBytes(uri)));
    const screenshotPath = path.join(SCREENSHOT_DIR, "brick_masonry_74sqm_viewer.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const extraction = extractEstimatePdfTextForProof({
      pdf: uri,
      knownWorkKey: estimate.work.workKey,
      requiredText,
    });
    expect(extraction.valid).toBe(true);
    expect(extraction.binaryHeader).toBe("%PDF-");
    expect(extraction.text).not.toContain(estimate.estimateId);
    expect(extraction.text).toContain(estimate.work.title);
    expect(extraction.text).toContain(estimate.totals.displayGrandTotal);
    expect(extraction.mojibakeFound).toBe(false);
    expect(extraction.blankText).toBe(false);

    writeJson("S_ESTIMATE_PDF_REAL_BINARY_web_screenshots.json", {
      wave: "S_ESTIMATE_PDF_REAL_BINARY_CYRILLIC_TABLE_VIEWER_POINT_OF_NO_RETURN",
      pdf_viewer_web_opened: true,
      playwright_web_passed: true,
      screenshotPath,
      pdfPath,
      url: currentUrl.pathname,
      fake_green_claimed: false,
    });
    writeJson("S_ESTIMATE_PDF_REAL_BINARY_pdf_manifest.json", {
      web_pdf: {
        id: "brick_masonry_74sqm",
        path: pdfPath,
        bytes: fs.statSync(pdfPath).size,
        valid: extraction.valid,
      },
    });
    writeJson("S_ESTIMATE_PDF_REAL_BINARY_pdf_text_extract.json", {
      brick_masonry_74sqm: extraction,
    });
  });
});
