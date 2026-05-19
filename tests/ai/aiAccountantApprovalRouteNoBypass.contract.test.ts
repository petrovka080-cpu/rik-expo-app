import { ACCOUNTANT_ROLE_POLICY, answerAccountantAction } from "../../src/lib/ai/accountantFinance";
import { buildAccountantRealFinanceFixture } from "./aiAccountantRealFinance.fixture";

describe("accountant approval route no bypass", () => {
  it("requires human approval and never auto-approves", () => {
    const answer = answerAccountantAction({
      context: buildAccountantRealFinanceFixture({ screenId: "accountant.invoice.detail" }),
      actionId: "prepare_approval_handoff",
    });

    expect(ACCOUNTANT_ROLE_POLICY.approvalBypassAllowed).toBe(false);
    expect(answer.approvalRoute).toMatchObject({
      required: true,
      approverRole: "director",
    });
    expect(answer.autoApproval).toBe(false);
    expect(answer.approvalBypassUsed).toBe(false);
  });
});
