import { parseRealMaterialQuantityIntent } from "../../src/lib/ai/professionalEstimateCalculator";

describe("AI does not invent structural quantities", () => {
  it("parses intent and area but leaves masonry material parameters to backend/user confirmation", () => {
    const intent = parseRealMaterialQuantityIntent({
      rawInput: "каменную кладку 400 кв метра",
    });

    expect(intent.workType).toBe("masonry");
    expect(intent.areaM2).toBe(400);
    expect(intent.missingParameters).toEqual(expect.arrayContaining(["material_type", "wall_thickness_mm"]));
    expect(intent.aiIsIntentParser).toBe(true);
    expect(intent.aiIsSourceOfTruth).toBe(false);
    expect(intent.backendTemplatesAreSourceOfTruth).toBe(true);
  });
});
