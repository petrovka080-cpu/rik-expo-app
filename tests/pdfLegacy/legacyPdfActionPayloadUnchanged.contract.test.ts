import { readRepoFile } from "../aiEstimatePdf/aiEstimatePdfSafeIntegrationTestHelpers";

describe("legacy PDF action payload", () => {
  it("keeps the existing consumer/request fallback payload path intact", () => {
    const source = readRepoFile("src/lib/ai/estimatePdf/estimatePdfActionService.ts");
    expect(source).toContain("generateConsumerRepairRequestPdf");
    expect(source).toContain("mapAiEstimatePdfSourceToExistingConsumerPdfModel");
    expect(source).toContain('route: "/pdf-viewer"');
  });
});
