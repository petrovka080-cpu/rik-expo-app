import { evaluateReal10000Compatibility } from "../../scripts/e2e/userInputExactMaterialPriceEstimate.shared";

describe("enterprise exact estimate real10000 compatibility", () => {
  jest.setTimeout(300_000);

  it("keeps 10000 compatibility scan stable", () => {
    const result = evaluateReal10000Compatibility();

    expect(result.final_status).toBe("GREEN_EXACT_MATERIAL_PRICE_REAL10000_COMPATIBILITY_READY");
    expect(result.cases_total).toBe(10000);
    expect(result.cases_failed).toBe(0);
    expect(result.stable_payload_ids).toBe(10000);
    expect(result.failures).toEqual([]);
  });
});
