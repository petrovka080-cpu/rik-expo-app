import { makeExternalKnowledgeAnswer } from "./aiVerifiedExternalKnowledgeTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: no web claim without provider", () => {
  it("does not claim public_web when deterministic providers are reference-only", () => {
    const answer = makeExternalKnowledgeAnswer();
    expect(answer.result.sourceDisclosure.publicWebUsed).toBe(false);
    expect(answer.result.sources.map((source) => source.origin)).not.toContain("public_web");
  });
});
