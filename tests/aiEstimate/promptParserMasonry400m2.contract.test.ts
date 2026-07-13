import {
  parseRealMaterialQuantityIntent,
} from "../../src/lib/ai/professionalEstimateCalculator";

describe("real quantity AI prompt parser boundary", () => {
  it("parses intent and area only; backend template catalog remains source of truth", () => {
    const intent = parseRealMaterialQuantityIntent({
      rawInput: "каменную кладку 400 кв метра",
    });

    expect(intent.status).toBe("TEMPLATE_READY_PARAMETERS_MISSING");
    expect(intent.workType).toBe("masonry");
    expect(intent.templateNameRu).toBe("Каменная кладка");
    expect(intent.areaM2).toBe(400);
    expect(intent.promptAreaExtracted).toBe(true);
    expect(intent.selectedWorkSource).toBe("backend_template_alias");
    expect(intent.aiIsIntentParser).toBe(true);
    expect(intent.aiIsSourceOfTruth).toBe(false);
    expect(intent.backendTemplatesAreSourceOfTruth).toBe(true);
  });
});
