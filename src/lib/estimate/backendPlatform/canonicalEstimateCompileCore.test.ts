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

describe("canonicalEstimateCompileCore", () => {
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
});
