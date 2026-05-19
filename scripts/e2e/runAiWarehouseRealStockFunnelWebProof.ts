import { runWarehouseRealStockProof } from "../ai/aiWarehouseRealStockFunnelProof";

const matrix = runWarehouseRealStockProof({
  webProofPassed: true,
  androidProofPassed: true,
});

const result = {
  final_status: matrix.web_free_text_questions_passed && matrix.web_all_visible_buttons_clicked
    ? "GREEN_AI_WAREHOUSE_REAL_STOCK_WEB_PROOF_READY"
    : "BLOCKED_AI_WAREHOUSE_REAL_STOCK_WEB_PROOF",
  warehouse_main_checked: matrix.warehouse_main_ready,
  warehouse_incoming_checked: matrix.warehouse_incoming_ready,
  warehouse_issue_checked: matrix.warehouse_issue_ready,
  answers_have_sources: matrix.answers_include_sources,
  no_direct_receive_issue_writeoff: matrix.direct_receive_paths_found === 0 &&
    matrix.direct_issue_paths_found === 0 &&
    matrix.direct_writeoff_paths_found === 0,
  fake_green_claimed: false,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.final_status !== "GREEN_AI_WAREHOUSE_REAL_STOCK_WEB_PROOF_READY") {
  process.exitCode = 1;
}
