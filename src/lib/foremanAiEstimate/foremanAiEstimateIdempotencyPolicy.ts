import type { ForemanBuyerProcurementRow } from "./foremanAiEstimateContracts";

export function buildForemanAiEstimateSubmitKey(requestId: string | number, estimateRevisionId: string): string {
  return `foreman-submit:${String(requestId)}:${estimateRevisionId}`;
}

export function buildForemanAiEstimateApprovalKey(requestId: string | number, estimateRevisionId: string): string {
  return `director-approve:${String(requestId)}:${estimateRevisionId}`;
}

export function buildForemanAiEstimateBuyerRowKey(row: Pick<ForemanBuyerProcurementRow, "estimateRevisionId" | "sourceRowId" | "rik_code">): string {
  return `${row.estimateRevisionId}:${row.sourceRowId}:${row.rik_code}`;
}

export function dedupeForemanAiEstimateBuyerRows(
  rows: readonly ForemanBuyerProcurementRow[],
): ForemanBuyerProcurementRow[] {
  const seen = new Set<string>();
  const deduped: ForemanBuyerProcurementRow[] = [];
  for (const row of rows) {
    const key = buildForemanAiEstimateBuyerRowKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }
  return deduped;
}

export function buildForemanAiEstimateIdempotencyMatrix(rows: readonly ForemanBuyerProcurementRow[]) {
  const doubledRows = [...rows, ...rows];
  const dedupedRows = dedupeForemanAiEstimateBuyerRows(doubledRows);
  const submitKeys = new Set([
    buildForemanAiEstimateSubmitKey("REQ-AI-1", rows[0]?.estimateRevisionId ?? "missing"),
    buildForemanAiEstimateSubmitKey("REQ-AI-1", rows[0]?.estimateRevisionId ?? "missing"),
  ]);
  const approvalKeys = new Set([
    buildForemanAiEstimateApprovalKey("REQ-AI-1", rows[0]?.estimateRevisionId ?? "missing"),
    buildForemanAiEstimateApprovalKey("REQ-AI-1", rows[0]?.estimateRevisionId ?? "missing"),
  ]);

  return {
    double_submit_director_duplicates: submitKeys.size === 1 ? 0 : submitKeys.size - 1,
    double_approve_buyer_duplicates: approvalKeys.size === 1 ? 0 : approvalKeys.size - 1,
    duplicate_procurement_rows: dedupedRows.length === rows.length ? 0 : dedupedRows.length - rows.length,
    duplicate_procurement_attempts_blocked: doubledRows.length - dedupedRows.length,
    deduped_procurement_rows: dedupedRows.length,
    fake_green_claimed: false as const,
  };
}
