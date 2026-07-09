import {
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
  listConsumerRepairApprovedHistory,
  __resetConsumerRepairRequestStoreForTests,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";

describe("platform core v2 consumer repair flow", () => {
  afterEach(() => __resetConsumerRepairRequestStoreForTests());

  it("creates and approves consumer draft from runtime-generated estimate", () => {
    const aiDraft = buildConsumerRepairDraftFromAiEstimateRuntime({
      estimateDraftId: "consumer-platform-core-v2",
      rawInput: "демонтаж плитки 98 м2",
      selectedTemplateId: "demolition_interior_tile_remove_standard_professional_expanded_v1",
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    expect(aiDraft?.items.length).toBeGreaterThan(0);
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "platform-core-v2-consumer",
      problemText: "демонтаж плитки 98 м2",
      city: "Bishkek",
      addressText: "Test street 10",
      contactPhone: "+996 555 123 456",
      aiDraft,
    });
    approveConsumerRepairRequestDraft({ requestDraftId: bundle.draft.id, userId: "platform-core-v2-consumer" });
    const history = listConsumerRepairApprovedHistory("platform-core-v2-consumer", { limit: 20 });

    expect(history.totalApprovedCount).toBe(1);
    expect(history.items[0]?.estimateDraftRevisionState?.revisions.length).toBeGreaterThan(0);
  });
});
