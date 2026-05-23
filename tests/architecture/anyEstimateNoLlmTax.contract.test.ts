import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("any estimate no LLM tax", () => {
  it("uses the tax engine and tax rules, not prompt tax math", () => {
    const calculator = readRepoFile("src/lib/ai/globalEstimate/globalEstimateCalculator.ts");
    const taxEngine = readRepoFile("src/lib/ai/globalEstimate/globalTaxEngine.ts");

    expect(calculator).toContain("resolveGlobalTaxRule");
    expect(calculator).toContain("calculateGlobalTax");
    expect(taxEngine).toContain("taxResolution");
    expect(calculator).not.toMatch(/llm.*tax|tax.*llm/i);
  });
});
