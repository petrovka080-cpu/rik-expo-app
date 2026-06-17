import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairDraftFromHistorySnapshot,
  getConsumerRepairRequest,
} from "../../src/lib/consumerRequests";
import {
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
    expect(draft.items.map((item) => item.titleRu).join(" ")).toContain("Ламинат");
    expect(draft.estimateRevisionState?.current_revision_id).toBeTruthy();
    expect(sourceAfterEdit.draft.status).toBe("consumer_approved");
    expect(sourceAfterEdit.pdfs[0]?.revisionId).toBe(approved.pdfs[0]?.revisionId);
  });
});
