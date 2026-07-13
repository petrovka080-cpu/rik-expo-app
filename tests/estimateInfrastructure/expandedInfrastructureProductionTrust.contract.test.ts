import { auditCommercialTrustCriticalCases } from "../../scripts/estimate/auditProductionTrustGovernance";
import { buildProductionTrustInventory } from "../../src/features/estimates/governance/productionTrustInventory";

describe("expanded infrastructure production trust", () => {
  it("keeps expanded infrastructure honest as quantity-only until pricebook and design inputs are present", () => {
    const inventory = buildProductionTrustInventory();
    const acceptance = auditCommercialTrustCriticalCases();

    expect(inventory.production_trust_dashboard.quantity_only_price_missing_count).toBe(1610);
    expect(inventory.production_trust_dashboard.needs_pricebook_count).toBe(1610);
    expect(inventory.production_trust_dashboard.needs_design_inputs_count).toBe(1610);
    expect(acceptance.commercial_trust_cases_count).toBeGreaterThanOrEqual(40);
    expect(acceptance.complex_engineering_commercial_trust_passed).toBe(true);
    expect(acceptance.price_missing_cases_labeled_correctly).toBe(true);
  });
});
