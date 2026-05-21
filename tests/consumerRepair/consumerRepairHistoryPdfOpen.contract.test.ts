import {
  __resetConsumerRepairRequestStoreForTests,
  getConsumerRepairRequestPdf,
  listConsumerRepairRequestHistory,
} from "../../src/lib/consumerRequests";
import { CONSUMER_REPAIR_TEST_USER_ID, createApprovedConsumerRepairRequest } from "./consumerRepairTestHelpers";

describe("consumer repair history PDF open contract", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("keeps generated PDFs openable from paginated history", () => {
    const bundle = createApprovedConsumerRepairRequest();
    const history = listConsumerRepairRequestHistory(CONSUMER_REPAIR_TEST_USER_ID, { limit: 20 });
    const row = history.find((item) => item.draft.id === bundle.draft.id);
    const pdf = getConsumerRepairRequestPdf({ requestDraftId: row?.draft.id ?? "" });

    expect(history.length).toBeLessThanOrEqual(20);
    expect(row?.pdfs[0].pdfStatus).toBe("generated");
    expect(pdf.signedUrl).toContain("application/pdf");
    expect(pdf.contentType).toBe("application/pdf");
  });
});
