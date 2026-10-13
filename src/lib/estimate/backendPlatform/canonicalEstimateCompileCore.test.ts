import { createHash } from "node:crypto";

import {
  bindCanonicalEstimateResourcePriceKeys,
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreInput,
} from "./canonicalEstimateCompileCore";
import { assertCreateRequest } from "./contracts";
import { compileFormulaGraph } from "./formulaGraph";

function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function hash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function baseInput(): CanonicalEstimateCompileCoreInput {
  return {
    operation: "compile",
    compilerVersion: "canonical-test.r1",
    catalogId: "test_catalog",
    primaryMeasureParameterId: "area_m2",
    parameterDefinitions: [{
      parameter_id: "area_m2",
      value_type: "number",
      required: true,
      default_value: null,
      constraints_json: { min: 0 },
    }],
    formulaDefinitions: [{
      formula_id: "material_quantity",
      ast: {
        kind: "binary",
        operator: "*",
        left: { kind: "parameter", id: "area_m2" },
        right: { kind: "literal", value: "1.1" },
      },
      input_parameter_ids: ["area_m2"],
      ast_sha256: "formula-ast-sha",
    }],
    resourceDefinitions: [{
      id: "resource-spec-1",
      row_id: "material:board",
      ordinal: 0,
      section: "materials",
      category: "material",
      title_ru: "Листовой материал",
      unit_id: "m2",
      formula_id: "material_quantity",
      inclusion_ast: { kind: "literal", value: true },
      resource_graph: {},
      procurement_eligible: true,
      cost_owner_id: "price:board",
      source_metadata: { normativeTrace: [{ sourceId: "norm-1" }] },
      row_sha256: "source-row-sha",
    }],
    submittedParameters: { area_m2: 10 },
    confirmedParameters: {},
    currencyCode: "KGS",
    priceSnapshotIds: ["snapshot-1"],
    priceItems: [{
      price_key: "price:board",
      unit_id: "m2",
      currency_code: "KGS",
      unit_price: "125.50",
      snapshot_id: "snapshot-1",
      estimate_price_snapshot: { route_id: "route-1" },
    }],
    maximumResourceRows: 2_000,
    hashJson: hash,
  };
}

function numericPeerInput(): CanonicalEstimateCompileCoreInput {
  const input = baseInput();
  input.parameterDefinitions.push(
    { parameter_id: "measured_scope_m2", value_type: "decimal", required: true, default_value: null,
      constraints_json: { min: 0, equalToParameter: "approved_scope_m2" } },
    { parameter_id: "approved_scope_m2", value_type: "decimal", required: false, default_value: null, constraints_json: { min: 0 } },
  );
  input.formulaDefinitions.push({ formula_id: "scope_quantity", ast: { kind: "parameter", id: "measured_scope_m2" },
    input_parameter_ids: ["measured_scope_m2"], ast_sha256: "scope-formula-sha" });
  input.resourceDefinitions.push({ ...input.resourceDefinitions[0]!, id: "resource-spec-scope", row_id: "material:scope",
    ordinal: 1, formula_id: "scope_quantity" });
  input.submittedParameters = { area_m2: 10, measured_scope_m2: 60 };
  return input;
}

