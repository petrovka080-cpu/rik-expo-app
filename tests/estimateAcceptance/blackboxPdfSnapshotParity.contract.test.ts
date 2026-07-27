import {
  evaluateBlackboxCases,
  expandBlackboxCorpus,
} from "../../scripts/e2e/runEstimateBlackboxAcceptanceWebSmoke";

jest.setTimeout(240_000);

describe("blackbox PDF snapshot parity", () => {
  it("keeps byte projection parity while exposing the exact normative-source deficit", () => {
    const results = evaluateBlackboxCases(expandBlackboxCorpus());
    const professionalRows = results.filter((item) => item.row_count > 0);
    const normProven = results.filter((item) => item.no_missing_norm_source);

    expect(results).toHaveLength(530);
    expect(professionalRows).toHaveLength(526);
    expect(results.every((item) => item.pdf_generated)).toBe(true);
    expect(results.every((item) => item.pdf_text_extracted)).toBe(true);
    expect(results.every((item) => item.pdf_rows_equal_snapshot_rows)).toBe(true);
    expect(normProven).toHaveLength(7);
    expect(results.filter((item) => !item.no_missing_norm_source)).toHaveLength(523);
    expect(results.every((item) => item.no_missing_formula_trace)).toBe(true);
    expect(results.every((item) => item.no_mojibake)).toBe(true);
  });
});
