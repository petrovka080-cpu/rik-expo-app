import { compileProductionExpandedEstimate10000 } from "../../src/lib/ai/estimateTemplate10000";
import { classifyEstimateRowsReality } from "../../scripts/estimate/classifyEstimateRowReality";

describe("P2 structural and exterior calculators", () => {
  it("preserves traced mechanics while reporting the exact independently registered norm subset", () => {
    const samples = [
      "masonry_interior_gas_block_lay_standard",
      "concrete_foundation_interior_concrete_slab_pour_standard",
      "concrete_foundation_interior_reinforcement_frame_reinforce_standard",
      "concrete_foundation_interior_formwork_form_standard",
      "earthworks_interior_trench_excavate_standard",
      "roofing_interior_metal_roof_install_standard",
      "facade_interior_facade_paint_apply_standard",
      "carpentry_metal_interior_fence_install_standard",
      "carpentry_metal_interior_metal_frame_install_standard",
      "paving_roads_landscape_interior_asphalt_install_standard",
    ];

    const registeredNormRows: number[] = [];
    for (const workKey of samples) {
      const estimate = compileProductionExpandedEstimate10000({ workKey, quantity: 100, countryCode: "KG" });
      const reality = classifyEstimateRowsReality(estimate.rows);
      registeredNormRows.push(reality.source_backed_count);
      expect(estimate.rows).toHaveLength(59);
      expect(reality.missing_formula_trace_count).toBe(0);
      expect(estimate.rows.every((row) => row.normId && row.normVersion && row.normSourceId)).toBe(true);
      expect(estimate.rows.every((row) => row.priceStatus === "PRICE_MISSING" && row.total === null)).toBe(true);
    }
    expect(registeredNormRows).toEqual([3, 3, 3, 3, 0, 0, 1, 0, 0, 0]);
  });
});
