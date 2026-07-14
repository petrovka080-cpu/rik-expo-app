import { buildExactMaterialPriceEstimate } from "../../src/lib/ai/exactMaterialPriceEstimate";

describe("enterprise exact estimate quantity parser", () => {
  it("parses real metric quantities and units from user text", () => {
    const cases = [
      {
        text: "\u0413\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f \u043a\u0440\u044b\u0448\u0438 120 \u043c2",
        expectedQuantity: 120,
        expectedUnit: "sq_m",
      },
      {
        text: "\u0421\u0442\u044f\u0436\u043a\u0430 \u043f\u043e\u043b\u0430 60 \u043c2",
        expectedQuantity: 60,
        expectedUnit: "sq_m",
      },
      {
        text: "\u0424\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442 30 \u043c3",
        expectedQuantity: 30,
        expectedUnit: "m3",
      },
    ];

    for (const testCase of cases) {
      const result = buildExactMaterialPriceEstimate({ text: testCase.text });
      expect(result.input.quantity).toBe(testCase.expectedQuantity);
      expect(result.input.unit).toBe(testCase.expectedUnit);
      expect(result.input.visible_quantity).toContain(String(testCase.expectedQuantity));
    }
  });
});
