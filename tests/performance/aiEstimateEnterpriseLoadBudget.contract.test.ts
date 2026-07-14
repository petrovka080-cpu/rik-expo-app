import { performance } from "node:perf_hooks";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import {
  AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY,
} from "../../src/lib/ai/globalEstimate";
import { buildProfessionalEstimateTableViewModel } from "../../src/lib/ai/estimatePresentation";
import { createEstimatePdf } from "../../src/lib/estimatePdf";

const CASES = [
  { route: "/request" as const, prompt: "estimate flooring floor_covering installation by standard_installation 100 sq_m in Bishkek" },
  { route: "/request" as const, prompt: "estimate paving_landscaping paving_stone laying by standard_installation 120 sq_m in Bishkek" },
  { route: "/ai?context=foreman" as const, prompt: "estimate canopies metal_canopy installation by steel_frame 80 sq_m in Bishkek" },
  { route: "/ai?context=foreman" as const, prompt: "estimate roofing gable_roof installation by gable_roof 67 sq_m in Bishkek" },
];

function measureEstimatePath(item: (typeof CASES)[number]) {
  const started = performance.now();
  const answer = answerBuiltInAi({
    text: item.prompt,
    route: item.route,
    screenContext: item.route === "/request" ? "request" : "foreman",
    role: item.route === "/request" ? "consumer" : "foreman",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  const estimate = answer.toolResult.estimate;

  expect(answer.route.intent).toBe("estimate");
  expect(answer.toolResult.toolName).toBe("calculate_global_estimate");
  expect(estimate).toBeDefined();
  if (!estimate) throw new Error(`estimate missing for ${item.prompt}`);

  const viewModel = buildProfessionalEstimateTableViewModel(estimate);
  const pdf = createEstimatePdf({
    estimate,
    runtimeTrace: answer.runtimeTrace,
    generatedAt: "2026-05-29T00:00:00.000Z",
    language: "ru",
  });

  return {
    answer,
    viewModel,
    pdf,
    latencyMs: performance.now() - started,
  };
}

describe("AI estimate enterprise load budget", () => {
  it("keeps representative estimate, presentation, and PDF path bounded", () => {
    for (const item of CASES) {
      const attempts = Array.from({ length: 3 }, () => measureEstimatePath(item));
      const best = attempts.reduce((currentBest, attempt) =>
        attempt.latencyMs < currentBest.latencyMs ? attempt : currentBest,
      );

      expect(best.latencyMs).toBeLessThanOrEqual(
        AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.maxLatencyBudgetMs,
      );
      expect(best.viewModel.rows.length).toBeGreaterThan(0);
      expect(best.viewModel.rows.length).toBeLessThanOrEqual(
        AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.maxRowsPerEstimate,
      );
      expect(best.pdf.bytes.length).toBeLessThanOrEqual(
        AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.maxPdfBytes,
      );
      expect(best.pdf.pdfTrace.pdf_uses_structured_global_estimate_result).toBe(true);
      expect(best.pdf.pdfTrace.markdown_parsed_as_pdf_truth).toBe(false);
      expect(best.answer.answerTextRu.length).toBeLessThanOrEqual(
        AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.maxAnswerChars,
      );
    }
  });
});
