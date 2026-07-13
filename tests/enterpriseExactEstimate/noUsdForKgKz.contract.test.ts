import { buildExactMaterialPriceEstimate } from "../../src/lib/ai/exactMaterialPriceEstimate";

describe("enterprise exact estimate no USD for KG/KZ users", () => {
  it("does not expose USD totals for KG or KZ regional estimates", () => {
    const kg = buildExactMaterialPriceEstimate({
      text: "\u041a\u043b\u0430\u0434\u043a\u0430 \u043a\u0438\u0440\u043f\u0438\u0447\u0430 74 \u043c2",
      selectedWorkKey: "brick_masonry",
      volume: 74,
      unit: "sq_m",
      countryCode: "KG",
      city: "Bishkek",
      region: "KG-Bishkek",
      currency: "KGS",
    });
    const kz = buildExactMaterialPriceEstimate({
      text: "\u0423\u043a\u043b\u0430\u0434\u043a\u0430 \u043f\u043b\u0438\u0442\u043a\u0438 28 \u043c2 \u0432 \u0410\u043b\u043c\u0430\u0442\u044b",
      selectedWorkKey: "ceramic_tile_laying",
      volume: 28,
      unit: "sq_m",
      countryCode: "KZ",
      city: "Almaty",
      region: "KZ-Almaty",
      currency: "KZT",
    });

    expect([...kg.ui_model.visible_text_lines, ...kz.ui_model.visible_text_lines].join("\n")).not.toContain("USD");
    expect(kg.totals.currency).toBe("KGS");
    expect(kz.totals.currency).toBe("KZT");
  });
});
