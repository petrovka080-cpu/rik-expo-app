import {
  __resetConsumerRepairRequestStoreForTests,
  ConsumerRepairValidationError,
  sendConsumerRepairRequestToMarketplace,
} from "../../src/lib/consumerRequests";
import { CONSUMER_REPAIR_TEST_USER_ID, createApprovedConsumerRepairRequest } from "./consumerRepairTestHelpers";

describe("consumer repair marketplace media validation", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("blocks marketplace send without photo, video, or document media", () => {
    const bundle = createApprovedConsumerRepairRequest({ withMedia: false });

    expect(() => sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
    })).toThrow(ConsumerRepairValidationError);

    try {
      sendConsumerRepairRequestToMarketplace({ requestDraftId: bundle.draft.id, userId: CONSUMER_REPAIR_TEST_USER_ID });
    } catch (error) {
      expect((error as ConsumerRepairValidationError).errors.map((item) => item.code)).toContain("MEDIA_REQUIRED");
      expect((error as ConsumerRepairValidationError).message).toContain("Добавьте хотя бы одно фото");
    }
  });
});
