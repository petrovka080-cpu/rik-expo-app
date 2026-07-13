import {
  capitalRenovationBundle,
  draftItemRowsForDetector,
  rowCode,
} from "./capitalRenovationTestHelpers";
import { detectEstimateFakeRows } from "../../src/lib/ai/estimateContinuousDetection";

describe("no fake rows after apartment wet-zone formula change", () => {
  it("keeps apartment calculator rows real, traced, and above wet-zone material threshold", () => {
    const bundle = capitalRenovationBundle();
    const detector = detectEstimateFakeRows({ rows: draftItemRowsForDetector(bundle.items), promptArea: 54 });
    const tileAdhesive = bundle.items.find((item) => rowCode(item) === "capreno_tile_adhesive_kg");
    const floorTile = bundle.items.find((item) => rowCode(item) === "capreno_bath_floor_tile_purchase_m2");
    const wallTile = bundle.items.find((item) => rowCode(item) === "capreno_bath_wall_tile_purchase_m2");
    const baseboard = bundle.items.find((item) => rowCode(item) === "capreno_baseboard_lm");
    const delivery = bundle.items.find((item) => rowCode(item) === "capreno_material_delivery_trips");

    expect(detector.failure_ids).not.toEqual(expect.arrayContaining([
      "all_rows_quantity_equal_input_area",
      "all_rows_unit_m2",
      "default_price_980",
      "calculated_row_without_formula_id",
      "calculated_row_without_calculation_trace",
      "calculated_row_without_template_version",
    ]));
    expect(tileAdhesive?.quantity).toBeGreaterThan(170);
    expect(floorTile?.quantity).toBeCloseTo(6.6, 2);
    expect(wallTile?.quantity).toBeCloseTo(33, 2);
    expect(baseboard?.unit).toBe("linear_m");
    expect(delivery?.unit).toBe("trip");
    expect(bundle.items.every((item) => item.formulaId && item.calculationTrace && item.templateVersion)).toBe(true);
  });
});
