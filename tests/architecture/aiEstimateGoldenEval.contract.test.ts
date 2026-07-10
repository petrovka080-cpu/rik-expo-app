import { runAiEstimateGoldenEval, GREEN_AI_ESTIMATE_GOLDEN_EVAL } from "../../scripts/aiPlatform/runAiEstimateGoldenEval";

jest.setTimeout(90_000);

describe("AI Estimate golden eval corpus", () => {
  it("passes the versioned 700 case construction quality corpus", async () => {
    const { summary } = await runAiEstimateGoldenEval({ writeSummary: false });

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_GOLDEN_EVAL);
    expect(summary.estimate_golden_cases_total).toBeGreaterThanOrEqual(700);
    expect(summary.critical_construction_cases_count).toBeGreaterThanOrEqual(100);
    expect(summary.unit_conflict_cases_count).toBeGreaterThanOrEqual(100);
    expect(summary.missing_input_cases_count).toBeGreaterThanOrEqual(100);
    expect(summary.parameter_override_cases_count).toBeGreaterThanOrEqual(100);
    expect(summary.pdf_buyer_parity_cases_count).toBeGreaterThanOrEqual(50);
    expect(summary.negative_forbidden_cases_count).toBeGreaterThanOrEqual(50);
    expect(summary.critical_work_families_covered).toBe(true);
    expect(summary.failed).toBe(0);
    expect(summary.blockers).toEqual([]);
  });
});
