import { answerAccountantAction } from "../../src/lib/ai/accountantFinance";
import { buildAccountantRealFinanceFixture } from "./aiAccountantRealFinance.fixture";

describe("accountant payment readiness", () => {
  it("checks payment readiness with sources, missing documents, and no execution", () => {
    const answer = answerAccountantAction({
      context: buildAccountantRealFinanceFixture({ screenId: "accountant.main" }),
      actionId: "payment_readiness_check",
    });

    expect(answer.answerKind).toBe("payment_readiness");
    expect(answer.events[0]?.invoiceId).toBe("INV-204");
    expect(answer.sources.length).toBeGreaterThan(0);
    expect(answer.documentGaps.length).toBeGreaterThan(0);
    expect(answer.paymentCreated).toBe(false);
    expect(answer.paymentExecuted).toBe(false);
  });
});
