import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildConsumerRepairProcurementHandoffFromSnapshot } from "../../src/features/procurement/consumerRepairProcurementHandoff";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";

describe("request estimate procurement handoff from structured estimate", () => {
  beforeEach(() => {
    __resetConsumerRepairRequestStoreForTests();
  });

  it("preserves procurement eligibility in the approved snapshot without sending work rows to buyer", () => {
    const prompt = "укладка керамической плитки 45 м² санузел стены и пол";
    const aiDraft = buildConsumerRepairAiDraft(prompt, { city: "Bishkek", currency: "KGS" });
    const draft = createConsumerRepairRequestDraft({
      consumerUserId: "structured-procurement-handoff-test",
      problemText: prompt,
      repairType: aiDraft.repairType,
      city: "Bishkek",
      addressText: "Test address",
      preferredTimeText: "today",
      contactPhone: "0700000000",
      aiDraft,
    });

    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: draft.draft.id,
      userId: draft.draft.consumerUserId,
      generatedAt: "2026-07-05T00:00:00.000Z",
    });
    const procurementItems = approved.items.filter((item) => item.itemType === "material" || item.itemType === "service");
    const handoff = buildConsumerRepairProcurementHandoffFromSnapshot(approved);

    expect(procurementItems.length).toBeGreaterThan(0);
    expect(handoff.items.length).toBe(procurementItems.length);
    expect(handoff.items.every((item) => String(item.itemType) !== "work")).toBe(true);
  });
});
