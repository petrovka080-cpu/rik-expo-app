import { readRepoFile } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("live estimate architecture - no exact prompt lookup", () => {
  it("does not hardcode P0 prompt+volume strings", () => {
    const files = [
      "src/lib/ai/constructionInterpreter/buildConstructionWorkPlan.ts",
      "src/lib/ai/professionalBoq/compileBoqFromConstructionWorkPlan.ts",
    ].map(readRepoFile).join("\n");
    expect(files).not.toContain("брусчатки на 587");
    expect(files).not.toContain("навес на площади 647");
    expect(files).not.toContain("линолеум на 100");
  });
});
