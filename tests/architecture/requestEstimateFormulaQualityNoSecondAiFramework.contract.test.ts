import { readFile } from "./requestEstimateArchitectureTestHelpers";

describe("request estimate formula quality no second AI framework", () => {
  it("validates formulas without creating another AI or prompt-price layer", () => {
    const formulaEngine = readFile("src/lib/ai/globalEstimate/estimateFormulaQualityEngine.ts");
    const source = [
      formulaEngine,
      readFile("src/lib/ai/globalEstimate/globalEstimateCalculator.ts"),
      readFile("src/lib/ai/globalEstimate/validateEstimateBoqDepth.ts"),
    ].join("\n");

    expect(formulaEngine).toContain("validateEstimateFormulaQuality");
    expect(source).not.toMatch(/new\s+OpenAI|createOpenAI|chat\.completions|responses\.create/);
    expect(source).not.toMatch(/promptHardcodedPrice|hardcodedTax|LLM_PRICE|LLM_TAX/);
  });
});
