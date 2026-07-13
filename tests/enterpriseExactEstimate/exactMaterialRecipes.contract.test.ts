import {
  evaluateRecipeCoverage,
} from "../../scripts/e2e/userInputExactMaterialPriceEstimate.shared";

describe("enterprise exact estimate material recipes", () => {
  it("resolves exact material rows and quantity formulas for required known works", () => {
    const result = evaluateRecipeCoverage();

    expect(result.final_status).toBe("GREEN_EXACT_MATERIAL_PRICE_RECIPE_COVERAGE_READY");
    expect(result.failures).toEqual([]);
    expect(result.required_total).toBeGreaterThan(20);
    expect(result.required_passed).toBe(result.required_total);
    expect(result.rows.every((row) => row.material_rows > 0)).toBe(true);
    expect(result.rows.every((row) => row.fake_price_claimed === false)).toBe(true);
    expect(result.rows.every((row) => row.fake_supplier_claimed === false)).toBe(true);
  });
});
