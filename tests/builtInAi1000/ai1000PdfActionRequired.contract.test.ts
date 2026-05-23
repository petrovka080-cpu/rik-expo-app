import { getAi1000Artifacts } from "./ai1000TestHelpers";

describe("built-in AI 1000 PDF action", () => {
  it("shows PDF action for every estimate and keeps PDF generation structured", () => {
    const { matrix, pdfActions } = getAi1000Artifacts();

    expect(matrix.make_pdf_action_visible_all_estimate_cases).toBe(true);
    expect(pdfActions.all_estimate_cases_have_make_pdf).toBe(true);
    expect(pdfActions.pdfTrace.structured_payload_used).toBe(true);
    expect(pdfActions.pdfTrace.markdown_parsed_as_pdf_truth).toBe(false);
    expect(pdfActions.pdfTrace.pdf_opened).toBe(true);
  });
});
