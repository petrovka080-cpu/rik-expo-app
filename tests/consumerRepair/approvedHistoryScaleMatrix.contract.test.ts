import {
  APPROVED_HISTORY_SCALE_MATRIX,
  evaluateApprovedHistoryScaleMatrix,
} from "../../src/lib/consumerRequests/approvedHistoryScaleMatrix";

describe("approved history scale matrix", () => {
  it("locks runtime samples separately from production-scale proof targets", () => {
    expect(APPROVED_HISTORY_SCALE_MATRIX).toMatchObject({
      uiRuntimeSampleApprovedRecords: 25,
      androidRuntimeSampleApprovedRecords: 21,
      scaleContractApprovedRecords: 1005,
      productionScaleTargetApprovedRecords: 50000,
      pageSize: 20,
      totalCountSource: "durable_store",
    });
    expect(APPROVED_HISTORY_SCALE_MATRIX.hardcodedCapsRejected).toEqual([13, 14]);
    expect(APPROVED_HISTORY_SCALE_MATRIX.requiredActions).toEqual(["pdf", "edit", "market"]);
    expect(APPROVED_HISTORY_SCALE_MATRIX.requiredFlows).toEqual([
      "approve_increment",
      "reload_persistence",
      "cursor_pagination",
      "archive_selected_record",
    ]);
  });

  it("rejects loaded-slice totals and accepts a 1000+ paged durable total", () => {
    expect(evaluateApprovedHistoryScaleMatrix({
      totalApprovedCount: 20,
      firstPageCount: 20,
      lastPageCount: 20,
      pageCount: 1,
      totalCountSource: "loaded_slice",
      uniqueLoadedIds: 20,
    })).toMatchObject({
      final_status: "STOP_APPROVED_HISTORY_SCALE_MATRIX_FAILED",
      total_count_from_durable_store: false,
      more_than_1000_records_proven: false,
    });

    expect(evaluateApprovedHistoryScaleMatrix({
      totalApprovedCount: 1005,
      firstPageCount: 20,
      lastPageCount: 5,
      pageCount: 51,
      totalCountSource: "durable_store",
      uniqueLoadedIds: 1005,
    })).toMatchObject({
      final_status: "GREEN_APPROVED_HISTORY_SCALE_MATRIX_READY",
      blockers: [],
      more_than_1000_records_proven: true,
    });
  });
});
