import { buildWorld50000GovernedCase, validateWorld50000Case } from "./worldConstruction50000TestHelpers";

describe("world construction 50000 PDF payload gate", () => {
  it("requires a structured PDF action for estimate cases", () => {
    const result = validateWorld50000Case(buildWorld50000GovernedCase(5));
    expect(result.pdfActionStatus).toBe("present");
    expect(result.failureCodes).not.toContain("PDF_STRUCTURED_PAYLOAD_MISSING");
  });
});
