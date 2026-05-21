import { readExternalKnowledgeSource } from "./aiExternalKnowledgeArchitectureTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE architecture: no hooks", () => {
  it("does not add AI hooks", () => {
    expect(readExternalKnowledgeSource()).not.toMatch(/\buse[A-Z][A-Za-z0-9_]*\s*\(/);
  });
});
