import { makeExternalKnowledgeAnswer } from "./aiVerifiedExternalKnowledgeTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: accounting review", () => {
  it("requires human review for accounting answers", () => {
    const answer = makeExternalKnowledgeAnswer({
      requestId: "test:accounting:review",
      questionRu: "как учитывать аванс подрядчику",
      normalizedQuestionRu: "как учитывать аванс подрядчику",
      role: "accountant",
      screenId: "accountant",
      intent: "accounting_entry_help",
      entity: "payment",
      countryCode: "KG",
    });
    expect(answer.result.safetyStatus.requiresHumanReview).toBe(true);
  });
});
