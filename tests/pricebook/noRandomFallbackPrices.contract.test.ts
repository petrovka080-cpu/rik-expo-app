import { resolveGovernedRatebookPrice } from "../../src/lib/ai/pricebookRatebookGovernance";
import { baseGovernedRate } from "./pricebookRatebookTestHelpers";

describe("no random fallback prices contract", () => {
  it("does not substitute prices across region, currency, or unit mismatches", () => {
    const rate = baseGovernedRate();
    const mismatches = [
      { region: "KG-Osh", currency: "KGS" as const, unit: rate.unit },
      { region: rate.region, currency: "USD" as const, unit: rate.unit },
      { region: rate.region, currency: "KGS" as const, unit: "linear_m" },
    ];

    for (const mismatch of mismatches) {
      const resolution = resolveGovernedRatebookPrice({
        materialId: rate.material_id,
        rateKey: rate.material_id,
        unit: mismatch.unit,
        region: mismatch.region,
        priceDate: "2026-06-12",
        currency: mismatch.currency,
        rates: [rate],
      });
      expect(resolution.price_status).toBe("PRICE_MISSING");
      expect(resolution.price_value).toBeNull();
    }
  });
});
