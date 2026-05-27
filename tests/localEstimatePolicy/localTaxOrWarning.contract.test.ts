import { localPolicyFor, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("local estimate tax policy", () => {
  it("returns a configured tax rule or explicit warning", () => {
    const local = localPolicyFor(WORLD_PROMPTS.roofWaterproofing, "KG", "Bishkek");
    const unknown = localPolicyFor(WORLD_PROMPTS.roofWaterproofing);

    expect(local.taxLabel.length).toBeGreaterThan(0);
    expect(unknown.taxWarning.length).toBeGreaterThan(0);
  });
});
