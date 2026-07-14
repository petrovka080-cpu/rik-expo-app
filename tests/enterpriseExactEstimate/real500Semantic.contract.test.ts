import { evaluateReal500MaterialPrice } from "../../scripts/e2e/userInputExactMaterialPriceEstimate.shared";

describe("enterprise exact estimate real500 semantic audit", () => {
  jest.setTimeout(120_000);

  it("keeps real500 material and price semantics green", () => {
    const result = evaluateReal500MaterialPrice();

    expect(result.final_status).toBe("GREEN_EXACT_MATERIAL_PRICE_REAL500_SEMANTIC_READY");
    expect(result.cases_total).toBe(500);
    expect(result.cases_failed).toBe(0);
    expect(result.failures).toEqual([]);
  });
});
