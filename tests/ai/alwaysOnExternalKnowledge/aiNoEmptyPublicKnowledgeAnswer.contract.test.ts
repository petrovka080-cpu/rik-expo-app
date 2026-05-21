import { answerAlwaysOnExternalKnowledgeQuestion } from "../../../src/lib/ai/alwaysOnExternalKnowledge";

describe("AI no empty public knowledge answer", () => {
  it("does not return a diagnostic refusal for estimates", () => {
    const result = answerAlwaysOnExternalKnowledgeQuestion({
      questionRu: "дай смету на установку паркета 100 кв м",
      role: "foreman",
      screenId: "foreman",
    });

    expect(result.handled).toBe(true);
    expect(result.answerTextRu).toBeTruthy();
    expect(result.answerTextRu?.toLowerCase()).not.toMatch(/^(не найдено|в доступных данных|pdf не найден)/);
  });
});
