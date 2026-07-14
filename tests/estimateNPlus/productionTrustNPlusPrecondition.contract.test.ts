import { buildProductionTrustInventory } from "../../src/features/estimates/governance/productionTrustInventory";

describe("production trust N+ precondition", () => {
  it("starts from the committed 10000 plus expanded infrastructure catalog", () => {
    const inventory = buildProductionTrustInventory();

    expect(inventory.base_template_count).toBe(10000);
    expect(inventory.expanded_template_count).toBe(1610);
    expect(inventory.catalog_total_templates).toBe(11610);
    expect(inventory.base_ready_professional_count).toBe(inventory.base_template_count);
    expect(inventory.not_ready_count).toBe(0);
    expect(inventory.generic_fallback_count).toBe(0);
  });
});
