import { ESTIMATE_NORM_GOLDEN_CASES_20 } from "../../src/lib/ai/estimateTemplate10000";
import { normGoldenResults } from "./normTestHelpers";

describe("estimate norm golden case traces", () => {
  it("keeps norm evidence on every golden compiled row", () => {
    const results = normGoldenResults();

    expect(ESTIMATE_NORM_GOLDEN_CASES_20).toHaveLength(20);
    expect(results).toHaveLength(20);
    expect(results.every((result) => result.passed)).toBe(true);
    expect(results.every((result) => result.row_count > 0 && result.norm_sources_count > 0)).toBe(true);
  });
});
