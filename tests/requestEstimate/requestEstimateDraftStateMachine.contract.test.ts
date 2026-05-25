import {
  resolveConsumerRepairDraftTransition,
  updateConsumerRepairRequestItemQuantity,
} from "../../src/lib/consumerRequests";
import { foundationSendBundleWithManualCatalogItem } from "./requestEstimateBoqCatalogTestHelpers";

describe("request estimate draft state machine", () => {
  it("allows only explicit production request draft transitions", () => {
    expect(resolveConsumerRepairDraftTransition({ currentStatus: "none", action: "create_draft" })).toMatchObject({
      from: "none",
      to: "draft",
    });
    expect(resolveConsumerRepairDraftTransition({ currentStatus: "draft", action: "approve" })).toMatchObject({
      from: "draft",
      to: "consumer_approved",
    });
    expect(resolveConsumerRepairDraftTransition({ currentStatus: "consumer_approved", action: "send_to_marketplace" })).toMatchObject({
      from: "consumer_approved",
      to: "sent_to_marketplace",
    });
    expect(() =>
      resolveConsumerRepairDraftTransition({ currentStatus: "draft", action: "send_to_marketplace" }),
    ).toThrow("CONSUMER_REPAIR_DRAFT_TRANSITION_SEND_NOT_ALLOWED");
  });

  it("blocks item mutations after marketplace send", () => {
    const sent = foundationSendBundleWithManualCatalogItem();
    expect(sent.draft.status).toBe("sent_to_marketplace");
    expect(() =>
      updateConsumerRepairRequestItemQuantity({
        requestDraftId: sent.draft.id,
        itemId: sent.items[0]?.id ?? "missing",
        quantity: 3,
      }),
    ).toThrow("CONSUMER_REPAIR_DRAFT_TRANSITION_NOT_EDITABLE");
  });
});
