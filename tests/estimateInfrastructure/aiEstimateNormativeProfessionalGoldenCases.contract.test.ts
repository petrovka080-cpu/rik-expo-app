import {
  GREEN_AI_ESTIMATE_NORMATIVE_PROFESSIONAL_GOLDEN_CASES,
  runAiEstimateNormativeProfessionalGoldenCases,
} from "../../scripts/estimate/runAiEstimateNormativeProfessionalGoldenCases";

jest.setTimeout(180_000);

describe("AI estimate normative professional golden cases", () => {
  it("passes all 50 professional parameter-completeness cases", () => {
    const { summary } = runAiEstimateNormativeProfessionalGoldenCases();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_NORMATIVE_PROFESSIONAL_GOLDEN_CASES);
    expect(summary.fixture_cases).toBe(50);
    expect(summary.golden_50_passed).toBe("50/50");
    expect(summary.all_expected_families_matched).toBe(true);
    expect(summary.all_required_parameters_present).toBe(true);
    expect(summary.all_missing_questions_ranked_lte_5).toBe(true);
    expect(summary.all_quantity_traces_current).toBe(true);
    expect(summary.all_missing_answers_recalculate).toBe(true);
  });
});
