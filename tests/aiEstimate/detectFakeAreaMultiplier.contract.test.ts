import {
  capitalRenovationBundle,
  draftItemRowsForDetector,
  rowCode,
} from "../estimateCalculator/capitalRenovationTestHelpers";
import {
  detectEstimateFakeRows,
  type ContinuousEstimateDetectorRow,
} from "../../src/lib/ai/estimateContinuousDetection";

function fakeRow(index: number): ContinuousEstimateDetectorRow {
  const delivery = index % 5 === 0;
  const baseboard = index % 5 === 1;
  return {
    row_id: `legacy-fake-${index}`,
    row_title: delivery ? "Доставка материалов" : baseboard ? "Монтаж плинтуса" : `Материал сметы ${index}`,
    section: index % 3 === 0 ? "materials" : "labor",
    line_type: index % 3 === 0 ? "material" : "work",
    quantity: 54,
    unit: "м²",
    unit_price: 980,
    amount: 52_920,
    currency: index === 0 ? "USD" : "KGS",
    formula_id: null,
    template_id: null,
    template_version: null,
    calculation_trace_visible: false,
    price_source: null,
    requires_measurement: false,
    included_in_procurement: index % 3 === 0,
  };
}

describe("AI estimate fake area multiplier detector", () => {
  it("fails legacy area-multiplier rows and does not fail real apartment calculator rows", () => {
    const fakeDetector = detectEstimateFakeRows({
      rows: Array.from({ length: 14 }, (_, index) => fakeRow(index)),
      promptArea: 54,
    });

    expect(fakeDetector.failure_ids).toEqual(expect.arrayContaining([
      "all_rows_quantity_equal_input_area",
      "all_rows_unit_m2",
      "same_price_repeated_for_unrelated_rows",
      "same_total_repeated_for_unrelated_rows",
      "default_price_980",
      "fake_usd_prices",
      "delivery_unit_m2",
      "baseboard_unit_m2",
      "calculated_row_without_formula_id",
      "calculated_row_without_calculation_trace",
      "calculated_row_without_template_version",
    ]));

    const bundle = capitalRenovationBundle();
    const realDetector = detectEstimateFakeRows({ rows: draftItemRowsForDetector(bundle.items), promptArea: 54 });
    const tileAdhesive = bundle.items.find((item) => rowCode(item) === "capreno_tile_adhesive_kg");

    expect(realDetector.failure_ids).not.toContain("all_rows_quantity_equal_input_area");
    expect(realDetector.failure_ids).not.toContain("all_rows_unit_m2");
    expect(realDetector.failure_ids).not.toContain("default_price_980");
    expect(realDetector.failure_ids).not.toContain("calculated_row_without_formula_id");
    expect(tileAdhesive?.quantity).toBeGreaterThan(170);
    expect(tileAdhesive?.quantityFormula).toBe("(bathroom_floor_area_m2 + bathroom_wall_tile_area_m2) * 4.5 * 1.1");
    expect(tileAdhesive?.unit).toBe("kg");
  });
});
