import { validateAiEstimateWorkClassification } from "../../src/lib/estimate/semantic/validateAiEstimateWorkClassification";

describe("AI estimate semantic work classifier", () => {
  it("classifies catalog works and protects unit-conflict regressions", () => {
    const result = validateAiEstimateWorkClassification();

    expect(result.ok).toBe(true);
    expect(result.workFamilyClassificationCoverage).toBe("11610/11610");
    expect(result.top1AccuracyOnGoldenCases).toBeGreaterThanOrEqual(95);
    expect(result.unitConflictRegressionsPassed).toBe(true);
    expect(result.workClassifierDoesNotUseHardcodedCapitalRepairOnly).toBe(true);
  }, 300_000);
});
