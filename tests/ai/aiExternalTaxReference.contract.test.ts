import { makeExternalKnowledgeAnswer } from "./aiVerifiedExternalKnowledgeTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: tax", () => {
  it("uses official or trusted sources for tax references", () => {
    const answer = makeExternalKnowledgeAnswer({
      requestId: "test:tax",
      questionRu: "какой налоговый риск",
      normalizedQuestionRu: "какой налоговый риск",
      role: "accountant",
      screenId: "accountant",
      intent: "tax_reference",
      entity: "payment",
      countryCode: "KG",
    });
    expect(answer.guard.passed).toBe(true);
    expect(answer.result.sources.some((source) => source.sourceType === "official_tax_source")).toBe(true);
  });
});
