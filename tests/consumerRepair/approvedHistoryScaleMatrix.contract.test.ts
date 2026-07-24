import {
  APPROVED_HISTORY_SCALE_MATRIX,
  evaluateApprovedHistoryScaleMatrix,
} from "../../src/lib/consumerRequests";

describe("approved history scale matrix", () => {
  it("locks runtime samples separately from production-scale proof targets", () => {
    expect(APPROVED_HISTORY_SCALE_MATRIX).toMatchObject({
      uiRuntimeSampleApprovedRecords: 25,
      androidRuntimeSampleApprovedRecords: 21,
      scaleContractApprovedRecords: 1005,
      productionScaleTargetApprovedRecords: 50000,
      pageSize: 20,
      totalCountSource: "durable_store",
      durableStorageMode: "manifest_plus_per_record_v2",
    });
    expect(APPROVED_HISTORY_SCALE_MATRIX.legacyMigrationSource).toBe("rik.consumer_repair.request_bundles.v1");
    expect(APPROVED_HISTORY_SCALE_MATRIX.durableManifestKey).toBe("rik.consumer_repair.request_bundles.v2.manifest");
    expect(APPROVED_HISTORY_SCALE_MATRIX.durableRecordKeyPrefix).toBe("rik.consumer_repair.request_bundle.v2:");
    expect(APPROVED_HISTORY_SCALE_MATRIX.hardcodedCapsRejected).toEqual([13, 14]);
    expect(APPROVED_HISTORY_SCALE_MATRIX.requiredActions).toEqual(["pdf", "edit", "market"]);
    expect(APPROVED_HISTORY_SCALE_MATRIX.requiredFlows).toEqual([
      "approve_increment",
      "reload_persistence",
      "legacy_v1_migration",
      "per_record_persistence",
      "prefix_scan_recovery",
      "cursor_pagination",
      "archive_selected_record",
    ]);
    expect(APPROVED_HISTORY_SCALE_MATRIX.requiredDurableStorageGuarantees).toEqual([
      "no_monolithic_full_history_rewrite",
      "compact_records_without_structured_payload",
      "legacy_snapshot_restored_if_v2_migration_incomplete",
      "durable_save_failure_blocks_false_success",
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
