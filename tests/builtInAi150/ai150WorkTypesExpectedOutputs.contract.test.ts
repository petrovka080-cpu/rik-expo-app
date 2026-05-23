import { getAi150Artifacts } from "./ai150TestHelpers";

describe("built-in AI 150 expected outputs", () => {
  it("renders professional BOQ output with required sections for every case", () => {
    const { matrix, transcripts } = getAi150Artifacts();

    expect(matrix.professional_boq_present_all).toBe(true);
    expect(matrix.materials_section_present_all).toBe(true);
    expect(matrix.labor_or_equipment_section_present_all).toBe(true);
    expect(matrix.quantities_present_all).toBe(true);
    expect(matrix.totals_present_all).toBe(true);
    expect(matrix.tax_status_or_warning_present_all).toBe(true);
    expect(matrix.cost_factors_present_all).toBe(true);
    expect(matrix.clarifying_questions_present_all).toBe(true);
    expect(matrix.expected_key_rows_present_all).toBe(true);
    expect(transcripts.every((trace) => trace.expected_key_rows_present)).toBe(true);
  });
});
