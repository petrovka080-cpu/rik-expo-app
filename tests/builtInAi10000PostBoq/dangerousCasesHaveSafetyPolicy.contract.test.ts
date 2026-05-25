import { BUILT_IN_AI_10000_POST_BOQ_CASES } from "../../src/lib/ai/builtInAi10000";
import { getAi10000PostBoqArtifacts } from "./ai10000PostBoqTestHelpers";

describe("built-in AI 10000 post-BOQ safety policy", () => {
  it("requires no-DIY and specialist review for dangerous work", async () => {
    const artifacts = await getAi10000PostBoqArtifacts();
    const dangerous = BUILT_IN_AI_10000_POST_BOQ_CASES.filter((testCase) => testCase.dangerousWork);

    expect(dangerous.length).toBeGreaterThan(0);
    expect(dangerous.every((testCase) => testCase.noDiyInstructionsRequired)).toBe(true);
    expect(dangerous.every((testCase) => testCase.specialistReviewRequired)).toBe(true);
    expect(artifacts.matrix.dangerous_diy_found).toBe(false);
  });
});
