import { readSource } from "../aiPlatform/universalProfessionalEstimateEngineTestHelpers";

describe("universal estimate PDF source-of-truth guard", () => {
  it("keeps PDFs bound to structured GlobalEstimateResult payloads", () => {
    const source = readSource("src/lib/estimatePdf/createEstimatePdf.ts");
    expect(source).toContain("Estimate PDF requires a structured GlobalEstimateResult");
    expect(source).toContain("markdown_parsed_as_pdf_truth: false");
  });
});
