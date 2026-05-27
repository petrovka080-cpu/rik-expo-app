import { buildWorldEngineEstimate, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("world estimate architecture - GlobalEstimateResult", () => {
  it("returns a structured GlobalEstimateResult for recognized work", () => {
    const estimate = buildWorldEngineEstimate(WORLD_PROMPTS.hydroTurbine);

    expect(estimate.outputContract.format).toBe("professional_boq");
    expect(estimate.sections.length).toBeGreaterThan(0);
    expect(estimate.totals.grandTotal).toBeGreaterThan(0);
    expect(estimate.sources.length).toBeGreaterThan(0);
  });
});
