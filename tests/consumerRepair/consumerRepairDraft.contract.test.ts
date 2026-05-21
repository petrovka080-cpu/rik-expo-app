import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
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
});
