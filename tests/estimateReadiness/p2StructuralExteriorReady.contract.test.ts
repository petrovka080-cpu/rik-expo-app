import { buildCatalogBackfillBatches } from "../../scripts/estimate/buildCatalogBackfillBatches";

jest.setTimeout(90000);

describe("P2 structural and exterior readiness", () => {
  it("marks every P2 template ready professional with no generic fallback", () => {
    const artifact = buildCatalogBackfillBatches({ writeFiles: false });
    const p2 = artifact.batches.P2_STRUCTURAL_EXTERIOR;

    expect(p2.template_count).toBe(3916);
    expect(p2.ready_professional_count).toBe(p2.template_count);
    expect(p2.generic_fallback_count).toBe(0);
    expect(p2.synthetic_family_default_count).toBe(0);
  });
});
