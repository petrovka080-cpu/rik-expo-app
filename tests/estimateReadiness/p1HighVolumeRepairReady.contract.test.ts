import { buildCatalogBackfillBatches } from "../../scripts/estimate/buildCatalogBackfillBatches";

jest.setTimeout(90000);

describe("P1 high-volume repair readiness", () => {
  it("keeps all P1 mappings while refusing unproven professional readiness", () => {
    const artifact = buildCatalogBackfillBatches({ writeFiles: false });
    const p1 = artifact.batches.P1_HIGH_VOLUME_REPAIR;

    expect(p1.template_count).toBe(4127);
    expect(p1.ready_professional_count).toBe(0);
    expect(p1.generic_fallback_count).toBe(0);
    expect(p1.synthetic_family_default_count).toBe(0);
    expect(artifact.full_10000_real_norm_green_claimed).toBe(false);
    expect(artifact.blockers).toContain("p1_batch_not_fully_ready_professional");
  });
});
