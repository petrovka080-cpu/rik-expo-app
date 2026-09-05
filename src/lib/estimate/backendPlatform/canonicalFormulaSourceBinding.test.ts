import {
  bindCanonicalFormulaSource,
  CanonicalFormulaSourceBindingError,
  canonicalNormConstantQuantityBinding,
} from "./canonicalFormulaSourceBinding";

describe("canonical formula source binding", () => {
  it("binds a domain-qualified measure to the one declared canonical measure", () => {
    expect(bindCanonicalFormulaSource({
      source: "roof_area_m2 * 1.08",
      parameterIds: new Set(["area_m2", "roof_windows_count"]),
    })).toBe("area_m2 * 1.08");
  });

  it("keeps exact parameters and expands declared derived formulas", () => {
    expect(bindCanonicalFormulaSource({
      source: "roof_installation_labor_hours",
      parameterIds: new Set(["area_m2", "roof_windows_count"]),
      derivedFormulas: new Map([
        ["roof_installation_labor_hours", "roof_area_m2 * 1.25 + roof_windows_count * 6"],
      ]),
    })).toBe("(area_m2 * 1.25 + roof_windows_count * 6)");
  });

  it("accepts a quantity explicitly stated by a descriptive fixed row", () => {
    expect(bindCanonicalFormulaSource({
      source: "1 HSE set per work package",
      parameterIds: new Set(["area_m2"]),
    })).toBe("1");
  });

  it("rejects an unresolved parameter instead of substituting its baseline value", () => {
    expect(() => bindCanonicalFormulaSource({
      source: "roof_area_m2 * insulation_mm / 1000",
      parameterIds: new Set(["area_m2"]),
    })).toThrow(CanonicalFormulaSourceBindingError);
  });

  it("recognizes minQty only through an explicit numeric runtime binding", () => {
    expect(canonicalNormConstantQuantityBinding({
      source: "minQty",
      runtimeExpressionSource: "1",
    })).toBe("1");
    expect(canonicalNormConstantQuantityBinding({
      source: "minQty",
      runtimeExpressionSource: null,
    })).toBeNull();
    expect(canonicalNormConstantQuantityBinding({
      source: "area_m2",
      runtimeExpressionSource: "1",
    })).toBeNull();
  });
});
