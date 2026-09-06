import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";
import {
  __resetConsumerRepairRequestStoreForTests, attachConsumerRepairMedia, sendConsumerRepairRequestToMarketplace, updateConsumerRepairRequestDraft } from "../../src/lib/consumerRequests";
import {
  approveCanonicalConsumerRepairAuditDraft,
  sendCanonicalConsumerRepairAuditDraft,
} from "../../scripts/estimate/canonicalConsumerRepairAuditHarness";
import { createConsumerRepairDraftFromGlobalEstimate } from "../../src/lib/consumerRequests/consumerRequestEstimateApplicationService";
import { validateConsumerRepairRequestForMarketplace } from "../../src/lib/consumerRequests/consumerRequestValidationService";

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
    bundle = updateConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      patch: {
        addressText: "Dallas TX 75201",
        contactPhone: "+1 214 555 0100",
      },
    });
    bundle = approveCanonicalConsumerRepairAuditDraft({ bundle });
    bundle = updateConsumerRepairRequestDraft({ requestDraftId: bundle.draft.id, patch: { contactPhone: null } });

    expect(validateConsumerRepairRequestForMarketplace(bundle.draft.id, bundle.draft.consumerUserId).errors.map((error) => error.code)).toContain("CONTACT_REQUIRED");
    expect(() => sendConsumerRepairRequestToMarketplace({ requestDraftId: bundle.draft.id, userId: bundle.draft.consumerUserId })).toThrow();

    bundle = updateConsumerRepairRequestDraft({ requestDraftId: bundle.draft.id, patch: { contactPhone: "+1 214 555 0100" } });
    const sent = sendCanonicalConsumerRepairAuditDraft({ bundle });
    expect(sent.marketplaceLink.status).toBe("sent");
  });
});
