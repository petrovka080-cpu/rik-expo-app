import { runProfessionalBoq11610PromptFuzzRegression } from "../../scripts/estimate/runProfessionalBoq11610PromptFuzzRegression";
import { GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY } from "../../scripts/estimate/professionalBoq11610RegressionSealCore";

jest.setTimeout(240000);

describe("professional BOQ prompt fuzz regression", () => {
  it("survives fuzz, unit conflicts, incomplete inputs, and unrelated prompts without fake totals", () => {
    const summary = runProfessionalBoq11610PromptFuzzRegression();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY);
    expect(summary.prompt_fuzz_regression_created).toBe(true);
    expect(summary.fuzz_cases_passed).toBe("2000/2000");
    expect(summary.unit_conflict_cases_passed).toBe("300/300");
    expect(summary.incomplete_input_cases_passed).toBe("300/300");
    expect(summary.negative_unrelated_cases_passed).toBe("150/150");
    expect(summary.no_crashes_on_fuzz).toBe(true);
    expect(summary.no_fake_total_on_fuzz).toBe(true);
    expect(summary.missing_inputs_shown_when_needed).toBe(true);
  });
});
