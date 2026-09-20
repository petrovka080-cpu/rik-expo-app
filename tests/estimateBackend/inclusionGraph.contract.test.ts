import { readFileSync } from "node:fs";

import {
  InclusionGraphEvaluationError,
  evaluateInclusionGraph,
  resolveInclusionGraph,
} from "../../src/lib/estimate/backendPlatform/inclusionGraph";

describe("canonical backend InclusionGraph", () => {
  const parameters = { enabled: true, quantity: 2, mode: "repair", disabled: false };

  it("evaluates the HVAC R4 conditions representation and numeric comparisons", () => {
    expect(evaluateInclusionGraph({
      kind: "and",
      conditions: [
        { kind: "equals", parameterId: "enabled", value: true },
        { kind: "greater_than", parameterId: "quantity", value: 0 },
      ],
    }, parameters)).toBe(true);
    expect(evaluateInclusionGraph({ kind: "less_than_or_equal", parameterId: "quantity", value: 2 }, parameters)).toBe(true);
  });

  it("keeps the predecessor operands representation compatible", () => {
    expect(evaluateInclusionGraph({
      kind: "or",
      operands: [
        { kind: "parameter", id: "disabled" },
        { kind: "in", parameterId: "mode", values: ["install", "repair"] },
      ],
    }, parameters)).toBe(true);
  });

  it("preserves undecided as a third state while the boolean compatibility wrapper stays false", () => {
    expect(resolveInclusionGraph({ kind: "greater_than", parameterId: "missing", value: 0 }, parameters)).toEqual({
      value: null,
      missingParameterIds: ["missing"],
    });
    expect(evaluateInclusionGraph({ kind: "greater_than", parameterId: "missing", value: 0 }, parameters)).toBe(false);
  });

  it.each([
    [{ kind: "and", conditions: [] }],
    [{ kind: "unknown", parameterId: "quantity", value: 0 }],
    [{ kind: "equals", parameterId: "missing_value" }],
    [{ kind: "literal", value: "true" }],
    [{ kind: "parameter" }],
  ])("fails closed for malformed or unsupported graphs %#", (ast) => {
    expect(() => evaluateInclusionGraph(ast, parameters)).toThrow(InclusionGraphEvaluationError);
  });

  it("routes the local HTTP runtime through the same shared fail-closed evaluator as the canonical worker", () => {
    const source = readFileSync("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts", "utf8");
    const compiler = readFileSync("src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts", "utf8");
    expect(source).toContain("compileCanonicalEstimateCore");
    expect(compiler).toContain('import { resolveInclusionGraph } from "./inclusionGraph"');
    expect(compiler).toContain("resolveInclusionGraph(resource.inclusion_ast, parameters)");
    expect(source).not.toContain("function evaluateCondition(");
  });
});
