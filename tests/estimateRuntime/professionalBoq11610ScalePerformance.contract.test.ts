import { benchmarkProfessionalBoq11610Scale } from "../../scripts/estimate/benchmarkProfessionalBoq11610Scale";
import { GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY } from "../../scripts/estimate/professionalBoq11610RegressionSealCore";

jest.setTimeout(240000);

describe("professional BOQ 11610 scale performance", () => {
  it("keeps core operations within SLO and memory budget", () => {
    const summary = benchmarkProfessionalBoq11610Scale();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY);
    expect(summary.scale_benchmark_created).toBe(true);
    expect(summary.all_core_operations_within_slo).toBe(true);
    expect(Number(summary.catalog_index_load_p95_ms)).toBeLessThanOrEqual(100);
    expect(Number(summary.template_create_p95_ms)).toBeLessThanOrEqual(800);
    expect(Number(summary.generated_prompt_create_p95_ms)).toBeLessThanOrEqual(1200);
    expect(Number(summary.parameter_override_p95_ms)).toBeLessThanOrEqual(250);
    expect(Number(summary.snapshot_build_p95_ms)).toBeLessThanOrEqual(800);
    expect(Number(summary.buyer_subset_build_p95_ms)).toBeLessThanOrEqual(500);
    expect(summary.memory_budget_violations_count).toBe(0);
  });
});
