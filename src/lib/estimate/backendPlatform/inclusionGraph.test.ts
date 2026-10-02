import { evaluateInclusionGraph, resolveInclusionGraph, InclusionGraphEvaluationError } from "./inclusionGraph";

describe("inclusionGraph present", () => {
  it("gates formulas until their explicit input exists without treating zero as missing", () => {
    const ast = { kind: "present", parameterId: "confirmed_trip_count" };
    expect(evaluateInclusionGraph(ast, {})).toBe(false);
    expect(evaluateInclusionGraph(ast, { confirmed_trip_count: null })).toBe(false);
    expect(evaluateInclusionGraph(ast, { confirmed_trip_count: "" })).toBe(false);
    expect(evaluateInclusionGraph(ast, { confirmed_trip_count: 0 })).toBe(true);
  });

  it("preserves an undecided branch and names the missing parameter", () => {
    expect(resolveInclusionGraph({ kind: "equals", parameterId: "needs_access", value: true }, {}))
      .toEqual({ value: null, missingParameterIds: ["needs_access"] });
    expect(resolveInclusionGraph(
      { kind: "in", parameterId: "crane_mode", values: ["RENTAL_SEPARATE"] },
      { crane_mode: undefined },
    )).toEqual({ value: null, missingParameterIds: ["crane_mode"] });
    expect(resolveInclusionGraph(
      { kind: "parameter", id: "wall_connectors_applicable" },
      { wall_connectors_applicable: undefined },
    )).toEqual({ value: null, missingParameterIds: ["wall_connectors_applicable"] });
    expect(resolveInclusionGraph({
      kind: "and",
      operands: [
        { kind: "literal", value: true },
        { kind: "present", parameterId: "waste_mass_kg" },
      ],
    }, {})).toEqual({ value: null, missingParameterIds: ["waste_mass_kg"] });
  });
});

describe("inclusionGraph numeric peer input", () => {
  const ast = { kind: "greater_than", parameterId: "length_m", valueParameterId: "physical_section_length_m" };
  it.each([[12, 12, false], [12.001, 12, true], [11, 12, false], [0, 0, false]])("compares %s to actual peer %s without a manually calculated flag", (left, right, expected) => {
    expect(resolveInclusionGraph(ast, { length_m: left, physical_section_length_m: right })).toEqual({ value: expected, missingParameterIds: [] });
  });
  it("keeps either or both missing inputs undecided rather than excluding the work", () => {
    expect(resolveInclusionGraph(ast, {})).toEqual({ value: null, missingParameterIds: ["length_m", "physical_section_length_m"] });
    expect(resolveInclusionGraph(ast, { length_m: 0 })).toEqual({ value: null, missingParameterIds: ["physical_section_length_m"] });
    expect(resolveInclusionGraph(ast, { physical_section_length_m: 0 })).toEqual({ value: null, missingParameterIds: ["length_m"] });
  });
  it.each([
    { kind: "greater_than_or_equal", left: 12, right: 12, result: true },
    { kind: "less_than", left: 11, right: 12, result: true },
    { kind: "less_than_or_equal", left: 13, right: 12, result: false },
  ])("supports the existing numeric comparison %s with a peer", ({ kind, left, right, result }) => {
    expect(evaluateInclusionGraph({ ...ast, kind }, { length_m: String(left), physical_section_length_m: String(right) })).toBe(result);
  });
  it.each([
    { ...ast, value: 12 }, { ...ast, valueParameterId: "" }, { ...ast, valueParameterId: null },
    { ...ast, kind: "equals", value: 12 },
  ])("rejects ambiguous or unsupported peer operand metadata: %j", invalid => {
    expect(() => resolveInclusionGraph(invalid, {})).toThrow(InclusionGraphEvaluationError);
  });
  it.each([NaN, Infinity, true, "invalid"])("rejects invalid peer values: %s", value => {
    expect(() => resolveInclusionGraph(ast, { length_m: 12, physical_section_length_m: value })).toThrow(InclusionGraphEvaluationError);
  });
  it("retains existing literal comparison semantics", () => {
    expect(resolveInclusionGraph({ kind: "greater_than", parameterId: "length_m", value: 0 }, { length_m: 12 })).toEqual({ value: true, missingParameterIds: [] });
  });
});
