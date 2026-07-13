import {
  GREEN_AI_ESTIMATE_10000_NO_GENERIC_FALLBACK_NO_BUILDS,
  validateNoGenericFallback10000,
} from "../../scripts/estimate/validateNoGenericFallback10000";

describe("truth audit no generic fallback 10000", () => {
  it("fails if generic or family-default rows return", () => {
    const summary = validateNoGenericFallback10000();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_10000_NO_GENERIC_FALLBACK_NO_BUILDS);
    expect(summary.generic_fallback_count).toBe(0);
    expect(summary.generic_norm_rows_count).toBe(0);
    expect(summary.synthetic_family_default_count).toBe(0);
    expect(summary.templates_only_generic_norms_count).toBe(0);
  });
});
