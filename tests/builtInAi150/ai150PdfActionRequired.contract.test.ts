import { getAi150Artifacts } from "./ai150TestHelpers";

describe("built-in AI 150 PDF actions", () => {
  it("shows PDF action for every case and uses structured PDF payload", () => {
    const { matrix, pdfActions } = getAi150Artifacts();

    expect(matrix.make_pdf_action_visible_all).toBe(true);
    expect(pdfActions.all_cases_have_make_pdf).toBe(true);
    expect(pdfActions.pdfTrace).toMatchObject({
      structured_payload_used: true,
      markdown_parsed_as_pdf_truth: false,
      pdf_opened: true,
    });
  });
});
