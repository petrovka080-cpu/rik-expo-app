import {
  __resetConsumerRepairRequestStoreForTests,
  attachConsumerRepairMedia,
  ConsumerRepairValidationError,
  createConsumerRepairRequestDraft,
  sendConsumerRepairRequestToMarketplace,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair";
import {
  CONSUMER_REPAIR_TEST_USER_ID,
  CONSUMER_REPAIR_VALID_PHONE,
  CONSUMER_REPAIR_VALID_PROBLEM,
} from "./consumerRepairTestHelpers";

describe("consumer repair marketplace approval gate", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("blocks marketplace send before explicit approval", () => {
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: CONSUMER_REPAIR_TEST_USER_ID,
      problemText: CONSUMER_REPAIR_VALID_PROBLEM,
      contactPhone: CONSUMER_REPAIR_VALID_PHONE,
      repairType: "flooring",
      aiDraft: buildConsumerRepairAiDraft(CONSUMER_REPAIR_VALID_PROBLEM),
    });
    attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });

    expect(() => sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
    })).toThrow(ConsumerRepairValidationError);

    try {
      sendConsumerRepairRequestToMarketplace({ requestDraftId: bundle.draft.id, userId: CONSUMER_REPAIR_TEST_USER_ID });
    } catch (error) {
      expect((error as ConsumerRepairValidationError).errors.map((item) => item.code)).toContain("REQUEST_NOT_APPROVED");
    }
  });
});
