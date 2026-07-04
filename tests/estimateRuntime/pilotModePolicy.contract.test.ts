import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import {
  buildEstimatePilotModeViewState,
  getEstimatePilotModePolicy,
} from "../../src/features/estimates/runtime/estimatePilotMode";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";

describe("estimate pilot mode policy", () => {
  it("marks UI and PDF as pilot when estimate is not production-final", () => {
    const policy = getEstimatePilotModePolicy();
    const state = buildEstimatePilotModeViewState({ trustLevel: "QUANTITY_ONLY_PRICE_MISSING", fullTotalStatus: "NOT_FINAL" });
    expect(state.badgeLabelRu).toBe(policy.badge_label_ru);
    expect(state.shouldWatermarkPdf).toBe(true);

    __resetConsumerRepairRequestStoreForTests();
    const prompt = "road construction 1 km width 6 m asphalt";
    const aiDraft = buildConsumerRepairAiDraft(prompt);
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "pilot-policy-test",
      problemText: prompt,
      repairType: aiDraft.repairType,
      aiDraft,
    });
    const vm = buildRequestEstimateViewModel(bundle);
    expect(vm?.pilotBadgeLabel).toBe(policy.badge_label_ru);

    const pdf = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: bundle.draft,
      items: bundle.items,
      media: bundle.media,
      generatedAt: "2026-07-04T00:00:00.000Z",
    });
    expect(pdf?.costIncreaseFactors).toContain(policy.pdf_watermark_ru);
  });
});
