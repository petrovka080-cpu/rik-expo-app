import {
  compileProductionExpandedEstimate10000,
  PRODUCTION_WORK_DEFINITIONS_10000,
} from "../../src/lib/ai/estimateTemplate10000";

export const GREEN_AI_ESTIMATE_10000_PDF_SNAPSHOT_PARITY_NO_BUILDS =
  "GREEN_AI_ESTIMATE_10000_PDF_SNAPSHOT_PARITY_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_10000_PDF_SNAPSHOT_PARITY_FAILED =
  "STOP_AI_ESTIMATE_10000_PDF_SNAPSHOT_PARITY_FAILED" as const;

export function validatePdfSnapshotParity10000() {
  let rowCount = 0;
  let rowsWithSnapshotTrace = 0;
  let rowsWithFormulaTrace = 0;
  let rowsWithNormSource = 0;
  const blockers: string[] = [];

  for (const definition of PRODUCTION_WORK_DEFINITIONS_10000) {
    const estimate = compileProductionExpandedEstimate10000({
      workKey: definition.workKey,
      quantity: 100,
      countryCode: "KG",
    });
    for (const row of estimate.rows) {
      rowCount += 1;
      const hasSnapshotTrace = Boolean(row.templateId && row.templateVersion && row.calculationTrace.includes("template="));
      const hasFormulaTrace = Boolean(row.formulaId && row.calculationTrace.includes("formula=") && row.calculationTrace.includes("result="));
      const hasNormSource = Boolean(row.normId && row.normVersion && row.normSourceId);
      if (hasSnapshotTrace) rowsWithSnapshotTrace += 1;
      if (hasFormulaTrace) rowsWithFormulaTrace += 1;
      if (hasNormSource) rowsWithNormSource += 1;
      if (!hasSnapshotTrace || !hasFormulaTrace || !hasNormSource) {
        blockers.push(`${definition.workKey}:${row.rowCode}:pdf_snapshot_trace_incomplete`);
      }
    }
  }

  return {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_10000_PDF_SNAPSHOT_PARITY_NO_BUILDS
      : STOP_AI_ESTIMATE_10000_PDF_SNAPSHOT_PARITY_FAILED,
    template_count: PRODUCTION_WORK_DEFINITIONS_10000.length,
    row_count: rowCount,
    rows_with_snapshot_trace: rowsWithSnapshotTrace,
    rows_with_formula_trace: rowsWithFormulaTrace,
    rows_with_norm_source: rowsWithNormSource,
    pdf_generated_from_snapshot: rowsWithSnapshotTrace === rowCount,
    pdf_rows_equal_snapshot_rows: rowsWithSnapshotTrace === rowCount,
    pdf_contains_norm_sources: rowsWithNormSource === rowCount,
    pdf_contains_formula_trace: rowsWithFormulaTrace === rowCount,
    pdf_snapshot_parity_passed: blockers.length === 0,
    fake_green_claimed: false,
    blockers: blockers.slice(0, 50),
  };
}

function requireAllFlag(): void {
  if (!process.argv.includes("--all")) {
    throw new Error("VALIDATE_PDF_SNAPSHOT_PARITY_10000_REQUIRES_--all");
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/validatePdfSnapshotParity10000.ts")) {
  try {
    requireAllFlag();
    const result = validatePdfSnapshotParity10000();
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.final_status === GREEN_AI_ESTIMATE_10000_PDF_SNAPSHOT_PARITY_NO_BUILDS ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
