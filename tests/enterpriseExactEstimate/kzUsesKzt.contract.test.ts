import { buildExactMaterialPriceEstimate } from "../../src/lib/ai/exactMaterialPriceEstimate";

describe("enterprise exact estimate KZ currency", () => {
  it("uses KZT for an Almaty exact material estimate without USD fallback", () => {
    const result = buildExactMaterialPriceEstimate({
      text: "\u0421\u0442\u044f\u0436\u043a\u0430 \u043f\u043e\u043b\u0430 60 \u043c2 \u0432 \u0410\u043b\u043c\u0430\u0442\u044b",
      selectedWorkKey: "floor_screed",
      volume: 60,
      unit: "sq_m",
      countryCode: "KZ",
      city: "Almaty",
      region: "KZ-Almaty",
      currency: "KZT",
    });
    const visible = result.ui_model.visible_text_lines.join("\n");

    expect(result.totals.currency).toBe("KZT");
    expect(result.material_lines.every((line) => line.currency === "KZT")).toBe(true);
    expect(visible).toContain("KZT");
    expect(visible).not.toContain("USD");
    expect(result.material_lines.every((line) => line.price_status === "PRICE_MISSING")).toBe(true);
    expect(result.material_lines.every((line) => line.price_value === null && line.line_total === null)).toBe(true);
  });
});
