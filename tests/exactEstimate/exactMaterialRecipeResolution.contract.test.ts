import { buildSelectedExactEstimate, expectExactEstimateCoreInvariants, requiredCoverageWorkKeys } from "./exactEstimateTestHelpers";

describe("exact material recipe resolution", () => {
  jest.setTimeout(120_000);

  it("resolves material recipes for the required work coverage", () => {
    for (const workKey of requiredCoverageWorkKeys()) {
      const result = buildSelectedExactEstimate(workKey);
      expect(result.work.work_key).toBe(workKey);
      expect(result.recipe.material_rows.length).toBeGreaterThan(0);
      expect(result.recipe.material_rows.every((row) => row.required && row.price_required)).toBe(true);
      expectExactEstimateCoreInvariants(result);
    }
  });
});
