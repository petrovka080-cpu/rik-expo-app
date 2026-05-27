import { buildWorldEngineEstimate, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("simple professional BOQ depth", () => {
  it("creates at least 12 meaningful rows for simple known work", () => {
    const estimate = buildWorldEngineEstimate(WORLD_PROMPTS.laminate);
    expect(estimate.sections.flatMap((section) => section.rows).length).toBeGreaterThanOrEqual(12);
  });
});
