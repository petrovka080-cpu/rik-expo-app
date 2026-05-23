import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("any estimate no LLM prices", () => {
  it("routes price calculation through backend calculator and rate book", () => {
    const router = readRepoFile("src/lib/ai/estimateRouting/universalEstimateIntentRouter.ts");
    const calculator = readRepoFile("src/lib/ai/globalEstimate/globalEstimateCalculator.ts");

    expect(router).toContain("calculateGlobalConstructionEstimateSync");
    expect(calculator).toContain("resolveGlobalRate");
    expect(calculator).not.toMatch(/llm.*price|price.*llm/i);
  });
});
