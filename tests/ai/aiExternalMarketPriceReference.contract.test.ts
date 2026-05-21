import { makeExternalKnowledgeAnswer } from "./aiVerifiedExternalKnowledgeTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: market price", () => {
  it("requires source date for market price references", () => {
    const answer = makeExternalKnowledgeAnswer({
      requestId: "test:market-price",
      questionRu: "сравни цены на профиль",
      normalizedQuestionRu: "сравни цены на профиль",
      role: "buyer",
      screenId: "buyer",
      intent: "market_price_reference",
      entity: "material",
      materialNameRu: "профиль",
    });
    expect(answer.guard.passed).toBe(true);
    expect(answer.result.sources.every((source) => Boolean(source.checkedAt))).toBe(true);
  });
});
