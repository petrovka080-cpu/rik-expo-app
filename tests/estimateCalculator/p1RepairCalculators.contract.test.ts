import { compileProductionExpandedEstimate10000 } from "../../src/lib/ai/estimateTemplate10000";
import { classifyEstimateRowsReality } from "../../scripts/estimate/classifyEstimateRowReality";

describe("P1 repair calculators", () => {
  it("preserve complete mechanics while reporting the exact independently registered norm subset", () => {
    const samples = [
      "demolition_interior_partition_remove_standard",
      "plaster_paint_interior_wall_plaster_apply_standard",
      "plaster_paint_interior_wall_putty_apply_standard",
      "plaster_paint_interior_paint_wall_apply_standard",
      "tile_stone_interior_tile_floor_lay_standard",
      "flooring_interior_laminate_install_standard",
      "waterproofing_interior_bathroom_apply_standard",
      "drywall_ceiling_interior_drywall_partition_install_standard",
      "doors_windows_interior_interior_door_install_standard",
    ];

    const registeredNormRows: number[] = [];
    for (const workKey of samples) {
      const estimate = compileProductionExpandedEstimate10000({ workKey, quantity: 100, countryCode: "KG" });
      const reality = classifyEstimateRowsReality(estimate.rows);
      registeredNormRows.push(reality.source_backed_count);
      expect(estimate.rows).toHaveLength(59);
      expect(reality.missing_formula_trace_count).toBe(0);
      expect(estimate.rows.some((row) => row.lineType === "material")).toBe(true);
      expect(estimate.rows.some((row) => row.lineType === "work")).toBe(true);
      expect(estimate.rows.some((row) => row.lineType === "service")).toBe(true);
      expect(estimate.rows.some((row) => row.lineType === "equipment")).toBe(true);
      expect(estimate.rows.some((row) => row.includedInProcurement)).toBe(true);
    }
    expect(registeredNormRows).toEqual([0, 1, 1, 2, 2, 0, 2, 2, 0]);
  });
});
