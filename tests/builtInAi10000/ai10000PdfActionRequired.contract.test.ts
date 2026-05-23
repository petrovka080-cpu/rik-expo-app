import { getAi10000Artifacts } from "./ai10000TestHelpers";

describe("built-in AI 10000 PDF actions", () => {
  it("exposes PDF action for every estimate and proves structured PDF payload", () => {
    const { matrix, pdfActions } = getAi10000Artifacts();

    expect(matrix.make_pdf_action_visible_all_estimate_cases).toBe(true);
    expect(pdfActions.all_estimate_cases_have_make_pdf).toBe(true);
    expect(pdfActions.pdfTrace.structured_payload_used).toBe(true);
    expect(pdfActions.pdfTrace.markdown_parsed_as_pdf_truth).toBe(false);
    expect(pdfActions.pdfTrace.passed).toBe(true);
  });
});
