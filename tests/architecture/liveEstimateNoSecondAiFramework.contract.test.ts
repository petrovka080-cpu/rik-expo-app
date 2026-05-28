import { readRepoFile } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("live estimate architecture - no second AI framework", () => {
  it("uses the existing builtInAi/globalEstimate pipeline", () => {
    const packageJson = readRepoFile("package.json");
    expect(packageJson).not.toMatch(/langchain|llamaindex|semantic-kernel/i);
  });
});
