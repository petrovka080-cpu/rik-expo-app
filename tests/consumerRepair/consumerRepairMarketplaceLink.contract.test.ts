import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  sendConsumerRepairRequestToMarketplace,
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
} from "./consumerRepairTestHelpers";

describe("consumer repair marketplace link contract", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("requires explicit consumer approval before marketplace send", () => {
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: CONSUMER_REPAIR_TEST_USER_ID,
      problemText: CONSUMER_REPAIR_VALID_PROBLEM,
      contactPhone: CONSUMER_REPAIR_VALID_PHONE,
      city: CONSUMER_REPAIR_VALID_CITY,
      addressText: CONSUMER_REPAIR_VALID_ADDRESS,
      repairType: "flooring",
      aiDraft: buildCanonicalConsumerRepairRevisionFixture(CONSUMER_REPAIR_VALID_PROBLEM),
    });

    expect(() => sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
    })).toThrow("Сначала утвердите заявку.");

    attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
    const withPdf = generateConsumerRepairRequestPdfForDraft({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
    });
    const canonicalArtifact = canonicalArtifactForConsumerRepairRevisionFixture(withPdf);
    approveConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
      canonicalArtifact,
    });
    const procurementArtifact = {
      ...canonicalArtifact,
      artifactId: `procurement:${canonicalArtifact.artifactId}`,
      kind: "procurement" as const,
    };
    const sent = sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
      canonicalArtifact: procurementArtifact,
    });

    expect(sent.draft.status).toBe("sent_to_marketplace");
    expect(sent.marketplaceLink.status).toBe("sent");
    expect(sent.marketplaceLink.marketplaceDemandId).toContain("marketplace_demand");
  });
});
