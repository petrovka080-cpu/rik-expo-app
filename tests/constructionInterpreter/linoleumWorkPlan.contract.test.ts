import { buildConstructionWorkPlan } from "../../src/lib/ai/constructionInterpreter";

describe("ConstructionWorkPlan linoleum", () => {
  it("recognizes linoleum laying as flooring", () => {
    const plan = buildConstructionWorkPlan("Хочу уложить линолеум на 100 кв м");
    expect(plan?.workKey).toBe("linoleum_laying");
    expect(plan?.domain).toBe("flooring");
    expect(plan?.operation).toBe("laying");
  });
});
