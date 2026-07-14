import { validateAiEstimateParameterGraph } from "../../src/lib/estimate/graph/validateAiEstimateParameterGraph";

describe("AI estimate parameter graph", () => {
  it("uses exact parameter dependencies across the catalog", () => {
    const result = validateAiEstimateParameterGraph();

    expect(result.ok).toBe(true);
    expect(result.parameterGraphCoverage).toBe("11610/11610");
    expect(result.exactIdentifierDependencyMatching).toBe(true);
    expect(result.substringDependencyMatchingAbsent).toBe(true);
  }, 300_000);
});
