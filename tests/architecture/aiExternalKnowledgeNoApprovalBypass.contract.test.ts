import { readExternalKnowledgeSource } from "./aiExternalKnowledgeArchitectureTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE architecture: no approval bypass", () => {
  it("does not auto approve or final submit", () => {
    const source = readExternalKnowledgeSource();
    expect(source).not.toMatch(/autoApprove|autoApproval:\s*true|approvalBypass|finalSubmit:\s*true/);
  });
});
