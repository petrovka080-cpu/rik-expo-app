import { buildEmbeddedAiAnswer, estimateFromAnswer, expectTokens, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("/ai?context=foreman world construction estimate", () => {
  it("uses GlobalEstimateResult and work-specific rows for construction prompts", () => {
    const answer = buildEmbeddedAiAnswer(WORLD_PROMPTS.asphalt);
    const estimate = estimateFromAnswer(answer);

    expect(answer.toolResult.toolName).toBe("calculate_global_estimate");
    expect(estimate.work.workKey).toBe("asphalt_paving");
    expectTokens(estimate, ["песчан", "щебен", "битум", "асфальтобетон", "уплотнен"], 4);
  });
});
