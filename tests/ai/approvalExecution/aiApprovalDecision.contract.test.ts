import { createSelfApprovalAttempt, createPurchaseApprovalScenario } from "./approvalExecutionTestFixtures";

describe("ai approval decision", () => {
  it("records approved human decision with reviewed refs and diff", () => {
    const { decision } = createPurchaseApprovalScenario();

    expect(decision?.decision).toBe("approved");
    expect(decision?.impactDiffReviewed).toBe(true);
    expect(decision?.preconditionsReviewed).toBe(true);
    expect(decision?.approvalPolicySnapshot.requesterCannotApproveOwnRequest).toBe(true);
  });

  it("blocks requester self approval", () => {
    const { decision } = createSelfApprovalAttempt();
    expect(decision.decision).toBe("needs_changes");
    expect(decision.commentRu).toContain("Requester cannot approve own request");
  });
});
