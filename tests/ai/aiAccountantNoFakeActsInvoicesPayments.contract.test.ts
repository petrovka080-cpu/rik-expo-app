import { answerAccountantFinanceQuestion } from "../../src/lib/ai/accountantFinance";
import { buildAccountantMissingSourceFixture } from "./aiAccountantRealFinance.fixture";

describe("accountant no fake acts invoices payments", () => {
  it("does not fabricate missing accounting documents or payments", () => {
    const answer = answerAccountantFinanceQuestion({
      context: buildAccountantMissingSourceFixture(),
      questionRu: "какие документы нужны для оплаты и можно ли оплатить",
    });

    expect(answer.fakeInvoiceCreated).toBe(false);
    expect(answer.fakeActCreated).toBe(false);
    expect(answer.fakePaymentCreated).toBe(false);
    expect(answer.fakeDocumentCreated).toBe(false);
    expect(answer.paymentCreated).toBe(false);
    expect(answer.answerRu).toContain("акт по счету не найден");
  });
});
