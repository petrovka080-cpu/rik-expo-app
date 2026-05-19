import { answerAccountantAction } from "../../src/lib/ai/accountantFinance";
import { buildAccountantRealFinanceFixture } from "./aiAccountantRealFinance.fixture";

describe("accountant uses construction core", () => {
  it("links act, work, object, and estimate sources for finance decisions", () => {
    const answer = answerAccountantAction({
      context: buildAccountantRealFinanceFixture({ screenId: "accountant.invoice.detail" }),
      actionId: "estimate_to_act_reconciliation",
    });

    expect(answer.chain.workId).toBe("WRK-701");
    expect(answer.chain.objectId).toBe("OBJ-7");
    expect(answer.chain.estimateLineId).toBe("EST-91");
    expect(answer.providerTrace).toEqual(expect.arrayContaining(["aiEstimateLinkedLineProvider", "aiWorkObjectLinkedProvider"]));
  });
});
