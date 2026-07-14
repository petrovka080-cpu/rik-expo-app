import {
  GREEN_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_AND_COST_CONFIDENCE_NO_BUILDS,
  validateAllProductionTemplatesPricing10000,
} from "../../src/lib/ai/estimateTemplate10000";

jest.setTimeout(120_000);

describe("all 10000 templates pricing validation contract", () => {
  it("validates price keys and honest missing-price state for all production templates", () => {
    const summary = validateAllProductionTemplatesPricing10000();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_AND_COST_CONFIDENCE_NO_BUILDS);
    expect(summary.templates_validated_count).toBeGreaterThanOrEqual(10000);
    expect(summary.templates_failed_count).toBe(0);
    expect(summary.all_10000_templates_have_price_keys).toBe(true);
    expect(summary.missing_price_state_valid).toBe(true);
    expect(summary.no_fake_price_fallback).toBe(true);
    expect(summary.no_zero_amount_when_price_missing).toBe(true);
  });
});
