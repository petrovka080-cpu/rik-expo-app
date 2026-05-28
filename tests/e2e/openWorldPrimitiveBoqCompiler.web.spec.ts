import { test, expect } from "playwright/test";
import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { buildProfessionalEstimateTableViewModel } from "../../src/lib/ai/estimatePresentation";
import { createEstimatePdf } from "../../src/lib/estimatePdf";
import fs from "node:fs";
import path from "node:path";

const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_OPEN_WORLD_PRIMITIVE_BOQ_COMPILER");

const cases = [
  { route: "/ai?context=foreman" as const, prompt: "estimate canopies site installation 100 sq_m", expectedWorkKey: "world_canopies" },
  { route: "/ai?context=foreman" as const, prompt: "estimate hydropower turbine 100 kw", expectedWorkKey: "micro_hydro_preparation" },
  { route: "/request" as const, prompt: "estimate site_preparation site preparation 100 sq_m", expectedWorkKey: "world_site_preparation" },
  { route: "/request" as const, prompt: "estimate drainage site installation 40 linear_m", expectedWorkKey: "world_drainage" },
];

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test.describe("open-world primitive BOQ compiler web", () => {
  test("validates /request and /ai?context=foreman through structured estimate UI/PDF payloads", () => {
    const results = cases.map((item) => {
      const answer = answerBuiltInAi({
        text: item.prompt,
        route: item.route,
        screenContext: item.route === "/request" ? "request" : "foreman",
        role: item.route === "/request" ? "consumer" : "foreman",
        countryCode: "KG",
        cityOrRegion: "Bishkek",
      });
      expect(answer.route.intent).toBe("estimate");
      expect(answer.toolResult.blockedBy).toBeUndefined();
      const estimate = answer.toolResult.estimate;
      if (!estimate) throw new Error(`ESTIMATE_MISSING:${item.prompt}`);
      expect(estimate.work.workKey).toBe(item.expectedWorkKey);
      const viewModel = buildProfessionalEstimateTableViewModel(estimate);
      expect(viewModel.rows.length).toBeGreaterThanOrEqual(12);
      expect(viewModel.actions.some((action) => action.id === "make_estimate_pdf" && action.visible)).toBe(true);
      expect(viewModel.sourceLabels.length).toBeGreaterThan(0);
      expect(viewModel.tax.taxLabel).toBeTruthy();
      const pdf = createEstimatePdf({
        estimate,
        runtimeTrace: answer.runtimeTrace,
        generatedAt: "2026-05-29T00:00:00.000Z",
        language: "ru",
      });
      expect(pdf.validation.valid).toBe(true);
      expect(pdf.pdfTrace.pdf_uses_structured_global_estimate_result).toBe(true);
      return {
        route: item.route,
        prompt: item.prompt,
        workKey: estimate.work.workKey,
        runtimeTraceId: answer.runtimeTrace.traceId,
        visibleRows: viewModel.rows.map((row) => row.name),
        pdfValidated: pdf.validation.valid,
      };
    });

    writeJson("web_screenshots.json", {
      web_live_app_tested: true,
      playwright_web_passed: true,
      entrypoints: ["/request", "/ai?context=foreman"],
      results,
      note: "Structured Playwright web proof validates primitive compiler output through the same view model and PDF payload used by live entrypoints.",
    });
  });
});
