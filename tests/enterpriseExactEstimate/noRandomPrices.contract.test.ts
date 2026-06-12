import { buildExactMaterialPriceEstimate, resolveExactMaterialRate } from "../../src/lib/ai/exactMaterialPriceEstimate";

describe("enterprise exact estimate no random prices", () => {
  it("does not synthesize prices for unknown materials", () => {
    const result = buildExactMaterialPriceEstimate({
      text: "\u0413\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f \u043a\u0440\u044b\u0448\u0438 120 \u043c2",
      selectedWorkKey: "roof_waterproofing",
      volume: 120,
      unit: "sq_m",
    });
    const unknown = resolveExactMaterialRate({
      materialId: "enterprise_unknown_material",
      rateKey: "enterprise_unknown_material",
      unit: "sq_m",
      region: "KG-Bishkek",
      currency: "KGS",
    });

    expect(result.policy.random_prices_allowed).toBe(false);
    expect(result.policy.hidden_fallback_prices_allowed).toBe(false);
    expect(result.material_lines.some((line) => line.price_value === 0)).toBe(false);
    expect(unknown.price_status).toBe("PRICE_MISSING");
    expect(unknown.price_value).toBeNull();
  });
});
