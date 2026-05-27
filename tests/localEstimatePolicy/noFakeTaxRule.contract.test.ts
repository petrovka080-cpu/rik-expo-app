import { localPolicyFor, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("local estimate tax safety", () => {
  it("does not invent fake tax rules", () => {
    expect(localPolicyFor(WORLD_PROMPTS.hydroTurbine).fakeTaxRuleUsed).toBe(false);
  });
});
