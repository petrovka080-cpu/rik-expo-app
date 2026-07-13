import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  ensureConsumerRepairRequestPdfAvailable,
  getConsumerRepairRequest,
  sendConsumerRepairRequestToMarketplace,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  CONSUMER_REPAIR_TEST_USER_ID,
  createApprovedConsumerRepairRequest,
} from "./consumerRepairTestHelpers";

describe("history send to market uses approved snapshot", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("sends the approved history estimate and leaves a different active draft untouched", () => {
    const laminate = createApprovedConsumerRepairRequest();
    const foundation = createConsumerRepairRequestDraft({
      consumerUserId: CONSUMER_REPAIR_TEST_USER_ID,
      problemText: "армирование фундамента на 10 куб метров",
      contactPhone: "+996 555 123 456",
      repairType: "foundation",
      aiDraft: buildConsumerRepairAiDraft("армирование фундамента на 10 куб метров"),
    });

    ensureConsumerRepairRequestPdfAvailable({
      requestDraftId: laminate.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
    });
    const sent = sendConsumerRepairRequestToMarketplace({
      requestDraftId: laminate.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
    });
    const activeDraft = getConsumerRepairRequest(foundation.draft.id);

    expect(sent.draft.id).toBe(laminate.draft.id);
    expect(sent.draft.status).toBe("sent_to_marketplace");
    expect(sent.marketplaceLink.marketplaceDemandId).toBeTruthy();
    expect(sent.estimateRevisionState?.request_bindings[0]?.request_revision_id).toBe(laminate.pdfs[0]?.revisionId);
    expect(activeDraft.draft.status).toBe("draft");
    expect(activeDraft.items.map((item) => item.titleRu).join(" ")).not.toContain("Ламинат");
  });
});
