import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
  listConsumerRepairRequestHistory,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";

describe("approve current user history only", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("stores an approved request only in the owner's history", () => {
    const prompt = "\u041d\u0443\u0436\u043d\u0430 \u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u043b\u0430\u043c\u0438\u043d\u0430\u0442 100 \u043c2";
    const draft = createConsumerRepairRequestDraft({
      consumerUserId: "restore-owner",
      problemText: prompt,
      repairType: "\u041f\u043e\u043b",
      aiDraft: buildConsumerRepairAiDraft(prompt, { city: "Bishkek" }),
    });
    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: draft.draft.id,
      userId: "restore-owner",
    });

    expect(approved.draft.status).toBe("consumer_approved");
    expect(listConsumerRepairRequestHistory("restore-owner").map((bundle) => bundle.draft.id)).toContain(approved.draft.id);
    expect(listConsumerRepairRequestHistory("other-user").map((bundle) => bundle.draft.id)).not.toContain(approved.draft.id);
  });
});
