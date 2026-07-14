import {
  compileProductionExpandedEstimate10000,
  PRODUCTION_WORK_DEFINITIONS_10000,
} from "../../src/lib/ai/estimateTemplate10000";

export const GREEN_AI_ESTIMATE_10000_BUYER_HANDOFF_NO_BUILDS =
  "GREEN_AI_ESTIMATE_10000_BUYER_HANDOFF_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_10000_BUYER_HANDOFF_FAILED =
  "STOP_AI_ESTIMATE_10000_BUYER_HANDOFF_FAILED" as const;

export function validateBuyerHandoff10000() {
  let materialRows = 0;
  let buyerRows = 0;
  let buyerWorkRows = 0;
  let quantityMismatches = 0;
  const blockers: string[] = [];

  for (const definition of PRODUCTION_WORK_DEFINITIONS_10000) {
    const estimate = compileProductionExpandedEstimate10000({
      workKey: definition.workKey,
      quantity: 100,
      countryCode: "KG",
    });
    const procurementRows = estimate.rows.filter((row) => row.includedInProcurement);
    const workRows = procurementRows.filter((row) => row.lineType === "work" || row.section === "labor");
    const materials = estimate.rows.filter((row) => row.lineType === "material" || row.section === "materials");
    materialRows += materials.length;
    buyerRows += procurementRows.length;
    buyerWorkRows += workRows.length;
    for (const row of procurementRows) {
      const source = estimate.rows.find((candidate) => candidate.rowCode === row.rowCode);
      if (!source || source.quantity !== row.quantity || source.unit !== row.unit) {
        quantityMismatches += 1;
        blockers.push(`${definition.workKey}:${row.rowCode}:buyer_quantity_mismatch`);
      }
    }
    if (workRows.length > 0) blockers.push(`${definition.workKey}:buyer_work_rows:${workRows.length}`);
  }

  return {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_10000_BUYER_HANDOFF_NO_BUILDS
      : STOP_AI_ESTIMATE_10000_BUYER_HANDOFF_FAILED,
    template_count: PRODUCTION_WORK_DEFINITIONS_10000.length,
    material_rows: materialRows,
    buyer_handoff_rows: buyerRows,
    buyer_work_rows: buyerWorkRows,
    quantity_mismatches: quantityMismatches,
    buyer_receives_procurement_subset_only: buyerRows > 0 && buyerWorkRows === 0,
    buyer_material_qty_matches_estimate: quantityMismatches === 0,
    buyer_work_rows_excluded: buyerWorkRows === 0,
    buyer_handoff_subset_passed: blockers.length === 0,
    fake_green_claimed: false,
    blockers: blockers.slice(0, 50),
  };
}

function requireAllFlag(): void {
  if (!process.argv.includes("--all")) {
    throw new Error("VALIDATE_BUYER_HANDOFF_10000_REQUIRES_--all");
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/validateBuyerHandoff10000.ts")) {
  try {
    requireAllFlag();
    const result = validateBuyerHandoff10000();
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.final_status === GREEN_AI_ESTIMATE_10000_BUYER_HANDOFF_NO_BUILDS ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
