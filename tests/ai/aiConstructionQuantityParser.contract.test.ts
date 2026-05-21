import { parseConstructionQuantity } from "../../src/lib/ai/liveUi";

describe("S_AI_CONSTRUCTION_INTENT_ESTIMATE_ENGINE_RECOVERY: quantity parser", () => {
  it("parses common Russian area and count phrasing", () => {
    expect(parseConstructionQuantity("площадь 100 кв метров")).toMatchObject({
      area: 100,
      areaUnit: "m2",
      quantitySource: "user_question",
    });
    expect(parseConstructionQuantity("бетонная стяжка 50 м2")).toMatchObject({
      area: 50,
      areaUnit: "m2",
    });
    expect(parseConstructionQuantity("смета на установку окон 10 штук")).toMatchObject({
      count: 10,
      countUnitRu: "шт.",
    });
  });
});
