import type { ApprovedEstimateHistoryRecord } from "./consumerRequestTypes";
import type { EstimateReplayRecord } from "../estimate/replayableEstimateCoreContract";
import { replayEstimateFromRecord } from "../estimate/replayEstimateFromRecord";
import { validateEstimateReplayRecord } from "../estimate/validateEstimateReplayRecord";

export type ApprovedEstimateHistoryReplayResult = {
  approved_history_replay_guard_created: true;
  history_replay_does_not_load_all_payloads: boolean;
  history_page_size_lte_20: boolean;
  approved_history_records_checked: number;
  replay_payloads_loaded: number;
  replay_payloads_available: number;
  replay_records_passed: number;
  stale_history_snapshot_rejected: boolean;
  passed: boolean;
  blocking_reasons: string[];
};

export function replayApprovedEstimateHistoryRecords(input: {
  records: readonly ApprovedEstimateHistoryRecord[];
  loadReplayRecord: (record: ApprovedEstimateHistoryRecord, index: number) => EstimateReplayRecord | null;
  pageSize?: number;
}): ApprovedEstimateHistoryReplayResult {
  const pageSize = Math.min(Math.max(input.pageSize ?? 20, 1), 20);
  const page = input.records.slice(0, pageSize);
  const loaded = page
    .map((record, index) => ({ record, replayRecord: input.loadReplayRecord(record, index) }))
    .filter((item): item is { record: ApprovedEstimateHistoryRecord; replayRecord: EstimateReplayRecord } =>
      item.replayRecord !== null
    );
  const results = loaded.map((item) => ({
    validation: validateEstimateReplayRecord(item.replayRecord),
    replay: replayEstimateFromRecord(item.replayRecord),
  }));
  const passed = results.filter((item) =>
    item.validation.valid && item.replay.comparison.status === "passed"
  ).length;
  const staleRejected = results.some((item) => item.replay.comparison.status === "failed");
  const blockers = [
    page.length > 0 ? "" : "approved_history_page_empty",
    pageSize <= 20 ? "" : "history_page_size_above_20",
    loaded.length === page.length ? "" : "replay_payload_missing_for_history_record",
    passed === loaded.length ? "" : "approved_history_replay_failed",
  ].filter(Boolean);
  return {
    approved_history_replay_guard_created: true,
    history_replay_does_not_load_all_payloads: input.records.length > page.length,
    history_page_size_lte_20: pageSize <= 20,
    approved_history_records_checked: page.length,
    replay_payloads_loaded: loaded.length,
    replay_payloads_available: input.records.length,
    replay_records_passed: passed,
    stale_history_snapshot_rejected: staleRejected,
    passed: blockers.length === 0,
    blocking_reasons: blockers,
  };
}
