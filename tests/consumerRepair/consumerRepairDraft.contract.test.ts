import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  deleteConsumerRepairRequestDraft,
  listConsumerRepairRequestHistory,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair";

describe("consumer repair draft contract", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("creates a consumer-only B2C draft with AI suggested items", () => {
    const aiDraft = buildConsumerRepairAiDraft("Хочу уложить ламинат на 100 кв м");
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "consumer-1",
      problemText: "Хочу уложить ламинат на 100 кв м",
      aiDraft,
    });

    expect(bundle.draft.orgId).toBeNull();
    expect(bundle.draft.status).toBe("draft");
    expect(bundle.draft.repairType).toBe("flooring");
    expect(bundle.items.length).toBeGreaterThan(3);
    expect(bundle.marketplaceLink.status).toBe("not_sent");
  });

  it("deletes only the current user's draft from their history", () => {
    const ownDraft = createConsumerRepairRequestDraft({
      consumerUserId: "consumer-1",
      problemText: "Хочу уложить ламинат на 100 кв м",
      aiDraft: buildConsumerRepairAiDraft("Хочу уложить ламинат на 100 кв м"),
    });
    createConsumerRepairRequestDraft({
      consumerUserId: "consumer-2",
      problemText: "Хочу покрасить стены 40 м2",
      aiDraft: buildConsumerRepairAiDraft("Хочу покрасить стены 40 м2"),
    });

    deleteConsumerRepairRequestDraft({ requestDraftId: ownDraft.draft.id, userId: "consumer-1" });

    expect(listConsumerRepairRequestHistory("consumer-1")).toEqual([]);
    expect(listConsumerRepairRequestHistory("consumer-2")).toHaveLength(1);
  });
});
