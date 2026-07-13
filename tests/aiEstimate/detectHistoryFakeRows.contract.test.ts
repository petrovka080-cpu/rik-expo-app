import {
  detectConsumerRepairLegacyFakeEstimateRevision,
  type ConsumerRepairRequestItem,
} from "../../src/lib/consumerRequests";

function legacyItem(index: number): ConsumerRepairRequestItem {
  return {
    id: `continuous-history-fake-${index}`,
    requestDraftId: "continuous-history-fake-draft",
    itemType: index % 3 === 0 ? "work" : "material",
    titleRu: index % 4 === 0 ? "Доставка материалов" : "Legacy fake professional row",
    quantity: 54,
    unit: "м²",
    unitPrice: 980,
    totalPrice: 52_920,
    currency: "KGS",
    source: "ai_suggested",
    editableByConsumer: true,
    createdAt: "2026-07-02T00:00:00.000Z",
  };
}

describe("continuous AI estimate history fake detector", () => {
  it("keeps legacy fake revisions out of professional status and requires recalculation", () => {
    const detection = detectConsumerRepairLegacyFakeEstimateRevision({
      items: Array.from({ length: 14 }, (_, index) => legacyItem(index)),
      promptArea: 54,
    });

    expect(detection.legacy_fake_revision).toBe(true);
    expect(detection.recalculate_action_visible).toBe(true);
    expect(detection.legacy_fake_history_not_marked_professional).toBe(true);
    expect(detection.do_not_silently_rewrite_old_history).toBe(true);
    expect(detection.new_history_revision_requires_calculation_trace).toBe(true);
    expect(detection.new_history_revision_has_template_versions).toBe(true);
  });
});
