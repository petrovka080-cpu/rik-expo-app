import {
  __resetConsumerRepairRequestStoreForTests,
  sendConsumerRepairRequestToMarketplace,
} from "../../src/lib/consumerRequests";
import {
  CONSUMER_REPAIR_TEST_USER_ID,
  createApprovedConsumerRepairRequest,
} from "../consumerRepair/consumerRepairTestHelpers";

describe("Wave08 B2C marketplace send idempotency", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("keeps repeated send retry on the same marketplace demand and writes one terminal send event", () => {
    const bundle = createApprovedConsumerRepairRequest();
    const first = sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
      idempotencyKey: "wave08:b2c-send:same-intent",
    });
    const retry = sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
      idempotencyKey: "wave08:b2c-send:same-intent",
    });

    expect(retry.marketplaceLink.marketplaceDemandId).toBe(first.marketplaceLink.marketplaceDemandId);
    expect(retry.marketplaceLink.idempotencyKey).toBe("wave08:b2c-send:same-intent");
    expect(retry.events.filter((event) => event.eventType === "sent_to_marketplace")).toHaveLength(1);
    expect(retry.events.some((event) => event.eventType === "marketplace_send_idempotent_replay")).toBe(true);
  });
});
