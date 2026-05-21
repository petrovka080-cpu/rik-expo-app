import { readAiAppContextGraphSource } from "./aiAppContextGraphArchitectureTestHelpers";

describe("S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS architecture: no approval bypass", () => {
  it("does not expose direct approval execution paths", () => {
    const source = readAiAppContextGraphSource();
    expect(source).not.toMatch(/bypassApproval|approveWithoutReview|skipApproval/i);
    expect(source).not.toMatch(/autoApproval\s*:\s*true|approvalBypass\s*:\s*true/);
    expect(source).not.toMatch(/finalSubmit\s*:\s*true/);
  });
});
