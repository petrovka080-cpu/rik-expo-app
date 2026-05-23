import { BUILT_IN_AI_PROMPTS, expectBuiltInEstimate, expectNoGenericEstimateFallback } from "./builtInAiTestHelpers";

describe("built-in AI no generic draft when estimate resolved", () => {
  it("does not return request generic draft for known estimate", () => {
    const answer = expectBuiltInEstimate(BUILT_IN_AI_PROMPTS.requestWindow, "window_installation", "request");
    expectNoGenericEstimateFallback(answer);
  });
});
