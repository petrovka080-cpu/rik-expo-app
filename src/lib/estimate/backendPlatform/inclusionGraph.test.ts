import { evaluateInclusionGraph, resolveInclusionGraph } from "./inclusionGraph";

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
