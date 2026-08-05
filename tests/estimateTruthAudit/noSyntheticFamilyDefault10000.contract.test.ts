import { getTruthAuditInventory } from "./estimateTruthAuditTestHelpers";

describe("truth audit no synthetic family default 10000", () => {
  it("does not accept generated or synthetic sources as professional", () => {
    const inventory = getTruthAuditInventory();

    expect(inventory.synthetic_family_default_count).toBe(0);
    expect(inventory.templates.every((template) =>
      template.norm_source_type === "partial_versioned_professional_norm_pack"
    )).toBe(true);
    expect(inventory.templates.every((template) => template.source_backed_row_count === template.row_count)).toBe(true);
    expect(inventory.templates.every((template) =>
      template.readiness_status === "NOT_READY_MISSING_NORM_SOURCE"
    )).toBe(true);
    expect(inventory.fake_green_claimed).toBe(false);
  });
});
