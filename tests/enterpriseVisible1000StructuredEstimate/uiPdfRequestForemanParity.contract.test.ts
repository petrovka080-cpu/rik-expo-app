import {
  getEnterpriseVisible1000Artifacts,
  readEnterpriseVisible1000StructuredCases,
} from "./enterpriseVisible1000TestHelpers";

describe("enterprise visible 1000 structured estimate parity", () => {
  it("uses the same presentation rows for UI, PDF, request draft, and foreman binding", () => {
    const { matrix, uiPdfParity } = getEnterpriseVisible1000Artifacts();
    const structuredCases = readEnterpriseVisible1000StructuredCases();

    expect(uiPdfParity.estimate_cases_checked).toBe(971);
    expect(uiPdfParity.ui_pdf_rows_match_count).toBe(971);
    expect(uiPdfParity.request_rows_match_count).toBe(971);
    expect(uiPdfParity.foreman_rows_match_count).toBe(971);
    expect(uiPdfParity.all_ui_pdf_rows_match).toBe(true);
    expect(uiPdfParity.all_request_rows_match).toBe(true);
    expect(uiPdfParity.all_foreman_rows_match).toBe(true);
    expect(matrix.pdf_rows_from_same_presentation_rows).toBe(true);
    expect(matrix.request_rows_from_same_presentation_rows).toBe(true);
    expect(matrix.foreman_rows_from_same_presentation_rows).toBe(true);
    expect(structuredCases.every((testCase) => testCase.uiPdfRowsMatch === true)).toBe(true);
    expect(structuredCases.every((testCase) => testCase.requestRowsMatch === true)).toBe(true);
    expect(structuredCases.every((testCase) => testCase.foremanRowsMatch === true)).toBe(true);
  });
});
