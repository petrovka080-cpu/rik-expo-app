import { buildConstructionEstimatePlan } from "../../src/lib/ai/liveUi";

describe("S_AI_CONSTRUCTION_INTENT_ESTIMATE_ENGINE_RECOVERY: estimate engine", () => {
  it("builds a reusable construction estimate plan instead of hardcoded screen summaries", () => {
    const plan = buildConstructionEstimatePlan("дай смету на укладку асфальта 100 м2");

    expect(plan.workType).toBe("asphalt_paving");
    expect(plan.estimateTitleRu).toContain("100");
    expect(plan.workItemsRu.join(" ")).toContain("асфальт");
    expect(plan.workItemsRu.join(" ")).toContain("уплотнение");
    expect(plan.missingDataRu.length).toBeGreaterThan(3);
  });
});
