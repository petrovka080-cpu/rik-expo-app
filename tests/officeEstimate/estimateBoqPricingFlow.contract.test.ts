import { buildEstimatePriceCatalogBoqProof } from "../../src/lib/ai/estimatePricing/priceCatalogBoq";

describe("office estimate BOQ pricing flow", () => {
  it("creates priced masonry BOQ from a 400 m2 estimate snapshot", () => {
    const proof = buildEstimatePriceCatalogBoqProof();

    expect(proof.masonry_400m2_boq_generated).toBe(true);
    expect(proof.boq_material_quantities_correct).toBe(true);
    expect(proof.boq_work_quantities_correct).toBe(true);
    expect(proof.boq_prices_resolved).toBe(true);
    expect(proof.boq_total_calculated).toBe(true);
    expect(proof.estimate_revision_price_snapshot_saved).toBe(true);
    expect(proof.no_zero_sum_for_unknown_price).toBe(true);
  });
});
