import { validateProfessionalCatalogBatch } from "../../scripts/estimate/validateProfessionalCatalogBatch";

jest.setTimeout(90000);

describe("P0 blind quantity copy guard", () => {
  it("does not accept copied user quantity as a substitute for formulas", () => {
    const summary = validateProfessionalCatalogBatch();

    expect(summary.p0_blind_quantity_copy_count).toBe(0);
    expect(summary.p0_missing_formula_trace_count).toBe(0);
    expect(summary.case_results.every((item) => item.deterministic_same_input_same_output)).toBe(true);
  });
});
