import { buildExactMaterialPriceEstimate } from "../../src/lib/ai/exactMaterialPriceEstimate";

describe("enterprise exact estimate work detection", () => {
  it("detects common real work requests without generic work fallback", () => {
    const cases = [
      {
        text: "\u041d\u0443\u0436\u043d\u043e \u0441\u0434\u0435\u043b\u0430\u0442\u044c \u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044e \u043a\u0440\u044b\u0448\u0438 120 \u043c2",
        expectedWorkKey: "roof_waterproofing",
      },
      {
        text: "\u0428\u0442\u0443\u043a\u0430\u0442\u0443\u0440\u043a\u0430 \u0441\u0442\u0435\u043d 85 \u043c2",
        expectedWorkKey: "wall_plastering",
      },
      {
        text: "\u041a\u043b\u0430\u0434\u043a\u0430 \u043a\u0438\u0440\u043f\u0438\u0447\u0430 74 \u043c2",
        expectedWorkKey: "brick_masonry",
      },
    ];

    for (const testCase of cases) {
      const result = buildExactMaterialPriceEstimate({ text: testCase.text });
      expect(result.work.work_key).toBe(testCase.expectedWorkKey);
      expect(result.material_lines.length).toBeGreaterThan(0);
      expect(result.policy.fake_price_claimed).toBe(false);
    }
  });
});
