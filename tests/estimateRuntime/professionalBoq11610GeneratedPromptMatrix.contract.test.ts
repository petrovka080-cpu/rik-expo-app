import { runProfessionalBoq11610GeneratedPromptMatrix } from "../../scripts/estimate/runProfessionalBoq11610GeneratedPromptMatrix";
import { GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY } from "../../scripts/estimate/professionalBoq11610RegressionSealCore";

jest.setTimeout(360000);

describe("professional BOQ 11610 generated prompt matrix", () => {
  it("creates a BOQ, parameter passport, missing-input model, and no raw ids for every template", () => {
    const summary = runProfessionalBoq11610GeneratedPromptMatrix();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY);
    expect(summary.generated_prompt_matrix_created).toBe(true);
    expect(summary.generated_prompt_cases_passed).toBe("11610/11610");
    expect(summary.work_family_recognition_passed).toBe("11610/11610");
    expect(summary.boq_created_from_generated_prompt).toBe("11610/11610");
    expect(summary.parameter_passport_created).toBe("11610/11610");
    expect(summary.missing_input_model_created).toBe("11610/11610");
    expect(summary.visible_internal_ids_count).toBe(0);
  });
});
