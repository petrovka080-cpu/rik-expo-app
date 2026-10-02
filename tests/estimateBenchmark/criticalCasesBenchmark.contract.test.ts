import {
  buildGeneratedBenchmarkEstimate,
  compareEstimateToGoldenBenchmark,
  loadGoldenBenchmarkCases,
  loadGoldenBenchmarkReference,
  PRODUCTION_NORM_APPLICABILITY_GATE_CASE_IDS,
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

  it("fails closed for historical production references without an applicable executable norm", () => {
    const casesById = new Map(loadGoldenBenchmarkCases().map((item) => [item.case_id, item]));

    for (const caseId of PRODUCTION_NORM_APPLICABILITY_GATE_CASE_IDS) {
      const caseDef = casesById.get(caseId);
      expect(caseDef).toBeDefined();
      if (!caseDef) continue;
      const generated = buildGeneratedBenchmarkEstimate(caseDef);
      const historicalReference = loadGoldenBenchmarkReference(caseDef);

      expect(caseDef.current_runtime_contract?.version).toBe("production-norm-applicability-gate-v1");
      expect(historicalReference.rows.length).toBeGreaterThan(0);
      expect(generated.estimate_level).toBe("NEEDS_INPUT");
      expect(generated.missing_design_inputs.length).toBeGreaterThan(0);
      expect(generated.rows).toEqual([]);
      expect(generated.procurement_subset).toEqual([]);
      expect(generated.pdf_row_codes).toEqual([]);
      expect(generated.buyer_row_codes).toEqual([]);
      expect(generated.total).toBeNull();
    }
  });
});
