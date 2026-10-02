import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../../src/lib/estimate/backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { parseCanonicalFormulaOutputBoundsV1, validateCanonicalFormulaOutputBoundsV1 } from "../../src/lib/estimate/backendPlatform/canonicalFormulaOutputBounds";

const bounds = {
  schemaVersion: "canonical_formula_output_bounds_v1", unitId: "mm",
  exclusiveMinimum: 15,
  reasonRu: "Разность диаметров футляра и выбранных опор RACI должна быть больше 15 мм.",
};

function fixture(policy: unknown = bounds): CanonicalEstimateCompileCoreInput {
  const formula = compileFormulaGraph("casing_id_mm-carrier_od_mm-2*element_height_mm");
  return {
    operation: "compile", compilerVersion: "output-bounds-test", catalogId: "test-owned-casing",
    primaryMeasureParameterId: "casing_id_mm",
    parameterDefinitions: [...["casing_id_mm", "carrier_od_mm", "element_height_mm"].map(id => ({
      parameter_id: id, value_type: "decimal", required: false, default_value: null, constraints_json: { min: 0 },
    })), {
      parameter_id: "enabled", value_type: "enum", required: false, default_value: null,
      constraints_json: { values: ["REQUIRED", "NOT_REQUIRED"] },
    }],
    formulaDefinitions: [{ formula_id: "clearance", output_unit_id: "mm", expression_source: formula.source,
      ast: formula.ast, input_parameter_ids: formula.inputParameterIds, ast_sha256: "test-formula-sha" }],
    resourceDefinitions: [{
      id: "test-resource", row_id: "test:clearance", ordinal: 0, section: "Контроль", category: "service",
      title_ru: "Разность диаметров футляра и опор", unit_id: "mm", formula_id: "clearance",
      inclusion_ast: { kind: "equals", parameterId: "enabled", value: "REQUIRED" },
      resource_graph: { costTreatment: "INFORMATIONAL_SCOPE", formulaOutputBoundsV1: policy },
      procurement_eligible: false, cost_owner_id: "test:clearance",
      source_metadata: { normativeTrace: [{ sourceId: "raci-selection-test" }] }, row_sha256: "test-resource-sha",
    }],
    submittedParameters: { casing_id_mm: 510, carrier_od_mm: 160, element_height_mm: 100, enabled: "REQUIRED" },
    confirmedParameters: {}, currencyCode: "KGS", priceItems: [], maximumResourceRows: 2,
    hashJson: value => estimateDeterministicHash(value),
  };
}

const manual = { quantity: "999", provenance: { kind: "manual", reason: "test-owned correction" } };

