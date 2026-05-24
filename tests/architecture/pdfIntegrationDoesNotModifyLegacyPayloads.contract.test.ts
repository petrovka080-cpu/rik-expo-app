import { readRepoFile } from "../aiEstimatePdf/aiEstimatePdfSafeIntegrationTestHelpers";

describe("PDF integration legacy payload guard", () => {
  it("does not modify existing non-structured PDF action payloads", () => {
    const source = readRepoFile("src/lib/ai/estimatePdf/estimatePdfActionService.ts");
    expect(source).toContain("mapAiEstimatePdfSourceToExistingConsumerPdfModel");
    expect(source).toContain("generateConsumerRepairRequestPdf(model)");
    expect(source).toContain("openConsumerRepairRequestPdf");
  });
});
