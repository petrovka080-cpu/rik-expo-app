import { buildEmbeddedAiAnswer, estimateFromAnswer, expectNoForbiddenWorldRows, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("embedded AI generic row guard", () => {
  it("does not show generic construction rows for known work", () => {
    for (const prompt of [WORLD_PROMPTS.brick, WORLD_PROMPTS.asphalt, WORLD_PROMPTS.gkl]) {
      expectNoForbiddenWorldRows(estimateFromAnswer(buildEmbeddedAiAnswer(prompt)));
    }
  });
});
