import { readRepoFile } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("live estimate architecture - no useEffect answer rewrite", () => {
  it("does not rewrite estimate answers in screen useEffect blocks", () => {
    const request = readRepoFile("app/(tabs)/request/index.tsx");
    const ai = readRepoFile("app/(tabs)/ai.tsx");
    expect(`${request}\n${ai}`).not.toMatch(/useEffect[\s\S]{0,800}(answerBuiltInAi|GlobalEstimateResult|professional_boq|calculate_global_estimate)/);
  });
});
