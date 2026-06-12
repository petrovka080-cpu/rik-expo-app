import {
  resolveGovernedRatebookPrice,
  validatePricebookRatebookImport,
} from "../../src/lib/ai/pricebookRatebookGovernance";
import {
  baseGovernedRate,
  validImportRow,
} from "./pricebookRatebookTestHelpers";

describe("conflicting prices contract", () => {
  it("detects conflicting active prices instead of selecting an arbitrary winner", () => {
    const left = baseGovernedRate({ price_value: 500, supplier_id: "supplier_left" });
    const right = baseGovernedRate({ price_value: 640, supplier_id: "supplier_right" });
    const resolution = resolveGovernedRatebookPrice({
      materialId: left.material_id,
      rateKey: left.material_id,
      unit: left.unit,
      region: left.region,
      priceDate: "2026-06-12",
      currency: left.currency,
      rates: [left, right],
    });

    expect(resolution.price_status).toBe("CONFLICTING");
    expect(resolution.governance_status).toBe("CONFLICTING_PRICE_BLOCKED");
    expect(resolution.price_value).toBeNull();
    expect(resolution.validation_failures).toContain("PRICEBOOK_CONFLICTING_ACTIVE_PRICE");
  });

  it("blocks conflicting import rows in preview", () => {
    const preview = validatePricebookRatebookImport({
      format: "csv",
      rows: [
        validImportRow({ material_id: "same", price_value: 10, supplier_id: "a" }),
        validImportRow({ material_id: "same", price_value: 11, supplier_id: "b" }),
      ],
    });

    expect(preview.blocked_rows).toBe(2);
    expect(preview.validations.flatMap((row) => row.blockers.map((item) => item.code))).toContain("PRICEBOOK_CONFLICTING_ACTIVE_PRICE");
  });
});
