import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";
import {
  assertConsumerRepairGlobalEstimateDraftSafe,
  createConsumerRepairDraftFromGlobalEstimate,
  __resetConsumerRepairRequestStoreForTests,
} from "../../src/lib/consumerRequests";

describe("global estimate B2C draft integration contract", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("creates editable consumer-only draft items from backend estimate rows", async () => {
    const { result } = await buildGlobalEstimateFixture({ text: "laminate installation 100 m2 Bishkek", language: "en" });
    const bundle = createConsumerRepairDraftFromGlobalEstimate({
      consumerUserId: "consumer_estimate_owner",
      estimate: result,
      originalText: "Need repair estimate for laminate installation 100 m2 with materials and labor.",
    });

    expect(() => assertConsumerRepairGlobalEstimateDraftSafe(bundle)).not.toThrow();
    expect(bundle.draft.orgId).toBeNull();
    expect(bundle.marketplaceLink.status).toBe("not_sent");
    expect(bundle.items.every((item) => item.editableByConsumer)).toBe(true);
    expect(bundle.items.every((item) => item.unitPrice != null)).toBe(true);
  });
});
