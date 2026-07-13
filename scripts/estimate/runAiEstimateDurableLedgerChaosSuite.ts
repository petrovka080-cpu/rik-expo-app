import path from "node:path";

import { createInMemoryAiEstimateLedgerStore } from "../../src/lib/estimate/ledger/adapters/InMemoryAiEstimateLedgerStore";
import { createInMemoryAiEstimateOfflineQueue } from "../../src/lib/estimate/ledger/sync/AiEstimateOfflineQueue";
import { syncAiEstimateLedgerQueue } from "../../src/lib/estimate/ledger/sync/syncAiEstimateLedgerQueue";
import { validateAiEstimateLedgerTelemetry } from "../../src/lib/estimate/ledger/telemetry/validateAiEstimateLedgerTelemetry";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_DURABLE_LEDGER_CHAOS =
  "GREEN_AI_ESTIMATE_DURABLE_LEDGER_CHAOS" as const;
export const STOP_AI_ESTIMATE_DURABLE_LEDGER_CHAOS_FAILED =
  "STOP_AI_ESTIMATE_DURABLE_LEDGER_CHAOS_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-production-durable-ledger-sync-history-scale", "chaos");

export function runAiEstimateDurableLedgerChaosSuite(input: { writeSummary?: boolean } = {}) {
  const store = createInMemoryAiEstimateLedgerStore();
  const ownerUserId = "chaos-owner";
  store.upsertDraft({
    estimateId: "chaos-estimate",
    ownerUserId,
    orgId: null,
    kind: "ai_estimate",
    sourceRoute: "/request",
    title: "Chaos",
    prompt: "Chaos",
    selectedTemplateId: "chaos-template",
    family: "chaos",
    createdAt: "2026-07-09T12:00:00.000Z",
    updatedAt: "2026-07-09T12:00:00.000Z",
    status: "draft",
    sourceDraftId: "chaos-estimate",
    currentRevisionId: "revision-1",
    sourceSnapshotId: "snapshot-1",
    rowCount: 1,
    materialRowsCount: 0,
    workRowsCount: 1,
    artifacts: {
      snapshotId: "snapshot-1",
      pdfArtifactId: "pdf-1",
      buyerHandoffId: "buyer-1",
      artifactsValidForRevisionId: "revision-1",
    },
    actorUserId: ownerUserId,
    sourceLayer: "runtime",
    idempotencyKey: "chaos-upsert-1",
  });
  store.appendRevision({
    estimateId: "chaos-estimate",
    revision: {
      revisionId: "revision-2",
      source: "param_edit",
      createdAt: "2026-07-09T12:01:00.000Z",
      params: {},
      rowCount: 2,
      materialRowsCount: 1,
      workRowsCount: 1,
      snapshotId: "snapshot-2",
      pdfArtifactId: null,
      buyerHandoffId: null,
      artifactsValidForRevisionId: null,
    },
    actorUserId: ownerUserId,
    sourceLayer: "runtime",
    idempotencyKey: "chaos-append-2",
  });
  let staleArtifactRejected = false;
  try {
    store.bindArtifacts({
      estimateId: "chaos-estimate",
      revisionId: "revision-1",
      snapshotId: "snapshot-1",
      pdfArtifactId: "stale-pdf",
      buyerHandoffId: "stale-buyer",
      actorUserId: ownerUserId,
      sourceLayer: "runtime",
      idempotencyKey: "chaos-stale-bind",
      boundAt: "2026-07-09T12:02:00.000Z",
    });
  } catch (error) {
    staleArtifactRejected = error instanceof Error
      && error.message.includes("AI_ESTIMATE_LEDGER_ARTIFACT_BINDING_STALE_REVISION");
  }
  const queue = createInMemoryAiEstimateOfflineQueue();
  queue.enqueue({
    queueId: "chaos-offline-stale",
    createdAt: "2026-07-09T12:03:00.000Z",
    baseRevisionId: "revision-1",
    operation: {
      operationType: "approve_revision",
      input: {
        estimateId: "chaos-estimate",
        revisionId: "revision-1",
        approvedAt: "2026-07-09T12:03:00.000Z",
        actorUserId: ownerUserId,
        sourceLayer: "runtime",
        idempotencyKey: "chaos-offline-approve",
      },
    },
  });
  const sync = syncAiEstimateLedgerQueue({ queue, store });
  const telemetry = validateAiEstimateLedgerTelemetry();
  const record = store.getRecord("chaos-estimate");
  const checks = {
    stale_artifact_rejected: staleArtifactRejected,
    stale_offline_conflict_retained: sync.conflictCount === 1 && sync.remainingQueueCount === 1,
    current_record_preserved: record?.currentRevisionId === "revision-2" && record.artifacts.pdfArtifactId === null,
    duplicate_history_not_created: store.listApprovedHistory({ ownerUserId, limit: 20 }).records.length === 0,
    telemetry_redaction_passed: telemetry.ok,
  };
  const blockers = Object.entries(checks).filter(([, passed]) => !passed).map(([key]) => key);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_DURABLE_LEDGER_CHAOS
      : STOP_AI_ESTIMATE_DURABLE_LEDGER_CHAOS_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    sync,
    ...checks,
    blockers,
  };
  const summaryPath = path.join(ROOT, timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = runAiEstimateDurableLedgerChaosSuite({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_DURABLE_LEDGER_CHAOS) process.exitCode = 1;
}
