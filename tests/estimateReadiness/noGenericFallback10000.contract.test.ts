import {
  validateNoGenericFallback10000,
  STOP_AI_ESTIMATE_10000_GENERIC_FALLBACK_FOUND,
} from "../../scripts/estimate/validateNoGenericFallback10000";

jest.setTimeout(60000);

describe("no generic fallback 10000", () => {
  it("stays blocked while catalog bindings are not verified professional norm sources", () => {
    const result = validateNoGenericFallback10000();

    expect(result.final_status).toBe(STOP_AI_ESTIMATE_10000_GENERIC_FALLBACK_FOUND);
    expect(result.generic_fallback_count).toBe(10000);
    expect(result.generic_norm_rows_count).toBeGreaterThan(0);
    expect(result.synthetic_family_default_count).toBe(0);
    expect(result.templates_only_generic_norms_count).toBeGreaterThan(0);
    expect(result.blockers).toEqual(expect.arrayContaining([
      expect.stringContaining("generic_norm_rows:"),
      "generic_fallback_count:10000",
    ]));
  });
});
