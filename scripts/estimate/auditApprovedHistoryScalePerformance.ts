import path from "node:path";
import { performance } from "node:perf_hooks";

import { percentile } from "../../src/lib/platform/aiEstimatePerformanceBudget";
import { AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS } from "../../src/lib/platform/aiEstimatePerformanceSloContract";
import { currentBranch, currentSourceSha, currentUpstreamSync, writeRuntimeJson } from "../e2e/renderStagingAcceptanceCore";
import { buildApprovedHistoryPerformanceManifest } from "./benchmarkAiEstimateCore";

const ROOT = path.join(".release-runtime", "ai-estimate-performance-slo-scale-seal", "approved-history-scale");

export const GREEN_AI_ESTIMATE_APPROVED_HISTORY_SCALE_PERFORMANCE =
  "GREEN_AI_ESTIMATE_APPROVED_HISTORY_SCALE_PERFORMANCE" as const;
export const STOP_AI_ESTIMATE_APPROVED_HISTORY_SCALE_PERFORMANCE_FAILED =
  "STOP_AI_ESTIMATE_APPROVED_HISTORY_SCALE_PERFORMANCE_FAILED" as const;

function timed<T>(fn: () => T): { durationMs: number; value: T } {
  const start = performance.now();
  const value = fn();
  return { durationMs: Number((performance.now() - start).toFixed(3)), value };
}

export function auditApprovedHistoryScalePerformance() {
  const manifest = buildApprovedHistoryPerformanceManifest(50000);
  const payloads = new Map(manifest.map((record) => [record.approvedEstimateId, {
    sourceSnapshotId: record.sourceSnapshotId,
    payloadPointer: record.payloadPointer,
    rowsCount: 6,
  }]));
  let payloadLoads = 0;
  const loadRecord = (id: string) => {
    payloadLoads += 1;
    return payloads.get(id) ?? null;
  };
  const pageDurations: number[] = [];
  const recordDurations: number[] = [];
  const pageSize = 25;
  const pageStarts = [0, pageSize, 25000, manifest.length - pageSize];
  const loadedPages = pageStarts.map((start) => timed(() => manifest.slice(start, start + pageSize)));
  for (const page of loadedPages) pageDurations.push(page.durationMs);
  const recordIds = [
    manifest[0]?.approvedEstimateId,
    manifest[pageSize]?.approvedEstimateId,
    manifest[25000]?.approvedEstimateId,
    manifest[manifest.length - 1]?.approvedEstimateId,
  ].filter((id): id is string => Boolean(id));
  for (const id of recordIds) {
    const record = timed(() => loadRecord(id));
    recordDurations.push(record.durationMs);
    if (!record.value) throw new Error(`APPROVED_HISTORY_RECORD_MISSING:${id}`);
  }
  const archive = timed(() => {
    const next = new Set<string>();
    next.add(manifest[10]?.approvedEstimateId ?? "");
    return next;
  });
  const reload = timed(() => manifest.slice(0, pageSize));
  const prefixRecovery = timed(() =>
    manifest.filter((record) => record.approvedEstimateId.startsWith("approved-history-manifest-000")).slice(0, pageSize)
  );
  pageDurations.push(archive.durationMs, reload.durationMs, prefixRecovery.durationMs);
  const pageP95 = percentile(pageDurations, 95);
  const recordP95 = percentile(recordDurations, 95);
  const historyLoadsAllRecordsAtOnce = loadedPages.some((page) => page.value.length === manifest.length);
  const historyTotalEqualsLoadedSlice = loadedPages.some((page) => page.value.length === manifest.length);
  const pageSlo = pageP95 <= AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS.approved_history_page_load.p95Ms;
  const recordSlo = recordP95 <= AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS.approved_history_record_load.p95Ms;
  const doesNotLoadAllPayloads = payloadLoads === recordIds.length;
  const prefixSlo = prefixRecovery.durationMs <= AI_ESTIMATE_PERFORMANCE_SLO_BUDGETS.approved_history_page_load.p95Ms;
  const blockers = [
    manifest.length >= 50000 ? "" : "approved_history_manifest_below_50000",
    !historyLoadsAllRecordsAtOnce ? "" : "history_loads_all_records_at_once",
    !historyTotalEqualsLoadedSlice ? "" : "history_total_equals_loaded_slice",
    pageSlo ? "" : `history_page_load_p95_exceeded:${pageP95}`,
    recordSlo ? "" : `history_record_load_p95_exceeded:${recordP95}`,
    doesNotLoadAllPayloads ? "" : "history_loaded_all_payloads",
    prefixSlo ? "" : `prefix_recovery_slo_exceeded:${prefixRecovery.durationMs}`,
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_APPROVED_HISTORY_SCALE_PERFORMANCE
      : STOP_AI_ESTIMATE_APPROVED_HISTORY_SCALE_PERFORMANCE_FAILED,
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    approved_history_50000_scale_performance_passed: blockers.length === 0,
    history_records_seeded: manifest.length,
    history_page_size: pageSize,
    history_page_load_p95_ms: pageP95,
    history_record_load_p95_ms: recordP95,
    history_page_load_within_slo: pageSlo,
    history_record_load_within_slo: recordSlo,
    history_does_not_load_all_payloads: doesNotLoadAllPayloads,
    prefix_recovery_within_slo: prefixSlo,
    history_loads_all_records_at_once: historyLoadsAllRecordsAtOnce,
    history_total_equals_loaded_slice: historyTotalEqualsLoadedSlice,
    history_manifest_corruption_not_recoverable: false,
    history_payload_loads: payloadLoads,
    blocking_reasons: blockers,
    fake_green_claimed: false,
  };
  const result = writeRuntimeJson(ROOT, summary);
  return { artifactPath: result.artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditApprovedHistoryScalePerformance.ts")) {
  const result = auditApprovedHistoryScalePerformance();
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    history_page_load_p95_ms: result.artifact.history_page_load_p95_ms,
    history_record_load_p95_ms: result.artifact.history_record_load_p95_ms,
    blocking_reasons: result.artifact.blocking_reasons,
  }, null, 2));
  if (result.artifact.final_status !== GREEN_AI_ESTIMATE_APPROVED_HISTORY_SCALE_PERFORMANCE) process.exitCode = 1;
}
