import { classifyWorld, readRepoFile } from "../worldConstruction/worldConstructionTestHelpers";

describe("world estimate architecture - no exact prompt lookup", () => {
  it("classifies paraphrases and avoids exact prompt manifest logic in the engine", () => {
    const source = readRepoFile("src/lib/ai/worldConstructionInterpreter/classifyConstructionWorkOutcome.ts");
    expect(source).not.toMatch(/exactPrompt|promptLookup|promptManifest/i);
    expect(classifyWorld("локальная смета для кровельной гидроизоляции 100 м2").primitive.workKey).toBe("roof_waterproofing");
  });
});
