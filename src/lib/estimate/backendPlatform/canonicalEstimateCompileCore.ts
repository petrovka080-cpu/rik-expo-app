import {
  evaluateFormulaGraph,
  formulaAstInputParameterIds,
  type FormulaAst,
  type FormulaParameterValue,
} from "./formulaGraph";
import { resolveInclusionGraph } from "./inclusionGraph";
import { validateCanonicalEstimateParameters } from "./parameterConstraints";
import { canonicalRoundDecimal } from "./canonicalEstimateDeterminism";
import {
  canonicalFixedQuantityStatedBySource,
  canonicalNormConstantQuantityBinding,
} from "./canonicalFormulaSourceBinding";
import {
  isCanonicalEstimatePhysicalNormBindingActiveV1,
  resolveCanonicalEstimatePhysicalNormApplicabilityV1,
} from "./canonicalEstimatePhysicalNormProjection";

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

const NON_PAYABLE_COST_TREATMENTS = new Set([
  "INCLUDED_IN_RESOURCE_ROWS",
  "INFORMATIONAL_SCOPE",
  "CONTROL_OR_DOCUMENT",
]);

export function canonicalEstimateResourceIncludedByDefault(
  resource: Pick<CanonicalEstimateResourceDefinition, "resource_graph" | "source_metadata">,
): boolean {
  const raw = resource.resource_graph?.costTreatment
    ?? resource.source_metadata?.costTreatment;
  return !NON_PAYABLE_COST_TREATMENTS.has(String(raw ?? "").trim());
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

export type CanonicalEstimateCompiledPreliminaryNeed = Record<string, unknown> & {
  row_id: string;
  ordinal: number;
  section: string;
  category: string;
  title_ru: string;
  unit_id: string;
  quantity: string | null;
  unit_price: string | null;
  need_state: "QUANTITY_REQUIRED" | "CONDITION_REQUIRED";
  missing_parameter_ids: string[];
  selected: boolean;
  procurement_eligible: boolean;
  need_sha256: string;
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
  preliminaryNeeds: CanonicalEstimateCompiledPreliminaryNeed[];
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
    preliminaryNeeds: { rowId: string; needSha256: string }[];
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

function resourceGraphForRevision(
  resourceGraph: Record<string, unknown>,
  parameters: Readonly<Record<string, unknown>>,
  rowId: string,
): Record<string, unknown> {
  const rawPolicy = resourceGraph.professionalMaterialQuantityPolicyV1;
  if (rawPolicy == null) return resourceGraph;
  if (typeof rawPolicy !== "object" || Array.isArray(rawPolicy)) {
    throw compilerError(`material quantity policy invalid ${rowId}`, "DEFINITION_INTEGRITY_FAILED");
  }
  const policy = { ...(rawPolicy as JsonRecord) };
  const resolveNumericParameter = (idField: string, valueField: string, allowZero: boolean): void => {
    const rawId = policy[idField];
    if (rawId == null) return;
    const parameterId = typeof rawId === "string" ? rawId.trim() : "";
    const value = parameterId ? Number(parameters[parameterId]) : Number.NaN;
    if (!parameterId || !Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) {
      throw compilerError(`material quantity policy parameter invalid ${rowId}:${idField}`, "DEFINITION_INTEGRITY_FAILED");
    }
    policy[valueField] = value;
  };
  resolveNumericParameter("wastePercentParameterId", "wastePercent", true);
  resolveNumericParameter("lossPercentParameterId", "lossPercent", true);
  resolveNumericParameter("procurementPackageSizeParameterId", "procurementPackageSize", false);
  const rawFormulaInputIds = policy.formulaInputParameterIds;
  if (rawFormulaInputIds != null) {
    if (!Array.isArray(rawFormulaInputIds)
      || rawFormulaInputIds.some((value) => typeof value !== "string" || !value.trim())) {
      throw compilerError(`material quantity formula inputs invalid ${rowId}`, "DEFINITION_INTEGRITY_FAILED");
    }
    policy.formulaInputs = Object.fromEntries(rawFormulaInputIds.map((parameterId) => [
      parameterId,
      parameters[parameterId],
    ]));
  }
  return { ...resourceGraph, professionalMaterialQuantityPolicyV1: policy };
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

type CanonicalTitleSpecification = {
  parameterIds: string[];
  mode: "APPEND" | "REPLACE";
  separator: " — " | " ";
};

function canonicalTitleSpecification(
  resource: CanonicalEstimateResourceDefinition,
  definitionParameterIds: ReadonlySet<string>,
): CanonicalTitleSpecification {
  const legacyParameterId = String(
    resource.resource_graph?.titleSpecificationParameterId ?? "",
  ).trim();
  const rawParameterIds = resource.resource_graph?.titleSpecificationParameterIds;
  if (rawParameterIds != null && !Array.isArray(rawParameterIds)) {
    throw compilerError(
      `title specification parameters invalid ${resource.row_id}`,
      "DEFINITION_INTEGRITY_FAILED",
    );
  }
  const parameterIds = rawParameterIds == null
    ? (legacyParameterId ? [legacyParameterId] : [])
    : rawParameterIds.map((value) => typeof value === "string" ? value.trim() : "");
  if (
    (legacyParameterId && rawParameterIds != null)
    || parameterIds.length > 8
    || parameterIds.some((parameterId) => !parameterId || !definitionParameterIds.has(parameterId))
    || new Set(parameterIds).size !== parameterIds.length
  ) {
    throw compilerError(
      `title specification parameters invalid ${resource.row_id}`,
      "DEFINITION_INTEGRITY_FAILED",
    );
  }
  const mode = String(resource.resource_graph?.titleSpecificationMode ?? "APPEND").trim();
  const separator = String(resource.resource_graph?.titleSpecificationSeparator ?? " — ");
  if (parameterIds.length > 0 && !["APPEND", "REPLACE"].includes(mode)) {
    throw compilerError(
      `title specification mode invalid ${resource.row_id}`,
      "DEFINITION_INTEGRITY_FAILED",
    );
  }
  if (parameterIds.length > 0 && ![" — ", " "].includes(separator)) {
    throw compilerError(
      `title specification separator invalid ${resource.row_id}`,
      "DEFINITION_INTEGRITY_FAILED",
    );
  }
  return {
    parameterIds,
    mode: mode as CanonicalTitleSpecification["mode"],
    separator: separator as CanonicalTitleSpecification["separator"],
  };
}

function validateConditionalPositiveQuantityPolicy(
  resource: CanonicalEstimateResourceDefinition,
  formula: CanonicalEstimateFormulaDefinition,
  parameters: Readonly<Record<string, unknown>>,
  definitionParameterIds: ReadonlySet<string>,
): void {
  const rawPolicy = resource.resource_graph?.conditionalPositiveQuantityPolicyV1;
  if (rawPolicy == null) return;
  if (!rawPolicy || typeof rawPolicy !== "object" || Array.isArray(rawPolicy)) {
    throw compilerError(`conditional quantity policy invalid ${resource.row_id}`, "DEFINITION_INTEGRITY_FAILED");
  }
  const policy = rawPolicy as JsonRecord;
  const allowedKeys = new Set([
    "version",
    "applicabilityParameterId",
    "quantityParameterIds",
    "errorCodeNamespace",
  ]);
  if (Object.keys(policy).some((key) => !allowedKeys.has(key))
    || policy.version !== "canonical-conditional-positive-quantity:v1") {
    throw compilerError(`conditional quantity policy contract invalid ${resource.row_id}`, "DEFINITION_INTEGRITY_FAILED");
  }
  const applicabilityParameterId = typeof policy.applicabilityParameterId === "string"
    ? policy.applicabilityParameterId.trim()
    : "";
  const quantityParameterIds = Array.isArray(policy.quantityParameterIds)
    ? policy.quantityParameterIds.map((value) => typeof value === "string" ? value.trim() : "")
    : [];
  const errorCodeNamespace = typeof policy.errorCodeNamespace === "string"
    ? policy.errorCodeNamespace.trim()
    : "";
  const inclusionAst = resource.inclusion_ast as JsonRecord;
  if (!applicabilityParameterId
    || !definitionParameterIds.has(applicabilityParameterId)
    || inclusionAst?.kind !== "parameter"
    || inclusionAst?.id !== applicabilityParameterId
    || quantityParameterIds.length === 0
    || quantityParameterIds.length > 8
    || quantityParameterIds.some((parameterId) => !parameterId
      || !definitionParameterIds.has(parameterId)
      || !formula.input_parameter_ids.includes(parameterId))
    || new Set(quantityParameterIds).size !== quantityParameterIds.length
    || !/^[A-Z][A-Z0-9_]{2,80}$/u.test(errorCodeNamespace)) {
    throw compilerError(`conditional quantity policy binding invalid ${resource.row_id}`, "DEFINITION_INTEGRITY_FAILED");
  }
  const applicable = parameters[applicabilityParameterId];
  if (typeof applicable !== "boolean") {
    throw compilerError(
      `conditional applicability is required ${resource.row_id}:${applicabilityParameterId}`,
      `${errorCodeNamespace}_APPLICABILITY_REQUIRED:${applicabilityParameterId}`,
    );
  }
  for (const quantityParameterId of quantityParameterIds) {
    const quantity = Number(parameters[quantityParameterId]);
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw compilerError(
        `conditional quantity is invalid ${resource.row_id}:${quantityParameterId}`,
        `${errorCodeNamespace}_INVALID_NUMBER:${quantityParameterId}`,
      );
    }
    if (applicable && quantity <= 0) {
      throw compilerError(
        `applicable resource requires a positive quantity ${resource.row_id}:${quantityParameterId}`,
        `${errorCodeNamespace}_APPLICABLE_QUANTITY_REQUIRED:${quantityParameterId}`,
      );
    }
    if (!applicable && quantity !== 0) {
      throw compilerError(
        `non-applicable resource cannot retain quantity ${resource.row_id}:${quantityParameterId}`,
        `${errorCodeNamespace}_NOT_APPLICABLE_QUANTITY_CONFLICT:${quantityParameterId}`,
      );
    }
  }
}

function validateFormulaLabeledValueConsistencyPolicy(
  resource: CanonicalEstimateResourceDefinition,
  formula: CanonicalEstimateFormulaDefinition,
  formulaParameters: Readonly<Record<string, FormulaParameterValue>>,
  parameters: Readonly<Record<string, unknown>>,
  definitionParameterIds: ReadonlySet<string>,
): void {
  const rawPolicy = resource.resource_graph?.formulaLabeledValueConsistencyPolicyV1;
  if (rawPolicy == null) return;
  if (!rawPolicy || typeof rawPolicy !== "object" || Array.isArray(rawPolicy)) {
    throw compilerError(`formula labeled-value policy invalid ${resource.row_id}`, "DEFINITION_INTEGRITY_FAILED");
  }
  const policy = rawPolicy as JsonRecord;
  const allowedKeys = new Set([
    "version",
    "textParameterId",
    "label",
    "absoluteTolerance",
    "errorCodeNamespace",
    "errorCodeSubject",
  ]);
  const textParameterId = typeof policy.textParameterId === "string" ? policy.textParameterId.trim() : "";
  const label = typeof policy.label === "string" ? policy.label.trim() : "";
  const absoluteTolerance = Number(policy.absoluteTolerance);
  const errorCodeNamespace = typeof policy.errorCodeNamespace === "string"
    ? policy.errorCodeNamespace.trim()
    : "";
  const errorCodeSubject = typeof policy.errorCodeSubject === "string"
    ? policy.errorCodeSubject.trim()
    : "";
  if (Object.keys(policy).some((key) => !allowedKeys.has(key))
    || policy.version !== "canonical-formula-labeled-value-consistency:v1"
    || !textParameterId
    || !definitionParameterIds.has(textParameterId)
    || !/^[A-Z][A-Z0-9_]{1,40}$/u.test(label)
    || !Number.isFinite(absoluteTolerance)
    || absoluteTolerance < 0
    || absoluteTolerance > 1
    || !/^[A-Z][A-Z0-9_]{2,80}$/u.test(errorCodeNamespace)
    || !/^[A-Z][A-Z0-9_]{2,80}$/u.test(errorCodeSubject)) {
    throw compilerError(`formula labeled-value policy binding invalid ${resource.row_id}`, "DEFINITION_INTEGRITY_FAILED");
  }
  const text = parameters[textParameterId];
  if (typeof text !== "string") {
    throw compilerError(
      `labeled value is required ${resource.row_id}:${textParameterId}`,
      `${errorCodeNamespace}_${errorCodeSubject}_REQUIRED`,
    );
  }
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = new RegExp(`(?:^|[;,\\s])${escapedLabel}\\s*=\\s*([+-]?\\d+(?:[.,]\\d+)?)`, "iu").exec(text);
  if (!match) {
    throw compilerError(
      `labeled value is required ${resource.row_id}:${label}`,
      `${errorCodeNamespace}_${errorCodeSubject}_REQUIRED`,
    );
  }
  const expected = Number(match[1]!.replace(",", "."));
  const actual = Number(evaluateFormulaGraph(formula.ast, formulaParameters));
  if (!Number.isFinite(expected) || !Number.isFinite(actual)
    || Math.abs(actual - expected) > absoluteTolerance) {
    throw compilerError(
      `formula labeled-value conflict ${resource.row_id}: formula=${actual}; labeled=${expected}`,
      `${errorCodeNamespace}_${errorCodeSubject}_CONFLICT`,
    );
  }
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
  for (const formula of input.formulaDefinitions) {
    const declared = [...new Set(formula.input_parameter_ids)].sort();
    const retainedByAst = formulaAstInputParameterIds(formula.ast);
    if (JSON.stringify(declared) !== JSON.stringify(retainedByAst)) {
      throw compilerError(
        `formula dependency graph does not match serialized AST ${formula.formula_id}`,
        "FORMULA_PARAMETER_DEPENDENCY_MISMATCH",
      );
    }
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
  const formulaParameters = Object.fromEntries(
    Object.entries(parameters).filter(([, value]) =>
      typeof value === "number" || typeof value === "string" || typeof value === "boolean"),
  ) as Record<string, FormulaParameterValue>;
  const definitionParameterIds = new Set(
    input.parameterDefinitions.map((parameter) => parameter.parameter_id),
  );
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
  const preliminaryNeeds: CanonicalEstimateCompiledPreliminaryNeed[] = [];
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
    const formula = formulas.get(resource.formula_id);
    if (!formula) throw compilerError("formula graph reference missing", "DEFINITION_INTEGRITY_FAILED");
    const override = overrides.get(resource.row_id);
    if (override != null && (!override || typeof override !== "object" || Array.isArray(override))) {
      throw compilerError(`invalid row override ${resource.row_id}`, "ROW_AMENDMENT_INVALID");
    }
    if (override != null) assertOnlyKeys(override, [
      "titleRu", "quantity", "unitPrice", "includedInEstimate", "includedInProcurement", "provenance",
    ], `row override ${resource.row_id}`);
    const provenance = override == null ? null : manualProvenance(override.provenance, resource.row_id);
    overrides.delete(resource.row_id);
    const inclusion = resolveInclusionGraph(resource.inclusion_ast, parameters);
    validateConditionalPositiveQuantityPolicy(resource, formula, parameters, definitionParameterIds);
    validateFormulaLabeledValueConsistencyPolicy(
      resource,
      formula,
      formulaParameters,
      parameters,
      definitionParameterIds,
    );
    const missingFormulaParameterIds = formula.input_parameter_ids.filter((parameterId) => {
      const value = formulaParameters[parameterId];
      return value === undefined || value === null || value === "";
    });
    const manualQuantity = override != null && Object.prototype.hasOwnProperty.call(override, "quantity")
      ? nonNegativeNumericText(override.quantity, `${resource.row_id}.quantity`)
      : null;
    const inclusionOnlyWaitsForFormulaInputs = inclusion.value == null
      && inclusion.missingParameterIds.every((parameterId) => formula.input_parameter_ids.includes(parameterId));
    const inclusionResolvedByManualQuantity = manualQuantity != null && inclusionOnlyWaitsForFormulaInputs;
    if (inclusion.value === false) continue;

    let appliedPhysicalNorm: ReturnType<typeof resolveCanonicalEstimatePhysicalNormApplicabilityV1> = null;
    if (resource.resource_graph?.professionalPhysicalNormBindingV1 != null
      && isCanonicalEstimatePhysicalNormBindingActiveV1({ parameters, resourceGraph: resource.resource_graph })) {
      const physicalNorm = resolveCanonicalEstimatePhysicalNormApplicabilityV1({
        parameters,
        capturedAt: "canonical-estimate-compile-core",
        resourceGraph: resource.resource_graph,
        normativeTrace: resource.source_metadata?.normativeTrace,
      });
      if (physicalNorm == null) {
        throw compilerError(
          `physical norm binding identity invalid ${resource.row_id}`,
          "DEFINITION_INTEGRITY_FAILED",
        );
      }
      if (physicalNorm.status !== "APPLIED") {
        throw compilerError(
          `physical norm applicability failed ${resource.row_id}: ${physicalNorm.blockers.join("|")}`,
          "PHYSICAL_NORM_APPLICABILITY_FAILED",
        );
      }
      appliedPhysicalNorm = physicalNorm;
    }

    const titleSpecification = canonicalTitleSpecification(resource, definitionParameterIds);
    const missingTitleSpecificationParameterIds = titleSpecification.parameterIds.filter((parameterId) => {
      const value = parameters[parameterId];
      return value == null || (typeof value === "string" && value.trim() === "");
    });

    if ((inclusion.value == null && !inclusionResolvedByManualQuantity)
      || (missingFormulaParameterIds.length > 0 && manualQuantity == null)
      || missingTitleSpecificationParameterIds.length > 0) {
      const needState = inclusion.value == null && !inclusionOnlyWaitsForFormulaInputs
        ? "CONDITION_REQUIRED" as const
        : missingFormulaParameterIds.length > 0 && manualQuantity == null
          ? "QUANTITY_REQUIRED" as const
          : "CONDITION_REQUIRED" as const;
      const missingParameterIds = [...new Set([
        ...(needState === "CONDITION_REQUIRED" ? inclusion.missingParameterIds : []),
        ...(manualQuantity == null ? missingFormulaParameterIds : []),
        ...missingTitleSpecificationParameterIds,
      ])].sort();
      const selected = override?.includedInEstimate !== false;
      const unitPrice = override != null && Object.prototype.hasOwnProperty.call(override, "unitPrice")
        ? nonNegativeNumericText(override.unitPrice, `${resource.row_id}.unitPrice`, true)
        : null;
      const knownQuantity = manualQuantity ?? (missingFormulaParameterIds.length === 0
        ? evaluateFormulaGraph(formula.ast, formulaParameters)
        : null);
      const needWithoutHash = {
        row_id: resource.row_id,
        ordinal: resource.ordinal,
        resource_spec_id: resource.id,
        section: resource.section,
        category: resource.category,
        title_ru: override?.titleRu == null
          ? resource.title_ru
          : boundedText(override.titleRu, `${resource.row_id}.titleRu`, 2_000),
        unit_id: resource.unit_id,
        quantity: knownQuantity,
        unit_price: unitPrice,
        need_state: needState,
        missing_parameter_ids: missingParameterIds,
        selected,
        procurement_eligible: resource.procurement_eligible,
        formula_id: resource.formula_id,
        calculation_trace: {
          compilerVersion: input.compilerVersion,
          formulaId: resource.formula_id,
          formulaAstSha256: formula.ast_sha256,
          inputParameterIds: formula.input_parameter_ids,
          resourceGraph: resource.resource_graph,
          preliminaryNeed: true,
          needState,
          missingParameterIds,
          ...(provenance == null ? {} : { manualAmendment: provenance }),
        },
        normative_trace: Array.isArray(resource.source_metadata?.normativeTrace)
          ? resource.source_metadata.normativeTrace
          : [],
      };
      preliminaryNeeds.push({
        ...needWithoutHash,
        need_sha256: await input.hashJson(needWithoutHash),
      });
      continue;
    }

    const calculatedQuantity = manualQuantity ?? evaluateFormulaGraph(formula.ast, formulaParameters);
    const priceKey = resource.cost_owner_id || resource.row_id;
    const price = prices.get(`${priceKey}:${resource.unit_id}`);
    if (price && price.currency_code !== input.currencyCode) {
      throw compilerError("mixed currency snapshot", "PRICE_CURRENCY_MISMATCH");
    }
    const quantity = override?.quantity == null
      ? calculatedQuantity
      : nonNegativeNumericText(override.quantity, `${resource.row_id}.quantity`)!;
    const physicalBinding = resource.resource_graph?.professionalPhysicalNormBindingV1;
    let physicalNormQuantityParity: JsonRecord | null = null;
    if (physicalBinding != null && typeof physicalBinding === "object" && !Array.isArray(physicalBinding)) {
      const rawOutputParameterId = (physicalBinding as JsonRecord).quantity_output_parameter_id;
      if (rawOutputParameterId != null) {
        const outputParameterId = typeof rawOutputParameterId === "string" ? rawOutputParameterId.trim() : "";
        const output = outputParameterId && appliedPhysicalNorm?.status === "APPLIED"
          ? appliedPhysicalNorm.parameter_values[outputParameterId]?.value
          : null;
        const expected = typeof output === "number" || typeof output === "string" ? Number(output) : Number.NaN;
        const rawOutputFormulaId = (physicalBinding as JsonRecord).quantity_output_formula_id;
        const outputFormulaId = rawOutputFormulaId == null
          ? null
          : typeof rawOutputFormulaId === "string" ? rawOutputFormulaId.trim() : "";
        const outputFormula = outputFormulaId ? formulas.get(outputFormulaId) : null;
        if (rawOutputFormulaId != null && (!outputFormulaId || !outputFormula)) {
          throw compilerError(
            `physical norm quantity formula invalid ${resource.row_id}`,
            "DEFINITION_INTEGRITY_FAILED",
          );
        }
        const actualText = outputFormula == null
          ? quantity
          : evaluateFormulaGraph(outputFormula.ast, formulaParameters);
        const actual = Number(actualText);
        const tolerance = Math.max(1, Math.abs(expected), Math.abs(actual)) * 1e-9;
        if (!outputParameterId || !Number.isFinite(expected)) {
          throw compilerError(
            `physical norm quantity output invalid ${resource.row_id}`,
            "DEFINITION_INTEGRITY_FAILED",
          );
        }
        if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance) {
          throw compilerError(
            `physical norm quantity mismatch ${resource.row_id}: formula=${actualText}; norm=${output}`,
            "PHYSICAL_NORM_QUANTITY_MISMATCH",
          );
        }
        physicalNormQuantityParity = {
          outputParameterId,
          outputFormulaId,
          formulaQuantity: actualText,
          normQuantity: String(output),
        };
      }
    }
    const snapshotUnitPrice = price ? String(price.unit_price) : null;
    const unitPrice = override != null && Object.prototype.hasOwnProperty.call(override, "unitPrice")
      ? nonNegativeNumericText(override.unitPrice, `${resource.row_id}.unitPrice`, true)
      : snapshotUnitPrice;
    const includedInEstimate = override?.includedInEstimate == null
      ? canonicalEstimateResourceIncludedByDefault(resource)
      : override.includedInEstimate;
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
      resourceGraph: resourceGraphForRevision(resource.resource_graph, parameters, resource.row_id),
      ...(physicalNormQuantityParity == null ? {} : { physicalNormQuantityParity }),
      ...(provenance == null ? {} : { manualAmendment: provenance }),
    };
    const normativeTrace = Array.isArray(resource.source_metadata?.normativeTrace)
      ? resource.source_metadata.normativeTrace
      : [];
    const titleSpecificationValues = titleSpecification.parameterIds.map((parameterId) => parameters[parameterId]);
    if (titleSpecificationValues.some((value) => typeof value !== "string")) {
      throw compilerError(`title specification parameter invalid ${resource.row_id}`, "DEFINITION_INTEGRITY_FAILED");
    }
    const normalizedTitleSpecificationValues = titleSpecificationValues.map((value) => String(value).trim());
    const joinedTitleSpecification = normalizedTitleSpecificationValues.filter(Boolean).join(", ");
    const boundedTitleSpecification = joinedTitleSpecification
      ? boundedText(joinedTitleSpecification, `${resource.row_id}.titleSpecification`, 500)
      : null;
    const canonicalTitleRu = boundedTitleSpecification == null
      ? resource.title_ru
      : titleSpecification.mode === "REPLACE"
        ? boundedTitleSpecification
        : `${resource.title_ru}${titleSpecification.separator}${boundedTitleSpecification}`;
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
    const override = overrides.get(rowId);
    if (override != null && (!override || typeof override !== "object" || Array.isArray(override))) {
      throw compilerError(`invalid row override ${rowId}`, "ROW_AMENDMENT_INVALID");
    }
    if (override != null) assertOnlyKeys(override, [
      "titleRu", "quantity", "unitPrice", "includedInEstimate", "includedInProcurement", "provenance",
    ], `row override ${rowId}`);
    const customProvenance = manualProvenance(custom.provenance, `customRows.${index}`);
    const overrideProvenance = override == null ? null : manualProvenance(override.provenance, rowId);
    const provenance = overrideProvenance ?? customProvenance;
    overrides.delete(rowId);
    const quantity = override != null && Object.prototype.hasOwnProperty.call(override, "quantity")
      ? nonNegativeNumericText(override.quantity, `${rowId}.quantity`, true)
      : nonNegativeNumericText(custom.quantity, `customRows.${index}.quantity`, true);
    const unitPrice = override != null && Object.prototype.hasOwnProperty.call(override, "unitPrice")
      ? nonNegativeNumericText(override.unitPrice, `${rowId}.unitPrice`, true)
      : nonNegativeNumericText(custom.unitPrice, `customRows.${index}.unitPrice`, true);
    const includedInEstimate = override?.includedInEstimate ?? custom.includedInEstimate;
    const includedInProcurement = includedInEstimate
      && (override?.includedInProcurement ?? custom.includedInProcurement);
    if (typeof includedInEstimate !== "boolean" || typeof includedInProcurement !== "boolean"
      || (includedInProcurement && !includedInEstimate)) {
      throw compilerError(`invalid custom row inclusion ${index}`, "ROW_AMENDMENT_INVALID");
    }
    const procurementEligible = custom.includedInProcurement === true;
    const section = boundedText(custom.section, `customRows.${index}.section`, 240);
    const category = boundedText(custom.category, `customRows.${index}.category`, 240);
    const titleRu = override?.titleRu == null
      ? boundedText(custom.titleRu, `customRows.${index}.titleRu`, 2_000)
      : boundedText(override.titleRu, `${rowId}.titleRu`, 2_000);
    const unitId = boundedText(custom.unitId, `customRows.${index}.unitId`, 120);
    if (quantity == null) {
      const needWithoutHash = {
        row_id: rowId,
        ordinal: nextOrdinal,
        resource_spec_id: null,
        section,
        category,
        title_ru: titleRu,
        unit_id: unitId,
        quantity: null,
        unit_price: unitPrice,
        need_state: "QUANTITY_REQUIRED" as const,
        missing_parameter_ids: [],
        selected: includedInEstimate,
        procurement_eligible: procurementEligible,
        formula_id: "manual_custom_quantity",
        calculation_trace: {
          compilerVersion: input.compilerVersion,
          rowId,
          semanticOwner: `manual:${clientRowId}`,
          physicalRowType: category,
          manualAmendment: provenance,
          preliminaryNeed: true,
          needState: "QUANTITY_REQUIRED",
          missingParameterIds: [],
        },
        normative_trace: [],
      };
      preliminaryNeeds.push({
        ...needWithoutHash,
        need_sha256: await input.hashJson(needWithoutHash),
      });
      rowIds.add(rowId);
      nextOrdinal += 1;
      continue;
    }
    const amount = multiply(quantity, unitPrice);
    addToTotal(amount, includedInEstimate);
    const rowWithoutHash: Record<string, unknown> = {
      row_id: rowId,
      ordinal: nextOrdinal,
      resource_spec_id: null,
      section,
      category,
      title_ru: titleRu,
      unit_id: unitId,
      quantity,
      unit_price: unitPrice,
      amount,
      currency_code: unitPrice == null ? null : input.currencyCode,
      procurement_eligible: procurementEligible,
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

  if (overrides.size > 0) {
    throw compilerError(`row override is not reachable: ${[...overrides.keys()][0]}`, "ROW_OVERRIDE_NOT_REACHED");
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
    preliminaryNeeds,
    totals,
    priceSnapshotIds,
    revisionProjection: {
      catalogId: input.catalogId,
      parameters,
      priceSnapshotIds,
      currencyCode: input.currencyCode,
      totals,
      rows: rows.map((row) => ({ rowId: row.row_id, rowSha256: row.row_sha256 })),
      preliminaryNeeds: preliminaryNeeds.map((need) => ({
        rowId: need.row_id,
        needSha256: need.need_sha256,
      })),
      compilerVersion: input.compilerVersion,
    },
  };
}
