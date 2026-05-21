import { classifyConstructionWorkType } from "../../src/lib/ai/liveUi";

describe("S_AI_CONSTRUCTION_INTENT_ESTIMATE_ENGINE_RECOVERY: work type classifier", () => {
  it("classifies broad construction work types, not only windows and doors", () => {
    expect(classifyConstructionWorkType("укладка асфальта")).toBe("asphalt_paving");
    expect(classifyConstructionWorkType("монтаж брусчатки")).toBe("paving_blocks");
    expect(classifyConstructionWorkType("бетонная стяжка")).toBe("concrete_screed");
    expect(classifyConstructionWorkType("заливка монолита")).toBe("monolithic_concrete");
    expect(classifyConstructionWorkType("электрика в доме")).toBe("electrical");
    expect(classifyConstructionWorkType("сантехника санузел")).toBe("plumbing");
  });
});
