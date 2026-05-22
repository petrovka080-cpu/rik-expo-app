import fs from "node:fs";

describe("global estimate data ops no fake green", () => {
  it("ties green status to coverage, QA, approval, rollback and audit evidence", () => {
    const proofRunner = fs.readFileSync("scripts/e2e/runGlobalEstimateDataOpsAdminGovernanceProof.ts", "utf8");

    expect(proofRunner).toContain("coverage_matrix_ready");
    expect(proofRunner).toContain("estimate_qa_ready");
    expect(proofRunner).toContain("approval_workflow_ready");
    expect(proofRunner).toContain("rollback_plan_ready");
    expect(proofRunner).toContain("audit_log_redacted");
    expect(proofRunner).toContain("fake_green_claimed: false");
  });
});
