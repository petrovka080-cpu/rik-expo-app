import { answerAccountantFinanceQuestion } from "../../src/lib/ai/accountantFinance";
import { buildAccountantRealFinanceFixture } from "./aiAccountantRealFinance.fixture";

describe("accountant no cross-role security leak", () => {
  it("sanitizes runtime/provider/security sources from answer and source trace", () => {
    const answer = answerAccountantFinanceQuestion({
      context: buildAccountantRealFinanceFixture(),
      questionRu: "что по оплатам сегодня",
    });
    const joined = `${answer.answerRu}\n${answer.sourceTrace.join("\n")}`.toLowerCase();

    expect(joined).not.toContain("runtime debug");
    expect(joined).not.toContain("service_role");
    expect(joined).not.toContain("secret");
    expect(joined).not.toContain("provider payload");
    expect(answer.sourceTrace).not.toContain("src:security:hidden");
  });
});
