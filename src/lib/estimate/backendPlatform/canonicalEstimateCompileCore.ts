import { evaluateFormulaGraph, type FormulaAst } from "./formulaGraph";
import { evaluateInclusionGraph } from "./inclusionGraph";
import { validateCanonicalEstimateParameters } from "./parameterConstraints";
import { canonicalRoundDecimal } from "./canonicalEstimateDeterminism";
import {
  canonicalFixedQuantityStatedBySource,
  canonicalNormConstantQuantityBinding,
} from "./canonicalFormulaSourceBinding";

export { canonicalRoundDecimal } from "./canonicalEstimateDeterminism";

export type CanonicalEstimateCompileOperation = "compile" | "recalculate";

export type CanonicalEstimateParameterDefinition = {
  parameter_id: string;
  value_type: string;
  required: boolean;
  default_value: unknown;
  constraints_json: Record<string, unknown> | null;
  truth_metadata?: Record<string, unknown> | null;
};

export type CanonicalEstimateFormulaDefinition = {
  formula_id: string;
  ast: FormulaAst;
  input_parameter_ids: string[];
  ast_sha256: string;
};

export type CanonicalEstimateResourceDefinition = {
  id: string;
  row_id: string;
  ordinal: number;
  section: string;
  category: string;
  title_ru: string;
  unit_id: string;
  formula_id: string;
  inclusion_ast: Record<string, unknown>;
  resource_graph: Record<string, unknown>;
  procurement_eligible: boolean;
  cost_owner_id: string | null;
  source_metadata: Record<string, unknown> | null;
  row_sha256: string;
};

export type CanonicalEstimatePriceItem = {
  price_key: string;
  unit_id: string;
  currency_code: string;
  unit_price: string | number;
  snapshot_id: string;
  estimate_price_snapshot?: { route_id?: string | null } | null;
};

export type CanonicalEstimateResourcePriceBinding = {
  resource_spec_id: string;
  price_key: string;
};

/**
 * Нормализует price owner до входа в pure compiler. В таблице ресурса
 * cost_owner_id исторически nullable, поэтому единственная однозначная
 * route binding является каноническим владельцем цены. Несколько разных price key
 * для одного ресурса без явного cost owner — дефект определения, а не повод
 * молча выбрать первый маршрут.
 */
export function bindCanonicalEstimateResourcePriceKeys(
  resources: readonly CanonicalEstimateResourceDefinition[],
  bindings: readonly CanonicalEstimateResourcePriceBinding[],
): CanonicalEstimateResourceDefinition[] {
  const priceKeysByResource = new Map<string, Set<string>>();
  for (const binding of bindings) {
    const resourceId = String(binding.resource_spec_id ?? "").trim();
    const priceKey = String(binding.price_key ?? "").trim();
    if (!resourceId || !priceKey) {
      throw compilerError("resource price binding is incomplete", "DEFINITION_INTEGRITY_FAILED");
    }
    const keys = priceKeysByResource.get(resourceId) ?? new Set<string>();
    keys.add(priceKey);
    priceKeysByResource.set(resourceId, keys);
  }
  return resources.map((resource) => {
    if (String(resource.cost_owner_id ?? "").trim()) return { ...resource };
    const keys = [...(priceKeysByResource.get(resource.id) ?? [])];
    if (keys.length > 1) {
      throw compilerError(`ambiguous resource price binding ${resource.row_id}`, "DEFINITION_INTEGRITY_FAILED");
    }
    return keys.length === 1 ? { ...resource, cost_owner_id: keys[0] } : { ...resource };
  });
}

export type CanonicalEstimateCompiledRow = Record<string, unknown> & {
  row_id: string;
  ordinal: number;
  quantity: string;
  unit_price: string | null;
  amount: string | null;
  included_in_estimate: boolean;
  included_in_procurement: boolean;
  procurement_eligible: boolean;
  ownership_status: "OWNED" | "OWNED_EXCLUDED" | "MANUAL_SERVER_OWNED";
  row_sha256: string;
};

