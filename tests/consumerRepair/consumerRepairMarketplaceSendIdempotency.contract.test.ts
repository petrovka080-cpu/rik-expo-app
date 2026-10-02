import {
  __resetConsumerRepairRequestStoreForTests,
  ConsumerRepairValidationError,
  sendConsumerRepairRequestToMarketplace,
} from "../../src/lib/consumerRequests";
import {
  canonicalArtifactForApprovedConsumerRepairTestBundle,
  consumerMarketplaceTransportForApprovedBundle,
  CONSUMER_REPAIR_TEST_USER_ID,
  createApprovedConsumerRepairRequest,
} from "./consumerRepairTestHelpers";

describe("consumer repair marketplace idempotency contract", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("does not create a duplicate marketplace demand on repeated send", async () => {
    const bundle = createApprovedConsumerRepairRequest();
    const canonicalArtifact = canonicalArtifactForApprovedConsumerRepairTestBundle(bundle);
    const transport = consumerMarketplaceTransportForApprovedBundle(bundle, canonicalArtifact);
    const first = await sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
      idempotencyKey: "same-submit",
      canonicalArtifact,
      transport,
    });
    const second = await sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
      idempotencyKey: "same-submit",
      canonicalArtifact,
      transport,
    });

    expect(second.marketplaceLink.marketplaceDemandId).toBe(first.marketplaceLink.marketplaceDemandId);
    expect(second.events.filter((event) => event.eventType === "sent_to_marketplace")).toHaveLength(1);
    expect(second.events.some((event) => event.eventType === "marketplace_send_idempotent_replay")).toBe(true);
  });

  it("rejects a procurement artifact whose revision differs from the immutable approval event", async () => {
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

    await expect(send()).rejects.toThrow(ConsumerRepairValidationError);
    try {
      await send();
    } catch (error) {
      expect((error as ConsumerRepairValidationError).errors.map((entry) => entry.code))
        .toContain("PDF_REQUIRED");
    }
  });
});
