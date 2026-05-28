import { readRepoFile } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("ConstructionWorkPlan architecture", () => {
  it("does not resolve P0 works by exact prompt lookup", () => {
    const source = readRepoFile("src/lib/ai/constructionInterpreter/buildConstructionWorkPlan.ts");
    expect(source).not.toContain("брусчатки на 587");
    expect(source).not.toContain("металлический навес на площади 647");
    expect(source).not.toContain("Хочу уложить линолеум на 100");
  });
});
