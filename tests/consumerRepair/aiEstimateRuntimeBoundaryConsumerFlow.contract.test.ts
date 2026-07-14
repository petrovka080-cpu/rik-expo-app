import {
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
  listConsumerRepairApprovedHistory,
  __resetConsumerRepairRequestStoreForTests,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";

describe("AI estimate runtime boundary consumer flow", () => {
  afterEach(() => __resetConsumerRepairRequestStoreForTests());

  it("uses runtime-built estimate state and ledger-backed approved history", () => {
    const aiDraft = buildConsumerRepairDraftFromAiEstimateRuntime({
      estimateDraftId: "runtime-boundary-consumer",
      rawInput: "bathroom repair 12 m2",
      selectedTemplateId: "demolition_interior_tile_remove_standard_professional_expanded_v1",
      createdAt: "2026-07-10T00:00:00.000Z",
    });
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "runtime-boundary-consumer-owner",
      problemText: "bathroom repair 12 m2",
      city: "Bishkek",
      addressText: "runtime boundary",
      contactPhone: "0700000000",
      aiDraft,
    });
    approveConsumerRepairRequestDraft({ requestDraftId: bundle.draft.id, userId: "runtime-boundary-consumer-owner" });
    const history = listConsumerRepairApprovedHistory("runtime-boundary-consumer-owner", { limit: 100 });

    expect(aiDraft?.items.length).toBeGreaterThan(0);
    expect(history.totalApprovedCount).toBe(1);
    expect(history.items[0]?.estimateDraftRevisionState?.revisions.length).toBeGreaterThan(0);
  });
});
