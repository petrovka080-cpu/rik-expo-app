import { buildLiveEstimate, generateAndValidateLivePdf } from "../liveAcceptance/liveAiEstimatePdfRealityTestHelpers";
import { estimatePdfInputToBytes } from "../../src/lib/estimatePdf";

describe("estimate PDF valid binary", () => {
  it("creates a real PDF binary with application/pdf data uri", () => {
    const { pdf, validation } = generateAndValidateLivePdf(
      buildLiveEstimate("сделай мне смету на асфальтирование на 1000 кв м"),
    );
    const bytes = estimatePdfInputToBytes(pdf.access.uri);

    expect(pdf.access.uri).toContain("data:application/pdf;base64,");
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
    expect(validation.details.binaryValid).toBe(true);
  });
});
