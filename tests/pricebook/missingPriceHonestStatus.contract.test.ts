import { resolveGovernedRatebookPrice } from "../../src/lib/ai/pricebookRatebookGovernance";
import { baseGovernedRate } from "./pricebookRatebookTestHelpers";

describe("missing price honest status contract", () => {
  it("returns PRICE_MISSING with null price and null supplier when no governed rate exists", () => {
    const resolution = resolveGovernedRatebookPrice({
      materialId: "unknown_material",
      rateKey: "unknown_material",
      unit: "sq_m",
      region: "KG-Bishkek",
      priceDate: "2026-06-12",
      currency: "KGS",
      rates: [baseGovernedRate()],
    });

    expect(resolution.price_status).toBe("PRICE_MISSING");
    expect(resolution.price_value).toBeNull();
    expect(resolution.supplier_id).toBeNull();
    expect(resolution.source_reference).toBeNull();
    expect(resolution.fake_price_claimed).toBe(false);
    expect(resolution.fake_supplier_claimed).toBe(false);
  });
});
