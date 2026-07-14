import { createLedgerWithDraft } from "./aiEstimateLedgerTestHelpers";

describe("AI estimate durable ledger chaos", () => {
  it("rejects stale artifact binding and preserves the current ledger record", () => {
    const store = createLedgerWithDraft();
    store.appendRevision({
      estimateId: "estimate-ledger-test-1",
      revision: {
        revisionId: "revision-2",
        source: "param_edit",
        createdAt: "2026-07-09T12:04:00.000Z",
        params: {},
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
      idempotencyKey: "append:chaos-revision-2",
    });

    expect(() => store.bindArtifacts({
      estimateId: "estimate-ledger-test-1",
      revisionId: "revision-1",
      snapshotId: "snapshot-revision-1",
      pdfArtifactId: "stale-pdf",
      buyerHandoffId: "stale-buyer",
      actorUserId: "ledger-owner-1",
      sourceLayer: "runtime",
      idempotencyKey: "bind:stale",
      boundAt: "2026-07-09T12:05:00.000Z",
    })).toThrow("AI_ESTIMATE_LEDGER_ARTIFACT_BINDING_STALE_REVISION");
    expect(store.getRecord("estimate-ledger-test-1")?.artifacts.pdfArtifactId).toBeNull();
    expect(store.listApprovedHistory({ ownerUserId: "ledger-owner-1", limit: 20 }).records).toHaveLength(0);
  });
});
