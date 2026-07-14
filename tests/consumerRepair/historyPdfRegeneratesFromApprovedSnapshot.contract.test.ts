import {
  __deleteConsumerRepairPdfStorageObjectForTests,
  __resetConsumerRepairRequestStoreForTests,
  consumerRepairPdfStorageObjectExists,
  getConsumerRepairRequest,
  getConsumerRepairRequestPdf,
} from "../../src/lib/consumerRequests";
import { createApprovedConsumerRepairRequest } from "./consumerRepairTestHelpers";

describe("history PDF regenerates from approved snapshot", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("rebuilds and rebinds PDF when the approved history storage object is missing", () => {
    const approved = createApprovedConsumerRepairRequest();
    const originalPdf = approved.pdfs[0];
    __deleteConsumerRepairPdfStorageObjectForTests({
      storageBucket: originalPdf.storageBucket,
      storageKey: originalPdf.storageKey,
    });

    const opened = getConsumerRepairRequestPdf({ requestDraftId: approved.draft.id });
    const refreshed = getConsumerRepairRequest(approved.draft.id);
    const regenerated = refreshed.pdfs[0];

    expect(opened.requestId).toBe(approved.draft.id);
    expect(opened.contentType).toBe("application/pdf");
    expect(regenerated.revisionId).toBe(approved.estimateRevisionState?.current_revision_id);
    expect(consumerRepairPdfStorageObjectExists(regenerated.storageBucket, regenerated.storageKey)).toBe(true);
  });
});
