import { buildProductionTrustInventory } from "../../src/features/estimates/governance/productionTrustInventory";

describe("production trust N+ precondition", () => {
  it("keeps the 10000 base catalog blocked while exposing the 1610 expanded inventory", () => {
    const inventory = buildProductionTrustInventory();

    expect(inventory.base_template_count).toBe(10000);
    expect(inventory.expanded_template_count).toBe(1610);
    expect(inventory.catalog_total_templates).toBe(11610);
    expect(inventory.base_ready_professional_count).toBe(0);
    expect(inventory.expanded_quantity_only_price_missing_count).toBe(1610);
    expect(inventory.not_ready_count).toBe(10000);
    expect(inventory.generic_fallback_count).toBe(0);
  });
});
