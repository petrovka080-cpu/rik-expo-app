import { expectExternalAnswerSafe, makeExternalKnowledgeAnswer } from "./aiVerifiedExternalKnowledgeTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: construction technology", () => {
  it("answers waterproofing checks as a reference, not a project fact", () => {
    const answer = makeExternalKnowledgeAnswer({
      requestId: "test:waterproofing",
      questionRu: "как проверить гидроизоляцию",
      normalizedQuestionRu: "как проверить гидроизоляцию",
      intent: "construction_technology",
      workType: "waterproofing",
    });
    expectExternalAnswerSafe(answer);
    expect(answer.answerTextRu).toContain("гидроизоля");
    expect(answer.result.safetyStatus.canBePresentedAsProjectFact).toBe(false);
  });
});
