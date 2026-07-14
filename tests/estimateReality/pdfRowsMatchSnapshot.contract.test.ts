import {
  auditEstimatePdfReality,
  rowsEqualSnapshotRows,
  snapshotRowsForPdf,
} from "../../scripts/estimate/auditEstimatePdfReality";
import {
  evaluateWorkSpecificityCase,
  FUNCTIONAL_REALITY_CASES,
} from "../../scripts/estimate/validateEstimateWorkSpecificity";

describe("PDF rows match snapshot detector", () => {
  it("detects parity and mismatch between parsed PDF rows and saved snapshot rows", () => {
    const testCase = FUNCTIONAL_REALITY_CASES.find((item) => item.case_id === "diamond_drilling_full");
    const result = evaluateWorkSpecificityCase(testCase!);
    const audit = auditEstimatePdfReality(result);
    const rows = snapshotRowsForPdf(result);

    expect(audit.pdf_rows_equal_snapshot_rows).toBe(true);
    expect(rowsEqualSnapshotRows(rows, rows.map((row, index) => index === 0 ? { ...row, quantity: row.quantity + 1 } : row))).toBe(false);
  });
});
