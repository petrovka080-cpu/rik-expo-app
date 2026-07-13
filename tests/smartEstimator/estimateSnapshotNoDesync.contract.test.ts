import { snapshotSummary } from "./smartEstimatorTestHelpers";

describe("smart estimator snapshot no desync", () => {
  it("keeps snapshot hashes aligned", () => {
    const summary = snapshotSummary();
    expect(summary.snapshot_desync_cases).toBe(0);
    expect(summary.ui_pdf_request_history_hashes_match).toBe(true);
  });
});
