import { classifyWorld, WORLD_PROMPTS } from "./worldConstructionTestHelpers";

describe("world construction intent", () => {
  it("detects construction estimate intent across open-world prompts", () => {
    for (const prompt of [
      WORLD_PROMPTS.roofWaterproofing,
      WORLD_PROMPTS.hydroTurbine,
      WORLD_PROMPTS.ventilation,
      WORLD_PROMPTS.solar,
      WORLD_PROMPTS.well,
    ]) {
      expect(classifyWorld(prompt).primitive.intentDetected).toBe(true);
    }
  });
});
