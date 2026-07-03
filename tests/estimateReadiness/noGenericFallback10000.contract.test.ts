import {
  validateNoGenericFallback10000,
  STOP_AI_ESTIMATE_10000_GENERIC_FALLBACK_FOUND,
} from "../../scripts/estimate/validateNoGenericFallback10000";

jest.setTimeout(60000);

describe("no generic fallback 10000", () => {
  it("stays red while P3 generic fallback remains outside P1/P2 backfill", () => {
    const result = validateNoGenericFallback10000();

    expect(result.final_status).toBe(STOP_AI_ESTIMATE_10000_GENERIC_FALLBACK_FOUND);
    expect(result.generic_fallback_count).toBe(1002);
    expect(result.generic_norm_rows_count).toBe(39844);
    expect(result.synthetic_family_default_count).toBe(39844);
    expect(result.templates_only_generic_norms_count).toBe(1002);
    expect(result.blockers).toEqual(expect.arrayContaining([
      "generic_norm_rows:39844",
      "templates_only_generic_norms:1002",
      "generic_fallback_count:1002",
    ]));
  });
});
