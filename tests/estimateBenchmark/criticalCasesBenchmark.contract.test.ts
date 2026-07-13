import {
  compareEstimateToGoldenBenchmark,
  loadGoldenBenchmarkCases,
} from "../../scripts/estimate/goldenBenchmarkCore";

describe("critical golden benchmark cases", () => {
  it("passes mandatory and live-critical expert cases", () => {
    const critical = loadGoldenBenchmarkCases().filter((item) => item.critical);
    const mandatory = critical.filter((item) => item.mandatory_case_number);
    const comparisons = critical.map((item) => compareEstimateToGoldenBenchmark(item));

    expect(mandatory.length).toBeGreaterThanOrEqual(32);
    expect(comparisons.every((item) => item.passed)).toBe(true);
    expect(comparisons.every((item) => item.zero_tolerance_violations === 0)).toBe(true);
  });
});
