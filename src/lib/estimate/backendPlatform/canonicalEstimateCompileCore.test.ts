import { createHash } from "node:crypto";

import {
  bindCanonicalEstimateResourcePriceKeys,
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreInput,
} from "./canonicalEstimateCompileCore";

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
