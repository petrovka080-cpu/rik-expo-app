import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  getConsumerRepairRequest,
  sendConsumerRepairRequestToMarketplace,
} from "../../src/lib/consumerRequests";

describe("Wave08 rollback on validation failure", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("does not create terminal marketplace state or success event when B2C validation fails", async () => {
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "consumer-rollback",
      problemText: "",
      contactPhone: null,
    });

    await expect(
      sendConsumerRepairRequestToMarketplace({
        requestDraftId: bundle.draft.id,
        userId: "consumer-rollback",
        idempotencyKey: "wave08:rollback:b2c",
      }),
    ).rejects.toThrow();

    const after = getConsumerRepairRequest(bundle.draft.id);
    expect(after.marketplaceLink.status).toBe("not_sent");
    expect(after.marketplaceLink.marketplaceDemandId).toBeNull();
    expect(after.events.filter((event) => event.eventType === "sent_to_marketplace")).toHaveLength(0);
    expect(after.events.some((event) => event.eventType === "marketplace_send_blocked")).toBe(true);
  });
});
