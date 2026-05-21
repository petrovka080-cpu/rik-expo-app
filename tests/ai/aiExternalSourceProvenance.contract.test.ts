import { buildAiExternalSourceProvenance } from "../../src/lib/ai/externalKnowledge";
import { makeExternalKnowledgeAnswer } from "./aiVerifiedExternalKnowledgeTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: source provenance", () => {
  it("exposes URL, checkedAt and never project-fact provenance", () => {
    const answer = makeExternalKnowledgeAnswer();
    const provenance = buildAiExternalSourceProvenance(answer.result.sources);
    expect(provenance.length).toBeGreaterThan(0);
    expect(provenance.every((source) => source.checkedAt && source.canBeUsedAsProjectFact === false)).toBe(true);
  });
});
