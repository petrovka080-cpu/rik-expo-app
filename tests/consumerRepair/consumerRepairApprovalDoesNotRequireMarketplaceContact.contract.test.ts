import {
  __resetConsumerRepairRequestStoreForTests,
  addConsumerRepairRequestItem,
  approveConsumerRepairRequestDraft,
  ConsumerRepairValidationError,
  createConsumerRepairRequestDraft,
  sendConsumerRepairRequestToMarketplace,
} from "../../src/lib/consumerRequests";

describe("consumer estimate approval boundary", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("approves a complete estimate without delivery contact but keeps marketplace validation strict", () => {
    let bundle = createConsumerRepairRequestDraft({
      consumerUserId: "approval-boundary-user",
      problemText: "Профессиональная предварительная смета электромонтажных работ",
      repairType: "electrical",
      city: "Bishkek",
      addressText: null,
      contactPhone: null,
    });
    bundle = addConsumerRepairRequestItem({
      requestDraftId: bundle.draft.id,
      titleRu: "Кабель силовой",
      itemType: "material",
      quantity: 25,
      unit: "linear_m",
      unitLabel: "пог. м",
      unitPrice: 118,
      currency: "KGS",
      source: "user_added",
      addedBy: "ai",
    });

    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
    });

    expect(approved.draft.status).toBe("consumer_approved");
    expect(approved.pdfs[0]?.pdfStatus).toBe("generated");
    expect(approved.pdfs[0]?.revisionId).toBeTruthy();

    expect(() =>
      sendConsumerRepairRequestToMarketplace({
        requestDraftId: approved.draft.id,
        userId: approved.draft.consumerUserId,
      }),
    ).toThrow(ConsumerRepairValidationError);

    try {
      sendConsumerRepairRequestToMarketplace({
        requestDraftId: approved.draft.id,
        userId: approved.draft.consumerUserId,
      });
    } catch (error) {
      const codes = (error as ConsumerRepairValidationError).errors.map(
        (item) => item.code,
      );
      expect(codes).toEqual(
        expect.arrayContaining(["CONTACT_REQUIRED", "DELIVERY_ADDRESS_REQUIRED"]),
      );
    }
  });
});
