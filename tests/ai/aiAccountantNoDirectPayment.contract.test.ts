import { answerAccountantAction } from "../../src/lib/ai/accountantFinance";
import { buildAccountantRealFinanceFixture } from "./aiAccountantRealFinance.fixture";

describe("accountant no direct payment", () => {
  it("keeps approval handoff free of payment execution and postings", () => {
    const answer = answerAccountantAction({
      context: buildAccountantRealFinanceFixture({ screenId: "accountant.main" }),
      actionId: "approval_queue_for_finance",
    });

    expect(answer.answerKind).toBe("approval_route");
    expect(answer.paymentCreated).toBe(false);
    expect(answer.paymentExecuted).toBe(false);
    expect(answer.accountingRecordCreated).toBe(false);
    expect(answer.directPaymentPathUsed).toBe(false);
  });
});
