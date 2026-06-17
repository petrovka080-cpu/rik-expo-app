import {
  __deleteConsumerRepairPdfStorageObjectForTests,
  __resetConsumerRepairRequestStoreForTests,
  getConsumerRepairRequestPdf,
} from "../../src/lib/consumerRequests";
import { createApprovedConsumerRepairRequest } from "./consumerRepairTestHelpers";

describe("history does not crash when PDF storage is missing", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("returns a regenerated PDF instead of surfacing the raw storage error", () => {
    const approved = createApprovedConsumerRepairRequest();
    const pdf = approved.pdfs[0];
    __deleteConsumerRepairPdfStorageObjectForTests({
      storageBucket: pdf.storageBucket,
      storageKey: pdf.storageKey,
    });

    expect(() => getConsumerRepairRequestPdf({ requestDraftId: approved.draft.id })).not.toThrow(
      "Consumer repair PDF storage object is missing.",
    );
    expect(getConsumerRepairRequestPdf({ requestDraftId: approved.draft.id }).signedUrl).toContain("application/pdf");
  });
});
