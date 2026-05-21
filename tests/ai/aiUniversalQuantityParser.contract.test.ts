import { parseUniversalQuantity } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: quantity parser", () => {
  it("parses construction quantities for universal questions", () => {
    expect(parseUniversalQuantity("дай смету на заливку монолита на 1200 кв метров")).toMatchObject({
      area: 1200,
      areaUnit: "m2",
      quantitySource: "user_question",
    });
  });
});
