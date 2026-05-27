import { readRepoFile } from "../worldConstruction/worldConstructionTestHelpers";

describe("world estimate architecture - no second AI framework", () => {
  it("extends BuiltIn AI pipeline instead of creating another AI framework", () => {
    const registry = readRepoFile("src/lib/ai/builtInAi/builtInAiToolRegistry.ts");
    const engine = readRepoFile("src/lib/ai/worldConstructionEstimateEngine.ts");

    expect(registry).toContain("runWorldConstructionEstimateEngine");
    expect(engine).not.toMatch(/openai|anthropic|gemini|new\s+AI|createAgent|secondAi/i);
  });
});
