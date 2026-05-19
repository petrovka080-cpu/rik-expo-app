import { answerAccountantAction } from "../../src/lib/ai/accountantFinance";
import { buildAccountantRealFinanceFixture } from "./aiAccountantRealFinance.fixture";

describe("accountant director rationale draft", () => {
  it("prepares director rationale as a draft without payment or auto approval", () => {
    const answer = answerAccountantAction({
      context: buildAccountantRealFinanceFixture({ screenId: "accountant.main" }),
      actionId: "director_payment_rationale",
    });

    expect(answer.answerKind).toBe("draft_rationale");
    expect(answer.paymentCreated).toBe(false);
    expect(answer.autoApproval).toBe(false);
    expect(answer.approvalRoute?.required).toBe(true);
  });
});
