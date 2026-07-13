import { resolveExactMaterialRate } from "../../src/lib/ai/exactMaterialPriceEstimate";
import { buildPricebookRoofEstimate } from "./pricebookRatebookTestHelpers";

describe("estimate builder uses pricebook only contract", () => {
  it("derives every exact material line price from governed pricebook lookup", () => {
    const result = buildPricebookRoofEstimate();

    for (const line of result.material_lines) {
      const direct = resolveExactMaterialRate({
        materialId: line.material_id,
        rateKey: line.source_rate_key,
        unit: line.unit,
        region: line.region,
        priceDate: line.price_source_audit.price_date,
        currency: line.currency,
      });
      expect(line.price_status).toBe(direct.price_status);
      expect(line.price_value).toBe(direct.price_value);
      expect(line.supplier_id).toBe(direct.supplier_id);
      expect(line.source_reference).toBe(direct.source_reference);
    }

    expect(result.policy.random_prices_allowed).toBe(false);
    expect(result.policy.hidden_fallback_prices_allowed).toBe(false);
    expect(result.policy.fake_suppliers_allowed).toBe(false);
  });
});
