import { buildExactMaterialPriceEstimate } from "../../src/lib/ai/exactMaterialPriceEstimate";

describe("enterprise exact estimate KG currency", () => {
  it("uses KGS for a Bishkek exact material estimate", () => {
    const result = buildExactMaterialPriceEstimate({
      text: "\u0413\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f \u043a\u0440\u044b\u0448\u0438 120 \u043c2 \u0432 \u0411\u0438\u0448\u043a\u0435\u043a\u0435",
      selectedWorkKey: "roof_waterproofing",
      volume: 120,
      unit: "sq_m",
      countryCode: "KG",
      city: "Bishkek",
      region: "KG-Bishkek",
      currency: "KGS",
    });
    const visible = result.ui_model.visible_text_lines.join("\n");

    expect(result.totals.currency).toBe("KGS");
    expect(visible).toContain("KGS");
    expect(visible).not.toContain("USD");
  });
});
