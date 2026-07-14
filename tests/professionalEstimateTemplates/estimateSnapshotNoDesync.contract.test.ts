import { professionalSnapshotAudit } from "./professionalEstimateTestHelpers";

describe("professional estimate snapshot no desync", () => {
  it("keeps UI/PDF/request/history hashes from one immutable snapshot", () => {
    const result = professionalSnapshotAudit();
    expect(result.snapshot_cases_total).toBeGreaterThanOrEqual(150);
    expect(result.ui_pdf_request_history_hashes_match).toBe(true);
    expect(result.ui_repriced_after_snapshot).toBe(false);
    expect(result.pdf_repriced_after_snapshot).toBe(false);
    expect(result.history_repriced_after_snapshot).toBe(false);
  });
});
