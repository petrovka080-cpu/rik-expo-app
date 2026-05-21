import { answerAlwaysOnExternalKnowledgeQuestion } from "../../../src/lib/ai/alwaysOnExternalKnowledge";

const roles = ["foreman", "director", "buyer", "accountant", "warehouse", "contractor", "market", "client"];

describe("AI always-on external knowledge core", () => {
  it("answers public knowledge questions across role contexts", () => {
    for (const role of roles) {
      const result = answerAlwaysOnExternalKnowledgeQuestion({
        questionRu: "дай смету на паркет 100 м²",
        role,
        context: role,
        screenId: role,
      });

      expect(result.handled).toBe(true);
      expect(result.externalKnowledgeAvailable).toBe(true);
      expect(result.answerTextRu).toContain("Коротко:");
      expect(result.answerTextRu).toContain("Смета:");
    }
  });
});
