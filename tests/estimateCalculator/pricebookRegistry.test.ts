import { buildProfessionalWorkPassport } from "../../src/lib/estimate/buildProfessionalWorkPassport";
import {
  professionalPricebookItemTypeForCostRowType,
  resolveProfessionalPriceRecord,
} from "../../src/lib/estimate/professionalPricebookRegistry";
import { validateProfessionalPricebook } from "../../src/lib/estimate/validateProfessionalPricebook";

describe("professional pricebook registry", () => {
  it("loads governed pricebooks with source, region, currency, and retrieved metadata", () => {
    const summary = validateProfessionalPricebook();

    expect(summary.material_pricebook_created).toBe(true);
    expect(summary.labor_rate_book_created).toBe(true);
    expect(summary.equipment_rate_book_created).toBe(true);
    expect(summary.service_rate_book_created).toBe(true);
    expect(summary.transport_rate_book_created).toBe(true);
    expect(summary.all_prices_have_source).toBe(true);
    expect(summary.all_prices_have_region).toBe(true);
    expect(summary.all_prices_have_retrieved_at).toBe(true);
    expect(summary.all_prices_have_currency).toBe(true);
    expect(summary.zero_or_negative_prices_count).toBe(0);
    expect(summary.trusted_contract_prices_require_source).toBe(true);
    expect(summary.blocking_reasons).toEqual([]);
  });

  it("resolves by exact norm-family/type/unit and does not use a broad unit allowlist", () => {
    const passport = buildProfessionalWorkPassport("ventilated_facade_rom_concept_expanded_complex_v1");
    if (!passport) throw new Error("passport_missing");
    const row = passport.boqRecipe.materialRows[0];
    const record = resolveProfessionalPriceRecord({
      normFamilyId: row.normFamilyId,
      rowType: row.rowType,
      unit: row.sourceUnit,
    });
    const broadMiss = resolveProfessionalPriceRecord({
      normFamilyId: "norm_family:unknown",
      rowType: row.rowType,
      unit: row.sourceUnit,
    });

    expect(professionalPricebookItemTypeForCostRowType(row.rowType)).toBe("material");
    expect(record?.sourceId).toBeTruthy();
    expect(record?.unitPrice).toBeGreaterThan(0);
    expect(broadMiss).toBeNull();
  });
});
