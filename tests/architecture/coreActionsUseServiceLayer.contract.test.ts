import { buildBackendServiceBoundaryReport } from "../../scripts/audit/backendServiceBoundary.shared";

describe("backend service boundary: core actions use service layer", () => {
  it("requires every core action to collect in UI and mutate in service/RPC boundary", () => {
    const report = buildBackendServiceBoundaryReport({ assumeGatesPassed: true });
    const failed = report.core_actions.filter((action) => !action.passed);

    expect(failed).toEqual([]);
    expect(report.matrix.core_actions_use_service_layer).toBe(true);
    expect(report.matrix.multi_step_flows_transactional).toBe(true);
    expect(report.matrix.backend_validation_returned_to_ui).toBe(true);
  });
});
