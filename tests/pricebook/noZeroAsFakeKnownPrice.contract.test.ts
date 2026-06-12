import {
  resolveGovernedRatebookPrice,
  validatePricebookRatebookImport,
} from "../../src/lib/ai/pricebookRatebookGovernance";
import {
  baseGovernedRate,
  validImportRow,
} from "./pricebookRatebookTestHelpers";

describe("no zero as fake known price contract", () => {
  it("blocks zero as a verified known price", () => {
    const preview = validatePricebookRatebookImport({
      format: "manual_ratebook",
      rows: [validImportRow({ price_value: 0 })],
    });
    const zeroRate = baseGovernedRate({ price_value: 0 });
    const resolution = resolveGovernedRatebookPrice({
      materialId: zeroRate.material_id,
      rateKey: zeroRate.material_id,
      unit: zeroRate.unit,
      region: zeroRate.region,
      priceDate: "2026-06-12",
      currency: zeroRate.currency,
      rates: [zeroRate],
    });

    expect(preview.blocked_rows).toBe(1);
    expect(preview.validations[0]?.blockers.map((item) => item.code)).toContain("PRICEBOOK_ZERO_PRICE_NOT_KNOWN");
    expect(resolution.price_value).toBeNull();
    expect(resolution.price_status).toBe("PRICE_MISSING");
  });
});
