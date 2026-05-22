import { buildBackendServiceBoundaryReport } from "../../scripts/audit/backendServiceBoundary.shared";

describe("backend service boundary: core mutations write audit events", () => {
  it("requires every core mutation family to emit audit/observability evidence", () => {
    const report = buildBackendServiceBoundaryReport({ assumeGatesPassed: true });

    expect(report.audit_events.missing_audit_events).toEqual([]);
    expect(report.matrix.core_mutations_have_audit_events).toBe(true);
  });
});
