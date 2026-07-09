import { createInMemoryAiEstimateOfflineQueue } from "../../src/lib/estimate/ledger/sync/AiEstimateOfflineQueue";
import { syncAiEstimateLedgerQueue } from "../../src/lib/estimate/ledger/sync/syncAiEstimateLedgerQueue";
import { createLedgerWithDraft } from "./aiEstimateLedgerTestHelpers";

describe("AI estimate offline sync", () => {
  it("replays queued operations idempotently and keeps stale base revisions queued as conflicts", () => {
    const store = createLedgerWithDraft();
    const queue = createInMemoryAiEstimateOfflineQueue();
    queue.enqueue({
      queueId: "offline-approve-1",
      createdAt: "2026-07-09T12:01:00.000Z",
      baseRevisionId: "revision-1",
      operation: {
        operationType: "approve_revision",
        input: {
          estimateId: "estimate-ledger-test-1",
          revisionId: "revision-1",
          approvedAt: "2026-07-09T12:05:00.000Z",
          actorUserId: "ledger-owner-1",
          sourceLayer: "runtime",
          idempotencyKey: "offline-approve-idem-1",
        },
      },
    });
    store.appendRevision({
      estimateId: "estimate-ledger-test-1",
      revision: {
        revisionId: "revision-2",
        source: "param_edit",
        createdAt: "2026-07-09T12:02:00.000Z",
        params: { area_m2: 100 },
        rowCount: 12,
        materialRowsCount: 7,
        workRowsCount: 5,
        snapshotId: "snapshot-revision-2",
        pdfArtifactId: null,
        buyerHandoffId: null,
        artifactsValidForRevisionId: null,
      },
      actorUserId: "ledger-owner-1",
      sourceLayer: "runtime",
      idempotencyKey: "append:revision-2",
    });

    const summary = syncAiEstimateLedgerQueue({ queue, store });

    expect(summary.syncedCount).toBe(0);
    expect(summary.conflictCount).toBe(1);
    expect(summary.remainingQueueCount).toBe(1);
    expect(store.getRecord("estimate-ledger-test-1")?.status).toBe("draft");
  });
});
