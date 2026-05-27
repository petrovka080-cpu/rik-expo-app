import { localPolicyFor, WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

describe("local estimate currency policy", () => {
  it("uses local currency when country is known and warning when region is missing", () => {
    expect(localPolicyFor(WORLD_PROMPTS.roofWaterproofing, "KG", "Bishkek").currency).toBe("KGS");
    expect(localPolicyFor(WORLD_PROMPTS.roofWaterproofing).localPriceWarningRequired).toBe(true);
  });
});
