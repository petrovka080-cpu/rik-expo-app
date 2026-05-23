import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("built-in AI no LLM prices", () => {
  it("uses global estimate backend and rate records for prices", () => {
    const registry = readRepoFile("src/lib/ai/builtInAi/builtInAiToolRegistry.ts");
    expect(registry).toContain("GLOBAL_RATE_MATERIALS");
    expect(registry).toContain("calculateGlobalConstructionEstimateSync");
    expect(registry).not.toMatch(/llm.*price|price.*llm/i);
  });
});
