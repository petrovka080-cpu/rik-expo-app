import { BUILT_IN_AI_PROMPTS, expectBuiltInEstimate } from "./builtInAiTestHelpers";

describe("built-in AI estimate intent beats role context", () => {
  it("keeps foreman context from overriding a tile estimate prompt", () => {
    const answer = expectBuiltInEstimate(BUILT_IN_AI_PROMPTS.foremanTile174, "ceramic_tile_laying", "foreman");
    expect(answer.route.screenContext).toBe("foreman");
    expect(answer.route.forbiddenFallbacks).toContain("role_qa");
  });
});
