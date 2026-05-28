import { answerFor } from "../constructionPrimitives/primitiveBoqTestHelpers";

describe("/request parametric BOQ compiler", () => {
  it("routes known primitive work through structured estimate output", () => {
    const answer = answerFor("/request", "estimate site_preparation site preparation 100 sq_m");
    expect(answer.route.intent).toBe("estimate");
    expect(answer.toolResult.estimate?.work.workKey).toBe("world_site_preparation");
    expect(answer.toolResult.estimate?.sections.flatMap((section) => section.rows).length).toBeGreaterThanOrEqual(12);
  });
});
