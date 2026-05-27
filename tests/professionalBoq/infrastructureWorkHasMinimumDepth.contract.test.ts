import { buildWorldEngineEstimate, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("infrastructure professional BOQ depth", () => {
  it("creates at least 45 meaningful rows for infrastructure work", () => {
    const estimate = buildWorldEngineEstimate(WORLD_PROMPTS.hydroTurbine);
    expect(estimate.sections.flatMap((section) => section.rows).length).toBeGreaterThanOrEqual(45);
  });
});
