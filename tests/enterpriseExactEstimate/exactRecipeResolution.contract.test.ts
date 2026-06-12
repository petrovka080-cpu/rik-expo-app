import { evaluateRecipeCoverage } from "../../scripts/e2e/userInputExactMaterialPriceEstimate.shared";

describe("enterprise exact estimate recipe resolution", () => {
  it("resolves recipes for all required known works", () => {
    const result = evaluateRecipeCoverage();

    expect(result.final_status).toBe("GREEN_EXACT_MATERIAL_PRICE_RECIPE_COVERAGE_READY");
    expect(result.required_passed).toBe(result.required_total);
    expect(result.failures).toEqual([]);
  });
});
