import { answerFor } from "../constructionPrimitives/primitiveBoqTestHelpers";

describe("/ai?context=foreman known primitive fallback guard", () => {
  it("does not return generic fallback for known primitive domains", () => {
    const answer = answerFor("/ai?context=foreman", "estimate low_voltage site installation 10 pcs");
    expect(answer.route.intent).toBe("estimate");
    expect(answer.toolResult.blockedBy).toBeUndefined();
    expect(answer.toolResult.estimate?.work.workKey).toBe("world_low_voltage");
    expect(answer.toolResult.estimate?.sections.flatMap((section) => section.rows).length).toBeGreaterThanOrEqual(12);
  });
});
