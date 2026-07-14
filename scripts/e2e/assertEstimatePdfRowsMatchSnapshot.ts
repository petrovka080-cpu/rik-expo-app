import {
  rowsEqualSnapshotRows,
  type EstimatePdfRealityRow,
} from "../estimate/auditEstimatePdfReality";

export { rowsEqualSnapshotRows };

export function assertEstimatePdfRowsMatchSnapshot(input: {
  snapshotRows: readonly EstimatePdfRealityRow[];
  pdfRows: readonly EstimatePdfRealityRow[];
}): void {
  if (!rowsEqualSnapshotRows(input.snapshotRows, input.pdfRows)) {
    throw new Error("ESTIMATE_PDF_ROWS_DO_NOT_MATCH_SNAPSHOT");
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/assertEstimatePdfRowsMatchSnapshot.ts")) {
  const row: EstimatePdfRealityRow = {
    row_id: "sample",
    name: "sample",
    quantity: 1,
    unit: "set",
    norm_source_id: "src",
    calculation_trace: "trace",
  };
  assertEstimatePdfRowsMatchSnapshot({ snapshotRows: [row], pdfRows: [row] });
  console.log(JSON.stringify({
    pdf_snapshot_parity_passed: true,
    browser_automation_started: false,
  }, null, 2));
}
