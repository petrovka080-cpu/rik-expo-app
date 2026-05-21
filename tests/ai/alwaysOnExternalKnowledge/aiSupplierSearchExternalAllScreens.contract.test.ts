import { answerAlwaysOnExternalKnowledgeQuestion } from "../../../src/lib/ai/alwaysOnExternalKnowledge";

describe("AI supplier search external all screens", () => {
  it("returns supplier options without waiting for internal-only data", () => {
    const result = answerAlwaysOnExternalKnowledgeQuestion({
      questionRu: "найди поставщиков ГКЛ",
      role: "warehouse",
      screenId: "warehouse",
    });

    expect(result.handled).toBe(true);
    expect(result.realAnswerMode).toBe("supplier_market_search");
    expect(result.answerTextRu).toContain("Варианты:");
    expect(result.answerTextRu).toContain("ГКЛ");
  });
});
