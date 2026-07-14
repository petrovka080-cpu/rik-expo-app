import { detectEstimateFakeRows, type ContinuousEstimateDetectorRow } from "../../src/lib/ai/estimateContinuousDetection/continuousAiEstimateDetector";
import { extended100CertificationSummary } from "../estimateGolden/extended100TestHelpers";

function detectorRow(input: Partial<ContinuousEstimateDetectorRow> = {}): ContinuousEstimateDetectorRow {
  return {
    row_id: input.row_id ?? "fake-row",
    row_title: input.row_title ?? "Fake row",
    section: input.section ?? "labor",
    line_type: input.line_type ?? "work",
    quantity: input.quantity ?? 54,
    unit: input.unit ?? "sq_m",
    unit_price: input.unit_price ?? 980,
    amount: input.amount ?? 52920,
    currency: input.currency ?? "KGS",
    formula_id: input.formula_id ?? null,
    template_id: input.template_id ?? null,
    template_version: input.template_version ?? null,
    calculation_trace_visible: input.calculation_trace_visible ?? false,
    calculation_trace: input.calculation_trace ?? null,
    norm_id: input.norm_id ?? null,
    norm_source: input.norm_source ?? null,
    norm_version: input.norm_version ?? null,
    price_source: input.price_source ?? null,
    price_source_type: input.price_source_type ?? null,
    price_confidence: input.price_confidence ?? null,
    is_manual_override: input.is_manual_override ?? false,
    override_reason: input.override_reason ?? null,
    requires_measurement: input.requires_measurement ?? false,
    included_in_procurement: input.included_in_procurement ?? null,
  };
}

describe("continuous detector extended estimate matrix", () => {
  it("runs the 100 case matrix and exposes extended detector classes", () => {
    const summary = extended100CertificationSummary();
    const detector = detectEstimateFakeRows({
      rows: Array.from({ length: 8 }, (_, index) => detectorRow({ row_id: `fake-${index}` })),
      promptArea: 54,
    });

    expect(summary.continuous_detector_checks_extended_estimate).toBe(true);
    expect(summary.continuous_detector_runs_100_case_matrix).toBe(true);
    expect(detector.extended_sections_detector).toBe(true);
    expect(detector.wrong_unit_by_work_group_detector).toBe(true);
    expect(detector.missing_procurement_flag_detector).toBe(true);
    expect(detector.failure_ids).toEqual(expect.arrayContaining([
      "all_rows_quantity_equal_input_area",
      "default_price_980",
      "procurement_flag_missing",
    ]));
  });
});
