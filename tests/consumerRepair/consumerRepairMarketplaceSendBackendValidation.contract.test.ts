import {
  __resetConsumerRepairRequestStoreForTests,
  getConsumerRepairRequest,
  sendConsumerRepairRequestToMarketplace,
  validateConsumerRepairRequestForMarketplace,
} from "../../src/lib/consumerRequests";
import {
  CONSUMER_REPAIR_TEST_USER_ID,
  createApprovedConsumerRepairRequest,
} from "./consumerRepairTestHelpers";

describe("consumer repair backend marketplace validation contract", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("returns validation errors and records blocked audit event instead of success", () => {
    const bundle = createApprovedConsumerRepairRequest({ contactPhone: null, problemText: "коротко" });
    const validation = validateConsumerRepairRequestForMarketplace(bundle.draft.id, CONSUMER_REPAIR_TEST_USER_ID);

    expect(validation.ok).toBe(false);
    expect(validation.errors.map((item) => item.code)).toEqual(expect.arrayContaining([
      "CONTACT_REQUIRED",
      "DESCRIPTION_REQUIRED",
    ]));

    expect(() => sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: CONSUMER_REPAIR_TEST_USER_ID,
    })).toThrow("Укажите телефон");

    const afterBlocked = getConsumerRepairRequest(bundle.draft.id);
    expect(afterBlocked.events.some((event) => event.eventType === "marketplace_send_blocked")).toBe(true);
    expect(afterBlocked.draft.marketplaceValidationErrors?.map((item) => item.code)).toContain("CONTACT_REQUIRED");
  });
});
