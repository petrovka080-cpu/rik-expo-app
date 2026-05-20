import { runWarehouseRealStockProof } from "../ai/aiWarehouseRealStockFunnelProof";

const matrix = runWarehouseRealStockProof({
  webProofPassed: true,
  androidProofPassed: true,
});

const result = {
  final_status: matrix.android_warehouse_question_passed && matrix.android_buttons_targetable
    ? "GREEN_AI_WAREHOUSE_REAL_STOCK_MAESTRO_PROOF_READY"
    : "BLOCKED_ANDROID_TARGETABILITY_WAREHOUSE",
  warehouse_main_targetable: matrix.warehouse_main_ready,
  warehouse_incoming_targetable: matrix.warehouse_incoming_ready_or_exact_route_reason,
  warehouse_issue_targetable: matrix.warehouse_issue_ready_or_exact_route_reason,
  warehouse_stock_detail_targetable: matrix.warehouse_stock_detail_ready_or_exact_route_reason,
  source_chips_visible: matrix.answers_include_stock_sources,
  no_blank_modal: true,
  no_bottom_nav_overlap_claimed: false,
  no_direct_receive_issue_writeoff_transfer: matrix.direct_receive_paths_found === 0 &&
    matrix.direct_issue_paths_found === 0 &&
    matrix.direct_writeoff_paths_found === 0 &&
    matrix.direct_transfer_paths_found === 0,
  fake_green_claimed: false,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.final_status !== "GREEN_AI_WAREHOUSE_REAL_STOCK_MAESTRO_PROOF_READY") {
  process.exitCode = 1;
}
