import { resolveUserLocaleFallback } from "../../src/lib/ai/globalLocalContext";

describe("user locale fallback", () => {
  it("marks locale-derived location as low confidence", () => {
    const context = resolveUserLocaleFallback("ru-KG");

    expect(context.countryCode).toBe("KG");
    expect(context.source).toBe("user_locale_fallback");
    expect(context.confidence).toBe("low");
    expect(context.warnings.join(" ")).toContain("низкой уверенностью");
  });
});
