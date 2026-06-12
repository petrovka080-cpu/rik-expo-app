import {
  resolveGovernedRatebookPrice,
  validatePricebookRatebookImport,
} from "../../src/lib/ai/pricebookRatebookGovernance";
import {
  baseGovernedRate,
  validImportRow,
} from "./pricebookRatebookTestHelpers";

describe("stale price policy contract", () => {
  it("blocks stale prices from being used as verified totals", () => {
    const stale = baseGovernedRate({ valid_to: "2026-05-31", confidence: 0.6 });
    const resolution = resolveGovernedRatebookPrice({
      materialId: stale.material_id,
      rateKey: stale.material_id,
      unit: stale.unit,
      region: stale.region,
      priceDate: "2026-06-12",
      currency: stale.currency,
      rates: [stale],
    });

    expect(resolution.price_status).toBe("STALE");
    expect(resolution.governance_status).toBe("STALE_PRICE_BLOCKED");
    expect(resolution.price_value).toBeNull();
  });

  it("rejects high-confidence stale imports", () => {
    const preview = validatePricebookRatebookImport({
      format: "supplier_catalog",
      rows: [validImportRow({ valid_to: "2026-05-31", confidence: 0.95 })],
      asOfDate: "2026-06-12",
    });

    expect(preview.blocked_rows).toBe(1);
    expect(preview.validations[0]?.blockers.map((item) => item.code)).toContain("PRICEBOOK_HIGH_CONFIDENCE_STALE_BLOCKED");
  });
});
