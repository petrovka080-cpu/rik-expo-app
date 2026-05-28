import { buildConstructionWorkPlan } from "../../src/lib/ai/constructionInterpreter";

describe("ConstructionWorkPlan gable roof", () => {
  it("maps двускатная крыша to installation, not repair roof", () => {
    const plan = buildConstructionWorkPlan("устройство двускатной крыши основание 67 кв м высота конька 2.5 м");
    expect(plan?.workKey).toBe("gable_roof_installation");
    expect(plan?.operation).toBe("installation");
  });
});
