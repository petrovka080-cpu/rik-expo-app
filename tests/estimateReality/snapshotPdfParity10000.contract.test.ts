import {
  validateEstimateSnapshotPdfParity10000,
  STOP_AI_ESTIMATE_10000_SNAPSHOT_PDF_PARITY_FAILED,
} from "../../scripts/estimate/validateEstimateSnapshotPdfParity10000";

describe("estimate snapshot PDF parity 10000", () => {
  it("keeps mandatory estimate PDF rows equal to the saved snapshot rows", () => {
    const result = validateEstimateSnapshotPdfParity10000();

    expect(result.final_status).toBe(STOP_AI_ESTIMATE_10000_SNAPSHOT_PDF_PARITY_FAILED);
    expect(result.pdf_rows_equal_snapshot_rows).toBe(true);
    expect(result.pdf_no_mojibake).toBe(true);
    expect(result.pdf_contains_norm_sources).toBe(true);
    expect(result.pdf_contains_calculation_trace).toBe(true);
    expect(result.rows_or_missing_params_captured).toBe(true);
    expect(result.blockers).toEqual([
      "diamond_drilling_full:pdf_diamond_drilling_not_work_specific",
      "profile_sheet_fence_full:pdf_profile_fence_not_work_specific",
      "mansard_roof_full:pdf_mansard_roof_not_work_specific",
    ]);
  });
});
