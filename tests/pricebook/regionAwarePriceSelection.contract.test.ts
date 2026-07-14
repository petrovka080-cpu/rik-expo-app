import { resolveGovernedRatebookPrice } from "../../src/lib/ai/pricebookRatebookGovernance";
import { baseGovernedRate } from "./pricebookRatebookTestHelpers";

describe("region-aware price selection contract", () => {
  it("selects the exact requested region and does not silently fall back to another region", () => {
    const bishkek = baseGovernedRate({ region: "KG-Bishkek", price_value: 500 });
    const osh = baseGovernedRate({ region: "KG-Osh", price_value: 640, supplier_id: "kg_osh_supplier" });

    const selected = resolveGovernedRatebookPrice({
      materialId: "governed_test_material",
      rateKey: "governed_test_material",
      unit: "sq_m",
      region: "KG-Osh",
      priceDate: "2026-06-12",
      currency: "KGS",
      rates: [bishkek, osh],
    });
    const missing = resolveGovernedRatebookPrice({
      materialId: "governed_test_material",
      rateKey: "governed_test_material",
      unit: "sq_m",
      region: "KG-Naryn",
      priceDate: "2026-06-12",
      currency: "KGS",
      rates: [bishkek, osh],
    });

    expect(selected.price_status).toBe("VERIFIED");
    expect(selected.price_value).toBe(640);
    expect(selected.region).toBe("KG-Osh");
    expect(missing.price_status).toBe("PRICE_MISSING");
    expect(missing.price_value).toBeNull();
  });
});
