import { classifyWorld, WORLD_PROMPTS } from "./worldConstructionTestHelpers";

describe("known construction work routing", () => {
  it("does not route known work to other_construction_work or generic repair", () => {
    for (const prompt of [
      WORLD_PROMPTS.laminate,
      WORLD_PROMPTS.roofWaterproofing,
      WORLD_PROMPTS.hydroTurbine,
      WORLD_PROMPTS.brick,
      WORLD_PROMPTS.asphalt,
      WORLD_PROMPTS.gkl,
    ]) {
      const primitive = classifyWorld(prompt).primitive;
      expect(primitive.workKey).not.toBe("other_construction_work");
      expect(primitive.workKey).not.toBe("generic_repair");
      expect(primitive.workKey).toBeTruthy();
    }
  });
});
