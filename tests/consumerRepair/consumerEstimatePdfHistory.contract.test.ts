import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  listConsumerRepairRequestHistory,
} from "../../src/lib/consumerRequests";

describe("consumer estimate PDF history contract", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("keeps the PDF in consumer history", () => {
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "consumer_pdf_history",
      problemText: "Нужна смета на сантехнику.",
      repairType: "Сантехника",
    });
    generateConsumerRepairRequestPdfForDraft({ requestDraftId: bundle.draft.id, userId: "consumer_pdf_history" });

    expect(listConsumerRepairRequestHistory("consumer_pdf_history")[0].pdfs.length).toBe(1);
  });
});
