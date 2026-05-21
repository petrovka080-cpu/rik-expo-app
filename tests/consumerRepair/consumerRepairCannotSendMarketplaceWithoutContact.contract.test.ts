import {
  __resetConsumerRepairRequestStoreForTests,
  ConsumerRepairValidationError,
  sendConsumerRepairRequestToMarketplace,
} from "../../src/lib/consumerRequests";
import { CONSUMER_REPAIR_TEST_USER_ID, createApprovedConsumerRepairRequest } from "./consumerRepairTestHelpers";

describe("consumer repair marketplace contact validation", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("blocks marketplace send without contact phone in backend service", () => {
    const bundle = createApprovedConsumerRepairRequest({ contactPhone: null });

    expect(() => sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
    })).toThrow(ConsumerRepairValidationError);

    try {
      sendConsumerRepairRequestToMarketplace({ requestDraftId: bundle.draft.id, userId: CONSUMER_REPAIR_TEST_USER_ID });
    } catch (error) {
      expect((error as ConsumerRepairValidationError).statusCode).toBe(422);
      expect((error as ConsumerRepairValidationError).errors.map((item) => item.code)).toContain("CONTACT_REQUIRED");
    }
  });
});
