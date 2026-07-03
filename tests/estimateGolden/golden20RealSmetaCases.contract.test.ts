import { ESTIMATE_NORM_GOLDEN_CASES_20 } from "../../src/lib/ai/estimateTemplate10000";
import { normGoldenResults } from "../estimateNorms/normTestHelpers";

describe("golden 20 real smeta norm cases", () => {
  it("covers all 20 production work categories with norm-backed BOQ rows", () => {
    const categories = new Set(ESTIMATE_NORM_GOLDEN_CASES_20.map((testCase) => testCase.category));
    const results = normGoldenResults();

    expect(categories.size).toBe(20);
    expect(results.every((result) => result.passed)).toBe(true);
    expect(results.every((result) => result.source_expectation === "norm_id_source_version_trace")).toBe(true);
  });
});
