import { validateAiEstimateFormulaDag } from "../../src/lib/estimate/formula/validateAiEstimateFormulaDag";

describe("AI estimate formula DAG", () => {
  it("evaluates safe formulas without eval or Function", () => {
    const result = validateAiEstimateFormulaDag();

    expect(result.ok).toBe(true);
    expect(result.formulaDagCoverage).toBe("11610/11610");
    expect(result.safeFormulaEvaluatorCreated).toBe(true);
    expect(result.evalNotUsed).toBe(true);
    expect(result.newFunctionNotUsed).toBe(true);
    expect(result.incrementalRecalculationSupported).toBe(true);
  }, 300_000);
});
