import { BUILT_IN_AI_PROMPTS, expectBuiltInEstimate, expectBuiltInProductSearch } from "./builtInAiTestHelpers";

describe("built-in AI intent router", () => {
  it("routes estimate and product intents to their domain tools", () => {
    expectBuiltInEstimate(BUILT_IN_AI_PROMPTS.asphalt10000, "asphalt_paving");
    expectBuiltInProductSearch(BUILT_IN_AI_PROMPTS.rebarProduct);
  });
});
