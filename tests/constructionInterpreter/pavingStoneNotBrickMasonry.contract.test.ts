import { buildConstructionWorkPlan } from "../../src/lib/ai/constructionInterpreter";

describe("ConstructionWorkPlan paving semantic", () => {
  it("maps брусчатка to paving, not brick masonry", () => {
    const plan = buildConstructionWorkPlan("смета на укладку брусчатки на 587 кв м");
    expect(plan?.workKey).toBe("paving_stone_laying");
    expect(plan?.domain).toBe("paving");
    expect(plan?.object).toBe("paving_stone_surface");
    expect(plan?.workKey).not.toBe("brick_masonry");
  });
});
