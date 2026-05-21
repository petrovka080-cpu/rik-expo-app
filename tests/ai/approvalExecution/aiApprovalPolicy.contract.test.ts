import { AI_APPROVAL_EXECUTION_POLICY, AI_APPROVAL_EXECUTION_WAVE } from "../../../src/lib/ai/approvalExecutionBoundary";

describe("ai approval execution policy", () => {
  it("locks the human approval ledger execution boundary wave", () => {
    expect(AI_APPROVAL_EXECUTION_WAVE).toBe("S_AI_HUMAN_APPROVAL_LEDGER_EXECUTION_BOUNDARY_POINT_OF_NO_RETURN");
    expect(AI_APPROVAL_EXECUTION_POLICY).toMatchObject({
      aiDraftIsNotExecution: true,
      humanApprovalIsNotExecution: true,
      executionBoundaryRequired: true,
      existingActionLedgerRequired: true,
      requesterSelfApprovalAllowed: false,
      autoApprovalAllowed: false,
      directDbMutationAllowed: false,
    });
  });
});
