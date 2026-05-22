import { convertGlobalUnit, normalizeGlobalUnitForLocale } from "../../src/lib/ai/globalEstimate";

describe("global unit conversion engine", () => {
  it("converts area and preserves local imperial units when required", () => {
    expect(Math.round(convertGlobalUnit(100, "sq_m", "sq_ft").value)).toBe(1076);
    const normalized = normalizeGlobalUnitForLocale({
      value: 1000,
      unit: "sq ft",
      unitSystem: "imperial",
    });
    expect(normalized.normalizedUnit).toBe("sq_ft");
    expect(normalized.displayUnit).toBe("sq ft");
  });
});
