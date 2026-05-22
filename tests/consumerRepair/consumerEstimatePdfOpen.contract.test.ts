import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequestPdf,
} from "../../src/lib/consumerRequests";

describe("consumer estimate PDF open contract", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("opens generated PDF through a signed access result", () => {
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "consumer_pdf_open",
      problemText: "Нужно покрасить стены 80 м2.",
      repairType: "Отделка",
    });
    const withPdf = generateConsumerRepairRequestPdfForDraft({ requestDraftId: bundle.draft.id, userId: "consumer_pdf_open" });
    const opened = getConsumerRepairRequestPdf({ requestDraftId: withPdf.draft.id });

    expect(opened.signedUrl).toContain("data:application/pdf");
    expect(opened.pdfId).toBe(withPdf.pdfs[0].id);
  });
});
