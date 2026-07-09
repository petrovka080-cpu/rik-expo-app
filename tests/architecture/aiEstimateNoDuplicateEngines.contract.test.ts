import {
  auditAiEstimateDuplicateEngines,
  GREEN_AI_ESTIMATE_NO_DUPLICATE_ENGINES,
} from "../../scripts/architecture/auditAiEstimateDuplicateEngines";

describe("AI estimate duplicate engines", () => {
  it("does not introduce second estimate engines, parsers, PDF builders, or buyer package builders", () => {
    const result = auditAiEstimateDuplicateEngines();

    expect(result.final_status).toBe(GREEN_AI_ESTIMATE_NO_DUPLICATE_ENGINES);
    expect(result.duplicate_estimate_engines_count).toBe(0);
    expect(result.duplicate_parameter_parsers_count).toBe(0);
    expect(result.duplicate_pdf_builders_count).toBe(0);
  });
});
