import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  updateConsumerRepairRequestItemQuantity,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair";

describe("consumer repair editable quantity contract", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("lets the consumer change item quantity without final submit", () => {
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "consumer-1",
      aiDraft: buildConsumerRepairAiDraft("ламинат 100 кв м"),
    });
    const item = bundle.items[0];
    const updated = updateConsumerRepairRequestItemQuantity({
      requestDraftId: bundle.draft.id,
      itemId: item.id,
      quantity: 123,
    });

    expect(updated.items.find((candidate) => candidate.id === item.id)?.quantity).toBe(123);
    expect(updated.draft.status).toBe("draft");
  });
});
