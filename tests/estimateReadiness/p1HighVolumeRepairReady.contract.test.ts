import { buildCatalogBackfillBatches } from "../../scripts/estimate/buildCatalogBackfillBatches";

jest.setTimeout(90000);

describe("P1 high-volume repair readiness", () => {
  it("marks every P1 template ready professional with no generic fallback", () => {
    const artifact = buildCatalogBackfillBatches({ writeFiles: false });
    const p1 = artifact.batches.P1_HIGH_VOLUME_REPAIR;

    expect(p1.template_count).toBe(4222);
    expect(p1.ready_professional_count).toBe(p1.template_count);
    expect(p1.generic_fallback_count).toBe(0);
    expect(p1.synthetic_family_default_count).toBe(0);
  });
});
