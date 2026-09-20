import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("entrypoint fix PDF renderer boundary", () => {
  it("continues to use the existing estimate PDF lifecycle", () => {
    const actions = readRepoFile("src/features/ai/AIAssistantEstimatePdfActions.tsx");
    const requestScreen = readRepoFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    expect(actions).toContain("buildCanonicalEstimateArtifact");
    expect(actions).toContain("artifact.revisionId !== message.canonicalEstimateRevisionId");
    expect(actions).toContain("artifact.releaseId !== message.canonicalEstimateReleaseId");
    expect(requestScreen).toContain("buildCanonicalEstimateArtifact");
    expect(requestScreen).toContain("assertCanonicalEstimateArtifactIdentity");
    expect(requestScreen).toContain("previewPdfDocument");
    expect(actions).not.toMatch(/new jsPDF|pdf-lib|PDFDocument/);
  });
});
