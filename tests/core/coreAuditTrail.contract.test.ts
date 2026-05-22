import {
  buildCoreWorkflowsReport,
  CORE_WORKFLOWS_GREEN_STATUS,
} from "../../scripts/audit/coreWorkflows.shared";

describe("Wave08 core workflow audit trail", () => {
  it("proves every core workflow has a service/RPC audit event boundary", () => {
    const report = buildCoreWorkflowsReport({ assumeGatesPassed: true });

    expect(report.matrix.final_status).toBe(CORE_WORKFLOWS_GREEN_STATUS);
    expect(report.matrix.audit_event_written_once).toBe(true);
    expect(report.audit_events.every((workflow) => workflow.audited)).toBe(true);
  });
});
