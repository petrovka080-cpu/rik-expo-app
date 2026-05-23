import { BUILT_IN_AI_PROMPTS, expectBuiltInEstimate } from "./builtInAiTestHelpers";

describe("built-in AI request screen uses estimate tool", () => {
  it("routes /request tile prompt to calculate_global_estimate", () => {
    expectBuiltInEstimate(BUILT_IN_AI_PROMPTS.requestTile15, "ceramic_tile_laying", "request");
  });
});
