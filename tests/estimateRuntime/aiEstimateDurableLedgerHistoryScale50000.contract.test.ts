import { createInMemoryAiEstimateLedgerStore } from "../../src/lib/estimate/ledger/adapters/InMemoryAiEstimateLedgerStore";

describe("AI estimate durable ledger 50000 approved history scale", () => {
  jest.setTimeout(30000);

  it("pages all approved history from ledger metadata without a 25 item cap", () => {
    const store = createInMemoryAiEstimateLedgerStore();
    const baseMs = Date.UTC(2026, 6, 9, 12, 0, 0);
    for (let index = 0; index < 50000; index += 1) {
      const estimateId = `scale-estimate-${index}`;
      const createdAt = new Date(baseMs - index * 1000).toISOString();
      store.upsertDraft({
        estimateId,
        ownerUserId: "scale-owner",
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
        actorUserId: "scale-owner",
        sourceLayer: "runtime",
        idempotencyKey: `upsert-scale-${index}`,
      });
      store.approveRevision({
        estimateId,
        revisionId: `revision-${index}`,
        approvedAt: createdAt,
        actorUserId: "scale-owner",
        sourceLayer: "runtime",
        idempotencyKey: `approve-scale-${index}`,
      });
    }

    const startedAt = performance.now();
    const firstPage = store.listApprovedHistory({ ownerUserId: "scale-owner", limit: 20 });
    const elapsedMs = performance.now() - startedAt;
    const secondPage = store.listApprovedHistory({
      ownerUserId: "scale-owner",
      limit: 20,
      cursorCreatedAt: firstPage.nextCursorCreatedAt,
    });

    expect(firstPage.totalCount).toBe(50000);
    expect(firstPage.records).toHaveLength(20);
    expect(secondPage.records).toHaveLength(20);
    expect(new Set([...firstPage.records, ...secondPage.records].map((record) => record.approvedEstimateId)).size).toBe(40);
    expect(elapsedMs).toBeLessThan(1000);
  });
});
