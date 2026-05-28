import { answerFor } from "../constructionPrimitives/primitiveBoqTestHelpers";

describe("/ai?context=foreman parametric BOQ compiler", () => {
  it("keeps foreman context from overriding estimate intent", () => {
    const answer = answerFor("/ai?context=foreman", "estimate canopies site installation 100 sq_m");
    expect(answer.route.intent).toBe("estimate");
    expect(answer.toolResult.toolName).toBe("calculate_global_estimate");
    expect(answer.toolResult.estimate?.work.workKey).toBe("world_canopies");
    expect(answer.toolResult.blockedBy).toBeUndefined();
  });
});
