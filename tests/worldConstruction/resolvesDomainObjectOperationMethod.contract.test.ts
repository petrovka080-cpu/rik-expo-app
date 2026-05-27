import { classifyWorld, WORLD_PROMPTS } from "./worldConstructionTestHelpers";

describe("world construction primitive resolution", () => {
  it("resolves domain, object, operation, method and unit for recognized construction work", () => {
    const roof = classifyWorld(WORLD_PROMPTS.roofWaterproofing).primitive;
    expect(roof).toEqual(expect.objectContaining({
      domain: "waterproofing",
      objectScope: "roof",
      operation: "waterproofing",
      method: expect.any(String),
      unit: "sq_m",
      workKey: "roof_waterproofing",
    }));

    const turbine = classifyWorld(WORLD_PROMPTS.hydroTurbine).primitive;
    expect(turbine).toEqual(expect.objectContaining({
      domain: "hydropower",
      objectScope: "hydropower_unit",
      operation: "installation",
      workKey: "micro_hydro_preparation",
      complexity: "infrastructure",
    }));
  });
});
