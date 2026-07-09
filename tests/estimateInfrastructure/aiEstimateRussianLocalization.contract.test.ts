import {
  auditAiEstimateVisibleRussianOnly,
  GREEN_AI_ESTIMATE_VISIBLE_RUSSIAN_ONLY_READY,
} from "../../scripts/estimate/auditAiEstimateVisibleRussianOnly";

describe("AI estimate Russian localization", () => {
  it("does not expose technical ids, English source values or raw status tokens", () => {
    const { summary, strings } = auditAiEstimateVisibleRussianOnly();
    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_VISIBLE_RUSSIAN_ONLY_READY);
    expect(summary.visible_english_or_raw_token_count).toBe(0);
    expect(strings.join("\n")).toContain("Источник цен не выбран");
    expect(strings.join("\n")).toContain("для точного расчета");
    expect(strings.join("\n")).not.toMatch(/PRICE_MISSING|PRELIMINARY_BOQ|better_accuracy|user_input|buyer handoff|area_m2/i);
  });
});
