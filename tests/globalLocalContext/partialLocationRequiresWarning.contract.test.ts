import { buildLocalContextWarning, resolveCountryRegionCity } from "../../src/lib/ai/globalLocalContext";

describe("global local partial location policy", () => {
  it("uses country policy but asks for city when only country is known", () => {
    const context = resolveCountryRegionCity({
      prompt: "смета на кровлю в Казахстане",
    });

    expect(context).toMatchObject({
      countryCode: "KZ",
      currency: "KZT",
      completeness: "LOCAL_CONTEXT_PARTIAL",
      confidence: "medium",
    });
    expect(buildLocalContextWarning(context)).toContain("город");
  });
});
