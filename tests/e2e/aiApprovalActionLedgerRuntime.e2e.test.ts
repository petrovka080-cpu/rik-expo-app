import fs from "node:fs";

const runnerPath = "scripts/e2e/runAiApprovalActionLedgerMaestro.ts";

describe("AI approval action ledger runtime E2E contract", () => {
  it("uses persistent-ledger blockers, approval testIDs, and no fake execution", () => {
    const runner = fs.readFileSync(runnerPath, "utf8");

    expect(runner).toContain("runAiApprovalActionLedgerMaestro");
    expect(runner).toContain("submitActionForApprovalBff");
    expect(runner).toContain("BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND");
    expect(runner).toContain("ai.approval.inbox.screen");
    expect(runner).toContain("ai.approval.action-card");
    expect(runner).toContain("ai.approval.status");
    expect(runner).toContain("ai.approval.approve");
    expect(runner).toContain("ai.approval.reject");
    expect(runner).toContain("ai.approval.execute-approved");
    expect(runner).toContain("ai.approval.evidence");
    expect(runner).toContain("ai.approval.idempotency");
    expect(runner).toContain("mutations_created: 0");
    expect(runner).toContain("fake_local_approval: false");
    expect(runner).toContain("fake_action_status: false");
    expect(runner).toContain("fake_execution: false");
    expect(runner).toContain("credentials_in_cli_args: false");
    expect(runner).toContain("credentials_printed: false");
    expect(runner).not.toContain("auth.admin");
    expect(runner).not.toContain("listUsers");
    expect(runner).not.toContain("service_role");
  });
});
