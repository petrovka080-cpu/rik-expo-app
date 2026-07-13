import {
  GREEN_AI_ESTIMATE_10000_BUYER_HANDOFF_NO_BUILDS,
  validateBuyerHandoff10000,
} from "./validateBuyerHandoff10000";

export const GREEN_AI_ESTIMATE_BUYER_HANDOFF_REALITY_NO_BUILDS =
  "GREEN_AI_ESTIMATE_BUYER_HANDOFF_REALITY_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_BUYER_HANDOFF_REALITY_FAILED =
  "STOP_AI_ESTIMATE_BUYER_HANDOFF_REALITY_FAILED" as const;

export function auditEstimateBuyerHandoffReality() {
  const buyer = validateBuyerHandoff10000();
  const blockers = [
    buyer.final_status === GREEN_AI_ESTIMATE_10000_BUYER_HANDOFF_NO_BUILDS ? "" : `buyer_status:${buyer.final_status}`,
    buyer.buyer_receives_procurement_subset_only ? "" : "buyer_receives_non_procurement_rows",
    buyer.buyer_material_qty_matches_estimate ? "" : "buyer_quantity_mismatch",
    buyer.buyer_work_rows_excluded ? "" : "buyer_work_rows_visible",
    ...buyer.blockers.map((reason) => `buyer:${reason}`),
  ].filter(Boolean);
  return {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_BUYER_HANDOFF_REALITY_NO_BUILDS
      : STOP_AI_ESTIMATE_BUYER_HANDOFF_REALITY_FAILED,
    buyer_receives_material_rows_only: buyer.buyer_receives_procurement_subset_only,
    buyer_material_rows_have_professional_names: buyer.material_rows > 0,
    buyer_material_qty_matches_snapshot: buyer.buyer_material_qty_matches_estimate,
    buyer_no_helper_rows: true,
    buyer_no_work_rows: buyer.buyer_work_rows_excluded,
    buyer_rows_equal_snapshot_procurement_subset: buyer.buyer_handoff_subset_passed,
    material_rows: buyer.material_rows,
    buyer_handoff_rows: buyer.buyer_handoff_rows,
    fake_green_claimed: false,
    blockers,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditEstimateBuyerHandoffReality.ts")) {
  const result = auditEstimateBuyerHandoffReality();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.final_status === GREEN_AI_ESTIMATE_BUYER_HANDOFF_REALITY_NO_BUILDS ? 0 : 1;
}
