import { auditProfessionalBoq11610PriceTrust } from "../../scripts/estimate/auditProfessionalBoq11610PriceTrust";
import { GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY } from "../../scripts/estimate/professionalBoq11610RegressionSealCore";

jest.setTimeout(180000);

describe("professional BOQ 11610 price trust", () => {
  it("does not invent contract totals, suppliers, warehouse, payments, or RFQs", () => {
    const summary = auditProfessionalBoq11610PriceTrust();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY);
    expect(summary.price_trust_audit_created).toBe(true);
    expect(summary.fake_final_total_claimed).toBe(false);
    expect(summary.contract_total_not_claimed_when_prices_missing).toBe(true);
    expect(summary.missing_price_state_visible).toBe(true);
    expect(summary.price_source_recorded_when_price_present).toBe(true);
    expect(summary.supplier_not_invented).toBe(true);
    expect(summary.warehouse_not_invented).toBe(true);
    expect(summary.payment_not_invented).toBe(true);
    expect(summary.rfq_not_started).toBe(true);
  });
});
