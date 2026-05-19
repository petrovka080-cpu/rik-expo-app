import { answerAccountantFinanceQuestion } from "../../src/lib/ai/accountantFinance";
import { buildAccountantMissingSourceFixture, buildAccountantRealFinanceFixture } from "./aiAccountantRealFinance.fixture";

describe("accountant estimate act documents", () => {
  it("uses estimate/project/document providers for source claims", () => {
    const answer = answerAccountantFinanceQuestion({
      context: buildAccountantRealFinanceFixture(),
      questionRu: "сверь счет со сметой проектом и актом",
    });

    expect(answer.providerTrace).toEqual(expect.arrayContaining([
      "aiAccountantEstimateProvider",
      "aiAccountantActProvider",
      "aiAccountantDocumentEvidenceProvider",
    ]));
    expect(answer.sourceTrace).toEqual(expect.arrayContaining(["src:estimate:EST-91", "src:project:KJ-22"]));
  });

  it("gives exact missing data instead of inventing sources", () => {
    const answer = answerAccountantFinanceQuestion({
      context: buildAccountantMissingSourceFixture(),
      questionRu: "сверь счет со сметой проектом и актом",
    });

    expect(answer.missingData).toEqual(expect.arrayContaining([
      "акт по счету не найден",
      "сметная строка не связана",
    ]));
    expect(answer.fakeDocumentCreated).toBe(false);
    expect(answer.answerRu).not.toContain("Проект КЖ.pdf, раздел бетонные работы");
  });
});
