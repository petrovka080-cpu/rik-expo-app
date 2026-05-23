import { BUILT_IN_AI_PROMPTS, expectBuiltInEstimate } from "./builtInAiTestHelpers";

describe("built-in AI action builder PDF visible", () => {
  it("attaches PDF action only when structured estimate exists", () => {
    const answer = expectBuiltInEstimate(BUILT_IN_AI_PROMPTS.brick74, "brick_masonry");
    expect(answer.actions.map((action) => action.id)).toContain("make_pdf");
    expect(answer.toolResult.estimate?.outputContract.format).toBe("professional_boq");
  });
});
