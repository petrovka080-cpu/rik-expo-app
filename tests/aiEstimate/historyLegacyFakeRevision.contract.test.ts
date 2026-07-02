import {
  detectConsumerRepairLegacyFakeEstimateRevision,
  type ConsumerRepairRequestItem,
} from "../../src/lib/consumerRequests";

function legacyItem(index: number): ConsumerRepairRequestItem {
  return {
    id: `legacy-${index}`,
    requestDraftId: "legacy-draft",
    itemType: index % 3 === 0 ? "work" : "material",
    titleRu: `Legacy row ${index}`,
    quantity: 54,
    unit: "м²",
    unitPrice: 980,
    totalPrice: 52920,
    currency: "KGS",
    source: "ai_suggested",
    editableByConsumer: true,
    createdAt: "2026-07-02T00:00:00.000Z",
  };
}

describe("AI estimate legacy fake history revision", () => {
  it("marks old fake area-multiplier history as requiring recalculation without rewriting it", () => {
    const detection = detectConsumerRepairLegacyFakeEstimateRevision({
      items: Array.from({ length: 12 }, (_, index) => legacyItem(index)),
      promptArea: 54,
    });

    expect(detection.legacy_fake_revision).toBe(true);
    expect(detection.display_status_ru).toBe("Требует пересчёта");
    expect(detection.recalculate_action_visible).toBe(true);
    expect(detection.do_not_silently_rewrite_old_history).toBe(true);
    expect(detection.legacy_fake_history_not_marked_professional).toBe(true);
    expect(detection.new_history_revision_requires_calculation_trace).toBe(true);
    expect(detection.new_history_revision_has_template_versions).toBe(true);
  });
});
