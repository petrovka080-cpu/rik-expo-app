import { validateGlobalEstimateFormula } from "../../src/lib/ai/globalEstimate";

describe("Global Estimate Data Ops formula validation contract", () => {
  it("accepts bounded quantity formulas and rejects executable code", () => {
    expect(validateGlobalEstimateFormula("area * 1.10", { area: 100 })).toMatchObject({
      valid: true,
      quantity: 110,
    });
    expect(validateGlobalEstimateFormula("sqrt(area) * 8", { area: 100 }).valid).toBe(true);
    expect(validateGlobalEstimateFormula("Function('return 1')()", { area: 100 }).valid).toBe(false);
    expect(validateGlobalEstimateFormula("eval('1 + 1')", { area: 100 }).valid).toBe(false);
  });
});
