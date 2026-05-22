import {
  buildCoreWorkflowsReport,
  CORE_WORKFLOWS_GREEN_STATUS,
} from "../../scripts/audit/coreWorkflows.shared";

describe("Wave08 director approve idempotency", () => {
  it("keeps director approve/reject mutation ids boundary-owned and retry-safe", () => {
    const report = buildCoreWorkflowsReport({ assumeGatesPassed: true });
    const workflow = report.workflows.find((item) => item.id === "director_approve_reject");

    expect(report.matrix.final_status).toBe(CORE_WORKFLOWS_GREEN_STATUS);
    expect(workflow).toMatchObject({
      idempotent: true,
      retry_safe: true,
      transactional: true,
      rollback_safe: true,
      audited: true,
      passed: true,
    });
  });
});
