import {
  __resetConsumerRepairRequestStoreForTests,
  ConsumerRepairValidationError,
  sendConsumerRepairRequestToMarketplace,
} from "../../src/lib/consumerRequests";
import { CONSUMER_REPAIR_TEST_USER_ID, createApprovedConsumerRepairRequest } from "./consumerRepairTestHelpers";

describe("consumer repair marketplace description validation", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("blocks marketplace send without a useful problem description", () => {
    const bundle = createApprovedConsumerRepairRequest({ problemText: "коротко" });

    expect(() => sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
    })).toThrow(ConsumerRepairValidationError);

    try {
      sendConsumerRepairRequestToMarketplace({ requestDraftId: bundle.draft.id, userId: CONSUMER_REPAIR_TEST_USER_ID });
    } catch (error) {
      expect((error as ConsumerRepairValidationError).errors.map((item) => item.code)).toContain("DESCRIPTION_REQUIRED");
      expect((error as ConsumerRepairValidationError).message).toContain("Добавьте описание проблемы.");
    }
  });
});