describe("purchase consumption requires its original quantity facts", () => {
  it("retains a known manual supply as a local need while legacy manual rows and independent resources continue", async () => {
    const input = baseInput();
    input.parameterDefinitions.push({ parameter_id: "required_m2", value_type: "decimal", required: false, default_value: null, constraints_json: { min: 0.001 } });
    const graph = compileFormulaGraph("required_m2");
    input.formulaDefinitions.push({ formula_id: "required_quantity", ast: graph.ast, input_parameter_ids: graph.inputParameterIds, ast_sha256: hash(graph.ast) });
    const ordinary = { ...input.resourceDefinitions[0]!, id: "ordinary-spec", row_id: "material:ordinary-manual", ordinal: 1, formula_id: "required_quantity" };
    input.resourceDefinitions.push(ordinary, { ...ordinary, id: "balanced-spec", row_id: "material:balanced-manual", ordinal: 2,
      resource_graph: { purchaseBalanceV1: { quantityMode: "canonical_decimal", balanceScope: "new_order_vs_required_consumption", unitId: "m2",
        consumedExpression: "required_m2", stockExpression: "0", reserveExpression: "0" } } });
    const amendment = { quantity: "18", unitPrice: "2", includedInProcurement: true, provenance: { kind: "manual", reason: "VALIDATION_FIXTURE accepted supply" } };
    input.operation = "recalculate";
    input.rowOverrides = { "material:ordinary-manual": amendment, "material:balanced-manual": amendment };
    const missing = await compileCanonicalEstimateCore(input);
    expect(missing.rows.map(value => value.row_id)).toEqual(["material:board", "material:ordinary-manual"]);
    expect(missing.preliminaryNeeds).toHaveLength(1);
    expect(missing.preliminaryNeeds[0]).toMatchObject({ row_id: "material:balanced-manual", quantity: "18", unit_price: "2",
      need_state: "QUANTITY_REQUIRED", missing_parameter_ids: ["required_m2"], calculation_trace: {
        manualQuantityOverride: true, calculatedQuantityBeforeOverride: null, manualAmendment: amendment.provenance } });
    const resolved = await compileCanonicalEstimateCore({ ...input, submittedParameters: { area_m2: 10, required_m2: 20 } });
    expect(resolved.preliminaryNeeds).toEqual([]);
    expect(resolved.rows.find(value => value.row_id === "material:balanced-manual")).toMatchObject({ quantity: "18", included_in_procurement: false,
      calculation_trace: { purchaseBalance: { consumed: "20", consumptionShortage: "2", procurementReady: false } } });
    await expect(compileCanonicalEstimateCore({ ...input, submittedParameters: { area_m2: 10, required_m2: 0 } })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
});

describe("localized unresolved numeric compatibility", () => {
  it("retains independent paid rows and one visible condition need with its known quantity", async () => {
    const input = numericPeerInput();
    const result = await compileCanonicalEstimateCore(input);
    expect(result.rows.map(row => row.row_id)).toEqual(["material:board"]);
    expect(result.totals.amount).toBe("1380.5");
    expect(result.preliminaryNeeds).toHaveLength(1);
    expect(result.preliminaryNeeds[0]).toMatchObject({ row_id: "material:scope", quantity: "60", selected: true,
      need_state: "CONDITION_REQUIRED", missing_parameter_ids: ["approved_scope_m2"] });
    expect(result.parameters).not.toHaveProperty("approved_scope_m2");
    expect((await compileCanonicalEstimateCore(input)).revisionProjection).toEqual(result.revisionProjection);
  });

  it("keeps manual quantity, price and procurement selection behind the original compatibility evidence", async () => {
    const input = numericPeerInput();
    input.operation = "recalculate";
    input.rowOverrides = { "material:scope": { quantity: 75, unitPrice: 2, includedInEstimate: true,
      includedInProcurement: true, provenance: { kind: "manual", reason: "quantity_from_schedule" } } };
    const unresolved = await compileCanonicalEstimateCore(input);
    expect(unresolved.rows.map(row => row.row_id)).toEqual(["material:board"]);
    expect(unresolved.preliminaryNeeds[0]).toMatchObject({ quantity: "75", unit_price: "2", need_state: "CONDITION_REQUIRED",
      missing_parameter_ids: ["approved_scope_m2"], calculation_trace: { manualQuantityOverride: true } });
    const resolved = await compileCanonicalEstimateCore({ ...input, submittedParameters: { ...input.submittedParameters, approved_scope_m2: 60 } });
    expect(resolved.preliminaryNeeds).toEqual([]);
    expect(resolved.rows.find(row => row.row_id === "material:scope")).toMatchObject({ quantity: "75", unit_price: "2",
      amount: "150", included_in_procurement: true });
    await expect(compileCanonicalEstimateCore({ ...input, submittedParameters: { ...input.submittedParameters, approved_scope_m2: 50 } }))
      .rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    const reset = await compileCanonicalEstimateCore({ ...input, rowOverrides: {},
      submittedParameters: { ...input.submittedParameters, approved_scope_m2: 60 } });
    expect(reset.rows.find(row => row.row_id === "material:scope")?.quantity).toBe("60");
  });

  it("follows chained constraints and terminates on cycles without gating independent rows", async () => {
    const input = numericPeerInput();
    input.parameterDefinitions[2]!.constraints_json = { equalToParameter: "verified_scope_m2" };
    input.parameterDefinitions.push({ parameter_id: "verified_scope_m2", value_type: "decimal", required: false,
      default_value: null, constraints_json: { equalToParameter: "measured_scope_m2" } });
    input.submittedParameters.approved_scope_m2 = 60;
    const unknown = await compileCanonicalEstimateCore(input);
    expect(unknown.preliminaryNeeds[0]?.missing_parameter_ids).toEqual(["verified_scope_m2"]);
    expect(unknown.rows.map(row => row.row_id)).toEqual(["material:board"]);
    const resolved = await compileCanonicalEstimateCore({ ...input, submittedParameters: { ...input.submittedParameters, verified_scope_m2: 60 } });
    expect(resolved.preliminaryNeeds).toEqual([]);
    expect(resolved.rows).toHaveLength(2);
  });

  it("requires both original operands when a manual quantity replaces the missing constrained operand", async () => {
    const input = numericPeerInput();
    delete input.submittedParameters.measured_scope_m2;
    input.submittedParameters.approved_scope_m2 = 60;
    input.operation = "recalculate";
    input.rowOverrides = { "material:scope": { quantity: 75, provenance: { kind: "manual" } } };
    const result = await compileCanonicalEstimateCore(input);
    expect(result.preliminaryNeeds[0]).toMatchObject({ quantity: "75", need_state: "CONDITION_REQUIRED",
      missing_parameter_ids: ["measured_scope_m2"] });
    expect(result.rows).toHaveLength(1);
  });

  it.each(["inclusion", "resource"])("checks compatibility evidence consumed by the %s graph even outside quantity formulas", async consumer => {
    const input = numericPeerInput();
    input.resourceDefinitions[1]!.formula_id = "material_quantity";
    if (consumer === "inclusion") input.resourceDefinitions[1]!.inclusion_ast = { kind: "present", parameterId: "measured_scope_m2" };
    else input.resourceDefinitions[1]!.resource_graph = { inputParameterIds: ["measured_scope_m2"] };
    const result = await compileCanonicalEstimateCore(input);
    expect(result.preliminaryNeeds[0]?.missing_parameter_ids).toEqual(["approved_scope_m2"]);
    expect(result.rows).toHaveLength(1);
  });

  it("does not revive a disabled branch or demand unused evidence from an OR alternative", async () => {
    const input = numericPeerInput();
    input.resourceDefinitions[1]!.inclusion_ast = { kind: "literal", value: false };
    expect((await compileCanonicalEstimateCore(input)).preliminaryNeeds).toEqual([]);
    input.resourceDefinitions[1]!.formula_id = "material_quantity";
    input.resourceDefinitions[1]!.inclusion_ast = { kind: "or", operands: [
      { kind: "present", parameterId: "measured_scope_m2" }, { kind: "literal", value: true },
    ] };
    // A known true alternative needs no measured-scope compatibility evidence.
    for (const measured of [undefined, 60]) {
      input.submittedParameters.measured_scope_m2 = measured;
      const result = await compileCanonicalEstimateCore(input);
      expect(result.preliminaryNeeds).toEqual([]);
      expect(result.rows).toHaveLength(2);
    }
  });

  it("accepts compatible zero facts without converting them to missing inputs", async () => {
    const input = numericPeerInput();
    input.submittedParameters.measured_scope_m2 = 0;
    input.submittedParameters.approved_scope_m2 = 0;
    const result = await compileCanonicalEstimateCore(input);
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.find(row => row.row_id === "material:scope")?.quantity).toBe("0");
  });
});

describe("canonicalEstimateCompileCore", () => {
  const nonPayableTreatments = ["INCLUDED_IN_RESOURCE_ROWS", "INFORMATIONAL_SCOPE", "CONTROL_OR_DOCUMENT"];
  const costTreatmentCases = nonPayableTreatments.flatMap(costTreatment =>
    ["resource_graph", "source_metadata"].map(source => ({ costTreatment, source })));

  it.each(costTreatmentCases)("enforces $costTreatment from $source while retaining all manual edits", async ({ costTreatment, source }) => {
    const input = baseInput();
    input.operation = "recalculate";
    input.resourceDefinitions.push({ ...input.resourceDefinitions[0]!, id: "resource-spec-info", row_id: "material:info", ordinal: 1,
      resource_graph: { costTreatment: source === "resource_graph" ? costTreatment : null },
      source_metadata: { costTreatment: source === "source_metadata" ? costTreatment : "OWN_COST" } });
    input.rowOverrides = {
      "material:board": { quantity: "12", unitPrice: "10", provenance: { kind: "manual" } },
      "material:info": { titleRu: "Manual informational scope", quantity: "999", unitPrice: "100",
        includedInEstimate: true, includedInProcurement: true, provenance: { kind: "manual", reason: "explicit_request" } },
    };
    const result = await compileCanonicalEstimateCore(input);
    expect(result.rows[1]).toMatchObject({ title_ru: "Manual informational scope", quantity: "999", unit_price: "100", amount: "99900",
      included_in_estimate: false, included_in_procurement: false, ownership_status: "OWNED_EXCLUDED",
      calculation_trace: { manualAmendment: { kind: "manual", reason: "explicit_request" }, manualQuantityOverride: true,
        inclusionDecision: { source: "definition_cost_treatment", costTreatment, costTreatmentSource: source,
          requestedIncludedInEstimate: true, requestedIncludedInProcurement: true,
          effectiveIncludedInEstimate: false, effectiveIncludedInProcurement: false } } });
    expect(result.rows[0]).toMatchObject({ quantity: "12", unit_price: "10", included_in_estimate: true });
    expect(result.totals).toMatchObject({ amount: "120", includedRowCount: 1, excludedRowCount: 1 });
    expect((await compileCanonicalEstimateCore(input)).revisionProjection).toEqual(result.revisionProjection);
  });

  it.each(costTreatmentCases)("keeps unresolved $costTreatment from $source unselected despite explicit inclusion", async ({ costTreatment, source }) => {
    const input = numericPeerInput();
    input.operation = "recalculate";
    input.resourceDefinitions[1]!.resource_graph = { costTreatment: source === "resource_graph" ? costTreatment : null };
    input.resourceDefinitions[1]!.source_metadata = { costTreatment: source === "source_metadata" ? costTreatment : "OWN_COST" };
    const defaultNeed = await compileCanonicalEstimateCore(input);
    expect(defaultNeed.preliminaryNeeds[0]).toMatchObject({ selected: false,
      calculation_trace: { inclusionDecision: { requestedIncludedInEstimate: null, requestedIncludedInProcurement: null } } });
    input.rowOverrides = { "material:scope": { quantity: "75", unitPrice: "2", includedInEstimate: true,
      includedInProcurement: true, provenance: { kind: "manual" } } };
    const unresolved = await compileCanonicalEstimateCore(input);
    expect(unresolved.preliminaryNeeds[0]).toMatchObject({ quantity: "75", unit_price: "2", selected: false,
      need_state: "CONDITION_REQUIRED", missing_parameter_ids: ["approved_scope_m2"],
      calculation_trace: { inclusionDecision: { costTreatment, costTreatmentSource: source,
        requestedIncludedInEstimate: true, requestedIncludedInProcurement: true,
        effectiveIncludedInEstimate: false, effectiveIncludedInProcurement: false } } });
    const resolved = await compileCanonicalEstimateCore({ ...input,
      submittedParameters: { ...input.submittedParameters, approved_scope_m2: 60 } });
    expect(resolved.preliminaryNeeds).toEqual([]);
    expect(resolved.rows[1]).toMatchObject({ quantity: "75", unit_price: "2", amount: "150",
      included_in_estimate: false, included_in_procurement: false });
    expect(resolved.totals.amount).toBe(unresolved.totals.amount);
  });

  it("retains non-payable quantity and price amendments without an inclusion request", async () => {
    const input = baseInput();
    input.operation = "recalculate";
    input.resourceDefinitions[0]!.resource_graph = { costTreatment: "INFORMATIONAL_SCOPE" };
    input.rowOverrides = { "material:board": { quantity: "12", unitPrice: "10", provenance: { kind: "manual" } } };
    const result = await compileCanonicalEstimateCore(input);
    expect(result.rows[0]).toMatchObject({ quantity: "12", unit_price: "10", amount: "120",
      included_in_estimate: false, included_in_procurement: false,
      calculation_trace: { inclusionDecision: { requestedIncludedInEstimate: null, requestedIncludedInProcurement: null } } });
    expect(result.totals.amount).toBe("0");
  });

  it.each(["includedInEstimate", "includedInProcurement"])("rejects malformed %s even for a non-payable resource", async field => {
    const input = baseInput();
    input.operation = "recalculate";
    input.resourceDefinitions[0]!.resource_graph = { costTreatment: "CONTROL_OR_DOCUMENT" };
    input.rowOverrides = { "material:board": { [field]: "true", provenance: { kind: "manual" } } };
    await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
  });

  it.each(["OWN_COST", undefined])("preserves inclusion and optional material exclusion for payable treatment %s", async costTreatment => {
    const input = baseInput();
    input.operation = "recalculate";
    input.resourceDefinitions[0]!.resource_graph = { costTreatment };
    const provenance = { kind: "manual" };
    const included = await compileCanonicalEstimateCore({ ...input, rowOverrides: {
      "material:board": { quantity: "12", unitPrice: "10", includedInEstimate: true, includedInProcurement: true, provenance },
    } });
    expect(included.rows[0]).toMatchObject({ included_in_estimate: true, included_in_procurement: true });
    expect(included.totals.amount).toBe("120");
    expect(included.rows[0]!.calculation_trace).not.toHaveProperty("inclusionDecision");
    const excluded = await compileCanonicalEstimateCore({ ...input, rowOverrides: {
      "material:board": { quantity: "12", unitPrice: "10", includedInEstimate: false, includedInProcurement: false, provenance },
    } });
    expect(excluded.rows[0]).toMatchObject({ quantity: "12", unit_price: "10", amount: "120",
      included_in_estimate: false, included_in_procurement: false });
    expect(excluded.totals.amount).toBe("0");
  });

  it("accepts an explicit null quantity only as an unresolved row amendment value", () => {
    expect(() => assertCreateRequest({
      idempotencyKey: "manual-row-clear",
      catalogId: "catalog-1",
      parameters: {},
      currencyCode: "KGS",
      rowOverrides: {
        "manual:catalog-row": {
          quantity: null,
          provenance: { kind: "manual", reason: "quantity_cleared_by_user" },
        },
      },
    })).not.toThrow();
    expect(() => assertCreateRequest({
      idempotencyKey: "manual-row-negative",
      catalogId: "catalog-1",
      parameters: {},
      currencyCode: "KGS",
      rowOverrides: {
        "manual:catalog-row": {
          quantity: -1,
          provenance: { kind: "manual" },
        },
      },
    })).toThrow(/quantity is invalid/u);
  });
  it("uses one normalized route binding when a legacy resource has no explicit cost owner", async () => {
    const input = baseInput();
    input.resourceDefinitions = bindCanonicalEstimateResourcePriceKeys(
      input.resourceDefinitions.map((resource) => ({ ...resource, cost_owner_id: null })),
      [{ resource_spec_id: "resource-spec-1", price_key: "price:board" }],
    );

    const result = await compileCanonicalEstimateCore(input);
    expect(result.rows[0]).toMatchObject({
      unit_price: "125.50",
      amount: "1380.5",
      price_resolution_trace: { priceKey: "price:board", resolved: true },
    });
  });

  it("rejects ambiguous route price keys when a resource has no explicit cost owner", () => {
    const resources = baseInput().resourceDefinitions.map((resource) => ({ ...resource, cost_owner_id: null }));
    expect(() => bindCanonicalEstimateResourcePriceKeys(resources, [
      { resource_spec_id: "resource-spec-1", price_key: "price:board:first" },
      { resource_spec_id: "resource-spec-1", price_key: "price:board:second" },
    ])).toThrow(expect.objectContaining({ code: "DEFINITION_INTEGRITY_FAILED" }));
  });

  it("fails closed when the primary project measure is disconnected from every quantity formula", async () => {
    const input = baseInput();
    input.formulaDefinitions = [{
      formula_id: "material_quantity",
      ast: { kind: "literal", value: "11" },
      input_parameter_ids: [],
      ast_sha256: "literal-formula-ast-sha",
    }];

    await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({
      code: "PRIMARY_MEASURE_FORMULA_DEPENDENCY_MISSING",
    });
  });

  it("fails closed when any computational source formula was frozen as a literal", async () => {
    const input = baseInput();
    input.formulaDefinitions.push({
      formula_id: "insulation_quantity",
      ast: { kind: "literal", value: "40" },
      input_parameter_ids: [],
      ast_sha256: "frozen-insulation-formula-sha",
    });
    input.resourceDefinitions.push({
      ...input.resourceDefinitions[0]!,
      id: "resource-spec-2",
      row_id: "material:insulation",
      ordinal: 1,
      formula_id: "insulation_quantity",
      source_metadata: { originalQuantityFormula: "roof_area_m2 * insulation_mm / 1000" },
    });

    await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({
      code: "FORMULA_PARAMETER_DEPENDENCY_MISSING",
    });
  });

  it("keeps a gabion condition and length dependency through compile, false and unresolved states", async () => {
    const compiled = compileFormulaGraph("is_gabion ? length_m : 0");
    const makeInput = (submittedParameters: Record<string, unknown>): CanonicalEstimateCompileCoreInput => ({
      ...baseInput(),
      primaryMeasureParameterId: "length_m",
      parameterDefinitions: [
        { parameter_id: "length_m", value_type: "decimal", required: true, default_value: null, constraints_json: { min: 0 } },
        {
          parameter_id: "is_gabion",
          value_type: "boolean",
          required: false,
          default_value: null,
          constraints_json: {},
          truth_metadata: { preliminary_compilation_allowed: true },
        },
      ],
      formulaDefinitions: [{
        formula_id: "gabion_drainage_pipe",
        ast: compiled.ast,
        input_parameter_ids: compiled.inputParameterIds,
        ast_sha256: "gabion-conditional-ast-sha",
      }],
      resourceDefinitions: [{
        ...baseInput().resourceDefinitions[0]!,
        formula_id: "gabion_drainage_pipe",
        row_id: "gabion_drainage_pipe_lm",
        source_metadata: { originalQuantityFormula: "is_gabion ? length_m : 0" },
      }],
      submittedParameters,
      priceItems: [],
    });

    const true150 = await compileCanonicalEstimateCore(makeInput({ is_gabion: true, length_m: 150 }));
    const true100 = await compileCanonicalEstimateCore(makeInput({ is_gabion: true, length_m: 100 }));
    const falseResult = await compileCanonicalEstimateCore(makeInput({ is_gabion: false, length_m: 150 }));
    const unknown = await compileCanonicalEstimateCore(makeInput({ length_m: 150 }));

    expect(true150.rows[0]?.quantity).toBe("150");
    expect(true100.rows[0]?.quantity).toBe("100");
    expect(falseResult.rows[0]?.quantity).toBe("0");
    expect(unknown.rows).toEqual([]);
    expect(unknown.preliminaryNeeds[0]).toMatchObject({
      row_id: "gabion_drainage_pipe_lm",
      need_state: "QUANTITY_REQUIRED",
      missing_parameter_ids: ["is_gabion"],
    });
  });

  it("rejects a loaded dependency list that omits a parameter retained by the serialized AST", async () => {
    const input = baseInput();
    input.formulaDefinitions[0] = {
      ...input.formulaDefinitions[0]!,
      input_parameter_ids: [],
    };
    await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({
      code: "FORMULA_PARAMETER_DEPENDENCY_MISMATCH",
    });
  });

  it("allows a fixed row only when its source explicitly states the numeric quantity", async () => {
    const input = baseInput();
    input.formulaDefinitions.push({
      formula_id: "handover_set",
      ast: { kind: "literal", value: "1" },
      input_parameter_ids: [],
      ast_sha256: "fixed-handover-formula-sha",
    });
    input.resourceDefinitions.push({
      ...input.resourceDefinitions[0]!,
      id: "resource-spec-2",
      row_id: "service:handover",
      ordinal: 1,
      formula_id: "handover_set",
      source_metadata: { originalQuantityFormula: "1 handover documentation set" },
    });

    const result = await compileCanonicalEstimateCore(input);
    expect(result.rows.map((row) => row.quantity)).toEqual(["11", "1"]);
  });

  it("allows an admitted minQty norm constant only when its runtime binding matches the formula", async () => {
    const input = baseInput();
    input.formulaDefinitions.push({
      formula_id: "overhead_quantity",
      ast: { kind: "literal", value: "1" },
      input_parameter_ids: [],
      ast_sha256: "fixed-overhead-formula-sha",
    });
    input.resourceDefinitions.push({
      ...input.resourceDefinitions[0]!,
      id: "resource-spec-2",
      row_id: "service:overhead",
      ordinal: 1,
      formula_id: "overhead_quantity",
      source_metadata: {
        originalQuantityFormula: "minQty",
        runtimeExpressionSource: "1",
      },
    });

    const result = await compileCanonicalEstimateCore(input);
    expect(result.rows.map((row) => row.quantity)).toEqual(["11", "1"]);
  });

  it("rejects minQty when its admitted runtime binding does not match the formula", async () => {
    const input = baseInput();
    input.formulaDefinitions.push({
      formula_id: "overhead_quantity",
      ast: { kind: "literal", value: "2" },
      input_parameter_ids: [],
      ast_sha256: "mismatched-overhead-formula-sha",
    });
    input.resourceDefinitions.push({
      ...input.resourceDefinitions[0]!,
      id: "resource-spec-2",
      row_id: "service:overhead",
      ordinal: 1,
      formula_id: "overhead_quantity",
      source_metadata: {
        originalQuantityFormula: "minQty",
        runtimeExpressionSource: "1",
      },
    });

    await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({
      code: "FORMULA_PARAMETER_DEPENDENCY_MISSING",
    });
  });

  it("produces the same canonical rows for sync Node and async edge hash adapters", async () => {
    const nodeResult = await compileCanonicalEstimateCore(baseInput());
    const edgeResult = await compileCanonicalEstimateCore({
      ...baseInput(),
      hashJson: async (value) => hash(value),
    });

    expect(edgeResult).toEqual(nodeResult);
    expect(nodeResult.rows).toHaveLength(1);
    expect(nodeResult.rows[0]).toMatchObject({
      row_id: "material:board",
      quantity: "11",
      unit_price: "125.50",
      amount: "1380.5",
      included_in_estimate: true,
      included_in_procurement: true,
      price_snapshot_id: "snapshot-1",
      price_route_id: "route-1",
    });
    expect(nodeResult.rows[0].row_sha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(nodeResult.totals).toEqual({
      amount: "1380.5",
      includedRowCount: 1,
      excludedRowCount: 0,
      pricedRowCount: 1,
      unpricedRowCount: 0,
      currencyCode: "KGS",
    });
  });

  it("owns row amendments and manual rows for every adapter", async () => {
    const result = await compileCanonicalEstimateCore({
      ...baseInput(),
      operation: "recalculate",
      rowOverrides: {
        "material:board": {
          quantity: "12",
          unitPrice: "100",
          includedInEstimate: true,
          includedInProcurement: true,
          provenance: { kind: "manual", reason: "  согласовано  " },
        },
      },
      customRows: [{
        clientRowId: "delivery-1",
        section: "logistics",
        category: "logistics",
        titleRu: "Доставка материалов",
        unitId: "trip",
        quantity: "1",
        unitPrice: "500",
        includedInEstimate: true,
        includedInProcurement: false,
        provenance: { kind: "manual", reason: "маршрут поставки" },
      }],
    });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      quantity: "12",
      unit_price: "100",
      amount: "1200",
      price_snapshot_id: null,
      price_resolution_trace: {
        kind: "manual_override",
        provenance: { kind: "manual", reason: "согласовано" },
        resolved: true,
      },
    });
    expect(result.rows[1]).toMatchObject({
      row_id: "manual:delivery-1",
      amount: "500",
      ownership_status: "MANUAL_SERVER_OWNED",
    });
    expect(result.totals.amount).toBe("1700");
  });

  it("keeps a newly selected catalog row preliminary until the user supplies quantity", async () => {
    const customRows = [{
      clientRowId: "catalog-primer-1",
      section: "Материалы",
      category: "material",
      titleRu: "Грунтовка из каталога",
      unitId: "kg",
      quantity: null,
      unitPrice: "250",
      includedInEstimate: true,
      includedInProcurement: true,
      provenance: { kind: "manual", reason: "catalog_add:primer-1:catalog" },
    }];
    const preliminary = await compileCanonicalEstimateCore({
      ...baseInput(),
      operation: "recalculate",
      customRows,
    });

    expect(preliminary.rows).toHaveLength(1);
    expect(preliminary.preliminaryNeeds).toHaveLength(1);
    expect(preliminary.preliminaryNeeds[0]).toMatchObject({
      row_id: "manual:catalog-primer-1",
      title_ru: "Грунтовка из каталога",
      quantity: null,
      unit_price: "250",
      need_state: "QUANTITY_REQUIRED",
      missing_parameter_ids: [],
      selected: true,
      procurement_eligible: true,
    });
    expect(preliminary.totals).toMatchObject({
      amount: "1380.5",
      includedRowCount: 1,
      pricedRowCount: 1,
    });

    const resolved = await compileCanonicalEstimateCore({
      ...baseInput(),
      operation: "recalculate",
      customRows,
      rowOverrides: {
        "manual:catalog-primer-1": {
          titleRu: "Грунтовка для контрольного проекта",
          quantity: "4.5",
          unitPrice: "300",
          includedInEstimate: true,
          includedInProcurement: true,
          provenance: { kind: "manual", reason: "quantity_confirmed_by_user" },
        },
      },
    });

    expect(resolved.preliminaryNeeds).toHaveLength(0);
    expect(resolved.rows).toHaveLength(2);
    expect(resolved.rows[1]).toMatchObject({
      row_id: "manual:catalog-primer-1",
      title_ru: "Грунтовка для контрольного проекта",
      quantity: "4.5",
      unit_price: "300",
      amount: "1350",
      included_in_estimate: true,
      included_in_procurement: true,
      ownership_status: "MANUAL_SERVER_OWNED",
    });
    expect(resolved.totals.amount).toBe("2730.5");

    const cleared = await compileCanonicalEstimateCore({
      ...baseInput(),
      operation: "recalculate",
      customRows,
      rowOverrides: {
        "manual:catalog-primer-1": {
          titleRu: "Грунтовка для контрольного проекта",
          quantity: null,
          unitPrice: "300",
          includedInEstimate: true,
          includedInProcurement: true,
          provenance: { kind: "manual", reason: "quantity_cleared_by_user" },
        },
      },
    });

    expect(cleared.rows.some((row) => row.row_id === "manual:catalog-primer-1")).toBe(false);
    expect(cleared.preliminaryNeeds).toHaveLength(1);
    expect(cleared.preliminaryNeeds[0]).toMatchObject({
      row_id: "manual:catalog-primer-1",
      title_ru: "Грунтовка для контрольного проекта",
      quantity: null,
      unit_price: "300",
      need_state: "QUANTITY_REQUIRED",
      category: "material",
    });
    expect(cleared.totals.amount).toBe("1380.5");
  });

  it.each([
    ["1", "1"],
    ["0", "0"],
    ["0.125", "0.125"],
  ])("preserves an explicitly entered manual quantity %s", async (quantity, expected) => {
    const result = await compileCanonicalEstimateCore({
      ...baseInput(),
      operation: "recalculate",
      customRows: [{
        clientRowId: `explicit-${quantity.replace(".", "-")}`,
        section: "Услуги",
        category: "service",
        titleRu: "Контрольная ручная услуга",
        unitId: "service",
        quantity,
        unitPrice: "10",
        includedInEstimate: true,
        includedInProcurement: false,
        provenance: { kind: "manual", reason: "explicit_quantity" },
      }],
    });
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(result.rows.at(-1)).toMatchObject({
      quantity: expected,
      procurement_eligible: false,
      included_in_procurement: false,
    });
  });

  it.each(["", "-1", "Infinity", "NaN", "1kg", "1..2"])(
    "rejects invalid manual quantity %p",
    async (quantity) => {
      await expect(compileCanonicalEstimateCore({
        ...baseInput(),
        operation: "recalculate",
        customRows: [{
          clientRowId: "invalid-quantity",
          section: "Материалы",
          category: "material",
          titleRu: "Контрольная позиция",
          unitId: "kg",
          quantity,
          unitPrice: null,
          includedInEstimate: true,
          includedInProcurement: true,
          provenance: { kind: "manual" },
        }],
      })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
    },
  );

  it("returns a definition-owned preliminary need instead of hiding or inventing its quantity", async () => {
    const input = baseInput();
    input.parameterDefinitions.push({
      parameter_id: "confirmed_waste_mass_kg",
      value_type: "number",
      required: true,
      default_value: null,
      constraints_json: { min: 0 },
      truth_metadata: { preliminary_compilation_allowed: true },
    });
    input.formulaDefinitions.push({
      formula_id: "waste_quantity",
      ast: { kind: "parameter", id: "confirmed_waste_mass_kg" },
      input_parameter_ids: ["confirmed_waste_mass_kg"],
      ast_sha256: "waste-formula-sha",
    });
    input.resourceDefinitions.push({
      ...input.resourceDefinitions[0]!,
      id: "resource-spec-waste",
      row_id: "waste:confirmed",
      ordinal: 1,
      title_ru: "Вывоз подтверждённой массы отходов",
      unit_id: "kg",
      formula_id: "waste_quantity",
      inclusion_ast: { kind: "present", parameterId: "confirmed_waste_mass_kg" },
      procurement_eligible: false,
      cost_owner_id: null,
    });

    const result = await compileCanonicalEstimateCore(input);
    expect(result.rows).toHaveLength(1);
    expect(result.preliminaryNeeds).toHaveLength(1);
    expect(result.preliminaryNeeds[0]).toMatchObject({
      row_id: "waste:confirmed",
      quantity: null,
      unit_price: null,
      need_state: "QUANTITY_REQUIRED",
      missing_parameter_ids: ["confirmed_waste_mass_kg"],
      selected: true,
    });
    expect(result.preliminaryNeeds[0]!.need_sha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(result.totals.includedRowCount).toBe(1);
  });

  it("keeps an unresolved condition visible and persists its manual exclusion", async () => {
    const input = baseInput();
    input.operation = "recalculate";
    input.parameterDefinitions.push({
      parameter_id: "access_required",
      value_type: "boolean",
      required: true,
      default_value: null,
      constraints_json: {},
      truth_metadata: { preliminary_compilation_allowed: true },
    });
    input.resourceDefinitions[0]!.inclusion_ast = {
      kind: "equals",
      parameterId: "access_required",
      value: true,
    };
    input.rowOverrides = {
      "material:board": {
        includedInEstimate: false,
        includedInProcurement: false,
        provenance: { kind: "manual", reason: "consumer_excluded_preliminary_need" },
      },
    };

    const result = await compileCanonicalEstimateCore(input);
    expect(result.rows).toHaveLength(0);
    expect(result.preliminaryNeeds[0]).toMatchObject({
      row_id: "material:board",
      need_state: "CONDITION_REQUIRED",
      missing_parameter_ids: ["access_required"],
      selected: false,
    });
  });

  it("fails closed on amendments outside recalculate and unknown override fields", async () => {
    await expect(compileCanonicalEstimateCore({
      ...baseInput(),
      rowOverrides: {
        "material:board": {
          quantity: "12",
          provenance: { kind: "manual" },
        },
      },
    })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });

    await expect(compileCanonicalEstimateCore({
      ...baseInput(),
      operation: "recalculate",
      rowOverrides: {
        "material:board": {
          hiddenBypass: true,
          provenance: { kind: "manual" },
        },
      },
    })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
  });

  it("replaces a generic source title with the exact validated specification when explicitly requested", async () => {
    const input = baseInput();
    input.parameterDefinitions.push({
      parameter_id: "exact_material_title_ru",
      value_type: "text",
      required: true,
      default_value: null,
      constraints_json: { maxLength: 500 },
    });
    input.submittedParameters.exact_material_title_ru = "Лист гипсовый влагостойкий ГСП-H2 12,5×1200×2500 мм";
    input.resourceDefinitions[0]!.resource_graph = {
      titleSpecificationParameterId: "exact_material_title_ru",
      titleSpecificationMode: "REPLACE",
    };

    const result = await compileCanonicalEstimateCore(input);
    expect(result.rows[0]!.title_ru).toBe("Лист гипсовый влагостойкий ГСП-H2 12,5×1200×2500 мм");
  });

  it("builds one exact public material title from multiple validated specification parameters", async () => {
    const input = baseInput();
    for (const parameterId of ["concrete_class", "watertightness", "frost_resistance", "mobility"]) {
      input.parameterDefinitions.push({
        parameter_id: parameterId,
        value_type: "text",
        required: true,
        default_value: null,
        constraints_json: { maxLength: 20 },
      });
    }
    Object.assign(input.submittedParameters, {
      concrete_class: "B25",
      watertightness: "W6",
      frost_resistance: "F150",
      mobility: "P4",
    });
    input.resourceDefinitions[0]!.title_ru = "Бетонная смесь";
    input.resourceDefinitions[0]!.resource_graph = {
      titleSpecificationParameterIds: ["concrete_class", "watertightness", "frost_resistance", "mobility"],
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " ",
    };

    const result = await compileCanonicalEstimateCore(input);
    expect(result.rows[0]!.title_ru).toBe("Бетонная смесь B25, W6, F150, P4");
  });
  it("appends finite typed packaging dimensions and whole counts without changing quantity inputs", async () => {
    const input = baseInput();
    input.parameterDefinitions.push(
      { parameter_id: "package_length", value_type: "decimal", required: true, default_value: null, constraints_json: { min: 0.1 } },
      { parameter_id: "kit_count", value_type: "integer", required: true, default_value: null, constraints_json: { min: 1 } },
      { parameter_id: "section_length", value_type: "decimal", required: true, default_value: null, constraints_json: { min: 0.1 } },
    );
    Object.assign(input.submittedParameters, { package_length: 25, kit_count: 5, section_length: 2 });
    input.resourceDefinitions[0]!.title_ru = "Выбранная упаковка/комплект/секция";
    input.resourceDefinitions[0]!.resource_graph = { titleSpecificationParameterIds: ["package_length", "kit_count", "section_length"], titleSpecificationMode: "APPEND" };
    const result = await compileCanonicalEstimateCore(input);
    expect(result.rows[0]!.title_ru).toBe("Выбранная упаковка/комплект/секция — 25, 5, 2");
    expect(result.rows[0]!.quantity).toBe("11");
    expect(result.parameters.package_length).toBe(25);
    expect(result.parameters.kit_count).toBe(5);
    input.submittedParameters.package_length = 24;
    expect((await compileCanonicalEstimateCore(input)).rows[0]!.title_ru).toContain(" — 24, 5, 2");
  });
  it("preserves a multi-field service specification above 500 characters and keeps its finite aggregate bound", async () => {
    const input = baseInput();
    const ids = ['transport', 'packaging', 'receiver', 'service_reference'];
    for (const id of ids) {
      input.parameterDefinitions.push({ parameter_id:id, value_type:'text', required:true, default_value:null, constraints_json:{maxLength:500} });
      input.submittedParameters[id] = `${id}: ${'я'.repeat(180)}`;
    }
    input.resourceDefinitions[0]!.resource_graph = {titleSpecificationParameterIds:ids,titleSpecificationMode:'APPEND'};
    const result = await compileCanonicalEstimateCore(input);
    const specification = ids.map(id=>input.submittedParameters[id]).join(', ');
    expect(specification.length).toBeGreaterThan(500);
    expect(result.rows[0]!.title_ru).toBe(`Листовой материал — ${specification}`);
    expect(result.rows[0]!.quantity).toBe('11');
    for (const id of ids) expect(result.parameters[id]).toBe(input.submittedParameters[id]);
    for (const id of ids) input.submittedParameters[id] = 'я'.repeat(500);
    await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
    input.submittedParameters.transport = 'я'.repeat(501);
    await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  });
  it("rejects boolean title values instead of coercing arbitrary non-string values", async () => {
    const input = baseInput();
    input.parameterDefinitions.push({ parameter_id: "boolean_title", value_type: "boolean", required: true, default_value: null, constraints_json: {} });
    input.submittedParameters.boolean_title = true;
    input.resourceDefinitions[0]!.resource_graph = { titleSpecificationParameterIds: ["boolean_title"], titleSpecificationMode: "APPEND" };
    await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({ code: "DEFINITION_INTEGRITY_FAILED" });
  });
  it.each([true, false])("preserves local missing numeric title semantics, required=%s", async required => {
    const input = baseInput();
    input.parameterDefinitions.push({ parameter_id: "package_length", value_type: "decimal", required, default_value: null, constraints_json: {} });
    input.resourceDefinitions[0]!.resource_graph = { titleSpecificationParameterIds: ["package_length"], titleSpecificationMode: "APPEND" };
    const result = await compileCanonicalEstimateCore(input);
    if (required) {
      expect(result.rows).toHaveLength(0);
      expect(result.preliminaryNeeds[0]).toMatchObject({ row_id: "material:board", quantity: "11", missing_parameter_ids: ["package_length"] });
    } else {
      expect(result.preliminaryNeeds).toEqual([]);
      expect(result.rows[0]!.title_ru).toBe("Листовой материал");
    }
  });
  it("keeps the existing whole-integer validation ahead of numeric title rendering", async () => {
    const input = baseInput();
    input.parameterDefinitions.push({ parameter_id: "kit_count", value_type: "integer", required: true, default_value: null, constraints_json: {} });
    input.submittedParameters.kit_count = 4.5;
    input.resourceDefinitions[0]!.resource_graph = { titleSpecificationParameterIds: ["kit_count"], titleSpecificationMode: "APPEND" };
    await expect(compileCanonicalEstimateCore(input)).rejects.toThrow();
  });
  it.each([Infinity, NaN, { size: 25 }])("rejects invalid numeric title input %s before it becomes public text", async value => {
    const input = baseInput();
    input.parameterDefinitions.push({ parameter_id: "numeric_title", value_type: "decimal", required: true, default_value: null, constraints_json: {} });
    input.submittedParameters.numeric_title = value;
    input.resourceDefinitions[0]!.resource_graph = { titleSpecificationParameterIds: ["numeric_title"], titleSpecificationMode: "APPEND" };
    await expect(compileCanonicalEstimateCore(input)).rejects.toThrow();
  });

  it("keeps a calculable resource in the estimate when an optional title specification is absent", async () => {
    const input = baseInput();
    input.parameterDefinitions.push({
      parameter_id: "material_class",
      value_type: "text",
      required: false,
      default_value: null,
      constraints_json: { maxLength: 20 },
    });
    input.resourceDefinitions[0]!.resource_graph = {
      titleSpecificationParameterIds: ["material_class"],
      titleSpecificationMode: "APPEND",
    };

    const preliminary = await compileCanonicalEstimateCore(input);

    expect(preliminary.rows).toHaveLength(1);
    expect(preliminary.preliminaryNeeds).toHaveLength(0);
    expect(preliminary.rows[0]).toMatchObject({
      row_id: "material:board",
      quantity: "11",
      title_ru: "Листовой материал",
      calculation_trace: {
        titleSpecification: {
          mode: "APPEND",
          parameterIds: ["material_class"],
          resolvedParameterIds: [],
          missingParameterIds: ["material_class"],
        },
      },
    });

    input.submittedParameters.material_class = "ГСП-H2 12,5 мм";
    const refined = await compileCanonicalEstimateCore(input);

    expect(refined.preliminaryNeeds).toHaveLength(0);
    expect(refined.rows[0]).toMatchObject({
      row_id: preliminary.rows[0]!.row_id,
      quantity: preliminary.rows[0]!.quantity,
      title_ru: "Листовой материал — ГСП-H2 12,5 мм",
      calculation_trace: {
        titleSpecification: {
          resolvedParameterIds: ["material_class"],
          missingParameterIds: [],
        },
      },
    });
  });

  it("keeps a row out of procurement when its required consumer identity is missing", async () => {
    const input = baseInput();
    input.parameterDefinitions.push({
      parameter_id: "approved_material_specification",
      value_type: "text",
      required: true,
      default_value: null,
      constraints_json: { maxLength: 500 },
    });
    input.resourceDefinitions[0]!.resource_graph = {
      inputParameterIds: ["approved_material_specification", "area_m2"],
    };

    const result = await compileCanonicalEstimateCore(input);

    expect(result.rows).toHaveLength(0);
    expect(result.preliminaryNeeds).toHaveLength(1);
    expect(result.preliminaryNeeds[0]).toMatchObject({
      row_id: "material:board",
      quantity: "11",
      need_state: "CONDITION_REQUIRED",
      missing_parameter_ids: ["approved_material_specification"],
      procurement_eligible: true,
    });
  });

  it("does not block a calculable row on an explicitly optional consumer reference", async () => {
    const input = baseInput();
    input.parameterDefinitions.push({
      parameter_id: "optional_document_reference",
      value_type: "text",
      required: false,
      default_value: null,
      constraints_json: { maxLength: 500 },
    });
    input.resourceDefinitions[0]!.resource_graph = {
      inputParameterIds: ["optional_document_reference", "area_m2"],
    };

    const result = await compileCanonicalEstimateCore(input);

    expect(result.rows).toHaveLength(1);
    expect(result.preliminaryNeeds).toHaveLength(0);
  });

  it("fails closed on ambiguous or incomplete multi-parameter title definitions", async () => {
    const input = baseInput();
    input.parameterDefinitions.push({
      parameter_id: "concrete_class",
      value_type: "text",
      required: true,
      default_value: null,
      constraints_json: { maxLength: 20 },
    });
    input.submittedParameters.concrete_class = "B25";
    input.resourceDefinitions[0]!.resource_graph = {
      titleSpecificationParameterId: "concrete_class",
      titleSpecificationParameterIds: ["concrete_class"],
    };
    await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({
      code: "DEFINITION_INTEGRITY_FAILED",
    });

    delete input.resourceDefinitions[0]!.resource_graph.titleSpecificationParameterId;
    input.resourceDefinitions[0]!.resource_graph.titleSpecificationParameterIds = ["concrete_class", "missing_value"];
    await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({
      code: "DEFINITION_INTEGRITY_FAILED",
    });
  });

  it("rejects an unknown title specification mode", async () => {
    const input = baseInput();
    input.parameterDefinitions.push({
      parameter_id: "exact_material_title_ru",
      value_type: "text",
      required: true,
      default_value: null,
      constraints_json: { maxLength: 500 },
    });
    input.submittedParameters.exact_material_title_ru = "Лист гипсовый влагостойкий 12,5 мм";
    input.resourceDefinitions[0]!.resource_graph = {
      titleSpecificationParameterId: "exact_material_title_ru",
      titleSpecificationMode: "UNSAFE_MODE",
    };

    await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({
      code: "DEFINITION_INTEGRITY_FAILED",
    });
  });

  it("resolves a declared exact source lookup in the common compiler", async () => {
    const input = baseInput();
    input.parameterDefinitions.push(
      {
        parameter_id: "material_temperature_c",
        value_type: "decimal",
        required: true,
        default_value: null,
        constraints_json: { min: 5, max: 35 },
      },
      {
        parameter_id: "accelerator_percent",
        value_type: "decimal",
        required: true,
        default_value: null,
        constraints_json: { min: 0, max: 5 },
      },
      {
        parameter_id: "reaction_time_min",
        value_type: "decimal",
        required: false,
        default_value: null,
        constraints_json: { min: 1 },
        truth_metadata: {
          derived_exact_lookup_v1: {
            version: "canonical-derived-exact-lookup:v1",
            inputParameterIds: ["material_temperature_c", "accelerator_percent"],
            rows: [
              { inputValues: [20, 0], outputValue: 135 },
              { inputValues: [5, 2], outputValue: 16 },
            ],
            interpolation: "FORBIDDEN",
          },
        },
      },
    );
    input.submittedParameters = {
      area_m2: 10,
      material_temperature_c: "20",
      accelerator_percent: "0",
    };

    const result = await compileCanonicalEstimateCore(input);

    expect(result.parameters.reaction_time_min).toBe(135);
    expect(result.derivedParameters).toEqual({ reaction_time_min: 135 });
  });

  it("keeps an explicit lookup target and does not interpolate an unknown tuple", async () => {
    const input = baseInput();
    input.parameterDefinitions.push({
      parameter_id: "temperature_c",
      value_type: "decimal",
      required: true,
      default_value: null,
      constraints_json: { min: 5, max: 35 },
    }, {
      parameter_id: "reaction_time_min",
      value_type: "decimal",
      required: false,
      default_value: null,
      constraints_json: { min: 1 },
      truth_metadata: {
        derived_exact_lookup_v1: {
          version: "canonical-derived-exact-lookup:v1",
          inputParameterIds: ["temperature_c"],
          rows: [{ inputValues: [20], outputValue: 135 }],
          interpolation: "FORBIDDEN",
        },
      },
    });
    input.submittedParameters = { area_m2: 10, temperature_c: 15 };
    const unresolved = await compileCanonicalEstimateCore(input);
    expect(unresolved.parameters.reaction_time_min).toBeUndefined();
    expect(unresolved.derivedParameters).toEqual({});

    input.submittedParameters.reaction_time_min = 90;
    const confirmed = await compileCanonicalEstimateCore(input);
    expect(confirmed.parameters.reaction_time_min).toBe(90);
    expect(confirmed.derivedParameters).toEqual({});
  });

  it("fails closed on duplicate exact source lookup rows", async () => {
    const input = baseInput();
    input.parameterDefinitions.push({
      parameter_id: "derived_quantity",
      value_type: "decimal",
      required: false,
      default_value: null,
      constraints_json: { min: 0 },
      truth_metadata: {
        derived_exact_lookup_v1: {
          version: "canonical-derived-exact-lookup:v1",
          inputParameterIds: ["area_m2"],
          rows: [
            { inputValues: [10], outputValue: 1 },
            { inputValues: ["10"], outputValue: 2 },
          ],
          interpolation: "FORBIDDEN",
        },
      },
    });

    await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({
      code: "DEFINITION_INTEGRITY_FAILED",
    });
  });
});

describe("authored title specification labels", () => {
  it("does not inherit a label for a declared parameter whose name exists on Object.prototype", async () => {
    const input = baseInput();
    input.parameterDefinitions.push({ parameter_id: "constructor", value_type: "decimal", required: true, default_value: null, constraints_json: {} });
    Object.assign(input.submittedParameters, { constructor: 300 });
    input.resourceDefinitions[0]!.resource_graph = { titleSpecificationParameterIds: ["constructor"], titleSpecificationParameterLabelsRu: {} };
    const result = await compileCanonicalEstimateCore(input);
    expect(result.rows[0]!.title_ru).toBe("Листовой материал — 300");
  });
  it("keeps typed dimensions identifiable without changing their values or quantity", async () => {
    const input = baseInput();
    input.parameterDefinitions.push(
      { parameter_id: "width", value_type: "decimal", required: true, default_value: null, constraints_json: {} },
      { parameter_id: "thickness", value_type: "decimal", required: true, default_value: null, constraints_json: {} },
    );
    Object.assign(input.submittedParameters, { width: 300, thickness: 1.5 });
    input.resourceDefinitions[0]!.resource_graph = { titleSpecificationParameterIds: ["width", "thickness"],
      titleSpecificationParameterLabelsRu: { width: "Ширина (мм)", thickness: "Толщина (мм)" } };
    const result = await compileCanonicalEstimateCore(input);
    expect(result.rows[0]!.title_ru).toBe("Листовой материал — Ширина (мм): 300, Толщина (мм): 1.5");
    expect(result.rows[0]!.quantity).toBe("11");
    expect(result.parameters.width).toBe(300);
    expect(result.parameters.thickness).toBe(1.5);
    delete input.submittedParameters.thickness;
    const missing = await compileCanonicalEstimateCore(input);
    expect(missing.rows).toHaveLength(0);
    expect(missing.preliminaryNeeds[0]!.title_ru).toContain("Ширина (мм): 300");
    expect(missing.preliminaryNeeds[0]!.missing_parameter_ids).toContain("thickness");
  });
  it.each([{ unknown: "Размер" }, { width: "" }, { width: 300 }, ["Ширина"]])("rejects unbound or malformed labels %p", async labels => {
    const input = baseInput();
    input.parameterDefinitions.push({ parameter_id: "width", value_type: "decimal", required: true, default_value: null, constraints_json: {} });
    input.submittedParameters.width = 300;
    input.resourceDefinitions[0]!.resource_graph = { titleSpecificationParameterIds: ["width"], titleSpecificationParameterLabelsRu: labels };
    await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({ code: "DEFINITION_INTEGRITY_FAILED" });
  });
});
