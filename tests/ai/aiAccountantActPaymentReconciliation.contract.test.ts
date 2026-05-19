import { answerAccountantAction } from "../../src/lib/ai/accountantFinance";
import { buildAccountantRealFinanceFixture } from "./aiAccountantRealFinance.fixture";

describe("accountant act payment reconciliation", () => {
  it("checks act to payment and linked work/object context", () => {
    const answer = answerAccountantAction({
      context: buildAccountantRealFinanceFixture({ screenId: "finance.payment.detail" }),
      actionId: "act_to_payment_reconciliation",
    });

    expect(answer.chain.actId).toBe("ACT-701");
    expect(answer.events[0]?.paymentId).toBe("PAY-10");
    expect(answer.providerTrace).toEqual(expect.arrayContaining(["aiActsProvider", "aiPaymentDetailProvider", "aiWorkObjectLinkedProvider"]));
  });
});
