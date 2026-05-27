import { classifyWorld, WORLD_PROMPTS } from "./worldConstructionTestHelpers";

describe("regulated construction work", () => {
  it("uses dangerous/regulated safe estimate mode for hydropower turbine installation", () => {
    const classification = classifyWorld(WORLD_PROMPTS.hydroTurbine).primitive;

    expect(classification.outcome).toBe("DANGEROUS_REGULATED_SAFE_ESTIMATE");
    expect(classification.riskClass).toBe("regulated");
    expect(classification.clarifyingQuestions.join("\n")).toMatch(/напор|расход|подключ/i);
  });
});
