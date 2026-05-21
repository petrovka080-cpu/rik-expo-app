import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  createConsumerRepairRequestDraft,
  sendConsumerRepairRequestToMarketplace,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair";
import {
  CONSUMER_REPAIR_TEST_USER_ID,
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
      repairType: "flooring",
      aiDraft: buildConsumerRepairAiDraft(CONSUMER_REPAIR_VALID_PROBLEM),
    });

    expect(() => sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
    })).toThrow("Сначала утвердите заявку.");

    attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
    approveConsumerRepairRequestDraft({ requestDraftId: bundle.draft.id, userId: CONSUMER_REPAIR_TEST_USER_ID });
    const sent = sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
    });

    expect(sent.draft.status).toBe("sent_to_marketplace");
    expect(sent.marketplaceLink.status).toBe("sent");
    expect(sent.marketplaceLink.marketplaceDemandId).toContain("marketplace_demand");
  });
});
