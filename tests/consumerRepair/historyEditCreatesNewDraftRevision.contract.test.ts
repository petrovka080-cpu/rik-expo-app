import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairDraftFromHistorySnapshot,
  getConsumerRepairRequest,
  listApprovedEstimateHistoryRecords,
  updateConsumerRepairRequestItemQuantity,
} from "../../src/lib/consumerRequests";
import { getCurrentEstimateRevision } from "../../src/lib/ai/estimateRevisions";
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

  it("reopens an approved estimate as an active draft when its quantity changes", () => {
    const approved = createApprovedConsumerRepairRequest();
    const item = approved.items[0];
    if (!item) throw new Error("approved item missing");
    const approvedPdf = approved.pdfs.find((pdf) => pdf.pdfStatus === "generated");
    const beforeRevision = getCurrentEstimateRevision(approved.estimateRevisionState!);

    const edited = updateConsumerRepairRequestItemQuantity({
      requestDraftId: approved.draft.id,
      itemId: item.id,
      quantity: (item.quantity ?? 0) + 1,
    });
    const editedRevision = getCurrentEstimateRevision(edited.estimateRevisionState!);

    expect(edited.draft.status).toBe("draft");
    expect(edited.draft.approvedAt).toBeNull();
    expect(edited.marketplaceLink.status).toBe("not_sent");
    expect(edited.marketplaceLink.marketplaceDemandId).toBeNull();
    expect(edited.events.some((event) => event.eventType === "approved_estimate_reopened_for_content_edit")).toBe(true);
    expect(editedRevision.revision_id).not.toBe(beforeRevision.revision_id);
    expect(editedRevision.rows_hash).not.toBe(beforeRevision.rows_hash);
    expect(edited.items.find((row) => row.id === item.id)?.quantity).toBe((item.quantity ?? 0) + 1);
    expect(edited.pdfs.find((pdf) => pdf.id === approvedPdf?.id)?.pdfStatus).toBe("archived");
    expect(listApprovedEstimateHistoryRecords(CONSUMER_REPAIR_TEST_USER_ID)).toHaveLength(0);
    expect(getConsumerRepairRequest(approved.draft.id).draft.status).toBe("draft");

    const reapproved = approveConsumerRepairRequestDraft({
      requestDraftId: approved.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
    });

    expect(reapproved.draft.status).toBe("consumer_approved");
    expect(reapproved.pdfs[0]?.pdfStatus).toBe("generated");
    expect(reapproved.pdfs[0]?.revisionId).toBe(editedRevision.revision_id);
    expect(reapproved.pdfs[0]?.revisionRowsHash).toBe(editedRevision.rows_hash);
    expect(reapproved.pdfs[0]?.id).not.toBe(approvedPdf?.id);
    expect(listApprovedEstimateHistoryRecords(CONSUMER_REPAIR_TEST_USER_ID)[0]?.sourceRevisionId)
      .toBe(editedRevision.revision_id);
  });
});
