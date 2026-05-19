import { answerAccountantFinanceQuestion } from "../../src/lib/ai/accountantFinance";
import { buildAccountantMissingSourceFixture } from "./aiAccountantRealFinance.fixture";

describe("accountant no fake finance data", () => {
  it("does not invent payments, invoices, acts, waybills, documents, cashflow, or records", () => {
    const answer = answerAccountantFinanceQuestion({
      context: buildAccountantMissingSourceFixture(),
      questionRu: "what can be paid today",
    });

    expect(answer.fakeInvoiceCreated).toBe(false);
    expect(answer.fakeActCreated).toBe(false);
    expect(answer.fakePaymentCreated).toBe(false);
    expect(answer.fakeWaybillCreated).toBe(false);
    expect(answer.fakeDocumentCreated).toBe(false);
    expect(answer.fakeCashflowCreated).toBe(false);
    expect(answer.fakeAccountingRecordCreated).toBe(false);
  });
});
