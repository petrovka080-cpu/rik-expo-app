import { buildBackendServiceBoundaryReport } from "../../scripts/audit/backendServiceBoundary.shared";

describe("backend service boundary: no direct status writes from screens", () => {
  it("blocks screen-local status mutations on core tables", () => {
    const report = buildBackendServiceBoundaryReport({ assumeGatesPassed: true });

    expect(report.matrix.direct_status_write_from_screens_found).toBe(false);
    expect(report.direct_writes.findings.filter((finding) => finding.kind === "direct_status_write")).toEqual([]);
  });
});
