import {
  auditAiEstimateParameterExtractionPriority,
  GREEN_AI_ESTIMATE_PARAMETER_EXTRACTION_PRIORITY_READY,
} from "../../scripts/estimate/auditAiEstimateParameterExtractionPriority";

describe("AI estimate parameter extraction priority", () => {
  it("preserves explicit construction values and maps them to work-specific parameters", () => {
    const { summary } = auditAiEstimateParameterExtractionPriority();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_PARAMETER_EXTRACTION_PRIORITY_READY);
    expect(summary.cases_passed).toBe("9/9");
    expect(summary.explicit_user_values_preserved).toBe(true);
    expect(summary.ceiling_height_not_misclassified_as_length).toBe(true);
    expect(summary.parameter_cards_match_extracted_values).toBe(true);
    expect(summary.boq_quantities_use_extracted_values).toBe(true);
    expect(summary.forbidden_visible_output_count).toBe(0);
  });
});
