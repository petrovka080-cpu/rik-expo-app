import { readExternalKnowledgeSource } from "./aiExternalKnowledgeArchitectureTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE architecture: no useEffect hacks", () => {
  it("does not use useEffect for AI fetch", () => {
    expect(readExternalKnowledgeSource()).not.toContain("useEffect(");
  });
});
