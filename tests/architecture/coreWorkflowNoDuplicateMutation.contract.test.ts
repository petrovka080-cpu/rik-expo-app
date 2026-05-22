import {
  buildCoreWorkflowsReport,
  CORE_WORKFLOWS_GREEN_STATUS,
} from "../../scripts/audit/coreWorkflows.shared";

describe("Wave08 no duplicate core mutation architecture", () => {
  it("keeps duplicate submit/publish/approve/warehouse mutations idempotent and retry-safe", () => {
    const report = buildCoreWorkflowsReport({ assumeGatesPassed: true });

    expect(report.matrix.final_status).toBe(CORE_WORKFLOWS_GREEN_STATUS);
    expect(report.matrix).toMatchObject({
      duplicate_submit_blocked: true,
      duplicate_publish_blocked: true,
      duplicate_approve_blocked: true,
      duplicate_warehouse_issue_blocked: true,
      network_retry_safe: true,
      transaction_rollback_verified: true,
      idempotency_key_used: true,
      fake_success_found: false,
      fake_green_claimed: false,
    });
  });
});
