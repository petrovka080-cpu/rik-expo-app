import {
  __resetConsumerRepairRequestStoreForTests,
  addConsumerRepairRequestItem,
  approveConsumerRepairRequestDraft,
  ConsumerRepairValidationError,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  sendConsumerRepairRequestToMarketplace,
} from "../../src/lib/consumerRequests";
import { approveCanonicalConsumerRepairAuditRequest } from "../../scripts/estimate/canonicalConsumerRepairAuditHarness";
import {
  buildCanonicalConsumerRepairRevisionFixture,
  canonicalArtifactForConsumerRepairRevisionFixture,
} from "./canonicalConsumerRepairRevisionFixture";

describe("consumer estimate approval boundary", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("approves a complete estimate without delivery contact but keeps marketplace validation strict", async () => {
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

    const approved = approveCanonicalConsumerRepairAuditRequest({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
    });

    expect(approved.draft.status).toBe("consumer_approved");
    expect(approved.pdfs[0]?.pdfStatus).toBe("generated");
    expect(approved.pdfs[0]?.revisionId).toBeTruthy();

    await expect(
      sendConsumerRepairRequestToMarketplace({
        requestDraftId: approved.draft.id,
        userId: approved.draft.consumerUserId,
      }),
    ).rejects.toThrow(ConsumerRepairValidationError);

    try {
      await sendConsumerRepairRequestToMarketplace({
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

  it("approves known quantities without prices and does not invent a total", () => {
    let bundle = createConsumerRepairRequestDraft({
      consumerUserId: "unpriced-approval-user",
      problemText: "Ведомость объемов готова, рыночные цены будут заполнены позднее",
      repairType: "foundation",
      city: "Bishkek",
      addressText: null,
      contactPhone: null,
      aiDraft: buildCanonicalConsumerRepairRevisionFixture(
        "Устройство монолитного железобетонного ленточного фундамента",
      ),
    });
    expect(bundle.items.every((item) => item.unitPrice == null && item.totalPrice == null)).toBe(true);
    bundle = generateConsumerRepairRequestPdfForDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
    });

    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      canonicalArtifact: canonicalArtifactForConsumerRepairRevisionFixture(bundle),
    });

    expect(approved.draft.status).toBe("consumer_approved");
    expect(approved.items.every((item) => item.unitPrice == null && item.totalPrice == null)).toBe(true);
    expect(approved.pdfs[0]?.pdfStatus).toBe("generated");
  });
});
