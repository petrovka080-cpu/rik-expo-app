import {
  estimateFor,
  pdfFor,
  presentationFor,
} from "../entrypoints/liveB2cEstimateRealityTestHelpers";
import {
  CONCRETE_PEDESTAL_PROMPT,
  FORBIDDEN_PEDESTAL_ROW_TOKENS,
  REQUIRED_PEDESTAL_ROW_TOKENS,
  estimateRowText,
  expectForbiddenTokensAbsent,
  expectTokens,
} from "./concretePedestalTestHelpers";

describe("concrete pedestal PDF parity", () => {
  it("keeps the PDF and presentation backed by the structured pedestal estimate", () => {
    const estimate = estimateFor("/request", CONCRETE_PEDESTAL_PROMPT);
    const viewModel = presentationFor(estimate);
    const pdf = pdfFor(estimate);
    const text = estimateRowText(estimate);

    expect(estimate.work.workKey).toBe("concrete_pedestal_pour");
    expect(viewModel.sections.length).toBeGreaterThanOrEqual(4);
    expect(pdf.pdfTrace.pdf_uses_structured_global_estimate_result).toBe(true);
    expect(pdf.pdfTrace.markdown_parsed_as_pdf_truth).toBe(false);
    expect(pdf.pdfTrace.pdf_mojibake_found).toBe(false);
    expectTokens(text, REQUIRED_PEDESTAL_ROW_TOKENS);
    expectForbiddenTokensAbsent(text, FORBIDDEN_PEDESTAL_ROW_TOKENS);
  });
});
