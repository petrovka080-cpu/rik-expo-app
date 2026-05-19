import { answerAccountantAction } from "../../src/lib/ai/accountantFinance";
import { buildAccountantRealFinanceFixture } from "./aiAccountantRealFinance.fixture";

describe("accountant no direct payment or posting", () => {
  it("prepares approval route without creating payment, posting, or invoice mutation", () => {
    const answer = answerAccountantAction({
      context: buildAccountantRealFinanceFixture({ screenId: "accountant.invoice.detail" }),
      actionId: "prepare_approval_handoff",
    });

    expect(answer.answerKind).toBe("approval_route");
    expect(answer.paymentCreated).toBe(false);
    expect(answer.postingCreated).toBe(false);
    expect(answer.invoiceMutated).toBe(false);
    expect(answer.directPaymentPathUsed).toBe(false);
    expect(answer.answerRu).toContain("Платеж не создан");
  });
});
