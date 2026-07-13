import { runEstimateQualityPdfParityAudit } from "../../scripts/e2e/runEstimateQualityGateProtocolAudit";

describe("PDF/request/history parity quality", () => {
  it("keeps all payloads on one immutable snapshot", () => {
    const audit = runEstimateQualityPdfParityAudit({ writeArtifacts: false });

    expect(audit.ui_pdf_request_history_same_snapshot).toBe(true);
    expect(audit.pdf_recalculated_separately).toBe(false);
    expect(audit.history_recalculated_separately).toBe(false);
  });
});
