import { auditProfessionalBoq11610UnitsCurrency } from "../../scripts/estimate/auditProfessionalBoq11610UnitsCurrency";
import { GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY } from "../../scripts/estimate/professionalBoq11610RegressionSealCore";

jest.setTimeout(180000);

describe("professional BOQ 11610 units and currency", () => {
  it("keeps units, unit families, price units, and missing-price currency state honest", () => {
    const summary = auditProfessionalBoq11610UnitsCurrency();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY);
    expect(summary.unit_currency_audit_created).toBe(true);
    expect(summary.unit_coverage).toBe("11610/11610");
    expect(summary.wrong_unit_rows_count).toBe(0);
    expect(summary.unknown_unit_rows_count).toBe(0);
    expect(summary.unit_family_mismatch_count).toBe(0);
    expect(summary.price_unit_mismatch_count).toBe(0);
    expect(summary.currency_consistency_passed).toBe(true);
    expect(summary.missing_price_state_honest).toBe(true);
    expect(summary.fake_price_conversion_count).toBe(0);
  });
});
