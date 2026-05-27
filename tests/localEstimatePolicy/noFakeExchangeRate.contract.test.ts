import { localPolicyFor, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("local estimate exchange-rate safety", () => {
  it("does not invent exchange rates", () => {
    expect(localPolicyFor(WORLD_PROMPTS.hydroTurbine).fakeExchangeRateUsed).toBe(false);
  });
});
