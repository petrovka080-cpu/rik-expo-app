import { buildWorldEngineEstimate, classifyWorld, expectTokens, rowText, WORLD_PROMPTS } from "./worldConstructionTestHelpers";

describe("roof waterproofing scope", () => {
  it("does not map roof waterproofing to bathroom waterproofing", () => {
    const classification = classifyWorld(WORLD_PROMPTS.roofWaterproofing).primitive;
    const estimate = buildWorldEngineEstimate(WORLD_PROMPTS.roofWaterproofing);

    expect(classification.objectScope).toBe("roof");
    expect(classification.workKey).toBe("roof_waterproofing");
    expect(rowText(estimate)).not.toMatch(/ванн|сануз|душев|плитка в ванной/i);
    expectTokens(estimate, ["очистка кровли", "праймер", "примыкания", "герметизация", "проверка герметичности"], 4);
  });
});
