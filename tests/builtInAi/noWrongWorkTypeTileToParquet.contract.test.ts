import { BUILT_IN_AI_PROMPTS, expectBuiltInEstimate } from "./builtInAiTestHelpers";

describe("built-in AI no wrong work type tile to parquet", () => {
  it("resolves кафельная плитка to ceramic tile laying", () => {
    const answer = expectBuiltInEstimate(BUILT_IN_AI_PROMPTS.foremanTile174, "ceramic_tile_laying", "foreman");
    expect(answer.toolResult.estimate?.work.workKey).not.toMatch(/parquet|laminate/);
  });
});
