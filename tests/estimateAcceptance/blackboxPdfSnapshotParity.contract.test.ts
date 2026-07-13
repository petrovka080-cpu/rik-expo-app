import {
  evaluateBlackboxCases,
  expandBlackboxCorpus,
} from "../../scripts/e2e/runEstimateBlackboxAcceptanceWebSmoke";

jest.setTimeout(240_000);

describe("blackbox PDF snapshot parity", () => {
  it("extracts PDF rows from snapshots without drifting from saved rows", () => {
    const results = evaluateBlackboxCases(expandBlackboxCorpus());
    const professionalRows = results.filter((item) => item.row_count > 0);

    expect(professionalRows.length).toBeGreaterThan(500);
    expect(results.every((item) => item.pdf_generated)).toBe(true);
    expect(results.every((item) => item.pdf_text_extracted)).toBe(true);
    expect(results.every((item) => item.pdf_rows_equal_snapshot_rows)).toBe(true);
    expect(results.every((item) => item.no_missing_norm_source)).toBe(true);
    expect(results.every((item) => item.no_missing_formula_trace)).toBe(true);
    expect(results.every((item) => item.no_mojibake)).toBe(true);
  });
});
