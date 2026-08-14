import { compileFormulaGraph, evaluateFormulaGraph, FormulaGraphError } from "./formulaGraph";

describe("canonical FormulaGraph", () => {
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
});
