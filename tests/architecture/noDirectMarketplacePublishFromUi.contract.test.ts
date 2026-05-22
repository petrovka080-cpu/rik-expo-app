import { buildBackendServiceBoundaryReport } from "../../scripts/audit/backendServiceBoundary.shared";

describe("backend service boundary: no direct marketplace publish from UI", () => {
  it("requires marketplace listing publish to go through profile service and transport", () => {
    const report = buildBackendServiceBoundaryReport({ assumeGatesPassed: true });
    const marketplace = report.core_actions.find((action) => action.id === "marketplace_publish");

    expect(report.matrix.frontend_only_publish_found).toBe(false);
    expect(marketplace?.screen_calls_service).toBe(true);
    expect(marketplace?.service_validates).toBe(true);
    expect(marketplace?.service_mutates).toBe(true);
    expect(marketplace?.service_writes_audit_event).toBe(true);
  });
});
