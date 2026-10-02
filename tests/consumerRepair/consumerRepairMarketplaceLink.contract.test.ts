import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  sendConsumerRepairRequestToMarketplace,
  updateConsumerRepairRequestItemUnitPrice,
} from "../../src/lib/consumerRequests";
import {
  buildCanonicalConsumerRepairRevisionFixture,
  canonicalArtifactForConsumerRepairRevisionFixture,
} from "./canonicalConsumerRepairRevisionFixture";
import {
  CONSUMER_REPAIR_TEST_USER_ID,
  CONSUMER_REPAIR_VALID_ADDRESS,
  CONSUMER_REPAIR_VALID_CITY,
  CONSUMER_REPAIR_VALID_PHONE,
  CONSUMER_REPAIR_VALID_PROBLEM,
  consumerMarketplaceTransportForApprovedBundle,
} from "./consumerRepairTestHelpers";

describe("consumer repair marketplace link contract", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("requires explicit consumer approval before marketplace send", async () => {
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: CONSUMER_REPAIR_TEST_USER_ID,
      problemText: CONSUMER_REPAIR_VALID_PROBLEM,
      contactPhone: CONSUMER_REPAIR_VALID_PHONE,
      city: CONSUMER_REPAIR_VALID_CITY,
      addressText: CONSUMER_REPAIR_VALID_ADDRESS,
      repairType: "flooring",
      aiDraft: buildCanonicalConsumerRepairRevisionFixture(CONSUMER_REPAIR_VALID_PROBLEM),
    });

    await expect(sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
    })).rejects.toThrow();

    let pricedBundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
    for (const item of pricedBundle.items) {
      if (item.unitPrice == null) {
        pricedBundle = updateConsumerRepairRequestItemUnitPrice({
          requestDraftId: bundle.draft.id,
          itemId: item.id,
          unitPrice: 100,
        });
      }
    }
    const withPdf = generateConsumerRepairRequestPdfForDraft({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
    });
    const canonicalArtifact = canonicalArtifactForConsumerRepairRevisionFixture(withPdf);
    const approvedBundle = approveConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
      canonicalArtifact,
    });
    const procurementArtifact = {
      ...canonicalArtifact,
      artifactId: `procurement:${canonicalArtifact.artifactId}`,
      kind: "procurement" as const,
    };
    const sent = await sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
      canonicalArtifact: procurementArtifact,
      transport: consumerMarketplaceTransportForApprovedBundle(approvedBundle, procurementArtifact),
    });

    expect(sent.draft.status).toBe("sent_to_marketplace");
    expect(sent.marketplaceLink.status).toBe("sent");
    expect(sent.marketplaceLink.marketplaceDemandId).toBe(procurementArtifact.revisionId);
  });
});
