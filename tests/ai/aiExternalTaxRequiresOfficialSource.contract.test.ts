import { makeExternalKnowledgeAnswer } from "./aiVerifiedExternalKnowledgeTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: tax source", () => {
  it("uses an official tax source for tax answers", () => {
    const answer = makeExternalKnowledgeAnswer({
      requestId: "test:tax:official",
      questionRu: "какой налоговый риск",
      normalizedQuestionRu: "какой налоговый риск",
      role: "accountant",
      screenId: "accountant",
      intent: "tax_reference",
      entity: "payment",
      countryCode: "KG",
    });
    expect(answer.result.sources.map((source) => source.sourceType)).toContain("official_tax_source");
  });
});
