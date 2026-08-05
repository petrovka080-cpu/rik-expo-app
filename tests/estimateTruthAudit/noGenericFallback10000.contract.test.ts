import {
  STOP_AI_ESTIMATE_10000_GENERIC_FALLBACK_FOUND,
  validateNoGenericFallback10000,
} from "../../scripts/estimate/validateNoGenericFallback10000";

describe("truth audit no generic fallback 10000", () => {
  it("fails closed while catalog-derived bindings are not verified norm sources", () => {
    const summary = validateNoGenericFallback10000();

    expect(summary.final_status).toBe(STOP_AI_ESTIMATE_10000_GENERIC_FALLBACK_FOUND);
    expect(summary.generic_fallback_count).toBe(10000);
    expect(summary.generic_norm_rows_count).toBeGreaterThan(0);
    expect(summary.synthetic_family_default_count).toBe(0);
    expect(summary.templates_only_generic_norms_count).toBeGreaterThan(0);
    expect(summary.blockers).toEqual(expect.arrayContaining([
      expect.stringContaining("generic_norm_rows:"),
      "generic_fallback_count:10000",
    ]));
  });
});
