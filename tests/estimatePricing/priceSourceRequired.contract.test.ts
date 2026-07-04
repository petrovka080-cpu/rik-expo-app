import { capitalRenovationBundle } from "../estimateCalculator/capitalRenovationTestHelpers";
import { validateResolvedEstimatePricing } from "../../src/features/estimates/pricing/priceResolutionEngine";

describe("estimate pricing source required contract", () => {
  it("rejects priced rows without an accepted price source", () => {
    const invalid = validateResolvedEstimatePricing([
      {
        rowId: "bad-row",
        quantity: 10,
        unitPrice: 100,
        total: 1000,
        priceTrace: null,
      },
    ]);

    expect(invalid.passed).toBe(false);
    expect(invalid.failures).toEqual(expect.arrayContaining([
      "PRICE_WITHOUT_SOURCE:bad-row",
      "AMOUNT_WITHOUT_PRICE_SOURCE:bad-row",
    ]));
  });

  it("keeps apartment calculator rows unpriced until a source is selected", () => {
    const bundle = capitalRenovationBundle();

    expect(bundle.items.length).toBeGreaterThan(60);
    expect(bundle.items.every((item) => item.unitPrice == null && item.totalPrice == null)).toBe(true);
    expect(bundle.items.every((item) => item.priceSourceLabel === "Источник цены не выбран")).toBe(true);
    expect(bundle.items.every((item) => item.priceStatus === "PRICE_MISSING")).toBe(true);
  });
});
