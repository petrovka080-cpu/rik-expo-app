import {
  evaluateReal10000Compatibility,
  evaluateReal500MaterialPrice,
} from "../../scripts/e2e/userInputExactMaterialPriceEstimate.shared";

describe("enterprise exact estimate real case audits", () => {
  jest.setTimeout(240_000);

  it("keeps real 500 semantic checks and real 10000 compatibility green", () => {
    const real500 = evaluateReal500MaterialPrice();
    const real10000 = evaluateReal10000Compatibility();

    expect(real500.final_status).toBe("GREEN_EXACT_MATERIAL_PRICE_REAL500_SEMANTIC_READY");
    expect(real500.cases_total).toBe(500);
    expect(real500.cases_failed).toBe(0);
    expect(real500.failures).toEqual([]);
    expect(real10000.final_status).toBe("GREEN_EXACT_MATERIAL_PRICE_REAL10000_COMPATIBILITY_READY");
    expect(real10000.cases_total).toBe(10000);
    expect(real10000.cases_failed).toBe(0);
    expect(real10000.stable_payload_ids).toBe(10000);
    expect(real10000.failures).toEqual([]);
  });
});
