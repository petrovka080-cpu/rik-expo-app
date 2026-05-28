import { buildConstructionWorkPlan } from "../../src/lib/ai/constructionInterpreter";

describe("ConstructionWorkPlan apartment renovation", () => {
  it("recognizes capital apartment renovation as a known work plan", () => {
    const plan = buildConstructionWorkPlan("капитальный ремонт квартиры 36 кв м");
    expect(plan?.workKey).toBe("apartment_capital_renovation");
    expect(plan?.complexity).toBe("complex");
  });
});
