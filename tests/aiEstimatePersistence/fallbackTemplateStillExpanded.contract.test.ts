import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair";

describe("AI estimate persistence fallback template", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("keeps a recognized fallback template expanded instead of a short generic draft", () => {
    const prompt = "смета на фундамент 10 куб метров в Бишкеке";
    const aiDraft = buildConsumerRepairAiDraft(prompt, { city: "Bishkek" });
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "consumer-expanded-fallback",
      problemText: prompt,
      city: "Bishkek",
      aiDraft,
    });

    expect(bundle.structuredEstimatePayload?.version).toBe("structured-estimate-v1");
    expect(bundle.structuredEstimatePayload?.workKey).toBeTruthy();
    expect(bundle.structuredEstimatePayload?.rows.length).toBeGreaterThanOrEqual(8);
    expect(bundle.items).toHaveLength(bundle.structuredEstimatePayload?.rows.length ?? 0);
    expect(bundle.items.every((item) => item.source === "reference_price_book")).toBe(true);
  });
});
