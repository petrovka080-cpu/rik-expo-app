import {
  __deleteConsumerRepairPdfStorageObjectForTests,
  __resetConsumerRepairRequestStoreForTests,
  ConsumerRepairValidationError,
  sendConsumerRepairRequestToMarketplace,
} from "../../src/lib/consumerRequests";
import { CONSUMER_REPAIR_TEST_USER_ID, createApprovedConsumerRepairRequest } from "./consumerRepairTestHelpers";

describe("consumer repair marketplace PDF validation", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("blocks canonical marketplace send when the exact backend PDF artifact is not supplied", () => {
    const bundle = createApprovedConsumerRepairRequest();
    const pdf = bundle.pdfs[0];
    __deleteConsumerRepairPdfStorageObjectForTests({
      storageBucket: pdf.storageBucket,
      storageKey: pdf.storageKey,
    });

    expect(() => sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
    })).toThrow(ConsumerRepairValidationError);

    try {
      sendConsumerRepairRequestToMarketplace({ requestDraftId: bundle.draft.id, userId: CONSUMER_REPAIR_TEST_USER_ID });
    } catch (error) {
      expect((error as ConsumerRepairValidationError).errors.map((item) => item.code)).toContain("PDF_REQUIRED");
    }
  });
});
