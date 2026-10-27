import { compileFormulaGraph, evaluateFormulaGraph, FormulaGraphError, isFormulaGraphDecimalMultiple } from "./formulaGraph";

describe("canonical FormulaGraph", () => {
  it("checks exact multiples at decimal storage scale without rounding into a supply or trip", () => {
    expect(isFormulaGraphDecimalMultiple("1000000000.000001", "20")).toBe(false);
    expect(isFormulaGraphDecimalMultiple("1000000000", "20")).toBe(true);
    expect(isFormulaGraphDecimalMultiple("9007199254740992.5", "1")).toBe(false);
    expect(isFormulaGraphDecimalMultiple("9007199254740993", "1")).toBe(true);
    expect(isFormulaGraphDecimalMultiple("20.0000000001", "20")).toBe(false);
    expect(isFormulaGraphDecimalMultiple("0.000000006", "0.000000002")).toBe(true);
  });
  it("normalizes accepted operators and evaluates deterministically", () => {
    const formula = compileFormulaGraph("ceil((area_m2 × layers) / coverage_m2) + 0.125");
    expect(formula.inputParameterIds).toEqual(["area_m2", "coverage_m2", "layers"]);
    expect(evaluateFormulaGraph(formula, { area_m2: "10.1", layers: 2, coverage_m2: 3 })).toBe("7.125");
  });

  it("supports max/min without arbitrary execution", () => {
    expect(evaluateFormulaGraph(compileFormulaGraph("max(1, min(a, 4))"), { a: 7 })).toBe("4");
    expect(() => compileFormulaGraph("globalThis.process.exit(1)")).toThrow(FormulaGraphError);
  });

  it("does not inherit binary floating point drift", () => {
    expect(evaluateFormulaGraph(compileFormulaGraph("0.1 + 0.2"), {})).toBe("0.3");
  });

  it("rejects missing inputs and division by zero", () => {
    expect(() => evaluateFormulaGraph(compileFormulaGraph("a + 1"), {})).toThrow("missing parameter a");
    expect(() => evaluateFormulaGraph(compileFormulaGraph("1 / zero"), { zero: 0 })).toThrow("division by zero");
  });

  it("evaluates the complete R5.5.5 engineering function vocabulary", () => {
    expect(evaluateFormulaGraph(compileFormulaGraph("round_to(unit_convert(q, 1.1), 4)"), { q: 3 })).toBe("3.3");
    expect(evaluateFormulaGraph(compileFormulaGraph("floor(10 / 3) + sqrt(16)"), {})).toBe("7");
    expect(evaluateFormulaGraph(compileFormulaGraph("pow(8, 2 / 3)"), {})).toBe("4");
  });

  it("retains conditional dependencies and never treats an unknown condition as false", () => {
    const formula = compileFormulaGraph("is_gabion ? length_m : 0");
    expect(formula.inputParameterIds).toEqual(["is_gabion", "length_m"]);
    expect(formula.ast).toMatchObject({ kind: "conditional" });
    expect(evaluateFormulaGraph(formula, { is_gabion: true, length_m: 150 })).toBe("150");
    expect(evaluateFormulaGraph(formula, { is_gabion: true, length_m: 100 })).toBe("100");
    expect(evaluateFormulaGraph(formula, { is_gabion: false, length_m: 150 })).toBe("0");
    expect(() => evaluateFormulaGraph(formula, { length_m: 150 })).toThrow("missing parameter is_gabion");
  });
});
