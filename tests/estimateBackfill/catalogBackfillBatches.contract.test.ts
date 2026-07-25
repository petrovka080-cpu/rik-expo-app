import {
  buildCatalogBackfillBatches,
  GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS,
} from "../../scripts/estimate/buildCatalogBackfillBatches";

jest.setTimeout(90000);

describe("catalog backfill batches", () => {
  it("creates P1/P2/P3 batch views with zero generic fallback", () => {
    const artifact = buildCatalogBackfillBatches({ writeFiles: false });

    expect(artifact.final_status).toBe(GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS);
    expect(artifact.manifest_total_templates).toBe(10000);
    expect(artifact.batches.P1_HIGH_VOLUME_REPAIR.template_count).toBe(4127);
    expect(artifact.batches.P1_HIGH_VOLUME_REPAIR.ready_professional_count).toBe(4127);
    expect(artifact.batches.P1_HIGH_VOLUME_REPAIR.generic_fallback_count).toBe(0);
    expect(artifact.batches.P2_STRUCTURAL_EXTERIOR.template_count).toBe(3964);
    expect(artifact.batches.P2_STRUCTURAL_EXTERIOR.ready_professional_count).toBe(3964);
    expect(artifact.batches.P2_STRUCTURAL_EXTERIOR.generic_fallback_count).toBe(0);
    expect(artifact.batches.P3_LONG_TAIL.template_count).toBe(1002);
    expect(artifact.batches.P3_LONG_TAIL.ready_professional_count).toBe(1002);
    expect(artifact.batches.P3_LONG_TAIL.generic_fallback_count).toBe(0);
    expect(
      artifact.template_assignments.filter(
        (template) =>
          template.work_family_id === "transport_delivery" &&
          /^(concrete_foundation|electrical)_/.test(template.work_key),
      ),
    ).toEqual([]);
    expect(artifact.full_10000_real_norm_green_claimed).toBe(true);
    expect(artifact.blockers).toEqual([]);
  });
});
