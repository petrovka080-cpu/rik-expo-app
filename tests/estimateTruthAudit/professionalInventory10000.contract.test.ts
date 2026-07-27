import { getTruthAuditInventory } from "./estimateTruthAuditTestHelpers";

describe("professional inventory 10000 truth audit", () => {
  it("classifies every template with real professional readiness fields", () => {
    const inventory = getTruthAuditInventory();

    expect(inventory.schema).toBe("estimate-10000-professional-inventory-v1");
    expect(inventory.manifest_total_templates).toBe(10000);
    expect(inventory.ready_professional_count).toBe(0);
    expect(inventory.not_ready_count).toBe(10000);
    expect(inventory.generic_fallback_count).toBe(0);
    expect(inventory.synthetic_family_default_count).toBe(0);
    expect(inventory.templates_only_generic_norms_count).toBe(0);
    expect(inventory.templates_with_real_norm_sources_count).toBe(0);
    expect(inventory.fake_green_claimed).toBe(false);
    expect(inventory.full_10000_green_claimed).toBe(false);
    expect(inventory.product_green_revoked).toBe(true);
    expect(inventory.blockers).toHaveLength(10000);
  });
});
