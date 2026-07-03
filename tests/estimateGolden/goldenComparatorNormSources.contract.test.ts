import { normGoldenResults } from "../estimateNorms/normTestHelpers";

describe("golden comparator norm sources", () => {
  it("rejects golden cases without norm sources or norm versions", () => {
    const results = normGoldenResults();
    const failures = results.flatMap((result) => result.failures);

    expect(failures).toEqual([]);
    expect(results.every((result) => result.norm_sources_count >= 1)).toBe(true);
    expect(new Set(results.map((result) => result.template_key)).size).toBe(20);
  });
});
