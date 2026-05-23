import { expectEstimateIntent, expectProfessionalBoqEstimate } from "./anyEstimateTestHelpers";

describe("any estimate intent routes to global estimate", () => {
  it("routes Russian estimate prompts into calculate_global_estimate contract", () => {
    const route = expectEstimateIntent("дай смету на прокладку асфальта на 10000 кв метров");
    expect(route.resolvedWorkKey).toBe("asphalt_paving");
    expect(route.volume).toBe(10000);

    expectProfessionalBoqEstimate("дай смету на прокладку асфальта на 10000 кв метров", "asphalt_paving");
  });
});
