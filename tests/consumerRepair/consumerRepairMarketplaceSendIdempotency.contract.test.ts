import {
  __resetConsumerRepairRequestStoreForTests,
  sendConsumerRepairRequestToMarketplace,
} from "../../src/lib/consumerRequests";
import { CONSUMER_REPAIR_TEST_USER_ID, createApprovedConsumerRepairRequest } from "./consumerRepairTestHelpers";

describe("consumer repair marketplace idempotency contract", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("does not create a duplicate marketplace demand on repeated send", () => {
    const bundle = createApprovedConsumerRepairRequest();
    const first = sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
      idempotencyKey: "same-submit",
    });
    const second = sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
      idempotencyKey: "same-submit",
    });

    expect(second.marketplaceLink.marketplaceDemandId).toBe(first.marketplaceLink.marketplaceDemandId);
    expect(second.events.filter((event) => event.eventType === "sent_to_marketplace")).toHaveLength(1);
    expect(second.events.some((event) => event.eventType === "marketplace_send_idempotent_replay")).toBe(true);
  });
});
