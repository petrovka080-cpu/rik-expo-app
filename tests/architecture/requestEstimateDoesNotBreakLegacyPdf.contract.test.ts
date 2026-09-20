import { readFile } from "./requestEstimateArchitectureTestHelpers";

describe("request estimate legacy PDF protection", () => {
  it("keeps legacy rendering isolated while production previews canonical artifacts", () => {
    const screen = readFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    expect(screen).toContain("buildCanonicalEstimateArtifact");
    expect(screen).toContain("assertCanonicalEstimateArtifactIdentity");
    expect(screen).toContain("createPdfDocumentDescriptor");
    expect(screen).toContain("previewPdfDocument");
    expect(screen).not.toContain("ensureConsumerRepairRequestPdfAvailable");
    expect(readFile("src/lib/consumerRequests/consumerRequestLegacyPdfMigrationReader.ts"))
      .toContain("generateConsumerRepairRequestPdf");
    expect(readFile("src/lib/consumerRequests/consumerRequestPdfService.ts")).toContain("renderTextPdfDocument");
  });
});
