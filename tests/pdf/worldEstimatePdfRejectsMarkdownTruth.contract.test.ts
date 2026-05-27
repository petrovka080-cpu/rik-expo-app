import { readRepoFile } from "../worldConstruction/worldConstructionTestHelpers";

describe("world estimate PDF architecture", () => {
  it("does not use markdown answer text as PDF source of truth", () => {
    const sourceResolver = readRepoFile("src/lib/ai/estimatePdf/estimatePdfSourceResolver.ts");
    const engine = readRepoFile("src/lib/ai/worldConstructionEstimateEngine.ts");

    expect(sourceResolver).toContain("buildAiEstimatePdfSourceFromGlobalEstimate");
    expect(engine).toContain("GlobalEstimateResult");
    expect(engine).not.toMatch(/markdown\s*answer|parseMarkdown|markdownTable/i);
  });
});
