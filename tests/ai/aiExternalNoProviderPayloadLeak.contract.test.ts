import { makeExternalKnowledgeAnswer } from "./aiVerifiedExternalKnowledgeTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: no provider payload leak", () => {
  it("does not show debug/provider/runtime payload in user text", () => {
    const answer = makeExternalKnowledgeAnswer();
    expect(answer.answerTextRu).not.toMatch(/provider payload|raw payload|debug|runtime|trace/i);
  });
});
