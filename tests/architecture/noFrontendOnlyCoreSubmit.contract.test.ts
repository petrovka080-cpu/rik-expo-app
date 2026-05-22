import { buildBackendServiceBoundaryReport } from "../../scripts/audit/backendServiceBoundary.shared";

describe("backend service boundary: no frontend-only core submit", () => {
  it("keeps core submit/publish/approve actions behind service boundaries", () => {
    const report = buildBackendServiceBoundaryReport({ assumeGatesPassed: true });

    expect(report.matrix.frontend_only_submit_found).toBe(false);
    expect(report.matrix.frontend_only_publish_found).toBe(false);
    expect(report.matrix.core_actions_use_service_layer).toBe(true);
  });
});
