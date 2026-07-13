import {
  auditAiEstimateVisibleRussianOnly,
  GREEN_AI_ESTIMATE_VISIBLE_RUSSIAN_ONLY_READY,
} from "../../scripts/estimate/auditAiEstimateVisibleRussianOnly";

describe("AI estimate visible Russian only", () => {
  it("keeps AI estimate parameter UI free of raw English ids and technical tokens", () => {
    const { summary } = auditAiEstimateVisibleRussianOnly();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_VISIBLE_RUSSIAN_ONLY_READY);
    expect(summary.visible_english_words_in_ai_estimate_ui_count).toBe(0);
    expect(summary.raw_internal_ids_visible_count).toBe(0);
    expect(summary.visible_english_or_raw_token_count).toBe(0);
  });
});
