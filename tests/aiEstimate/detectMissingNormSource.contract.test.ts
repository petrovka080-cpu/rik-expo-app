import {
  detectEstimateFakeRows,
  type ContinuousEstimateDetectorRow,
} from "../../src/lib/ai/estimateContinuousDetection";

function detectorRow(overrides: Partial<ContinuousEstimateDetectorRow> = {}): ContinuousEstimateDetectorRow {
  return {
    row_id: "norm-detector-row",
    row_title: "Norm detector row",
    section: "materials",
    line_type: "material",
    quantity: 10,
    unit: "m2",
    unit_price: null,
    amount: null,
    currency: "KGS",
    formula_id: "formula_v1",
    template_id: "template_v1",
    template_version: "1.0.0",
    calculation_trace_visible: true,
    calculation_trace: "template=template_v1; templateVersion=1.0.0; formula=q; result=10 m2",
    price_source: null,
    requires_measurement: false,
    included_in_procurement: true,
    ...overrides,
  };
}

describe("continuous detector missing norm source", () => {
  it("detects missing, hardcoded, unknown and AI norm sources", () => {
    const missing = detectEstimateFakeRows({ rows: [detectorRow()] });
    expect(missing.missing_norm_source_detector).toBe(true);
    expect(missing.failure_ids).toEqual(expect.arrayContaining([
      "missing_norm_source",
      "template_without_norm_binding",
      "trace_without_norm_id",
    ]));

    const hardcoded = detectEstimateFakeRows({
      rows: [detectorRow({ calculation_trace: "template=t; templateVersion=1; formula=q; normFactor=1.8; result=18 kg" })],
    });
    expect(hardcoded.failure_ids).toContain("hardcoded_norm_rate");

    const badSource = detectEstimateFakeRows({
      rows: [detectorRow({
        norm_id: "norm:bad",
        norm_source: "unknown_ai_generated",
        norm_version: "2026.07.03",
        norm_source_type: "ai_generated",
      })],
    });
    expect(badSource.failure_ids).toEqual(expect.arrayContaining(["unknown_norm_source", "ai_as_norm_source"]));
  });
});
