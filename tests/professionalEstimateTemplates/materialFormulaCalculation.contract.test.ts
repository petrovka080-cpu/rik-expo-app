import { professionalFormulaAudit } from "./professionalEstimateTestHelpers";

describe("professional estimate material formula calculation", () => {
  it("parses all formulas without invalid quantities", () => {
    const result = professionalFormulaAudit();
    expect(result.formula_cases_total).toBeGreaterThanOrEqual(1500);
    expect(result.formula_parse_failures).toBe(0);
    expect(result.negative_quantities).toBe(0);
    expect(result.nan_quantities).toBe(0);
    expect(result.unit_mismatches).toBe(0);
  });
});
