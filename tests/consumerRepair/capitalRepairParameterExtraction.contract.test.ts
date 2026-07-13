import { extractWorkParamsFromInlinePrompt } from "../../src/lib/ai/extractWorkParamsFromInlinePrompt";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { buildAiEstimateParameterCards } from "../../src/lib/estimate/buildAiEstimateParameterCards";

describe("capital repair parameter extraction", () => {
  it("understands area, bathrooms and ceiling height without turning ceiling height into length", () => {
    const prompt = "Капитальный ремонт квартиры 154 кв метра 2 санузла высота потолка 3 метра";
    const params = extractWorkParamsFromInlinePrompt(prompt);

    expect(params.area_m2?.value).toBe(154);
    expect(params.bathrooms_count?.value).toBe(2);
    expect(params.ceiling_height_m?.value).toBe(3);
    expect(params.length_m).toBeUndefined();

    const revision = createEstimateDraftRevision({
      rawInput: prompt,
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    const cards = buildAiEstimateParameterCards({ revision });
    const visible = cards.map((card) => `${card.labelRu} ${card.displayValueRu}`).join(" ");
    expect(visible).toContain("Высота потолка");
    expect(visible).toContain("Количество санузлов");
    expect(visible).not.toMatch(/ceiling_height_m|bathrooms_count|length_m/i);
  });
});
