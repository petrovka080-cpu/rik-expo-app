import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  listConsumerRepairRequestHistory,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";

describe("AI estimate persistence expanded snapshots", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("persists the structured expanded snapshot into request history", () => {
    const prompt = "смета на укладку ламината 100 м2 в Бишкеке";
    const aiDraft = buildConsumerRepairAiDraft(prompt, { city: "Bishkek" });
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "consumer-expanded-snapshot",
      problemText: prompt,
      city: "Bishkek",
      aiDraft,
    });
    const historyItem = listConsumerRepairRequestHistory("consumer-expanded-snapshot")[0];
    const viewModel = buildRequestEstimateViewModel(historyItem);

    expect(aiDraft.structuredEstimatePayload?.version).toBe("structured-estimate-v1");
    expect(bundle.structuredEstimatePayload?.fingerprint).toBe(aiDraft.structuredEstimatePayload?.fingerprint);
    expect(historyItem.structuredEstimatePayload?.fingerprint).toBe(aiDraft.structuredEstimatePayload?.fingerprint);
    expect(historyItem.items).toHaveLength(aiDraft.structuredEstimatePayload?.rows.length ?? 0);
    expect(viewModel?.sections.length).toBeGreaterThanOrEqual(2);
    expect(viewModel?.visibleLines).toHaveLength(historyItem.items.length);
  });
});
