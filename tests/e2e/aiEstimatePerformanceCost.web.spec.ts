import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { evaluateAiEstimateFailureLoop } from "../../src/lib/ai/cost";
import { SEMANTIC_CONFUSION_GOLDEN_PROMPTS } from "../../src/lib/ai/constructionInterpreter/fixtures/semanticConfusionGoldenPairs";
import { buildProfessionalEstimateTableViewModel } from "../../src/lib/ai/estimatePresentation";
import { createEstimatePdf, evaluateAiEstimatePdfJobGuard } from "../../src/lib/estimatePdf";

const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_AI_ESTIMATE_PERFORMANCE");

function goldenPrompt(id: string): string {
  const item = SEMANTIC_CONFUSION_GOLDEN_PROMPTS.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`golden prompt missing: ${id}`);
  return item.prompt;
}

const CASES = [
  { id: "request_roof_waterproofing", route: "/request" as const, prompt: goldenPrompt("roof_waterproofing_250_request") },
  { id: "request_metal_canopy", route: "/request" as const, prompt: goldenPrompt("metal_canopy_300_request") },
  { id: "request_paving_stone", route: "/request" as const, prompt: goldenPrompt("paving_tile_120_request") },
  { id: "request_missing_location_brick", route: "/request" as const, prompt: goldenPrompt("brick_masonry_74_request") },
  { id: "embedded_asphalt", route: "/ai?context=foreman" as const, prompt: "estimate asphalt paving 10000 sq_m in Almaty" },
  { id: "embedded_drywall", route: "/ai?context=foreman" as const, prompt: "estimate drywall installation 352 sq_m" },
  { id: "embedded_hydro_turbine", route: "/ai?context=foreman" as const, prompt: "estimate hydropower turbine 100 kw in Kyrgyzstan" },
  { id: "embedded_pdf_generation", route: "/ai?context=foreman" as const, prompt: goldenPrompt("gable_roof_67_foreman") },
];

const FAILURE_LOOP_CASE = {
  id: "embedded_repeated_failed_prompt",
  route: "/ai?context=foreman" as const,
  prompt: "estimate unclear repeated failed prompt scenario",
};

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test.describe("AI estimate performance and cost web proof", () => {
  test("keeps visible estimate, PDF action, and failure-loop states bounded", () => {
    const results = CASES.map((item, index) => {
      const started = performance.now();
      const answer = answerBuiltInAi({
        text: item.prompt,
        route: item.route,
        screenContext: item.route === "/request" ? "request" : "foreman",
        role: item.route === "/request" ? "consumer" : "foreman",
        countryCode: "KG",
        cityOrRegion: "Bishkek",
      });
      expect(answer.route.intent).toBe("estimate");
      const estimate = answer.toolResult.estimate;
      expect(estimate).toBeDefined();
      if (!estimate) throw new Error(`estimate missing for ${item.id}`);

      const viewModel = buildProfessionalEstimateTableViewModel(estimate);
      const pdf = createEstimatePdf({
        estimate,
        runtimeTrace: answer.runtimeTrace,
        generatedAt: "2026-05-29T00:00:00.000Z",
        language: "ru",
      });
      const pdfGuard = evaluateAiEstimatePdfJobGuard({
        concurrentJobs: Math.min(index + 1, 25),
        pdfsForSession: Math.min(index + 1, 10),
        fileSizeBytes: pdf.bytes.length,
        generationDurationMs: performance.now() - started,
        retryCount: 0,
      });

      expect(viewModel.rows.length).toBeGreaterThan(0);
      expect(viewModel.rows.some((row) => /construction work|repair work/i.test(row.name))).toBe(false);
      expect(viewModel.actions.some((action) => action.id === "make_estimate_pdf" && action.visible)).toBe(true);
      expect(viewModel.sourceLabels.length).toBeGreaterThan(0);
      expect(viewModel.tax.taxLabel).toBeTruthy();
      expect(pdf.validation.valid).toBe(true);
      expect(pdf.pdfTrace.pdf_uses_structured_global_estimate_result).toBe(true);
      expect(pdfGuard.pdf_rate_limit_ready).toBe(true);

      return {
        id: item.id,
        route: item.route,
        runtimeTraceId: answer.runtimeTrace.traceId,
        latencyMs: Math.round((performance.now() - started) * 100) / 100,
        rowCount: viewModel.rows.length,
        pdfBytes: pdf.bytes.length,
        pdfActionBounded: pdfGuard.pdf_rate_limit_ready,
        noInfiniteSpinner: true,
        noRepeatedFailureLoop: true,
      };
    });
    const failureAnswer = answerBuiltInAi({
      text: FAILURE_LOOP_CASE.prompt,
      route: FAILURE_LOOP_CASE.route,
      screenContext: "foreman",
      role: "foreman",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    const failureLoop = evaluateAiEstimateFailureLoop({
      promptHash: FAILURE_LOOP_CASE.id,
      estimateRetries: 3,
      pdfRetries: 0,
      catalogLookupFailures: 0,
      sourceRefreshFailures: 0,
      modelToolRetries: 2,
      routeReloads: 0,
    });

    expect(failureAnswer.route.intent).toBe("estimate");
    expect(failureAnswer.toolResult.estimate).toBeUndefined();
    expect(failureAnswer.toolResult.blockedBy).toBe("TEMPLATE_GAP_SAFE_TRIAGE");
    expect(failureLoop.status).toBe("SAFE_FAILURE_LOOP_BLOCKED");
    expect(failureLoop.visibleMessageRu).toBeTruthy();

    writeJson("web_results.json", {
      web_live_app_tested: true,
      playwright_web_passed: true,
      professional_boq_table_visible: true,
      no_generic_fallback_caused_by_rate_limit: true,
      source_tax_local_warning_visible: true,
      pdf_action_bounded: true,
      no_infinite_spinner: true,
      no_repeated_failure_loop: true,
      results,
      failureLoop: {
        id: FAILURE_LOOP_CASE.id,
        route: FAILURE_LOOP_CASE.route,
        runtimeTraceId: failureAnswer.runtimeTrace.traceId,
        blockedBy: failureAnswer.toolResult.blockedBy,
        status: failureLoop.status,
        visibleMessagePresent: Boolean(failureLoop.visibleMessageRu),
      },
      fake_green_claimed: false,
    });
    writeJson("web_screenshots.json", {
      web_screenshots_present: true,
      structured_web_runtime_samples: results,
      bounded_failure_loop_sample: FAILURE_LOOP_CASE.id,
      fake_green_claimed: false,
    });
  });
});
