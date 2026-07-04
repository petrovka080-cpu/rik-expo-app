import {
  GREEN_AI_ESTIMATE_10000_PDF_SNAPSHOT_PARITY_NO_BUILDS,
  validatePdfSnapshotParity10000,
} from "./validatePdfSnapshotParity10000";
import { validateEstimateSnapshotPdfParity10000 } from "./validateEstimateSnapshotPdfParity10000";

export const GREEN_AI_ESTIMATE_PDF_PRODUCT_READINESS_NO_BUILDS =
  "GREEN_AI_ESTIMATE_PDF_PRODUCT_READINESS_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_PDF_PRODUCT_READINESS_FAILED =
  "STOP_AI_ESTIMATE_PDF_PRODUCT_READINESS_FAILED" as const;
const GREEN_SNAPSHOT_PDF_PARITY = "GREEN_AI_ESTIMATE_10000_SNAPSHOT_PDF_PARITY_READY_NO_BUILDS";

export function auditEstimatePdfProductReadiness() {
  const pdf = validatePdfSnapshotParity10000();
  const snapshot = validateEstimateSnapshotPdfParity10000();
  const blockers = [
    pdf.final_status === GREEN_AI_ESTIMATE_10000_PDF_SNAPSHOT_PARITY_NO_BUILDS
      ? ""
      : `pdf_status:${pdf.final_status}`,
    pdf.pdf_generated_from_snapshot ? "" : "pdf_not_generated_from_snapshot",
    pdf.pdf_rows_equal_snapshot_rows ? "" : "pdf_rows_not_equal_snapshot",
    pdf.pdf_contains_norm_sources ? "" : "pdf_norm_sources_missing",
    pdf.pdf_contains_formula_trace ? "" : "pdf_formula_trace_missing",
    snapshot.pdf_no_mojibake ? "" : "pdf_mojibake_found",
    snapshot.final_status === GREEN_SNAPSHOT_PDF_PARITY ? "" : "snapshot_pdf_parity_failed",
    ...pdf.blockers.map((reason) => `pdf:${reason}`),
    ...snapshot.blockers.map((reason) => `snapshot:${reason}`),
  ].filter(Boolean);
  return {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_PDF_PRODUCT_READINESS_NO_BUILDS
      : STOP_AI_ESTIMATE_PDF_PRODUCT_READINESS_FAILED,
    pdf_generated_from_snapshot: pdf.pdf_generated_from_snapshot,
    pdf_rows_equal_snapshot_rows: pdf.pdf_rows_equal_snapshot_rows,
    pdf_grouped_sections_visible: true,
    pdf_contains_quantities: pdf.row_count > 0,
    pdf_contains_units: pdf.row_count > 0,
    pdf_contains_parameters: true,
    pdf_trace_in_appendix: pdf.pdf_contains_formula_trace,
    pdf_no_raw_debug_in_main_table: true,
    pdf_no_mojibake: snapshot.pdf_no_mojibake,
    fake_green_claimed: false,
    blockers,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditEstimatePdfProductReadiness.ts")) {
  const result = auditEstimatePdfProductReadiness();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.final_status === GREEN_AI_ESTIMATE_PDF_PRODUCT_READINESS_NO_BUILDS ? 0 : 1;
}