export type CanonicalEstimateCompileCoreInput = {
  operation: CanonicalEstimateCompileOperation;
  compilerVersion: string;
  catalogId: string;
  /** Required by R6 callers; omitted only by explicit legacy/test projections. */
  primaryMeasureParameterId?: string | null;
  parameterDefinitions: CanonicalEstimateParameterDefinition[];
  formulaDefinitions: CanonicalEstimateFormulaDefinition[];
  resourceDefinitions: CanonicalEstimateResourceDefinition[];
  submittedParameters: Record<string, unknown>;
  confirmedParameters: Record<string, unknown>;
  currencyCode: string;
  priceSnapshotIds?: string[];
  priceItems?: CanonicalEstimatePriceItem[];
  rowOverrides?: Record<string, Record<string, unknown>>;
  customRows?: Record<string, unknown>[];
  maximumResourceRows: number;
  maximumCustomRows?: number;
  hashJson: (value: unknown) => string | Promise<string>;
};

export type CanonicalEstimateCompileCoreResult = {
  parameters: Record<string, unknown>;
  rows: CanonicalEstimateCompiledRow[];
  totals: {
    amount: string;
    includedRowCount: number;
    excludedRowCount: number;
    pricedRowCount: number;
    unpricedRowCount: number;
    currencyCode: string;
  };
  priceSnapshotIds: string[];
  revisionProjection: {
    catalogId: string;
    parameters: Record<string, unknown>;
    priceSnapshotIds: string[];
    currencyCode: string;
    totals: CanonicalEstimateCompileCoreResult["totals"];
    rows: { rowId: string; rowSha256: string }[];
    compilerVersion: string;
  };
};

type JsonRecord = Record<string, unknown>;

function compilerError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

function boundedText(value: unknown, field: string, maxLength: number): string {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized.length > maxLength) {
    throw compilerError(`invalid ${field}`, "ROW_AMENDMENT_INVALID");
  }
  return normalized;
}

function nonNegativeNumericText(value: unknown, field: string, nullable = false): string | null {
  if (value == null && nullable) return null;
  const normalized = String(value ?? "").trim();
  if (!/^\+?\d+(?:\.\d+)?$/u.test(normalized) || !Number.isFinite(Number(normalized))) {
    throw compilerError(`invalid ${field}`, "ROW_AMENDMENT_INVALID");
  }
  return normalized;
}

function manualProvenance(value: unknown, field: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || (value as JsonRecord).kind !== "manual") {
    throw compilerError(`invalid ${field} provenance`, "ROW_AMENDMENT_INVALID");
  }
  const reason = (value as JsonRecord).reason;
  if (reason != null && (typeof reason !== "string" || reason.trim().length > 500)) {
    throw compilerError(`invalid ${field} reason`, "ROW_AMENDMENT_INVALID");
  }
  return { kind: "manual", ...(typeof reason === "string" ? { reason: reason.trim() } : {}) };
}

function assertOnlyKeys(value: JsonRecord, allowed: readonly string[], field: string): void {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    throw compilerError(`invalid ${field} keys: ${unknown.join(",")}`, "ROW_AMENDMENT_INVALID");
  }
}

function multiply(quantity: string, unitPrice: string | null): string | null {
  if (unitPrice == null) return null;
  return canonicalRoundDecimal(evaluateFormulaGraph({
    kind: "binary",
    operator: "*",
    left: { kind: "literal", value: quantity },
    right: { kind: "literal", value: unitPrice },
  }, {}), 2);
}

/**
 * Единственный pure business-core компиляции canonical estimate.
 * Node/local и Deno/edge передают только загруженные DB records и hash adapter;
 * DB loading, auth, queue claiming и atomic commit остаются тонкими adapters.
 */
