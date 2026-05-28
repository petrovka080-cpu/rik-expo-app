import { answerFor } from "../constructionPrimitives/primitiveBoqTestHelpers";

describe("/request known primitive fallback guard", () => {
  it("does not return template gap for known primitive domains", () => {
    const answer = answerFor("/request", "estimate drainage site installation 40 linear_m");
    expect(answer.toolResult.blockedBy).toBeUndefined();
    expect(answer.toolResult.fallbackUsed).toBeUndefined();
    expect(answer.toolResult.estimate?.work.workKey).toBe("world_drainage");
  });
});
