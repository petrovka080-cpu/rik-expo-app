import { classifyWorld, WORLD_PROMPTS } from "./worldConstructionTestHelpers";

describe("ambiguous work", () => {
  it("asks for object disambiguation instead of guessing waterproofing scope", () => {
    const classification = classifyWorld(WORLD_PROMPTS.ambiguousWaterproofing).primitive;
    expect(classification.outcome).toBe("AMBIGUOUS_NEEDS_DISAMBIGUATION");
    expect(classification.disambiguationOptions).toEqual(expect.arrayContaining(["кровля", "ванная / санузел", "фундамент"]));
  });
});
