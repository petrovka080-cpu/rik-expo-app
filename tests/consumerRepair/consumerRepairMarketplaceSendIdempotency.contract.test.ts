import {
  __resetConsumerRepairRequestStoreForTests,
  ConsumerRepairValidationError,
  sendConsumerRepairRequestToMarketplace,
} from "../../src/lib/consumerRequests";
import {
  canonicalArtifactForApprovedConsumerRepairTestBundle,
  CONSUMER_REPAIR_TEST_USER_ID,
  createApprovedConsumerRepairRequest,
} from "./consumerRepairTestHelpers";

describe("consumer repair marketplace idempotency contract", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("does not create a duplicate marketplace demand on repeated send", () => {
    const bundle = createApprovedConsumerRepairRequest();
    const canonicalArtifact = canonicalArtifactForApprovedConsumerRepairTestBundle(bundle);
    const first = sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
      idempotencyKey: "same-submit",
      canonicalArtifact,
    });
    const second = sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
      idempotencyKey: "same-submit",
      canonicalArtifact,
    });

    expect(second.marketplaceLink.marketplaceDemandId).toBe(first.marketplaceLink.marketplaceDemandId);
    expect(second.events.filter((event) => event.eventType === "sent_to_marketplace")).toHaveLength(1);
    expect(second.events.some((event) => event.eventType === "marketplace_send_idempotent_replay")).toBe(true);
  });

  it("rejects a procurement artifact whose revision differs from the immutable approval event", () => {
    const bundle = createApprovedConsumerRepairRequest();
    const canonicalArtifact = canonicalArtifactForApprovedConsumerRepairTestBundle(bundle);
    const send = () => sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
      canonicalArtifact: {
        ...canonicalArtifact,
        revisionId: `${canonicalArtifact.revisionId}:different`,
      },
    });

    expect(send).toThrow(ConsumerRepairValidationError);
    try {
      send();
    } catch (error) {
      expect((error as ConsumerRepairValidationError).errors.map((entry) => entry.code))
        .toContain("PDF_REQUIRED");
    }
  });
});
