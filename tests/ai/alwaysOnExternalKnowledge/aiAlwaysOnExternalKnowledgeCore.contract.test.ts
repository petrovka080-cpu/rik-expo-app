import { answerAlwaysOnExternalKnowledgeQuestion } from "../../../src/lib/ai/alwaysOnExternalKnowledge";

const roles = ["foreman", "director", "buyer", "accountant", "warehouse", "contractor", "market", "client"];

describe("AI always-on external knowledge core", () => {
  it("answers public knowledge questions across role contexts", () => {
    for (const role of roles) {
      const result = answerAlwaysOnExternalKnowledgeQuestion({
        questionRu: "как проверить влажность стяжки перед укладкой паркета",
        role,
        context: role,
        screenId: role,
      });

      expect(result.handled).toBe(true);
      expect(result.externalKnowledgeAvailable).toBe(true);
      expect(result.realAnswerMode).toBe("technology_checklist_answer");
      expect(result.answerTextRu).toContain("Коротко:");
      expect(result.answerTextRu).toContain("Чек-лист:");
    }
  });

  it("routes estimate requests to the canonical backend without a local estimate draft", () => {
    const result = answerAlwaysOnExternalKnowledgeQuestion({
      questionRu: "дай смету на паркет 100 м²",
      role: "director",
      context: "director",
      screenId: "director",
    });

    expect(result.handled).toBe(true);
    expect(result.realAnswerMode).toBe("canonical_estimate_backend_handoff");
    expect(result.answerTextRu).toContain("канонический редактор сметы");
    expect(result.answerTextRu).toContain("backend");
    expect(result.estimate).toBeUndefined();
  });
});
