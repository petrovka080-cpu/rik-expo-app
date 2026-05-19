import { answerAccountantFinanceQuestion } from "../../src/lib/ai/accountantFinance";
import { buildAccountantRealFinanceFixture } from "./aiAccountantRealFinance.fixture";

describe("accountant invoice act payment chain", () => {
  it("links invoice, act, estimate, work, object, payment and approval sources", () => {
    const answer = answerAccountantFinanceQuestion({
      context: buildAccountantRealFinanceFixture(),
      questionRu: "покажи смета акт счет и движение оплаты",
    });

    expect(answer.providerTrace).toEqual(expect.arrayContaining([
      "aiAccountantEstimateProvider",
      "aiAccountantProcurementLinkProvider",
    ]));
    expect(answer.chain).toMatchObject({
      invoiceId: "INV-204",
      requestId: "MR-701",
      actId: "ACT-701",
      workId: "WRK-701",
      objectId: "OBJ-7",
      estimateLineId: "EST-91",
    });
    expect(answer.answerRu).toContain("Смета: EST-91");
    expect(answer.answerRu).toContain("Платежи:");
  });
});
