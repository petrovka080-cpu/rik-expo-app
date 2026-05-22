import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  createConsumerRepairDraftFromGlobalEstimate,
  sendConsumerRepairRequestToMarketplace,
  updateConsumerRepairRequestDraft,
  validateConsumerRepairRequestForMarketplace,
} from "../../src/lib/consumerRequests";

describe("global estimate marketplace contact contract", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("requires explicit contact and approved PDF before marketplace send", async () => {
    const { result } = await buildGlobalEstimateFixture({ text: "Need laminate installation for 1000 sq ft in Dallas TX 75201", language: "en" });
    let bundle = createConsumerRepairDraftFromGlobalEstimate({
      consumerUserId: "consumer_market_owner",
      estimate: result,
      originalText: "Need laminate installation for 1000 sq ft in Dallas TX 75201 with enough detail.",
    });
    bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
    bundle = approveConsumerRepairRequestDraft({ requestDraftId: bundle.draft.id, userId: bundle.draft.consumerUserId });

    expect(validateConsumerRepairRequestForMarketplace(bundle.draft.id, bundle.draft.consumerUserId).errors.map((error) => error.code)).toContain("CONTACT_REQUIRED");
    expect(() => sendConsumerRepairRequestToMarketplace({ requestDraftId: bundle.draft.id, userId: bundle.draft.consumerUserId })).toThrow();

    bundle = updateConsumerRepairRequestDraft({ requestDraftId: bundle.draft.id, patch: { contactPhone: "+1 214 555 0100" } });
    const sent = sendConsumerRepairRequestToMarketplace({ requestDraftId: bundle.draft.id, userId: bundle.draft.consumerUserId });
    expect(sent.marketplaceLink.status).toBe("sent");
  });
});
