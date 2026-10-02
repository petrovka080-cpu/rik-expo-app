import { compileFormulaGraph } from
  "../../src/lib/estimate/backendPlatform/formulaGraph";
import { validateMasterFormulaGraphConsistency } from
  "../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1";

function formula(expressionSource: string) {
  const compiled = compileFormulaGraph(expressionSource);
  return {
    formula_id: "test:formula",
    expression_source: expressionSource,
    ast: compiled.ast,
    input_parameter_ids: [...compiled.inputParameterIds],
  };
}

describe("MASTER successor formula consistency gate", () => {
  it("accepts an AST and dependency list compiled from the stored expression", () => {
    expect(validateMasterFormulaGraphConsistency([
      formula("area_m2*layer_thickness_mm/1000"),
    ])).toEqual([]);
  });

  it("rejects stale AST and dependencies before any successor write", () => {
    const stale = formula("area_m2*0.05");

    expect(validateMasterFormulaGraphConsistency([{
      ...stale,
      expression_source: "area_m2*layer_thickness_mm/1000",
    }])).toEqual([
      "test:formula:AST_EXPRESSION_DRIFT",
      "test:formula:INPUT_PARAMETER_DRIFT",
    ]);
  });
});
