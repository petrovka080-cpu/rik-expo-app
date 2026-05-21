import { makeExternalKnowledgeAnswer } from "./aiVerifiedExternalKnowledgeTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: finance", () => {
  it("keeps finance references read-only and review-required", () => {
    const answer = makeExternalKnowledgeAnswer({
      requestId: "test:finance",
      questionRu: "какой финансовый риск по оплате без акта",
      normalizedQuestionRu: "какой финансовый риск по оплате без акта",
      role: "director",
      screenId: "director",
      intent: "finance_reference",
      entity: "payment",
      countryCode: "KG",
    });
    expect(answer.guard.passed).toBe(true);
    expect(answer.result.safetyStatus.changedData).toBe(false);
    expect(answer.result.safetyStatus.requiresHumanReview).toBe(true);
  });
});
