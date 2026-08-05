import { buildCatalogBackfillBatches } from "../../scripts/estimate/buildCatalogBackfillBatches";

jest.setTimeout(90000);

describe("P2 structural and exterior readiness", () => {
  it("keeps all P2 mappings while refusing unproven professional readiness", () => {
    const artifact = buildCatalogBackfillBatches({ writeFiles: false });
    const p2 = artifact.batches.P2_STRUCTURAL_EXTERIOR;

    expect(p2.template_count).toBe(3964);
    expect(p2.ready_professional_count).toBe(0);
    expect(p2.generic_fallback_count).toBe(0);
    expect(p2.synthetic_family_default_count).toBe(0);
    expect(artifact.full_10000_real_norm_green_claimed).toBe(false);
    expect(artifact.blockers).toContain("p2_batch_not_fully_ready_professional");
  });
});
