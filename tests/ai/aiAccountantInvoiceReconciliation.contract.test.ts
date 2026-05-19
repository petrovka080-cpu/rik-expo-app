import { answerAccountantAction } from "../../src/lib/ai/accountantFinance";
import { buildAccountantRealFinanceFixture } from "./aiAccountantRealFinance.fixture";

describe("accountant invoice reconciliation", () => {
  it("checks invoice against procurement request and supplier sources", () => {
    const answer = answerAccountantAction({
      context: buildAccountantRealFinanceFixture({ screenId: "finance.invoice.detail" }),
      actionId: "invoice_to_request_reconciliation",
    });

    expect(answer.chain.requestId).toBe("MR-701");
    expect(answer.providerTrace).toEqual(expect.arrayContaining(["aiProcurementLinkedRequestProvider", "aiSupplierLinkedProvider"]));
    expect(answer.sourceTrace).toEqual(expect.arrayContaining(["src:procurement:MR-701", "src:supplier:KP-701"]));
  });
});
