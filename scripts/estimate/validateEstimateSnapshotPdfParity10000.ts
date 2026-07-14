import { auditEstimatePdfReality } from "./auditEstimatePdfReality";
import {
  evaluateWorkSpecificityCase,
  FUNCTIONAL_REALITY_CASES,
} from "./validateEstimateWorkSpecificity";

export const GREEN_AI_ESTIMATE_10000_SNAPSHOT_PDF_PARITY_READY_NO_BUILDS =
  "GREEN_AI_ESTIMATE_10000_SNAPSHOT_PDF_PARITY_READY_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_10000_SNAPSHOT_PDF_PARITY_FAILED =
  "STOP_AI_ESTIMATE_10000_SNAPSHOT_PDF_PARITY_FAILED" as const;

export function validateEstimateSnapshotPdfParity10000() {
  const cases = FUNCTIONAL_REALITY_CASES.map(evaluateWorkSpecificityCase);
  const audits = cases.map((item) => ({
    case_id: item.case_id,
    row_count: item.row_count,
    missing_parameters_count: item.missing_parameters.length,
    ...auditEstimatePdfReality(item),
  }));
  const blockers = audits.flatMap((audit) => audit.blocking_reasons.map((reason) => `${audit.case_id}:${reason}`));
  const rowsOrMissingParamsCaptured = audits.every((audit) =>
    audit.parsed_rows.length > 0 || audit.missing_parameters_count > 0
  );
  if (!rowsOrMissingParamsCaptured) blockers.push("pdf_rows_or_missing_params_not_captured");

  return {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_10000_SNAPSHOT_PDF_PARITY_READY_NO_BUILDS
      : STOP_AI_ESTIMATE_10000_SNAPSHOT_PDF_PARITY_FAILED,
    cases_count: cases.length,
    pdf_rows_equal_snapshot_rows: audits.every((audit) => audit.pdf_rows_equal_snapshot_rows),
    pdf_no_mojibake: audits.every((audit) => audit.pdf_no_mojibake),
    pdf_contains_norm_sources: audits.every((audit) => audit.pdf_contains_norm_sources || audit.missing_parameters_count > 0),
    pdf_contains_calculation_trace: audits.every((audit) => audit.pdf_contains_calculation_trace || audit.missing_parameters_count > 0),
    rows_or_missing_params_captured: rowsOrMissingParamsCaptured,
    blockers,
  };
}

function requireAllFlag(): void {
  if (!process.argv.includes("--all")) {
    throw new Error("VALIDATE_ESTIMATE_SNAPSHOT_PDF_PARITY_10000_REQUIRES_--all");
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/validateEstimateSnapshotPdfParity10000.ts")) {
  try {
    requireAllFlag();
    const result = validateEstimateSnapshotPdfParity10000();
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.final_status === GREEN_AI_ESTIMATE_10000_SNAPSHOT_PDF_PARITY_READY_NO_BUILDS ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
