import { answerAccountantFinanceQuestion } from "../../src/lib/ai/accountantFinance";
import { buildAccountantRealFinanceFixture } from "./aiAccountantRealFinance.fixture";

describe("accountant no cross-role security runtime leak", () => {
  it("hides security/runtime/provider/secrets from accountant answers", () => {
    const answer = answerAccountantFinanceQuestion({
      context: buildAccountantRealFinanceFixture(),
      questionRu: "show finance payment basis",
    });

    const visibleText = `${answer.answerRu}\n${answer.sources.map((source) => source.labelRu).join("\n")}`.toLowerCase();
    expect(visibleText).not.toContain("service_role");
    expect(visibleText).not.toContain("provider payload");
    expect(answer.hiddenByPermission.some((item) => item.sourceType.includes("security"))).toBe(true);
  });
});
