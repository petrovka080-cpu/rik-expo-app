import { getAi1000Artifacts } from "./ai1000TestHelpers";

describe("built-in AI 1000 expected BOQ outputs", () => {
  it("renders professional BOQ output with required sections for every estimate case", () => {
    const { matrix, transcripts } = getAi1000Artifacts();
    const estimateTranscripts = transcripts.filter((trace) => trace.detected_intent === "estimate");

    expect(matrix.professional_boq_present_all).toBe(true);
    expect(matrix.materials_section_present_all).toBe(true);
    expect(matrix.labor_or_equipment_section_present_all).toBe(true);
    expect(matrix.quantities_present_all).toBe(true);
    expect(matrix.totals_present_all).toBe(true);
    expect(matrix.tax_status_or_warning_present_all).toBe(true);
    expect(matrix.cost_factors_present_all).toBe(true);
    expect(matrix.clarifying_questions_present_all).toBe(true);
    expect(matrix.expected_rows_present_all).toBe(true);
    expect(estimateTranscripts.every((trace) => "expected_rows_present" in trace && trace.expected_rows_present)).toBe(true);
  });
});
