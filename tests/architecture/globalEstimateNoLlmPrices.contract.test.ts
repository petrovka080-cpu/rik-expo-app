import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("global estimate no LLM prices", () => {
  it("keeps prices in backend ratebook records", () => {
    const calculator = readRepoFile("src/lib/ai/globalEstimate/globalEstimateCalculator.ts");
    const ratebook = readRepoFile("src/lib/ai/globalEstimate/globalRateBookService.ts");
    expect(calculator).toContain("resolveGlobalRate");
    expect(ratebook).toContain("GLOBAL_RATE_MATERIALS");
    expect(ratebook).toContain("GLOBAL_RATE_WORKS");
    expect(calculator + ratebook).not.toMatch(/llm.*price|price.*llm|prompt.*price/i);
  });
});
