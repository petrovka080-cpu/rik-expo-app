import { buildWorldEngineEstimate, expectNoForbiddenWorldRows, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("professional BOQ generic row guard", () => {
  it("rejects generic item rows for known work", () => {
    for (const prompt of [WORLD_PROMPTS.laminate, WORLD_PROMPTS.roofWaterproofing, WORLD_PROMPTS.hydroTurbine, WORLD_PROMPTS.brick, WORLD_PROMPTS.asphalt]) {
      expectNoForbiddenWorldRows(buildWorldEngineEstimate(prompt));
    }
  });
});
