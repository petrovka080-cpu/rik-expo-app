import { answerAlwaysOnExternalKnowledgeQuestion } from "../../../src/lib/ai/alwaysOnExternalKnowledge";

describe("AI no diagnostics before answer", () => {
  it("keeps source diagnostics collapsed at the bottom", () => {
    const result = answerAlwaysOnExternalKnowledgeQuestion({
      questionRu: "дай смету на паркет 100 м²",
      role: "foreman",
      screenId: "foreman",
    });
    const text = result.answerTextRu ?? "";
    const sourcesIndex = text.indexOf("Источники:");

    expect(text.startsWith("Коротко:")).toBe(true);
    expect(sourcesIndex).toBeGreaterThan(0);
    expect(text.slice(0, sourcesIndex).toLowerCase()).not.toContain("интернет не использовался");
    expect(text).toContain("Показать");
  });
});