describe("authoritative formula output bounds", () => {
  it("checks the common evaluator's output and records the passing constraint, not an applied manual quantity", async () => {
    const result = await compileCanonicalEstimateCore({ ...fixture(), operation: "recalculate", rowOverrides: { "test:clearance": manual } });
    expect(result.rows[0]).toMatchObject({ quantity: "999", included_in_estimate: false, included_in_procurement: false });
    expect(result.rows[0]?.calculation_trace).toMatchObject({
      manualQuantityOverride: true, calculatedQuantityBeforeOverride: "150",
      formulaOutputBounds: { status: "PASSED", formulaQuantity: "150", unitId: "mm" },
    });
    expect(result.totals.amount).toBe("0");
  });

  it.each([15, 14.999, 0, -1])("rejects an insufficient actual clearance %s rather than clamping it", async actual => {
    const input = fixture();
    input.submittedParameters.element_height_mm = (350 - actual) / 2;
    await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });

  it("does not bypass an active geometry constraint with a manual value or row-cost exclusion", async () => {
    const input = fixture();
    input.operation = "recalculate";
    input.submittedParameters.element_height_mm = 167.5;
    input.rowOverrides = { "test:clearance": { ...manual, includedInEstimate: false } };
    await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });

  it("keeps missing geometry local and explicit even when an editable row has a manual quantity", async () => {
    const input = fixture();
    delete input.submittedParameters.element_height_mm;
    input.operation = "recalculate";
    input.rowOverrides = { "test:clearance": manual };
    const result = await compileCanonicalEstimateCore(input);
    expect(result.rows).toHaveLength(0);
    expect(result.preliminaryNeeds).toHaveLength(1);
    expect(result.preliminaryNeeds[0]).toMatchObject({
      quantity: "999", need_state: "QUANTITY_REQUIRED", missing_parameter_ids: ["element_height_mm"],
      calculation_trace: { manualQuantityOverride: true, calculatedQuantityBeforeOverride: null },
    });
  });

  it("does not evaluate or charge a genuinely disabled branch", async () => {
    const input = fixture();
    input.submittedParameters.enabled = "NOT_REQUIRED";
    input.submittedParameters.element_height_mm = 500;
    input.operation = "recalculate";
    input.rowOverrides = { "test:clearance": manual };
    const result = await compileCanonicalEstimateCore(input);
    expect(result.rows).toHaveLength(0);
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(result.totals).toMatchObject({ amount: "0", includedRowCount: 0, unpricedRowCount: 0 });
  });

  it("does not pretend an unknown branch condition is resolved by a manual control quantity", async () => {
    const input = fixture();
    delete input.submittedParameters.enabled;
    input.operation = "recalculate";
    input.rowOverrides = { "test:clearance": manual };
    const result = await compileCanonicalEstimateCore(input);
    expect(result.rows).toHaveLength(0);
    expect(result.preliminaryNeeds[0]).toMatchObject({ need_state: "CONDITION_REQUIRED", missing_parameter_ids: ["enabled"] });
    expect(result.preliminaryNeeds[0]?.calculation_trace).not.toHaveProperty("formulaOutputBounds");
  });

  it("uses fixed-decimal comparison beyond Number's integer precision", () => {
    const policy = parseCanonicalFormulaOutputBoundsV1({ ...bounds, exclusiveMinimum: 10_000_000_000_000_000 }, "mm", "mm", "large-control")!;
    expect(validateCanonicalFormulaOutputBoundsV1(policy, "10000000000000000.000000001", "large-control")).toMatchObject({ status: "PASSED" });
    expect(() => validateCanonicalFormulaOutputBoundsV1(policy, "10000000000000000", "large-control")).toThrow();
    expect(() => validateCanonicalFormulaOutputBoundsV1(policy, "9999999999999999.999999999", "large-control")).toThrow();
  });

  it.each([
    { minimum: 150, accepted: true }, { minimum: 151, accepted: false },
    { maximum: 150, accepted: true }, { maximum: 149, accepted: false },
    { exclusiveMinimum: 150, accepted: false }, { exclusiveMinimum: 149, accepted: true },
    { exclusiveMaximum: 150, accepted: false }, { exclusiveMaximum: 151, accepted: true },
  ])("honors inclusive and exclusive bounds: %j", async ({ accepted, ...limit }) => {
    const input = fixture({ schemaVersion: bounds.schemaVersion, unitId: "mm", reasonRu: bounds.reasonRu, ...limit });
    if (accepted) expect((await compileCanonicalEstimateCore(input)).rows[0]?.quantity).toBe("150");
    else await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });

  it.each([
    [], null, { ...bounds, schemaVersion: "unsupported" }, { ...bounds, unitId: "m" },
    { ...bounds, exclusiveMinimum: "15" }, { ...bounds, exclusiveMinimum: Number.NaN },
    { ...bounds, exclusiveMinimum: Number.POSITIVE_INFINITY }, { ...bounds, minimum: 20, maximum: 10 },
    { ...bounds, exclusiveMinimum: 0.0000000001 }, { ...bounds, exclusiveMinimum: 1e100 },
    { ...bounds, exclusiveMinimum: 15, maximum: 15 }, { ...bounds, reasonRu: "" },
    { schemaVersion: bounds.schemaVersion, unitId: "mm", reasonRu: bounds.reasonRu },
    { ...bounds, typoMinimum: 15 },
  ])("rejects malformed bounds before use even in an inactive branch: %j", async policy => {
    const input = fixture(policy);
    input.submittedParameters.enabled = "NOT_REQUIRED";
    await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({ code: "DEFINITION_INTEGRITY_FAILED" });
  });

  it("rejects a mismatched formula output unit rather than comparing metres as millimetres", async () => {
    const input = fixture();
    input.formulaDefinitions[0]!.output_unit_id = "m";
    await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({ code: "DEFINITION_INTEGRITY_FAILED" });
  });

  it("retains the legacy manual-quantity path for rows without an authored output constraint", async () => {
    const input = fixture(undefined);
    delete input.resourceDefinitions[0]!.resource_graph.formulaOutputBoundsV1;
    delete input.submittedParameters.element_height_mm;
    input.operation = "recalculate";
    input.rowOverrides = { "test:clearance": manual };
    const result = await compileCanonicalEstimateCore(input);
    expect(result.rows[0]).toMatchObject({ quantity: "999", calculation_trace: { manualQuantityOverride: true, calculatedQuantityBeforeOverride: null } });
    expect(result.preliminaryNeeds).toHaveLength(0);
  });
});
