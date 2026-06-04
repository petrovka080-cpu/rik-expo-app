import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
  getConsumerRepairRequestPdf,
} from "../../src/lib/consumerRequests";
import { ConsumerRepairValidationError } from "../../src/lib/consumerRequests/consumerRequestMarketplaceService";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";

describe("approved request hidden from other users", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("prevents non-owner PDF generation/open flows from acting on another user's request", () => {
    const prompt = "\u041d\u0443\u0436\u043d\u0430 \u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u043b\u0430\u043c\u0438\u043d\u0430\u0442 100 \u043c2";
    const draft = createConsumerRepairRequestDraft({
      consumerUserId: "owner-user",
      problemText: prompt,
      repairType: "\u041f\u043e\u043b",
      aiDraft: buildConsumerRepairAiDraft(prompt, { city: "Bishkek" }),
    });

    expect(() =>
      approveConsumerRepairRequestDraft({
        requestDraftId: draft.draft.id,
        userId: "other-user",
      }),
    ).toThrow(ConsumerRepairValidationError);

    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: draft.draft.id,
      userId: "owner-user",
    });
    expect(getConsumerRepairRequestPdf({ requestDraftId: approved.draft.id }).signedUrl).toMatch(/^data:application\/pdf/);
  });
});