export async function compileCanonicalEstimateCore(
  input: CanonicalEstimateCompileCoreInput,
): Promise<CanonicalEstimateCompileCoreResult> {
  if (input.resourceDefinitions.length > input.maximumResourceRows) {
    throw compilerError("resource graph row limit exceeded", "DEFINITION_LIMIT_EXCEEDED");
  }
  const primaryMeasureParameterId = String(input.primaryMeasureParameterId ?? "").trim();
  if (primaryMeasureParameterId) {
    const primaryParameterExists = input.parameterDefinitions.some(
      (parameter) => parameter.parameter_id === primaryMeasureParameterId,
    );
    const primaryMeasureHasFormulaConsumer = input.formulaDefinitions.some(
      (formula) => formula.input_parameter_ids.includes(primaryMeasureParameterId),
    );
    if (!primaryParameterExists || !primaryMeasureHasFormulaConsumer) {
      throw compilerError(
        `primary measure is disconnected from formula graph ${primaryMeasureParameterId}`,
        "PRIMARY_MEASURE_FORMULA_DEPENDENCY_MISSING",
      );
    }
    const formulaById = new Map(input.formulaDefinitions.map((formula) => [formula.formula_id, formula]));
    for (const resource of input.resourceDefinitions) {
      const formula = formulaById.get(resource.formula_id);
      const source = String(resource.source_metadata?.originalQuantityFormula ?? "").trim();
      const normConstant = canonicalNormConstantQuantityBinding({
        source,
        runtimeExpressionSource: resource.source_metadata?.runtimeExpressionSource,
      });
      const normConstantMatchesFormula = formula && normConstant != null
        && Number(evaluateFormulaGraph(formula.ast, {})) === Number(normConstant);
      if (formula && formula.input_parameter_ids.length === 0 && source
        && canonicalFixedQuantityStatedBySource(source) == null
        && !normConstantMatchesFormula) {
        throw compilerError(
          `resource formula lost its source parameters ${resource.row_id}`,
          "FORMULA_PARAMETER_DEPENDENCY_MISSING",
        );
      }
    }
  }
  const parameters = validateCanonicalEstimateParameters(
    input.parameterDefinitions,
    input.submittedParameters,
    {
      confirmedParameters: input.confirmedParameters,
      baselineContext: { catalogId: input.catalogId },
    },
  );
  const numericParameters = Object.fromEntries(
    Object.entries(parameters).filter(([, value]) => typeof value === "number" || typeof value === "string"),
  ) as Record<string, string | number>;
  const formulas = new Map(input.formulaDefinitions.map((formula) => [formula.formula_id, formula]));
  const prices = new Map<string, CanonicalEstimatePriceItem>();
  for (const item of input.priceItems ?? []) {
    const key = `${item.price_key}:${item.unit_id}`;
    if (!prices.has(key)) prices.set(key, item);
  }
  if (!/^[A-Z]{3}$/u.test(input.currencyCode)) {
    throw compilerError("invalid currency", "PARAMETER_VALIDATION_FAILED");
  }

  const rawOverrides = input.rowOverrides ?? {};
  const rawCustomRows = input.customRows ?? [];
  const maximumCustomRows = input.maximumCustomRows ?? 200;
  if (!rawOverrides || typeof rawOverrides !== "object" || Array.isArray(rawOverrides)
    || Object.keys(rawOverrides).length > input.maximumResourceRows
    || !Array.isArray(rawCustomRows) || rawCustomRows.length > maximumCustomRows) {
    throw compilerError("row amendment payload exceeds limits", "ROW_AMENDMENT_INVALID");
  }
  if (input.operation !== "recalculate"
    && (Object.keys(rawOverrides).length > 0 || rawCustomRows.length > 0)) {
    throw compilerError("row amendments require recalculate", "ROW_AMENDMENT_INVALID");
  }

  const overrides = new Map(Object.entries(rawOverrides));
  const rows: CanonicalEstimateCompiledRow[] = [];
  const rowIds = new Set<string>();
  let totalAmount = "0";
  const addToTotal = (amount: string | null, included: boolean): void => {
    if (amount != null && included) {
      totalAmount = evaluateFormulaGraph({
        kind: "binary",
        operator: "+",
        left: { kind: "literal", value: totalAmount },
        right: { kind: "literal", value: amount },
      }, {});
    }
  };

  for (const resource of input.resourceDefinitions) {
    if (!evaluateInclusionGraph(resource.inclusion_ast, parameters)) continue;
    const formula = formulas.get(resource.formula_id);
    if (!formula) throw compilerError("formula graph reference missing", "DEFINITION_INTEGRITY_FAILED");
    const calculatedQuantity = evaluateFormulaGraph(formula.ast, numericParameters);
    const priceKey = resource.cost_owner_id || resource.row_id;
    const price = prices.get(`${priceKey}:${resource.unit_id}`);
    if (price && price.currency_code !== input.currencyCode) {
      throw compilerError("mixed currency snapshot", "PRICE_CURRENCY_MISMATCH");
    }
    const override = overrides.get(resource.row_id);
    if (override != null && (!override || typeof override !== "object" || Array.isArray(override))) {
      throw compilerError(`invalid row override ${resource.row_id}`, "ROW_AMENDMENT_INVALID");
    }
    if (override != null) assertOnlyKeys(override, [
      "titleRu", "quantity", "unitPrice", "includedInEstimate", "includedInProcurement", "provenance",
    ], `row override ${resource.row_id}`);
    const provenance = override == null ? null : manualProvenance(override.provenance, resource.row_id);
    const quantity = override?.quantity == null
      ? calculatedQuantity
      : nonNegativeNumericText(override.quantity, `${resource.row_id}.quantity`)!;
    const snapshotUnitPrice = price ? String(price.unit_price) : null;
    const unitPrice = override != null && Object.prototype.hasOwnProperty.call(override, "unitPrice")
      ? nonNegativeNumericText(override.unitPrice, `${resource.row_id}.unitPrice`, true)
      : snapshotUnitPrice;
    const includedInEstimate = override?.includedInEstimate == null ? true : override.includedInEstimate;
    const includedInProcurement = includedInEstimate
      && (override?.includedInProcurement == null ? resource.procurement_eligible : override.includedInProcurement);
    if (typeof includedInEstimate !== "boolean" || typeof includedInProcurement !== "boolean"
      || (includedInProcurement && !resource.procurement_eligible)) {
      throw compilerError(`invalid row inclusion ${resource.row_id}`, "ROW_AMENDMENT_INVALID");
    }
    const amount = multiply(quantity, unitPrice);
    addToTotal(amount, includedInEstimate);
    const calculationTrace = {
      compilerVersion: input.compilerVersion,
      formulaId: resource.formula_id,
      formulaAstSha256: formula.ast_sha256,
      inputParameterIds: formula.input_parameter_ids,
      resourceGraph: resource.resource_graph,
      ...(provenance == null ? {} : { manualAmendment: provenance }),
    };
    const normativeTrace = Array.isArray(resource.source_metadata?.normativeTrace)
      ? resource.source_metadata.normativeTrace
      : [];
    const titleSpecificationParameterId = String(resource.resource_graph?.titleSpecificationParameterId ?? "").trim();
    const rawTitleSpecificationParameterIds = resource.resource_graph?.titleSpecificationParameterIds;
    if (rawTitleSpecificationParameterIds != null && !Array.isArray(rawTitleSpecificationParameterIds)) {
      throw compilerError(`title specification parameters invalid ${resource.row_id}`, "DEFINITION_INTEGRITY_FAILED");
    }
    const titleSpecificationParameterIds = rawTitleSpecificationParameterIds == null
      ? (titleSpecificationParameterId ? [titleSpecificationParameterId] : [])
      : rawTitleSpecificationParameterIds.map((value) => typeof value === "string" ? value.trim() : "");
    if (
      (titleSpecificationParameterId && rawTitleSpecificationParameterIds != null)
      || titleSpecificationParameterIds.length > 8
      || titleSpecificationParameterIds.some((parameterId) => !parameterId)
      || new Set(titleSpecificationParameterIds).size !== titleSpecificationParameterIds.length
    ) {
      throw compilerError(`title specification parameters invalid ${resource.row_id}`, "DEFINITION_INTEGRITY_FAILED");
    }
    const titleSpecificationMode = String(resource.resource_graph?.titleSpecificationMode ?? "APPEND").trim();
    const titleSpecificationSeparator = String(resource.resource_graph?.titleSpecificationSeparator ?? " — ");
    if (titleSpecificationParameterIds.length > 0 && !["APPEND", "REPLACE"].includes(titleSpecificationMode)) {
      throw compilerError(`title specification mode invalid ${resource.row_id}`, "DEFINITION_INTEGRITY_FAILED");
    }
    if (titleSpecificationParameterIds.length > 0 && ![" — ", " "].includes(titleSpecificationSeparator)) {
      throw compilerError(`title specification separator invalid ${resource.row_id}`, "DEFINITION_INTEGRITY_FAILED");
    }
    const titleSpecificationValues = titleSpecificationParameterIds.map((parameterId) => parameters[parameterId]);
    if (titleSpecificationValues.some((value) => typeof value !== "string")) {
      throw compilerError(`title specification parameter invalid ${resource.row_id}`, "DEFINITION_INTEGRITY_FAILED");
    }
    const normalizedTitleSpecificationValues = titleSpecificationValues.map((value) => String(value).trim());
    if (titleSpecificationParameterIds.length > 1 && normalizedTitleSpecificationValues.some((value) => !value)) {
      throw compilerError(`title specification parameter empty ${resource.row_id}`, "DEFINITION_INTEGRITY_FAILED");
    }
    const joinedTitleSpecification = normalizedTitleSpecificationValues.filter(Boolean).join(", ");
    const boundedTitleSpecification = joinedTitleSpecification
      ? boundedText(joinedTitleSpecification, `${resource.row_id}.titleSpecification`, 500)
      : null;
    const canonicalTitleRu = boundedTitleSpecification == null
      ? resource.title_ru
      : titleSpecificationMode === "REPLACE"
        ? boundedTitleSpecification
        : `${resource.title_ru}${titleSpecificationSeparator}${boundedTitleSpecification}`;
    const manuallyPriced = provenance != null && Object.prototype.hasOwnProperty.call(override!, "unitPrice");
    const rowWithoutHash: Record<string, unknown> = {
      row_id: resource.row_id,
      ordinal: resource.ordinal,
      resource_spec_id: resource.id,
      section: resource.section,
      category: resource.category,
      title_ru: override?.titleRu == null
        ? canonicalTitleRu
        : boundedText(override.titleRu, `${resource.row_id}.titleRu`, 2_000),
      unit_id: resource.unit_id,
      quantity,
      unit_price: unitPrice,
      amount,
      currency_code: unitPrice == null ? null : input.currencyCode,
      procurement_eligible: resource.procurement_eligible,
      included_in_estimate: includedInEstimate,
      included_in_procurement: includedInProcurement,
      ownership_status: includedInEstimate ? "OWNED" : "OWNED_EXCLUDED",
      calculation_trace: calculationTrace,
      normative_trace: normativeTrace,
      legacy_row_payload: null,
      price_snapshot_id: manuallyPriced ? null : price?.snapshot_id ?? null,
      price_route_id: manuallyPriced ? null : price?.estimate_price_snapshot?.route_id ?? null,
      price_resolution_trace: manuallyPriced
        ? { kind: "manual_override", provenance, resolved: unitPrice != null }
        : price ? { priceKey, resolved: true } : { priceKey, resolved: false },
    };
    const row = {
      ...rowWithoutHash,
      row_sha256: await input.hashJson(rowWithoutHash),
    } as CanonicalEstimateCompiledRow;
    rows.push(row);
    rowIds.add(resource.row_id);
    overrides.delete(resource.row_id);
  }

  if (overrides.size > 0) {
    throw compilerError(`row override is not reachable: ${[...overrides.keys()][0]}`, "ROW_OVERRIDE_NOT_REACHED");
  }
  let nextOrdinal = rows.reduce((maximum, row) => Math.max(maximum, Number(row.ordinal)), -1) + 1;
  for (let index = 0; index < rawCustomRows.length; index += 1) {
    const custom = rawCustomRows[index];
    if (!custom || typeof custom !== "object" || Array.isArray(custom)) {
      throw compilerError(`invalid custom row ${index}`, "ROW_AMENDMENT_INVALID");
    }
    assertOnlyKeys(custom, [
      "clientRowId", "section", "category", "titleRu", "unitId", "quantity", "unitPrice",
      "includedInEstimate", "includedInProcurement", "provenance",
    ], `custom row ${index}`);
    const clientRowId = boundedText(custom.clientRowId, `customRows.${index}.clientRowId`, 200);
    if (!/^[A-Za-z0-9._:-]+$/u.test(clientRowId)) {
      throw compilerError(`invalid custom row identity ${index}`, "ROW_AMENDMENT_INVALID");
    }
    const rowId = `manual:${clientRowId}`;
    if (rowIds.has(rowId)) throw compilerError(`duplicate custom row ${rowId}`, "ROW_AMENDMENT_INVALID");
    const provenance = manualProvenance(custom.provenance, `customRows.${index}`);
    const quantity = nonNegativeNumericText(custom.quantity, `customRows.${index}.quantity`)!;
    const unitPrice = nonNegativeNumericText(custom.unitPrice, `customRows.${index}.unitPrice`, true);
    const includedInEstimate = custom.includedInEstimate;
    const includedInProcurement = custom.includedInProcurement;
    if (typeof includedInEstimate !== "boolean" || typeof includedInProcurement !== "boolean"
      || (includedInProcurement && !includedInEstimate)) {
      throw compilerError(`invalid custom row inclusion ${index}`, "ROW_AMENDMENT_INVALID");
    }
    const amount = multiply(quantity, unitPrice);
    addToTotal(amount, includedInEstimate);
    const rowWithoutHash: Record<string, unknown> = {
      row_id: rowId,
      ordinal: nextOrdinal,
      resource_spec_id: null,
      section: boundedText(custom.section, `customRows.${index}.section`, 240),
      category: boundedText(custom.category, `customRows.${index}.category`, 240),
      title_ru: boundedText(custom.titleRu, `customRows.${index}.titleRu`, 2_000),
      unit_id: boundedText(custom.unitId, `customRows.${index}.unitId`, 120),
      quantity,
      unit_price: unitPrice,
      amount,
      currency_code: unitPrice == null ? null : input.currencyCode,
      procurement_eligible: true,
      included_in_estimate: includedInEstimate,
      included_in_procurement: includedInProcurement,
      ownership_status: "MANUAL_SERVER_OWNED",
      calculation_trace: {
        compilerVersion: input.compilerVersion,
        rowId,
        semanticOwner: `manual:${clientRowId}`,
        physicalRowType: String(custom.category ?? "manual"),
        manualAmendment: provenance,
      },
      normative_trace: [],
      legacy_row_payload: { kind: "manual_server_owned_v1", clientRowId, provenance },
      price_snapshot_id: null,
      price_route_id: null,
      price_resolution_trace: { kind: "manual_custom_row", provenance, resolved: unitPrice != null },
    };
    const row = {
      ...rowWithoutHash,
      row_sha256: await input.hashJson(rowWithoutHash),
    } as CanonicalEstimateCompiledRow;
    rows.push(row);
    rowIds.add(rowId);
    nextOrdinal += 1;
  }

  const totals = {
    amount: totalAmount,
    includedRowCount: rows.filter((row) => row.included_in_estimate).length,
    excludedRowCount: rows.filter((row) => !row.included_in_estimate).length,
    pricedRowCount: rows.filter((row) => row.included_in_estimate && row.unit_price != null).length,
    unpricedRowCount: rows.filter((row) => row.included_in_estimate && row.unit_price == null).length,
    currencyCode: input.currencyCode,
  };
  const priceSnapshotIds = input.priceSnapshotIds ?? [];
  return {
    parameters,
    rows,
    totals,
    priceSnapshotIds,
    revisionProjection: {
      catalogId: input.catalogId,
      parameters,
      priceSnapshotIds,
      currencyCode: input.currencyCode,
      totals,
      rows: rows.map((row) => ({ rowId: row.row_id, rowSha256: row.row_sha256 })),
      compilerVersion: input.compilerVersion,
    },
  };
}
