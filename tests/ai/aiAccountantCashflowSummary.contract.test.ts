import { answerAccountantFinanceQuestion } from "../../src/lib/ai/accountantFinance";
import { buildAccountantRealFinanceFixture } from "./aiAccountantRealFinance.fixture";

describe("accountant cashflow summary", () => {
  it("uses cashflow sources and does not invent movement", () => {
    const answer = answerAccountantFinanceQuestion({
      context: buildAccountantRealFinanceFixture({ screenId: "finance.cashflow" }),
      questionRu: "покажи движение денег",
    });

    expect(answer.answerKind).toBe("cashflow_summary");
    expect(answer.period?.labelRu).toBeTruthy();
    expect(answer.cashflowInvented).toBe(false);
    expect(answer.sourceTrace).toEqual(expect.arrayContaining(["src:payment:PAY-10"]));
  });
});
