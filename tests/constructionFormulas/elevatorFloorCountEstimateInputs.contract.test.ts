import { estimatorPlan, UNIVERSAL_PROMPTS } from "../estimatorKernel/universalEstimatorTestHelpers";

describe("elevator floor-count estimate inputs", () => {
  it("uses floor count as stops, not area or generic count", () => {
    const formula = estimatorPlan(UNIVERSAL_PROMPTS.elevator).formulas[0];
    expect(formula?.formulaId).toBe("passenger_elevator_floor_count_preliminary_estimate");
    expect(formula?.outputs).toMatchObject({ stops: 14, shaftDoors: 14, callStations: 14 });
  });
});
