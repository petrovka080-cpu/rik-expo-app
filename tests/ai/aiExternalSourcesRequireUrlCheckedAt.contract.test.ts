import { makeExternalKnowledgeAnswer } from "./aiVerifiedExternalKnowledgeTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: source date", () => {
  it("gives URL and checkedAt for non-draft external sources", () => {
    const answer = makeExternalKnowledgeAnswer();
    const nonDraft = answer.result.sources.filter((source) => source.origin !== "general_knowledge");
    expect(nonDraft.every((source) => Boolean(source.url && source.checkedAt))).toBe(true);
  });
});
