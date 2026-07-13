import { validateAiEstimateLedgerRevisionArtifactLifecycle } from "../../src/lib/estimate/ledger/lifecycle/AiEstimateLedgerRevisionArtifactLifecycle";
import { createLedgerWithDraft } from "./aiEstimateLedgerTestHelpers";

describe("AI estimate ledger revision artifact lifecycle", () => {
  it("invalidates pdf and buyer artifact refs when a new revision is appended", () => {
    const store = createLedgerWithDraft();
    store.bindArtifacts({
      estimateId: "estimate-ledger-test-1",
      revisionId: "revision-1",
      snapshotId: "snapshot-revision-1",
      pdfArtifactId: "pdf-revision-1",
      buyerHandoffId: "buyer-revision-1",
      actorUserId: "ledger-owner-1",
      sourceLayer: "runtime",
      idempotencyKey: "bind:revision-1",
      boundAt: "2026-07-09T12:03:00.000Z",
    });
    store.appendRevision({
      estimateId: "estimate-ledger-test-1",
      revision: {
        revisionId: "revision-2",
        source: "param_edit",
        createdAt: "2026-07-09T12:04:00.000Z",
        params: { area_m2: 100 },
        rowCount: 13,
        materialRowsCount: 8,
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

    const record = store.getRecord("estimate-ledger-test-1");
    expect(record?.artifacts.pdfArtifactId).toBeNull();
    expect(record?.artifacts.buyerHandoffId).toBeNull();
    expect(validateAiEstimateLedgerRevisionArtifactLifecycle(record!)).toMatchObject({
      ok: true,
      stale_pdf_buyer_invalidated_after_revision: true,
    });
  });
});
