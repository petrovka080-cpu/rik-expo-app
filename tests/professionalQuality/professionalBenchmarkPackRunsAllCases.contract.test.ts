import { PROFESSIONAL_ESTIMATE_BENCHMARKS } from "../../src/lib/ai/professionalQuality/fixtures/professionalEstimateBenchmarks";
import { resolveEstimatorOutcome } from "../../src/lib/ai/estimatorKernel/resolveEstimatorOutcome";
import { compileDynamicProfessionalBoq } from "../../src/lib/ai/professionalBoq/compileDynamicProfessionalBoq";
import { estimateFor } from "../entrypoints/liveB2cEstimateRealityTestHelpers";
import {
  expectForbiddenTokensAbsent,
  expectTokens,
  rowText,
} from "./concretePedestalTestHelpers";

describe("professional benchmark pack", () => {
  it("runs all concrete pedestal benchmark cases through kernel, BOQ, and request entrypoint", () => {
    expect(PROFESSIONAL_ESTIMATE_BENCHMARKS.length).toBeGreaterThanOrEqual(5);

    for (const benchmark of PROFESSIONAL_ESTIMATE_BENCHMARKS) {
      const outcome = resolveEstimatorOutcome({ text: benchmark.prompt, currency: "KGS" });
      expect(outcome.failures).toEqual([]);
      if (!outcome.plan) throw new Error(`BENCHMARK_PLAN_MISSING:${benchmark.id}`);
      expect(outcome.plan.semanticFrame.domain).toBe(benchmark.expected_domain);
      expect(outcome.plan.semanticFrame.object).toBe(benchmark.expected_object);
      expect(outcome.plan.semanticFrame.operation).toBe(benchmark.expected_operation);
      expect(outcome.plan.workKey).toBe(benchmark.expected_recipe);
      expect(benchmark.forbidden_objects).not.toContain(outcome.plan.semanticFrame.object);

      const rows = compileDynamicProfessionalBoq(outcome.plan).rows;
      const text = rowText(rows);
      expect(rows.length).toBeGreaterThanOrEqual(benchmark.expected_min_rows);
      expectTokens(text, benchmark.required_material_rows);
      expectTokens(text, benchmark.required_labor_rows);
      expectTokens(text, benchmark.required_equipment_or_warning_rows);
      expectForbiddenTokensAbsent(text, benchmark.forbidden_rows);

      const exclusions = outcome.plan.boqPlan.exclusions.join("\n").toLocaleLowerCase("ru-RU");
      const questions = outcome.plan.boqPlan.clarifyingQuestions.join("\n").toLocaleLowerCase("ru-RU");
      expectTokens(exclusions, benchmark.required_exclusions);
      expectTokens(questions, benchmark.required_clarifying_questions);

      const estimate = estimateFor("/request", benchmark.prompt);
      expect(estimate.work.workKey).toBe(benchmark.expected_recipe);
    }
  });
});
