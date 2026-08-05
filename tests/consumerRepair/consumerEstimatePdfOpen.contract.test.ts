import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  ensureConsumerRepairRequestPdfAvailable,
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

  it("reuses the immutable current-revision PDF instead of regenerating on reopen", () => {
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "consumer_pdf_reopen",
      problemText: "РќСѓР¶РЅРѕ РїРѕРєСЂР°СЃРёС‚СЊ СЃС‚РµРЅС‹ 80 Рј2.",
      repairType: "РћС‚РґРµР»РєР°",
      aiDraft: {
        titleRu: "PDF cache",
        summaryRu: "PDF cache",
        repairType: "РћС‚РґРµР»РєР°",
        items: [
          {
            itemType: "work",
            titleRu: "РџРѕРєСЂР°СЃРєР°",
            quantity: 80,
            unit: "РјВІ",
            source: "ai_suggested",
          },
        ],
        missingData: [],
        dangerousDiyBlocked: false,
      },
    });
    const first = ensureConsumerRepairRequestPdfAvailable({
      requestDraftId: bundle.draft.id,
      userId: "consumer_pdf_reopen",
    });
    const second = ensureConsumerRepairRequestPdfAvailable({
      requestDraftId: bundle.draft.id,
      userId: "consumer_pdf_reopen",
    });

    expect(second.pdfs).toHaveLength(1);
    expect(second.pdfs[0]).toEqual(first.pdfs[0]);
  });
});
