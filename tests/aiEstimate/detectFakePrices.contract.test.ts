import {
  capitalRenovationBundle,
  draftItemRowsForDetector,
} from "../estimateCalculator/capitalRenovationTestHelpers";
import {
  detectEstimateFakeRows,
  type ContinuousEstimateDetectorRow,
} from "../../src/lib/ai/estimateContinuousDetection";

function fakePriceRow(index: number): ContinuousEstimateDetectorRow {
  return {
    row_id: `fake-price-${index}`,
    row_title: `Fake material ${index}`,
    section: "materials",
    line_type: "material",
    quantity: 54,
    unit: "sq_m",
    unit_price: index === 3 ? null : 980,
    amount: index === 3 ? 0 : 52_920,
    currency: index === 1 ? "USD" : "KGS",
    formula_id: null,
    template_id: null,
    template_version: null,
    calculation_trace_visible: false,
    price_source: null,
    price_source_type: null,
    price_confidence: null,
    is_manual_override: index === 2,
    override_reason: null,
    requires_measurement: false,
    included_in_procurement: true,
  };
}

describe("AI estimate fake price detectors", () => {
  it("detects fake prices, missing zero amounts, missing sources, and manual overrides without reasons", () => {
    const result = detectEstimateFakeRows({
      rows: Array.from({ length: 12 }, (_, index) => fakePriceRow(index)),
      promptArea: 54,
    });

    expect(result.failure_ids).toEqual(expect.arrayContaining([
      "fake_price_detector",
      "missing_price_zero_detector",
      "same_price_for_unrelated_rows_detector",
      "price_without_source_detector",
      "amount_without_price_source_detector",
      "manual_override_without_reason_detector",
    ]));
  });

  it("does not flag real unpriced apartment calculator rows as fake priced rows", () => {
    const bundle = capitalRenovationBundle();
    const result = detectEstimateFakeRows({
      rows: draftItemRowsForDetector(bundle.items),
      promptArea: 54,
    });

    expect(result.failure_ids).not.toContain("fake_price_detector");
    expect(result.failure_ids).not.toContain("missing_price_zero_detector");
    expect(result.failure_ids).not.toContain("same_price_for_unrelated_rows_detector");
    expect(result.failure_ids).not.toContain("price_without_source_detector");
    expect(result.failure_ids).not.toContain("amount_without_price_source_detector");
    expect(bundle.items.every((item) => item.unitPrice == null && item.totalPrice == null)).toBe(true);
  });
});
