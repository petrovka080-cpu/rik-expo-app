import { makeExternalKnowledgeAnswer } from "./aiVerifiedExternalKnowledgeTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: general knowledge", () => {
  it("marks general knowledge as draft only", () => {
    const answer = makeExternalKnowledgeAnswer();
    const general = answer.result.sources.filter((source) => source.sourceType === "general_knowledge");
    expect(general.every((source) => !source.canBePresentedAsFact && !source.canBeUsedAsProjectFact)).toBe(true);
  });
});
