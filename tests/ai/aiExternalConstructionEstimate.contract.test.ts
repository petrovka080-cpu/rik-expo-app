import { expectExternalAnswerSafe, makeExternalKnowledgeAnswer } from "./aiVerifiedExternalKnowledgeTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: construction estimate", () => {
  it("returns an asphalt draft estimate with assumptions and missing data", () => {
    const answer = makeExternalKnowledgeAnswer();
    expectExternalAnswerSafe(answer);
    expect(answer.answerTextRu).toContain("асфальт");
    expect(answer.result.missingData).toEqual(expect.arrayContaining(["толщина слоя", "состояние основания"]));
  });
});
