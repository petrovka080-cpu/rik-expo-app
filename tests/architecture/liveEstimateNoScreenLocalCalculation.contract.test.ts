import { readRepoFile } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("live estimate architecture - no screen-local calculation", () => {
  it("keeps estimate calculation out of /request and /ai screens", () => {
    const request = readRepoFile("app/(tabs)/request/index.tsx");
    const ai = readRepoFile("app/(tabs)/ai.tsx");
    expect(request).not.toMatch(/calculateGlobalConstructionEstimate|buildConstructionWorkPlan|compileBoqFromConstructionWorkPlan/);
    expect(ai).not.toMatch(/calculateGlobalConstructionEstimate|buildConstructionWorkPlan|compileBoqFromConstructionWorkPlan/);
  });
});
