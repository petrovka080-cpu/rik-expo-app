import { makeExternalKnowledgeAnswer } from "./aiVerifiedExternalKnowledgeTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: accounting country", () => {
  it("fails accounting guard without country", () => {
    const answer = makeExternalKnowledgeAnswer({
      requestId: "test:accounting:no-country",
      questionRu: "какая проводка по счету",
      normalizedQuestionRu: "какая проводка по счету",
      role: "accountant",
      screenId: "accountant",
      intent: "accounting_entry_help",
      entity: "invoice",
      countryCode: undefined,
    });
    expect(answer.guard.passed).toBe(false);
    expect(answer.guard.failureReason).toBe("accounting_answer_without_country");
  });
});
