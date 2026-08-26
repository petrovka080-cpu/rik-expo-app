import {
  __resetConsumerRepairRequestStoreForTests,
  ConsumerRepairValidationError,
  createConsumerRepairDraftFromHistorySnapshot,
  getConsumerRepairRequest,
  listApprovedEstimateHistoryRecords,
  updateConsumerRepairRequestItemQuantity,
} from "../../src/lib/consumerRequests";
import {
  canonicalArtifactForApprovedConsumerRepairTestBundle,
  CONSUMER_REPAIR_TEST_USER_ID,
  createApprovedConsumerRepairRequest,
} from "./consumerRepairTestHelpers";

describe("history edit creates new draft revision", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("creates an editable draft from an approved history snapshot without mutating history", () => {
    const approved = createApprovedConsumerRepairRequest();
    const draft = createConsumerRepairDraftFromHistorySnapshot({
      sourceRequestDraftId: approved.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
      reason: "edit_as_new_revision",
    });
    const sourceAfterEdit = getConsumerRepairRequest(approved.draft.id);

    expect(draft.draft.id).not.toBe(approved.draft.id);
    expect(draft.draft.status).toBe("draft");
    expect(draft.items).toHaveLength(approved.items.length);
    const canonicalArtifact = canonicalArtifactForApprovedConsumerRepairTestBundle(approved);
    expect(draft.items.map((item) => item.titleRu).join(" ").toLocaleLowerCase("ru")).toContain("ламинат");
    expect(draft.estimateRevisionState ?? null).toBeNull();
    expect(draft.items.every((item) =>
      item.sourceParameters?.canonicalBackendRevisionId === canonicalArtifact.revisionId
    )).toBe(true);
    expect(draft.events.some((event) =>
      event.eventType === "history_snapshot_edit_as_new_revision" &&
      event.payload.sourceRevisionId === canonicalArtifact.revisionId
    )).toBe(true);
    expect(sourceAfterEdit.draft.status).toBe("consumer_approved");
    expect(sourceAfterEdit.pdfs[0]?.revisionId).toBe(approved.pdfs[0]?.revisionId);
  });

  it("fails closed instead of mutating an approved canonical revision locally", () => {
    const approved = createApprovedConsumerRepairRequest();
    const item = approved.items[0];
    if (!item) throw new Error("approved item missing");
    const mutate = () => updateConsumerRepairRequestItemQuantity({
      requestDraftId: approved.draft.id,
      itemId: item.id,
      quantity: (item.quantity ?? 0) + 1,
    });
    expect(mutate).toThrow(ConsumerRepairValidationError);
    try {
      mutate();
    } catch (error) {
      expect((error as ConsumerRepairValidationError).errors.map((item) => item.code))
        .toContain("CANONICAL_ESTIMATE_BACKEND_REQUIRED");
    }
    expect(getConsumerRepairRequest(approved.draft.id).draft.status).toBe("consumer_approved");
    expect(listApprovedEstimateHistoryRecords(CONSUMER_REPAIR_TEST_USER_ID)[0]?.sourceRevisionId)
      .toBe(canonicalArtifactForApprovedConsumerRepairTestBundle(approved).revisionId);
  });
});
