import {
  validatePdfSnapshotParity10000,
  GREEN_AI_ESTIMATE_10000_PDF_SNAPSHOT_PARITY_NO_BUILDS,
} from "../../scripts/estimate/validatePdfSnapshotParity10000";

jest.setTimeout(90000);

describe("PDF snapshot parity P1/P2", () => {
  it("keeps formula trace and norm source on every snapshot row", () => {
    const result = validatePdfSnapshotParity10000();

    expect(result.final_status).toBe(GREEN_AI_ESTIMATE_10000_PDF_SNAPSHOT_PARITY_NO_BUILDS);
    expect(result.pdf_generated_from_snapshot).toBe(true);
    expect(result.pdf_rows_equal_snapshot_rows).toBe(true);
    expect(result.pdf_contains_norm_sources).toBe(true);
    expect(result.pdf_contains_formula_trace).toBe(true);
  });
});
