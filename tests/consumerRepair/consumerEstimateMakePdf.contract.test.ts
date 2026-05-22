import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
} from "../../src/lib/consumerRequests";

describe("consumer estimate make PDF contract", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("creates a PDF for a consumer estimate without sending to marketplace", () => {
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "consumer_make_pdf",
      problemText: "Нужно уложить ламинат на 100 квадратных метров.",
      repairType: "Пол",
      aiDraft: {
        titleRu: "Смета на ламинат",
        summaryRu: "Материалы и работы рассчитаны.",
        repairType: "Пол",
        items: [{ itemType: "work", titleRu: "Укладка ламината", quantity: 100, unit: "м²", source: "ai_suggested" }],
        missingData: ["город"],
        dangerousDiyBlocked: false,
      },
    });
    const next = generateConsumerRepairRequestPdfForDraft({ requestDraftId: bundle.draft.id, userId: "consumer_make_pdf" });

    expect(next.pdfs[0].pdfStatus).toBe("generated");
    expect(next.marketplaceLink.status).toBe("not_sent");
  });
});
