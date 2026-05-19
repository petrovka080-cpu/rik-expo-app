import { answerAccountantAction } from "../../src/lib/ai/accountantFinance";
import { buildAccountantRealFinanceFixture } from "./aiAccountantRealFinance.fixture";

describe("accountant critical payments", () => {
  it("explains critical payment risks from the finance pipeline", () => {
    const answer = answerAccountantAction({
      context: buildAccountantRealFinanceFixture({ screenId: "accountant.main" }),
      actionId: "critical_payments",
    });

    expect(answer.answerKind).toBe("risk_explanation");
    expect(answer.riskExplanations.length).toBeGreaterThan(0);
    expect(answer.providerTrace).toEqual(expect.arrayContaining(["aiFinanceRiskProvider"]));
    expect(answer.genericAnswerUsed).toBe(false);
  });
});
