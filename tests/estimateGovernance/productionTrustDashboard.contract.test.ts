import { buildProductionTrustInventory } from "../../src/features/estimates/governance/productionTrustInventory";

describe("production trust dashboard", () => {
  it("counts the current N+ catalog and exposes trust blockers", () => {
    const inventory = buildProductionTrustInventory();
    const dashboard = inventory.production_trust_dashboard;

    expect(dashboard.catalog_total_templates).toBeGreaterThan(10000);
    expect(dashboard.catalog_total_templates).toBe(inventory.catalog_total_templates);
    expect(dashboard.catalog_total_templates).toBe(11610);
    expect(dashboard.pricebook_coverage_percent).toBeGreaterThan(0);
    expect(dashboard.expert_review_coverage_percent).toBe(100);
    expect(dashboard.needs_pricebook_count).toBe(inventory.expanded_template_count);
    expect(dashboard.groups_by_work_family.length).toBeGreaterThanOrEqual(2);
    expect(dashboard.groups_by_region.map((item) => item.region)).toEqual(["KG", "KZ", "UZ", "RU"]);
  });
});
