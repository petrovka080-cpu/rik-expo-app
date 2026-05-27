import { buildWorldEngineEstimate, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("medium professional BOQ depth", () => {
  it("creates at least 20 meaningful rows for medium work", () => {
    const estimate = buildWorldEngineEstimate(WORLD_PROMPTS.brick);
    expect(estimate.sections.flatMap((section) => section.rows).length).toBeGreaterThanOrEqual(20);
  });
});
