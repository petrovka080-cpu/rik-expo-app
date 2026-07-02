import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  detectEstimateFakeRows,
  structuredRowsForDetector,
  type ContinuousEstimateDetectorRow,
} from "../../src/lib/ai/estimateContinuousDetection";

const PROMPT = "Капитальный ремонт квартиры 54 кв метра";

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
  it("fails legacy area-multiplier rows and does not fail real apartment BOQ rows", () => {
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

    const payload = buildConsumerRepairAiDraft(PROMPT).structuredEstimatePayload;
    expect(payload).toBeTruthy();
    const rows = payload!.rows;
    const realDetector = detectEstimateFakeRows({ rows: structuredRowsForDetector(rows), promptArea: 54 });
    const tile = rows.find((row) => row.rowId.includes("apartment_ceramic_tile_wet_zones"));

    expect(realDetector.failure_ids).toEqual([]);
    expect(tile?.quantity).toBeGreaterThan(35);
    expect(tile?.quantityFormula).toBe("q * 0.72");
    expect(tile?.unit).toBe("sq_m");
  });
});
