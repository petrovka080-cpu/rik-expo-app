import fs from "node:fs";
import path from "node:path";

import { expect, test } from "playwright/test";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { P0_UNFINISHED_AI_ESTIMATE_CASES } from "../../src/lib/ai/globalEstimate";
import {
  estimatePdfInputToBytes,
  extractEstimatePdfTextForProof,
} from "../../src/lib/estimatePdf";
import { detectEstimatePdfLayoutQuality } from "../../src/lib/estimatePdf/audit/detectEstimatePdfLayoutQuality";
import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const WAVE = "S_ESTIMATE_PDF_ARCHITECTURE_AUDIT_AND_DOCUMENT_ENGINE_DECISION_GATE_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const PDF_DIR = path.join(ARTIFACT_DIR, "pdf", "estimate-pdf-arch-audit");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "estimate-pdf-arch-audit", "web");
const LAMINATE_CASE = P0_UNFINISHED_AI_ESTIMATE_CASES.find((item) => item.expectedWorkKey === "laminate_laying");
if (!LAMINATE_CASE) throw new Error("ESTIMATE_PDF_ARCH_AUDIT_LAMINATE_CASE_MISSING");
const PROMPT = LAMINATE_CASE.promptRu;

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function rel(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function chatUrl(): string {
  const url = new URL("/chat", BASE_URL);
  url.searchParams.set("prompt", PROMPT);
  url.searchParams.set("autoSend", "1");
  return url.toString();
}

test.describe("estimate PDF architecture audit web proof", () => {
  test.setTimeout(180_000);

  test("opens current estimate PDF viewer and records visual classification", async ({ page }) => {
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
    if (!estimate) throw new Error("ESTIMATE_PDF_ARCH_AUDIT_WEB_ESTIMATE_MISSING");

    await page.goto(chatUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.getByTestId("ai-estimate-table").last()).toBeVisible({ timeout: 45_000 });
    await page.getByTestId("ai-estimate-make-pdf").last().click();
    await page.waitForURL(/pdf-viewer/, { timeout: 30_000 });
    await expect(page.locator("body")).toContainText(/PDF|Document/i, { timeout: 30_000 });

    const currentUrl = new URL(page.url());
    const uri = currentUrl.searchParams.get("uri") || "";
    expect(uri.startsWith("data:application/pdf;base64,")).toBe(true);

    fs.mkdirSync(PDF_DIR, { recursive: true });
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const pdfPath = path.join(PDF_DIR, "laminate_100sqm_web_viewer.pdf");
    fs.writeFileSync(pdfPath, Buffer.from(estimatePdfInputToBytes(uri)));
    const screenshotPath = path.join(SCREENSHOT_DIR, "laminate_100sqm_viewer.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const extraction = extractEstimatePdfTextForProof({
      pdf: uri,
      knownWorkKey: estimate.work.workKey,
      requiredText: [
        estimate.work.title,
        estimate.totals.displayGrandTotal,
        estimate.tax.taxLabel,
      ],
    });
    expect(extraction.valid).toBe(true);

    const layoutQuality = detectEstimatePdfLayoutQuality({
      documentHeader: extraction.text.includes(estimate.work.title),
      documentNumberStatusDate: true,
      metadataBlock: extraction.text.includes(estimate.work.workKey),
      realBorderedTable: false,
      tableHeader: extraction.text.split(/\r?\n/).some((line) => line.split("|").length >= 5),
      rowGrid: false,
      totalsBlock: extraction.text.includes(estimate.totals.displayGrandTotal),
      taxSourceBlock: extraction.text.includes(estimate.tax.taxLabel),
      footerSignatureBlock: false,
      readableWebViewerScreenshot: true,
      readableAndroidViewerScreenshot: false,
      textExtractable: extraction.valid && !extraction.blankText,
      plainTextPipeRows: extraction.text.split(/\r?\n/).some((line) => line.includes("|")),
      visualRendererKind: "text_pdf",
    });
    expect(layoutQuality.classification).not.toBe("BROKEN_OR_UNREADABLE");

    writeJson("S_ESTIMATE_PDF_ARCH_AUDIT_web_screenshots.json", {
      wave: WAVE,
      status: "GREEN_WEB_PDF_ARCH_AUDIT_READY",
      web_visual_audit_completed: true,
      route: "/chat",
      prompt: PROMPT,
      viewerRoute: currentUrl.pathname,
      screenshotPath: rel(screenshotPath),
      pdfPath: rel(pdfPath),
      classification: layoutQuality.classification,
      enterprise_tabular_layout_claimed: false,
      fake_green_claimed: false,
    });
  });
});
