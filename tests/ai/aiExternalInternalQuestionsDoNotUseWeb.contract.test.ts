import { makeExternalKnowledgeAnswer } from "./aiVerifiedExternalKnowledgeTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: internal questions", () => {
  it("does not use public web for app-data questions", () => {
    const answer = makeExternalKnowledgeAnswer({
      requestId: "test:internal",
      questionRu: "сколько заявок за май",
      normalizedQuestionRu: "сколько заявок за май",
      intent: "app_data_count",
      entity: "procurement_request",
      internetAllowed: false,
    });
    expect(answer.plan.enabled).toBe(false);
    expect(answer.result.sources).toEqual([]);
  });
});
