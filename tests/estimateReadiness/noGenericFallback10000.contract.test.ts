import {
  validateNoGenericFallback10000,
  GREEN_AI_ESTIMATE_10000_NO_GENERIC_FALLBACK_NO_BUILDS,
} from "../../scripts/estimate/validateNoGenericFallback10000";

jest.setTimeout(60000);

describe("no generic fallback 10000", () => {
  it("has zero generic, synthetic, or template-only generic norm coverage", () => {
    const result = validateNoGenericFallback10000();

    expect(result.final_status).toBe(GREEN_AI_ESTIMATE_10000_NO_GENERIC_FALLBACK_NO_BUILDS);
    expect(result.generic_fallback_count).toBe(0);
    expect(result.generic_norm_rows_count).toBe(0);
    expect(result.synthetic_family_default_count).toBe(0);
    expect(result.templates_only_generic_norms_count).toBe(0);
    expect(result.blockers).toEqual([]);
  });
});
