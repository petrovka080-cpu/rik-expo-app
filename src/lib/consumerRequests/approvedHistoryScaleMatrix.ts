export const APPROVED_HISTORY_SCALE_MATRIX = {
  scope: "AI_ESTIMATE_APPROVED_HISTORY_PERSISTENCE_PAGINATION_SCALING",
  proofMode: "synthetic_history_store_scale_contract",
  uiRuntimeSampleApprovedRecords: 25,
  androidRuntimeSampleApprovedRecords: 21,
  scaleContractApprovedRecords: 1005,
  productionScaleTargetApprovedRecords: 50000,
  pageSize: 20,
  totalCountSource: "durable_store",
  hardcodedCapsRejected: [13, 14],
  requiredActions: ["pdf", "edit", "market"],
  requiredFlows: ["approve_increment", "reload_persistence", "cursor_pagination", "archive_selected_record"],
} as const;

export type ApprovedHistoryScaleMatrix = typeof APPROVED_HISTORY_SCALE_MATRIX;

export function evaluateApprovedHistoryScaleMatrix(input: {
  totalApprovedCount: number;
  firstPageCount: number;
  lastPageCount: number;
  pageCount: number;
  totalCountSource: string;
  uniqueLoadedIds: number;
}): {
  final_status:
    | "GREEN_APPROVED_HISTORY_SCALE_MATRIX_READY"
    | "STOP_APPROVED_HISTORY_SCALE_MATRIX_FAILED";
  blockers: string[];
  page_size_lte_20: boolean;
  total_count_from_durable_store: boolean;
  more_than_1000_records_proven: boolean;
  no_cap_13_or_14: boolean;
} {
  const blockers: string[] = [];
  const pageSizeLte20 = input.firstPageCount <= APPROVED_HISTORY_SCALE_MATRIX.pageSize;
  const durableTotal = input.totalCountSource === APPROVED_HISTORY_SCALE_MATRIX.totalCountSource;
  const moreThan1000 = input.totalApprovedCount > 1000 && input.uniqueLoadedIds === input.totalApprovedCount;
  const noCap13Or14 = !APPROVED_HISTORY_SCALE_MATRIX.hardcodedCapsRejected.includes(
    input.totalApprovedCount as 13 | 14,
  );
  if (!pageSizeLte20) blockers.push("APPROVED_HISTORY_PAGE_SIZE_EXCEEDS_20");
  if (!durableTotal) blockers.push("APPROVED_HISTORY_TOTAL_NOT_DURABLE");
  if (!moreThan1000) blockers.push("APPROVED_HISTORY_1000_PLUS_NOT_PROVEN");
  if (!noCap13Or14) blockers.push("APPROVED_HISTORY_CAP_13_OR_14_DETECTED");
  if (input.lastPageCount < 1) blockers.push("APPROVED_HISTORY_LAST_PAGE_EMPTY");
  if (input.pageCount < 2) blockers.push("APPROVED_HISTORY_CURSOR_PAGINATION_NOT_PROVEN");

  return {
    final_status: blockers.length === 0
      ? "GREEN_APPROVED_HISTORY_SCALE_MATRIX_READY"
      : "STOP_APPROVED_HISTORY_SCALE_MATRIX_FAILED",
    blockers,
    page_size_lte_20: pageSizeLte20,
    total_count_from_durable_store: durableTotal,
    more_than_1000_records_proven: moreThan1000,
    no_cap_13_or_14: noCap13Or14,
  };
}
