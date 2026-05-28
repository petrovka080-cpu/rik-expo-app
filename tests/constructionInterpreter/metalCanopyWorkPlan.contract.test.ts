import { buildConstructionWorkPlan } from "../../src/lib/ai/constructionInterpreter";

describe("ConstructionWorkPlan metal canopy", () => {
  it("resolves object, operation and method for a metal canopy", () => {
    const plan = buildConstructionWorkPlan("смета на металлический навес на площади 647 кв метров");
    expect(plan).toMatchObject({
      workKey: "metal_canopy_installation",
      domain: "metalworks",
      object: "metal_canopy",
      operation: "installation",
      method: "welded_metal_frame",
    });
  });
});
