import fs from "node:fs";

describe("request state does not replace PDF renderer", () => {
  it("uses payload parity without introducing a request-specific PDF renderer", () => {
    const source = [
      "src/features/consumerRepair/requestEstimateStateMachine.ts",
      "src/features/consumerRepair/requestEstimateDraftReducer.ts",
      "src/features/consumerRepair/buildRequestEstimatePayload.ts",
      "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
    ].map((file) => fs.readFileSync(file, "utf8")).join("\n");

    expect(source).not.toMatch(/new\s+PDFDocument|renderRequestEstimatePdf|replaceLegacyPdf/i);
    expect(source).toContain("generateConsumerRepairRequestPdfForDraft");
  });
});
