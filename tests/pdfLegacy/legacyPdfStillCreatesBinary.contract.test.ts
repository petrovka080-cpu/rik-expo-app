import { buildLegacyPdfProof } from "../aiEstimatePdf/aiEstimatePdfSafeIntegrationTestHelpers";

describe("legacy PDF binary regression", () => {
  it("still creates a valid PDF binary through the old estimate renderer", () => {
    const { extraction } = buildLegacyPdfProof();
    expect(extraction.binaryHeader).toBe("%PDF-");
    expect(extraction.valid).toBe(true);
  });
});
