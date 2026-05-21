import { makeExternalKnowledgeAnswer } from "./aiVerifiedExternalKnowledgeTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: accounting", () => {
  it("requires country and human review for accounting guidance", () => {
    const answer = makeExternalKnowledgeAnswer({
      requestId: "test:accounting",
      questionRu: "какая проводка по счету",
      normalizedQuestionRu: "какая проводка по счету",
      role: "accountant",
      screenId: "accountant",
      intent: "accounting_entry_help",
      entity: "invoice",
      countryCode: "KG",
    });
    expect(answer.guard.passed).toBe(true);
    expect(answer.result.safetyStatus.requiresHumanReview).toBe(true);
    expect(answer.answerTextRu).toContain("Требуется проверка");
  });
});
