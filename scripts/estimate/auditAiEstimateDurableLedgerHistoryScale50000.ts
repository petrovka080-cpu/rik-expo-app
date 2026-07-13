import path from "node:path";

import { createInMemoryAiEstimateLedgerStore } from "../../src/lib/estimate/ledger/adapters/InMemoryAiEstimateLedgerStore";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_DURABLE_LEDGER_HISTORY_SCALE_50000 =
  "GREEN_AI_ESTIMATE_DURABLE_LEDGER_HISTORY_SCALE_50000" as const;
export const STOP_AI_ESTIMATE_DURABLE_LEDGER_HISTORY_SCALE_50000_FAILED =
  "STOP_AI_ESTIMATE_DURABLE_LEDGER_HISTORY_SCALE_50000_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-production-durable-ledger-sync-history-scale", "history-scale-50000");

export function auditAiEstimateDurableLedgerHistoryScale50000(input: { writeSummary?: boolean } = {}) {
  const store = createInMemoryAiEstimateLedgerStore();
  const ownerUserId = "scale-owner";
  const baseMs = Date.UTC(2026, 6, 9, 12, 0, 0);
  for (let index = 0; index < 50000; index += 1) {
    const estimateId = `scale-estimate-${index}`;
    const createdAt = new Date(baseMs - index * 1000).toISOString();
    store.upsertDraft({
      estimateId,
      ownerUserId,
      orgId: null,
      kind: "consumer_repair",
      sourceRoute: "/request",
      title: `Смета ${index}`,
      prompt: "Типовая работа",
      selectedTemplateId: "template-scale",
      family: "scale",
      createdAt,
      updatedAt: createdAt,
      status: "draft",
      sourceDraftId: estimateId,
      currentRevisionId: `revision-${index}`,
      sourceSnapshotId: `snapshot-${index}`,
      rowCount: 3,
      materialRowsCount: 1,
      workRowsCount: 2,
      artifacts: {
        snapshotId: `snapshot-${index}`,
        pdfArtifactId: `pdf-${index}`,
        buyerHandoffId: null,
        artifactsValidForRevisionId: `revision-${index}`,
      },
      actorUserId: ownerUserId,
      sourceLayer: "runtime",
      idempotencyKey: `upsert-scale-${index}`,
    });
    store.approveRevision({
      estimateId,
      revisionId: `revision-${index}`,
      approvedAt: createdAt,
      actorUserId: ownerUserId,
      sourceLayer: "runtime",
      idempotencyKey: `approve-scale-${index}`,
    });
  }
  const startedAt = performance.now();
  const firstPage = store.listApprovedHistory({ ownerUserId, limit: 20 });
  const listP95Ms = Math.round((performance.now() - startedAt) * 100) / 100;
  const secondPage = store.listApprovedHistory({
    ownerUserId,
    limit: 20,
    cursorCreatedAt: firstPage.nextCursorCreatedAt,
  });
  const checks = {
    approved_history_count_50000: firstPage.totalCount === 50000,
    page_size_not_capped_at_25_total: firstPage.totalCount > 25 && firstPage.records.length === 20,
    cursor_pagination_unique: new Set([...firstPage.records, ...secondPage.records].map((record) => record.approvedEstimateId)).size === 40,
    list_p95_under_1000ms: listP95Ms < 1000,
    metadata_history_without_bundle_payloads: firstPage.records.every((record) => !("items" in record) && record.pdfArtifactId?.startsWith("pdf-")),
  };
  const blockers = Object.entries(checks).filter(([, passed]) => !passed).map(([key]) => key);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_DURABLE_LEDGER_HISTORY_SCALE_50000
      : STOP_AI_ESTIMATE_DURABLE_LEDGER_HISTORY_SCALE_50000_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    approved_history_total: firstPage.totalCount,
    first_page_count: firstPage.records.length,
    second_page_count: secondPage.records.length,
    list_p95_ms: listP95Ms,
    ...checks,
    blockers,
  };
  const summaryPath = path.join(ROOT, timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = auditAiEstimateDurableLedgerHistoryScale50000({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_DURABLE_LEDGER_HISTORY_SCALE_50000) process.exitCode = 1;
}
