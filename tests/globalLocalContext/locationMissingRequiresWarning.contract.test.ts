import { buildLocalContextWarning, resolveCountryRegionCity } from "../../src/lib/ai/globalLocalContext";

describe("global local missing location policy", () => {
  it("requires an explicit warning when location is missing", () => {
    const context = resolveCountryRegionCity({
      prompt: "смета на кладку кирпича 74 кв метров",
    });

    expect(context.completeness).toBe("LOCAL_CONTEXT_MISSING");
    expect(context.currency).toBeNull();
    expect(buildLocalContextWarning(context)).toContain("Регион не указан");
  });
});
