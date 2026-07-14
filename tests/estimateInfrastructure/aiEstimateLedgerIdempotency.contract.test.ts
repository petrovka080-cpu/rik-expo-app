import { createLedgerWithDraft } from "./aiEstimateLedgerTestHelpers";

describe("AI estimate ledger idempotency", () => {
  it("does not duplicate approved history or approval events on duplicate approve", () => {
    const store = createLedgerWithDraft();

    const first = store.approveRevision({
      estimateId: "estimate-ledger-test-1",
      revisionId: "revision-1",
      approvedAt: "2026-07-09T12:05:00.000Z",
      actorUserId: "ledger-owner-1",
      sourceLayer: "runtime",
      idempotencyKey: "approve:estimate-ledger-test-1:revision-1",
    });
    const replay = store.approveRevision({
      estimateId: "estimate-ledger-test-1",
      revisionId: "revision-1",
      approvedAt: "2026-07-09T12:05:00.000Z",
      actorUserId: "ledger-owner-1",
      sourceLayer: "runtime",
      idempotencyKey: "approve:estimate-ledger-test-1:revision-1",
    });
    const page = store.listApprovedHistory({ ownerUserId: "ledger-owner-1", limit: 20 });
    const record = store.getRecord("estimate-ledger-test-1");

    expect(first.idempotencyReused).toBe(false);
    expect(replay.idempotencyReused).toBe(true);
    expect(page.records).toHaveLength(1);
    expect(record?.eventLog.filter((event) => event.eventType === "revision_approved")).toHaveLength(1);
  });
});
