import { buildBackendServiceBoundaryReport } from "../../scripts/audit/backendServiceBoundary.shared";

describe("backend service boundary: no fake PDF status", () => {
  it("keeps generated PDF status in service/storage boundary instead of UI fabrication", () => {
    const report = buildBackendServiceBoundaryReport({ assumeGatesPassed: true });

    expect(report.matrix.fake_pdf_status_found).toBe(false);
    expect(report.direct_writes.findings.filter((finding) => finding.kind === "fake_pdf_status")).toEqual([]);
  });
});
