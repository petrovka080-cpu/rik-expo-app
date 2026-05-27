import { buildWorldEngineEstimate, classifyWorld, expectTokens, WORLD_PROMPTS } from "./worldConstructionTestHelpers";

describe("hydro turbine classification", () => {
  it("classifies 100 kW GES turbine work as hydropower infrastructure, not generic construction", () => {
    const classification = classifyWorld(WORLD_PROMPTS.hydroTurbine).primitive;
    const estimate = buildWorldEngineEstimate(WORLD_PROMPTS.hydroTurbine);

    expect(classification.domain).toBe("hydropower");
    expect(classification.workKey).toBe("micro_hydro_preparation");
    expect(classification.complexity).toBe("infrastructure");
    expect(estimate.sections.flatMap((section) => section.rows).length).toBeGreaterThanOrEqual(45);
    expectTokens(estimate, ["турбина", "генератор", "шкаф управления", "синхронизация", "щит 0,4", "ПНР", "обучение"], 5);
  });
});
