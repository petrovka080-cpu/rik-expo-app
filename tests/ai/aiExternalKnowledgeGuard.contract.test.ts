import { guardAiExternalKnowledge } from "../../src/lib/ai/externalKnowledge";
import { makeExternalKnowledgeAnswer } from "./aiVerifiedExternalKnowledgeTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: guard", () => {
  it("fails if an external source is used for an internal question", () => {
    const answer = makeExternalKnowledgeAnswer();
    const result = guardAiExternalKnowledge({
      request: answer.plan.request,
      result: answer.result,
      internalQuestion: true,
    });
    expect(result.passed).toBe(false);
    expect(result.failureReason).toBe("internal_question_used_external_source");
  });
});
