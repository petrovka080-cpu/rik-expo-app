import { answerFor, FOREMAN_GABLE_PROMPT } from "./liveB2cEstimateRealityTestHelpers";

describe("/ai?context=foreman estimate intent priority", () => {
  it("routes estimate prompts to calculate_global_estimate instead of foreman status", () => {
    const answer = answerFor("/ai?context=foreman", FOREMAN_GABLE_PROMPT);
    expect(answer.route.intent).toBe("estimate");
    expect(answer.toolResult.toolName).toBe("calculate_global_estimate");
    expect(answer.answerTextRu).not.toMatch(/За\s+2026|работы сегодня|отч[её]т прораба/i);
  });
});
