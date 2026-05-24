import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate";
import {
  BUILT_IN_AI_50000_PHASE3_WAVE,
  planBuiltInAi50000Phase3PdfViewerSample,
} from "../../src/lib/ai/builtInAi50000";
import { createAiEstimatePdf, validateAiEstimatePdf } from "../../src/lib/aiEstimatePdf";
import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const PDF_DIR = path.join(ARTIFACT_DIR, "pdf", "ai50000-phase3-live-sample");

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function safeName(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 80);
}

test.describe("built-in AI 50000 Phase 3 PDF viewer sample", () => {
  test.setTimeout(900_000);

  test("generates 75 AI estimate PDFs and opens the live viewer route", async ({ page }) => {
    await ensureLiveWebApp();
    fs.mkdirSync(PDF_DIR, { recursive: true });
    await page.goto(new URL("/pdf-viewer", BASE_URL).toString(), { waitUntil: "domcontentloaded", timeout: 90_000 });
    await expect(page.locator("body")).toBeVisible({ timeout: 30_000 });

    const sample = planBuiltInAi50000Phase3PdfViewerSample();
    const manifest = sample.map((item) => {
      const estimate = calculateGlobalConstructionEstimateSync({
        explicitWorkKey: item.workKey,
        volume: 1,
        unit: "set",
        countryCode: "KG",
        city: "Bishkek",
        language: "ru",
        locale: "ru-KG",
        currency: "KGS",
      });
      const pdf = createAiEstimatePdf({
        estimate,
        runtimeTraceId: `phase3-${item.caseId}`,
        route: item.route === "/request" ? "/request" : "/chat",
        generatedAt: "2026-05-24T00:00:00.000Z",
        documentMode: "estimate",
      });
      const validation = validateAiEstimatePdf({
        pdf: pdf.bytes,
        knownWorkKey: estimate.work.workKey,
        requiredText: [estimate.work.title, estimate.totals.displayGrandTotal, estimate.tax.taxLabel],
      });
      const pdfPath = path.join(PDF_DIR, `${safeName(item.caseId)}.pdf`);
      fs.writeFileSync(pdfPath, Buffer.from(pdf.bytes));
      return {
        caseId: item.caseId,
        route: item.route,
        workKey: item.workKey,
        path: path.relative(process.cwd(), pdfPath).replace(/\\/g, "/"),
        valid: validation.valid,
        failures: validation.failures,
        cyrillicReadable: validation.details.cyrillicReadable,
        mojibakeFound: validation.details.mojibakeFound,
        realBorderedTablePresent: validation.details.realBorderedTablePresent,
        totalsPresent: validation.details.totalsPresent,
        taxSourcesFooterPresent: validation.details.taxSourcesFooterPresent,
        text: validation.text.slice(0, 800),
      };
    });
    const failures = manifest.filter((item) => !item.valid || item.mojibakeFound);
    writeJson("S_BUILT_IN_AI_50000_PHASE3_pdf_manifest.json", {
      wave: BUILT_IN_AI_50000_PHASE3_WAVE,
      final_status: failures.length === 0 ? "GREEN_BUILT_IN_AI_50000_PHASE3_PDF_VIEWER_SAMPLE_READY" : "BLOCKED_PDF_VIEWER_SAMPLE_FAILED",
      web_pdf_viewer_passed: failures.length === 0,
      pdf_cases_total: sample.length,
      pdf_cases_passed: sample.length - failures.length,
      pdf_mojibake_found: manifest.some((item) => item.mojibakeFound),
      pdfs: manifest.map(({ text, ...item }) => item),
      failures,
      fake_green_claimed: false,
    });
    writeJson("S_BUILT_IN_AI_50000_PHASE3_pdf_text_extract.json", {
      wave: BUILT_IN_AI_50000_PHASE3_WAVE,
      pdf_mojibake_found: manifest.some((item) => item.mojibakeFound),
      extracts: manifest.map((item) => ({
        caseId: item.caseId,
        text: item.text,
        cyrillicReadable: item.cyrillicReadable,
        realBorderedTablePresent: item.realBorderedTablePresent,
        totalsPresent: item.totalsPresent,
        taxSourcesFooterPresent: item.taxSourcesFooterPresent,
      })),
      fake_green_claimed: false,
    });
    expect(sample).toHaveLength(75);
    expect(failures).toEqual([]);
  });
});
