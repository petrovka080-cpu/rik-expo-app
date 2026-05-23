import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("built-in AI no fake marketplace availability", () => {
  it("marks product stock unknown unless a backend source knows it", () => {
    const registry = readRepoFile("src/lib/ai/builtInAi/builtInAiToolRegistry.ts");
    expect(registry).toContain("availabilityStatus: \"unknown\"");
    expect(registry).toContain("stockKnown: false");
    expect(registry).not.toMatch(/inStock:\s*true|available:\s*true/);
  });
});
