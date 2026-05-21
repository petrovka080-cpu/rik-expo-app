import { answerAlwaysOnExternalKnowledgeQuestion } from "../../../src/lib/ai/alwaysOnExternalKnowledge";

describe("AI accounting reference all screens", () => {
  it("returns a result-first accounting reference with country and review status", () => {
    const result = answerAlwaysOnExternalKnowledgeQuestion({
      questionRu: "какая проводка по счету",
      role: "foreman",
      screenId: "foreman",
    });

    expect(result.handled).toBe(true);
    expect(result.realAnswerMode).toBe("accounting_reference_answer");
    expect(result.answerTextRu).toContain("Проводка-справка:");
    expect(result.answerTextRu).toContain("Кыргызстан");
    expect(result.answerTextRu).toContain("Требуется проверка бухгалтером");
  });
});
