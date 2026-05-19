import { answerAccountantFinanceQuestion } from "../../src/lib/ai/accountantFinance";
import { buildAccountantRealFinanceFixture } from "./aiAccountantRealFinance.fixture";

describe("accountant payment risk source trace", () => {
  it("explains payment risk with source trace", () => {
    const answer = answerAccountantFinanceQuestion({
      context: buildAccountantRealFinanceFixture(),
      questionRu: "почему этот счет рискованный",
    });

    expect(answer.answerKind).toBe("risk_explanation");
    expect(answer.risks.length).toBeGreaterThan(0);
    expect(answer.risks[0]?.sourceRefs.length).toBeGreaterThan(0);
    expect(answer.sourceTrace.length).toBeGreaterThan(0);
    expect(answer.answerRu).toContain("Риски:");
  });
});
