import {
  auditEstimatePdfReality,
  rowsEqualSnapshotRows,
  snapshotRowsForPdf,
} from "../../scripts/estimate/auditEstimatePdfReality";
import {
  evaluateWorkSpecificityCase,
  FUNCTIONAL_REALITY_CASES,
} from "../../scripts/estimate/validateEstimateWorkSpecificity";

describe("P0 PDF rows match snapshot", () => {
  it("keeps critical PDF rows equal to saved estimate rows", () => {
    const caseIds = ["diamond_drilling_full", "profile_sheet_fence_full", "mansard_roof_full"];

    for (const caseId of caseIds) {
      const testCase = FUNCTIONAL_REALITY_CASES.find((item) => item.case_id === caseId);
      const result = evaluateWorkSpecificityCase(testCase!);
      const audit = auditEstimatePdfReality(result);
      const snapshotRows = snapshotRowsForPdf(result);

      expect(audit.pdf_rows_equal_snapshot_rows).toBe(true);
      expect(rowsEqualSnapshotRows(snapshotRows, audit.parsed_rows)).toBe(true);
      expect(audit.blocking_reasons).toEqual([]);
    }
  });
});
