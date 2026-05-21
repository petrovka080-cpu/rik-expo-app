import { makeExternalKnowledgeAnswer } from "./aiVerifiedExternalKnowledgeTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: external source not app fact", () => {
  it("never presents external sources as app/project facts", () => {
    const answer = makeExternalKnowledgeAnswer();
    expect(answer.result.sources.every((source) => source.canBeUsedAsProjectFact === false)).toBe(true);
    expect(answer.answerTextRu).toContain("внешний источник не является фактом приложения");
  });
});
