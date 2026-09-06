import {
  listConsumerRepairApprovedHistory,
  __resetConsumerRepairRequestStoreForTests,
} from "../../src/lib/consumerRequests";
import {
  approveCanonicalConsumerRepairAuditRequest as approveConsumerRepairRequestDraft,
  createCanonicalConsumerRepairAuditDraft as createConsumerRepairRequestDraft,
} from "../../scripts/estimate/canonicalConsumerRepairAuditHarness";
import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";

describe("AI estimate runtime boundary consumer flow", () => {
  afterEach(() => __resetConsumerRepairRequestStoreForTests());

  it("uses runtime-built estimate state and ledger-backed approved history", () => {
    const aiDraft = buildConsumerRepairDraftFromAiEstimateRuntime({
      estimateDraftId: "runtime-boundary-consumer",
      rawInput: "capital apartment repair 98 m2 2 bathrooms ceiling height 2.7 m",
      selectedTemplateId: "capital_renovation_professional_calculator_v1",
      createdAt: "2026-07-10T00:00:00.000Z",
    });
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "runtime-boundary-consumer-owner",
      problemText: "capital apartment repair 98 m2 2 bathrooms ceiling height 2.7 m",
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
