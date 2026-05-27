import {
  buildRequestAnswer,
  estimateFromAnswer,
  expectNoForbiddenWorldRows,
  expectTokens,
  WORLD_PROMPTS,
} from "../worldConstruction/worldConstructionTestHelpers";

describe("/request world construction estimate", () => {
  it("uses GlobalEstimateResult for known construction work", () => {
    const answer = buildRequestAnswer(WORLD_PROMPTS.roofWaterproofing);
    const estimate = estimateFromAnswer(answer);

    expect(answer.route.intent).toBe("estimate");
    expect(answer.toolResult.toolName).toBe("calculate_global_estimate");
    expect(answer.toolResult.backendCalled).toBe(true);
    expect(estimate.work.workKey).toBe("roof_waterproofing");
    expectTokens(estimate, ["очистка кровли", "праймер", "примыкан", "проверка герметичности"], 4);
    expectNoForbiddenWorldRows(estimate);
  });
});
