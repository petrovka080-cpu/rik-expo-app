import {
  __resetConsumerRepairRequestStoreForTests,
  getConsumerRepairRequestPdf,
} from "../../src/lib/consumerRequests";
import { createApprovedConsumerRepairRequest } from "./consumerRepairTestHelpers";

describe("consumer repair PDF open contract", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("returns a content-type checked open result with signed URL", () => {
    const bundle = createApprovedConsumerRepairRequest();
    const pdf = getConsumerRepairRequestPdf({ requestDraftId: bundle.draft.id });

    expect(pdf.requestId).toBe(bundle.draft.id);
    expect(pdf.pdfId).toBe(bundle.pdfs[0].id);
    expect(pdf.contentType).toBe("application/pdf");
    expect(pdf.signedUrl).toContain("application/pdf");
    expect(pdf.signedUrl).not.toContain(bundle.pdfs[0].storageKey);
    expect(Date.parse(pdf.expiresAt)).toBeGreaterThan(Date.now());
  });
});
