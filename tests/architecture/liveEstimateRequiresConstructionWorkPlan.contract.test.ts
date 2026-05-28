import { readRepoFile } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("live estimate architecture - ConstructionWorkPlan", () => {
  it("requires ConstructionWorkPlan before professional BOQ compilation", () => {
    const calculator = readRepoFile("src/lib/ai/globalEstimate/globalEstimateCalculator.ts");
    const compiler = readRepoFile("src/lib/ai/professionalBoq/compileBoqFromConstructionWorkPlan.ts");
    expect(calculator).toContain("buildConstructionWorkPlan");
    expect(compiler).toContain("ConstructionWorkPlan");
  });
});
