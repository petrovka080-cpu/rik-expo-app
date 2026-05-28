import { buildConstructionWorkPlan } from "../../src/lib/ai/constructionInterpreter";

describe("ConstructionWorkPlan roof waterproofing", () => {
  it("keeps roof waterproofing out of bathroom scope", () => {
    const roof = buildConstructionWorkPlan("смета на гидроизоляцию крыши 100 кв м");
    const bathroom = buildConstructionWorkPlan("смета на гидроизоляцию ванной 20 кв м");
    expect(roof?.workKey).toBe("roof_waterproofing");
    expect(roof?.object).toBe("roof");
    expect(bathroom?.workKey).toBe("bathroom_waterproofing");
  });
});
