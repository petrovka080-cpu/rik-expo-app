import { extended100CertificationSummary } from "../estimateGolden/extended100TestHelpers";

describe("director PDF extended estimate projection", () => {
  it("renders extended sections, formulas and public norm source labels", () => {
    const summary = extended100CertificationSummary();

    expect(summary.pdf_extended_sections_visible).toBe(true);
    expect(summary.pdf_calculation_trace_visible).toBe(true);
    expect(summary.pdf_norm_sources_visible).toBe(true);
    expect(summary.pdf_no_raw_ai_json).toBe(true);
    expect(summary.lifecycle_evaluations.every((item) => item.pdf_no_raw_ai_json)).toBe(true);
  });
});
