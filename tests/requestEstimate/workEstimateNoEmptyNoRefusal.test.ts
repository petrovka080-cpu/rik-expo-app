import { buildWorkEstimateSemanticCriticalCases } from "../../scripts/estimate/workEstimateSemanticCriticalCases";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";

describe("work estimate no empty and no refusal policy", () => {
  it("does not return empty/refusal drafts for the 150-case semantic subset", () => {
    const drafts = buildWorkEstimateSemanticCriticalCases().map((testCase) =>
      buildConsumerRepairAiDraft(testCase.prompt, {
        currency: "KGS",
        city: "Bishkek",
      })
    );

    expect(drafts).toHaveLength(150);
    expect(drafts.every((draft) => draft.items.length > 0)).toBe(true);
    expect(drafts.every((draft) => draft.dangerousDiyBlocked !== true)).toBe(true);
    expect(drafts.every((draft) => draft.titleRu.trim().length > 0)).toBe(true);
    expect(drafts.every((draft) => draft.summaryRu.trim().length > 0)).toBe(true);
  });
});
