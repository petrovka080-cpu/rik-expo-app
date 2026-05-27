import { buildWorldEngineEstimate, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("complex professional BOQ depth", () => {
  it("creates at least 35 meaningful rows for complex work", () => {
    const estimate = buildWorldEngineEstimate(WORLD_PROMPTS.roofWaterproofing);
    expect(estimate.sections.flatMap((section) => section.rows).length).toBeGreaterThanOrEqual(35);
  });
});
