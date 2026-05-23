import { BUILT_IN_AI_PROMPTS, expectBuiltInEstimate } from "./builtInAiTestHelpers";

describe("built-in AI foreman estimate uses estimate tool", () => {
  it("routes carpet prompt to global estimate in foreman context", () => {
    expectBuiltInEstimate(BUILT_IN_AI_PROMPTS.foremanCarpet100, "carpet_laying", "foreman");
  });
});
