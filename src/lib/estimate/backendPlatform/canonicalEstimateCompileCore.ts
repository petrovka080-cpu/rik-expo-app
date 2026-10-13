import { planCanonicalCompositionSelectionV1, type CanonicalEstimateCompositionSelectionV1 } from './canonicalEstimateCompositionSelectionV1';
import {assertCanonicalMachineHourDefinitionV1,parseCanonicalMachineHourPriceCoverageV1,resolveCanonicalMachineHourPriceCoverageV1,canonicalMachineHourPriceNeedsConfirmationV1} from './canonicalMachineHourPriceCoverageV1';
import {
  compareFormulaGraphDecimals,
  evaluateFormulaGraph,
  formulaAstInputParameterIds,
  type FormulaAst,
  type FormulaParameterValue,
} from "./formulaGraph";
import { inclusionGraphEvidenceParameterIds, resolveInclusionGraph } from "./inclusionGraph";
import { resolveCanonicalScopeRequirementV1 } from './canonicalScopeRequirementV1';
import { bindCanonicalPublicResourceSavedTitleV1 } from './canonicalPublicResourcePresentationV1';
import {
  canonicalNumericRelationDependencies,
  missingCanonicalNumericRelationParameterIds,
  validateCanonicalEstimateParameters,
} from "./parameterConstraints";
import { canonicalRoundDecimal } from "./canonicalEstimateDeterminism";
import { parseCanonicalFormulaOutputBoundsV1, validateCanonicalFormulaOutputBoundsV1 } from "./canonicalFormulaOutputBounds";
import { validateCanonicalDerivedQuantityEditPolicyV1, assertCanonicalDerivedQuantityAmendmentV1 } from './canonicalDerivedQuantityEditPolicyV1';
import {
  canonicalFixedQuantityStatedBySource,
  canonicalNormConstantQuantityBinding,
} from "./canonicalFormulaSourceBinding";
import {
  isCanonicalEstimatePhysicalNormBindingActiveV1,
  resolveCanonicalEstimatePhysicalNormApplicabilityV1,
} from "./canonicalEstimatePhysicalNormProjection";
import { planCanonicalEffectiveResourceQuantitiesV1 } from "./canonicalEffectiveResourceQuantityV1";
import { resolveCanonicalPurchaseBalanceV1, resolveCanonicalKnownPurchaseRequirementV1, validateCanonicalManualTransportQuantityV1, validateCanonicalPurchaseOrderQuantityV1 } from "./canonicalPurchaseBalanceV1";
import { resolveCanonicalPreliminaryParameterFormulasV1, canonicalMissingAutomaticParameterSourcesV1, PRELIMINARY_SOURCE_FORMULA } from './canonicalPreliminaryParameterFormulaV1';
import {
  planCanonicalCommercialCostCoverageV1, canonicalCommercialCoveredResourceGraphV1,
  assertCanonicalCommercialCoveredQuantityV1, assertCanonicalCommercialCostOwnersV1,
} from './canonicalCommercialCostCoverageV1';

export { canonicalRoundDecimal } from "./canonicalEstimateDeterminism";

export type CanonicalEstimateCompileOperation = "compile" | "recalculate";

export type CanonicalEstimateParameterDefinition = {
  parameter_id: string;
  unit_id?: string | null;
  value_type: string;
  required: boolean;
  default_value: unknown;
  constraints_json: Record<string, unknown> | null;
  truth_metadata?: Record<string, unknown> | null;
};

export type CanonicalEstimateFormulaDefinition = {
  formula_id: string;
  /** Persisted formula metadata; the evaluator itself consumes the compiled AST. */
  output_unit_id?: string;
  expression_source?: string;
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
  /** Required for an automatic price of an explicitly covered commercial package. */
  cost_scope_id?: string | null;
  machine_hour_price_coverage_v1?:unknown;
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

function resolveCanonicalResourceCostInclusion(
  resource: CanonicalEstimateResourceDefinition,
  override: Record<string, unknown> | undefined,
) {
  const payable = canonicalEstimateResourceIncludedByDefault(resource);
  const requestedEstimate = override?.includedInEstimate;
  const requestedProcurement = override?.includedInProcurement;
  if ((requestedEstimate != null && typeof requestedEstimate !== "boolean")
    || (requestedProcurement != null && typeof requestedProcurement !== "boolean")) {
    throw compilerError(`invalid row inclusion ${resource.row_id}`, "ROW_AMENDMENT_INVALID");
  }
  // Definition-owned cost treatment is an invariant, including for preliminary
  // needs. Keep the requested selection in the trace without losing other edits.
  const includedInEstimate = payable && requestedEstimate !== false;
  const includedInProcurement = includedInEstimate
    && (requestedProcurement == null ? resource.procurement_eligible : requestedProcurement === true);
  if (includedInProcurement && !resource.procurement_eligible) {
    throw compilerError(`invalid row inclusion ${resource.row_id}`, "ROW_AMENDMENT_INVALID");
  }
  const inclusionDecision = payable ? null : {
    source: "definition_cost_treatment",
    costTreatment: String(resource.resource_graph?.costTreatment ?? resource.source_metadata?.costTreatment).trim(),
    costTreatmentSource: resource.resource_graph?.costTreatment != null ? "resource_graph" : "source_metadata",
    requestedIncludedInEstimate: requestedEstimate ?? null,
    requestedIncludedInProcurement: requestedProcurement ?? null,
    effectiveIncludedInEstimate: includedInEstimate,
    effectiveIncludedInProcurement: includedInProcurement,
  };
  return { includedInEstimate, includedInProcurement, inclusionDecision };
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
  compositionSelectionV1?: CanonicalEstimateCompositionSelectionV1 | null;
  customRows?: Record<string, unknown>[];
  maximumResourceRows: number;
  maximumCustomRows?: number;
  hashJson: (value: unknown) => string | Promise<string>;
};

export type CanonicalEstimateCompileCoreResult = {
  compositionSelectionV1?: CanonicalEstimateCompositionSelectionV1;
  parameters: Record<string, unknown>;
  /** Exact lookup outputs added by the common compiler, excluding explicit/default values. */
  derivedParameters: Record<string, unknown>;
  rows: CanonicalEstimateCompiledRow[];
  preliminaryNeeds: CanonicalEstimateCompiledPreliminaryNeed[];
  totals: {
    amount: string;
    includedRowCount: number;
    excludedRowCount: number;
    pricedRowCount: number;
    unpricedRowCount: number;
    unconfirmedMachinePriceRowCount?:number;
    currencyCode: string;
  };
  priceSnapshotIds: string[];
  revisionProjection: {
    compositionSelectionV1?: CanonicalEstimateCompositionSelectionV1;
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

function normalizedExactLookupValue(
  value: unknown,
  definition: CanonicalEstimateParameterDefinition | undefined,
): unknown {
  if (definition?.value_type === "decimal"
    || definition?.value_type === "integer"
    || definition?.value_type === "number") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : value;
  }
  return value;
}

/**
 * Resolves a source-backed exact lookup declared on the target parameter.
 * The policy deliberately does not interpolate: a missing table tuple remains
 * a normal preliminary need and can only be replaced by an explicit value.
 */
function resolveCanonicalDerivedExactLookups(
  definitions: readonly CanonicalEstimateParameterDefinition[],
  inputParameters: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const definitionsById = new Map(definitions.map((definition) => [
    definition.parameter_id,
    definition,
  ]));
  const parameters = { ...inputParameters };
  for (const definition of definitions) {
    const rawPolicy = definition.truth_metadata?.derived_exact_lookup_v1;
    if (rawPolicy == null) continue;
    if (!rawPolicy || typeof rawPolicy !== "object" || Array.isArray(rawPolicy)) {
      throw compilerError(
        `derived exact lookup invalid ${definition.parameter_id}`,
        "DEFINITION_INTEGRITY_FAILED",
      );
    }
    const policy = rawPolicy as JsonRecord;
    const allowedKeys = new Set(["version", "inputParameterIds", "rows", "interpolation"]);
    const inputParameterIds = Array.isArray(policy.inputParameterIds)
      ? policy.inputParameterIds.map((value) => typeof value === "string" ? value.trim() : "")
      : [];
    const rows = Array.isArray(policy.rows) ? policy.rows : [];
    if (Object.keys(policy).some((key) => !allowedKeys.has(key))
      || policy.version !== "canonical-derived-exact-lookup:v1"
      || policy.interpolation !== "FORBIDDEN"
      || inputParameterIds.length === 0
      || inputParameterIds.length > 8
      || new Set(inputParameterIds).size !== inputParameterIds.length
      || inputParameterIds.includes(definition.parameter_id)
      || inputParameterIds.some((parameterId) =>
        !parameterId || !definitionsById.has(parameterId))
      || rows.length === 0
      || rows.length > 100) {
      throw compilerError(
        `derived exact lookup contract invalid ${definition.parameter_id}`,
        "DEFINITION_INTEGRITY_FAILED",
      );
    }

    const normalizedRows = new Map<string, unknown>();
    for (const rawRow of rows) {
      if (!rawRow || typeof rawRow !== "object" || Array.isArray(rawRow)) {
        throw compilerError(
          `derived exact lookup row invalid ${definition.parameter_id}`,
          "DEFINITION_INTEGRITY_FAILED",
        );
      }
      const row = rawRow as JsonRecord;
      const rowKeys = Object.keys(row);
      const inputValues = Array.isArray(row.inputValues) ? row.inputValues : [];
      if (rowKeys.some((key) => !["inputValues", "outputValue"].includes(key))
        || !Object.prototype.hasOwnProperty.call(row, "outputValue")
        || row.outputValue == null
        || typeof row.outputValue === "object"
        || inputValues.length !== inputParameterIds.length) {
        throw compilerError(
          `derived exact lookup row contract invalid ${definition.parameter_id}`,
          "DEFINITION_INTEGRITY_FAILED",
        );
      }
      const key = JSON.stringify(inputValues.map((value, index) =>
        normalizedExactLookupValue(value, definitionsById.get(inputParameterIds[index]!))));
      if (normalizedRows.has(key)) {
        throw compilerError(
          `derived exact lookup duplicate row ${definition.parameter_id}`,
          "DEFINITION_INTEGRITY_FAILED",
        );
      }
      normalizedRows.set(key, row.outputValue);
    }

    const currentValue = parameters[definition.parameter_id];
    const catalogueOwned = definition.truth_metadata?.catalogue_owned_lookup_v1 === true;
    if (catalogueOwned && definition.truth_metadata?.visibility_role !== 'USER_DERIVED_READONLY') {
      throw compilerError(`catalogue lookup ownership invalid ${definition.parameter_id}`, 'DEFINITION_INTEGRITY_FAILED');
    }
    if (!catalogueOwned && currentValue != null && currentValue !== "") continue;
    const actualInputs = inputParameterIds.map((parameterId) => parameters[parameterId]);
    if (actualInputs.some((value) => value == null || value === "")) {
      if (catalogueOwned && currentValue != null) throw compilerError(`Характеристика ${definition.parameter_id} требует выбранной системы.`, 'SOURCE_MANAGED_PARAMETER_OVERRIDE_NOT_ALLOWED');
      continue;
    }
    const actualKey = JSON.stringify(actualInputs.map((value, index) =>
      normalizedExactLookupValue(value, definitionsById.get(inputParameterIds[index]!))));
    if (normalizedRows.has(actualKey)) {
      if (catalogueOwned && currentValue != null && currentValue !== normalizedRows.get(actualKey)) {
        throw compilerError(`Характеристику ${definition.parameter_id} задаёт паспорт выбранного изделия.`, 'SOURCE_MANAGED_PARAMETER_OVERRIDE_NOT_ALLOWED');
      }
      parameters[definition.parameter_id] = normalizedRows.get(actualKey);
    } else if (catalogueOwned && currentValue != null) {
      throw compilerError(`Для характеристики ${definition.parameter_id} не подтверждён совместимый паспорт.`, 'SOURCE_MANAGED_PARAMETER_OVERRIDE_NOT_ALLOWED');
    }
  }
  return parameters;
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
  parameterLabelsRu: Record<string, string>;
  mode: "APPEND" | "REPLACE";
  separator: " — " | " ";
};

function canonicalParameterRequiredNow(
  definition: CanonicalEstimateParameterDefinition | undefined,
  parameters: Record<string, unknown>,
): boolean {
  if (!definition) return false;
  if (definition.required) return true;
  const constraints = definition.constraints_json;
  if (!constraints || typeof constraints !== "object" || Array.isArray(constraints)) return false;
  const requiredWhen = constraints.requiredWhen;
  if (!requiredWhen || typeof requiredWhen !== "object" || Array.isArray(requiredWhen)) return false;
  const condition = requiredWhen as Record<string, unknown>;
  if (typeof condition.kind === "string" && condition.kind.trim()) {
    try {
      return resolveInclusionGraph(condition, parameters).value === true;
    } catch {
      throw compilerError(
        `required parameter condition invalid ${definition.parameter_id}`,
        "DEFINITION_INTEGRITY_FAILED",
      );
    }
  }
  const parameterId = typeof condition.parameterId === "string" ? condition.parameterId : "";
  return Boolean(parameterId) && Object.prototype.hasOwnProperty.call(condition, "equals")
    && parameters[parameterId] === condition.equals;
}

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
  const rawLabels = resource.resource_graph?.titleSpecificationParameterLabelsRu;
  if (rawLabels != null && (!rawLabels || typeof rawLabels !== "object" || Array.isArray(rawLabels)
    || Object.entries(rawLabels).some(([id, label]) => !parameterIds.includes(id)
      || typeof label !== "string" || label.trim().length === 0 || label.length > 100 || !/[А-Яа-яЁё]/u.test(label)))) {
    throw compilerError(`title specification labels invalid ${resource.row_id}`, "DEFINITION_INTEGRITY_FAILED");
  }
  const parameterLabelsRu = Object.fromEntries(Object.entries(rawLabels ?? {}).map(([id,label]) => [id,String(label).trim()]));
  return {
    parameterIds,
    parameterLabelsRu,
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
  if (applicable == null || applicable === "") return;
  if (typeof applicable !== "boolean") {
    throw compilerError(
      `conditional applicability is required ${resource.row_id}:${applicabilityParameterId}`,
      `${errorCodeNamespace}_APPLICABILITY_REQUIRED:${applicabilityParameterId}`,
    );
  }
  for (const quantityParameterId of quantityParameterIds) {
    const rawQuantity = parameters[quantityParameterId];
    if (rawQuantity == null || rawQuantity === "") continue;
    const quantity = Number(rawQuantity);
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

function validateConditionalEnumPositiveQuantityPolicy(
  resource: CanonicalEstimateResourceDefinition,
  formula: CanonicalEstimateFormulaDefinition,
  parameters: Readonly<Record<string, unknown>>,
  definitionParameterIds: ReadonlySet<string>,
): void {
  const rawPolicy = resource.resource_graph?.conditionalEnumPositiveQuantityPolicyV1;
  if (rawPolicy == null) return;
  if (!rawPolicy || typeof rawPolicy !== "object" || Array.isArray(rawPolicy)) {
    throw compilerError(`conditional enum quantity policy invalid ${resource.row_id}`, "DEFINITION_INTEGRITY_FAILED");
  }
  const policy = rawPolicy as JsonRecord;
  const allowedKeys = new Set([
    "version",
    "selectorParameterId",
    "applicableValues",
    "notApplicableValues",
    "quantityParameterIds",
    "errorCodeNamespace",
  ]);
  if (Object.keys(policy).some((key) => !allowedKeys.has(key))
    || policy.version !== "canonical-conditional-enum-positive-quantity:v1") {
    throw compilerError(`conditional enum quantity policy contract invalid ${resource.row_id}`, "DEFINITION_INTEGRITY_FAILED");
  }
  const selectorParameterId = typeof policy.selectorParameterId === "string"
    ? policy.selectorParameterId.trim()
    : "";
  const applicableValues = Array.isArray(policy.applicableValues)
    ? policy.applicableValues.map((value) => typeof value === "string" ? value.trim() : "")
    : [];
  const notApplicableValues = Array.isArray(policy.notApplicableValues)
    ? policy.notApplicableValues.map((value) => typeof value === "string" ? value.trim() : "")
    : [];
  const quantityParameterIds = Array.isArray(policy.quantityParameterIds)
    ? policy.quantityParameterIds.map((value) => typeof value === "string" ? value.trim() : "")
    : [];
  const errorCodeNamespace = typeof policy.errorCodeNamespace === "string"
    ? policy.errorCodeNamespace.trim()
    : "";
  const inclusionAst = resource.inclusion_ast as JsonRecord;
  const selectorValues = [...applicableValues, ...notApplicableValues];
  if (!selectorParameterId
    || !definitionParameterIds.has(selectorParameterId)
    || applicableValues.length === 0 || notApplicableValues.length === 0
    || selectorValues.some((value) => !value)
    || new Set(selectorValues).size !== selectorValues.length
    || inclusionAst?.kind !== "in"
    || inclusionAst?.parameterId !== selectorParameterId
    || JSON.stringify(inclusionAst.values) !== JSON.stringify(applicableValues)
    || quantityParameterIds.length === 0 || quantityParameterIds.length > 8
    || quantityParameterIds.some((parameterId) => !parameterId
      || !definitionParameterIds.has(parameterId)
      || !formula.input_parameter_ids.includes(parameterId))
    || new Set(quantityParameterIds).size !== quantityParameterIds.length
    || !/^[A-Z][A-Z0-9_]{2,80}$/u.test(errorCodeNamespace)) {
    throw compilerError(`conditional enum quantity policy binding invalid ${resource.row_id}`, "DEFINITION_INTEGRITY_FAILED");
  }
  const selector = parameters[selectorParameterId];
  if (selector == null || selector === "") return;
  if (typeof selector !== "string" || !selectorValues.includes(selector)) {
    throw compilerError(
      `conditional enum selector is required ${resource.row_id}:${selectorParameterId}`,
      `${errorCodeNamespace}_SELECTOR_REQUIRED:${selectorParameterId}`,
    );
  }
  const applicable = applicableValues.includes(selector);
  for (const quantityParameterId of quantityParameterIds) {
    const rawQuantity = parameters[quantityParameterId];
    if (rawQuantity == null || rawQuantity === "") continue;
    const quantity = Number(rawQuantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw compilerError(
        `conditional enum quantity is invalid ${resource.row_id}:${quantityParameterId}`,
        `${errorCodeNamespace}_INVALID_NUMBER:${quantityParameterId}`,
      );
    }
    if (applicable && quantity <= 0) {
      throw compilerError(
        `applicable enum resource requires a positive quantity ${resource.row_id}:${quantityParameterId}`,
        `${errorCodeNamespace}_APPLICABLE_QUANTITY_REQUIRED:${quantityParameterId}`,
      );
    }
    if (!applicable && quantity !== 0) {
      throw compilerError(
        `non-applicable enum resource cannot retain quantity ${resource.row_id}:${quantityParameterId}`,
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
  if (text == null || text === "") return;
  if (typeof text !== "string") {
    throw compilerError(
      `labeled value is required ${resource.row_id}:${textParameterId}`,
      `${errorCodeNamespace}_${errorCodeSubject}_REQUIRED`,
    );
  }
  const waitsForFormulaInputs = formula.input_parameter_ids.some((parameterId) => {
    const value = parameters[parameterId];
    return value == null || value === "";
  });
  if (waitsForFormulaInputs) return;
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
  const effectiveQuantityPlan = planCanonicalEffectiveResourceQuantitiesV1(
    input.parameterDefinitions, input.resourceDefinitions, input.formulaDefinitions,
  );
  const compositionPlan = planCanonicalCompositionSelectionV1({selection: input.compositionSelectionV1,
    customRowIds:(input.customRows ?? []).map(row=>`manual:${String(row?.clientRowId ?? '')}`),
    resources: input.resourceDefinitions, formulas: input.formulaDefinitions});
  const initiallyValidatedParameters = validateCanonicalEstimateParameters(
    input.parameterDefinitions,
    effectiveQuantityPlan.stripIncoming(input.submittedParameters),
    {
      confirmedParameters: effectiveQuantityPlan.stripIncoming(input.confirmedParameters),
      baselineContext: { catalogId: input.catalogId },
    },
  );
  const explicitUnknownValues: Record<string, unknown> = {};
  const calculationInputs = { ...initiallyValidatedParameters };
  for (const definition of input.parameterDefinitions) {
    const unknownValues = definition.truth_metadata?.unknown_enum_values;
    if (unknownValues == null) continue;
    if (definition.value_type !== 'enum' || !Array.isArray(unknownValues) || unknownValues.length > 8
      || unknownValues.some(value => typeof value !== 'string' || !(definition.constraints_json?.values as unknown[] | undefined)?.includes(value))) {
      throw compilerError(`unknown choice policy invalid ${definition.parameter_id}`, 'DEFINITION_INTEGRITY_FAILED');
    }
    if (unknownValues.includes(calculationInputs[definition.parameter_id])) {
      explicitUnknownValues[definition.parameter_id] = calculationInputs[definition.parameter_id];
      delete calculationInputs[definition.parameter_id];
    }
  }
  const parameters = validateCanonicalEstimateParameters(
    input.parameterDefinitions,
    resolveCanonicalPreliminaryParameterFormulasV1(input.parameterDefinitions,
      resolveCanonicalDerivedExactLookups(input.parameterDefinitions, calculationInputs)),
    {
      confirmedParameters: {},
      baselineContext: { catalogId: input.catalogId },
    },
  );
  const derivedParameters = Object.fromEntries(Object.entries(parameters).filter(
    ([parameterId, value]) =>
      JSON.stringify(initiallyValidatedParameters[parameterId]) !== JSON.stringify(value),
  ));
  const preliminaryParameterIds = new Set(input.parameterDefinitions.filter(definition =>
    definition.truth_metadata?.runtime_profile_classification === PRELIMINARY_SOURCE_FORMULA
    && Object.hasOwn(derivedParameters, definition.parameter_id)).map(definition => definition.parameter_id));
  const formulaParameters = Object.fromEntries(
    Object.entries(parameters).filter(([, value]) =>
      typeof value === "number" || typeof value === "string" || typeof value === "boolean"),
  ) as Record<string, FormulaParameterValue>;
  const parameterDefinitionsById = new Map(
    input.parameterDefinitions.map((parameter) => [parameter.parameter_id, parameter]),
  );
  const definitionParameterIds = new Set(parameterDefinitionsById.keys());
  const numericRelationDependencies = canonicalNumericRelationDependencies(input.parameterDefinitions);
  const formulas = new Map(input.formulaDefinitions.map((formula) => [formula.formula_id, formula]));
  const prices = new Map<string, CanonicalEstimatePriceItem>();
  const scopedPrices = new Map<string, CanonicalEstimatePriceItem>();
  for (const item of input.priceItems ?? []) {
    const key = `${item.price_key}:${item.unit_id}`;
    if (!prices.has(key)) prices.set(key, item);
    if (typeof item.cost_scope_id === 'string' && item.cost_scope_id.trim()) {
      const scopedKey = JSON.stringify([key, item.cost_scope_id]);
      if (!scopedPrices.has(scopedKey)) scopedPrices.set(scopedKey, item);
    }
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
  const commercialCoverage = planCanonicalCommercialCostCoverageV1(
    input.resourceDefinitions, parameters, new Map(input.parameterDefinitions.map(p => [p.parameter_id, p.unit_id])),
    rawOverrides, input.formulaDefinitions, new Map(input.parameterDefinitions.map(p => [p.parameter_id, p.value_type])),
  );
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

  const unresolvedEffectiveOutputs = new Map<string, string[]>();
  const scopeResourceIds = new Set(input.resourceDefinitions.map(r=>r.row_id));
  const scopeExcludedOperationDefinitionIds=new Set(input.resourceDefinitions.filter(r=>compositionPlan.operationsExcludeRow(r.row_id)).map(r=>r.row_id));
  const missingAutomaticSources = canonicalMissingAutomaticParameterSourcesV1(input.parameterDefinitions, parameters);
  const originalMissingIds = (ids: readonly string[]): string[] => missingAutomaticSources([...new Set(ids.flatMap(id =>
    effectiveQuantityPlan.owners.has(id) ? unresolvedEffectiveOutputs.get(id) ?? [] : [id],
  ))]);
  for (const resource of effectiveQuantityPlan.ordered) {
    const formula = formulas.get(resource.formula_id);
    if (!formula) throw compilerError("formula graph reference missing", "DEFINITION_INTEGRITY_FAILED");
    const formulaOutputBounds = parseCanonicalFormulaOutputBoundsV1(
      resource.resource_graph?.formulaOutputBoundsV1, resource.unit_id, formula.output_unit_id, resource.row_id,
    );
    const derivedQuantityEditPolicy = validateCanonicalDerivedQuantityEditPolicyV1(
      resource.resource_graph?.derivedQuantityEditPolicyV1, resource.row_id, resource.unit_id,
      formula.output_unit_id, formula.input_parameter_ids, definitionParameterIds, formulaAstInputParameterIds(formula.ast),
    );
    const override = overrides.get(resource.row_id);
    if (override != null && (!override || typeof override !== "object" || Array.isArray(override))) {
      throw compilerError(`invalid row override ${resource.row_id}`, "ROW_AMENDMENT_INVALID");
    }
    if (override != null) assertOnlyKeys(override, [
      "titleRu", "quantity", "unitPrice", "machineHourPriceCoverageV1", "includedInEstimate", "includedInProcurement", "provenance",
    ], `row override ${resource.row_id}`);
    const machinePriceRequirement=assertCanonicalMachineHourDefinitionV1({catalogId:input.catalogId,rowId:resource.row_id,unitId:resource.unit_id,sourceMetadata:resource.source_metadata});
    if(override?.machineHourPriceCoverageV1!=null&&(!machinePriceRequirement||!parseCanonicalMachineHourPriceCoverageV1(override.machineHourPriceCoverageV1)))
      throw compilerError(`machine-hour price evidence invalid ${resource.row_id}`,'ROW_AMENDMENT_INVALID');
    const provenance = override == null ? null : manualProvenance(override.provenance, resource.row_id);
    const effectiveOutput = effectiveQuantityPlan.outputs.get(resource.row_id);
    const excludeKnownZero = resource.resource_graph?.excludeKnownZeroQuantityV1;
    if (excludeKnownZero != null && (typeof excludeKnownZero !== 'boolean'
      || (excludeKnownZero && (commercialCoverage.members.has(resource.row_id)
        || commercialCoverage.owners.has(resource.row_id))))) {
      throw compilerError(`known zero exclusion policy invalid ${resource.row_id}`, 'DEFINITION_INTEGRITY_FAILED');
    }
    overrides.delete(resource.row_id);
    const inclusion = resolveInclusionGraph(resource.inclusion_ast, parameters);
    validateConditionalPositiveQuantityPolicy(resource, formula, parameters, definitionParameterIds);
    validateConditionalEnumPositiveQuantityPolicy(resource, formula, parameters, definitionParameterIds);
    validateFormulaLabeledValueConsistencyPolicy(
      resource,
      formula,
      formulaParameters,
      parameters,
      definitionParameterIds,
    );
    const compositionDecision = compositionPlan.decision(resource.row_id);
    const activeFormulaInputIds = compositionPlan.activeInputIds(resource.row_id, formula.input_parameter_ids);
    const missingFormulaParameterIds = activeFormulaInputIds.filter((parameterId) => {
      const value = formulaParameters[parameterId];
      return value === undefined || value === null || value === "";
    });
    const manualQuantity = override != null
      && Object.prototype.hasOwnProperty.call(override, "quantity")
      && override.quantity != null
      ? nonNegativeNumericText(override.quantity, `${resource.row_id}.quantity`)
      : null;
    const inclusionOnlyWaitsForFormulaInputs = inclusion.value == null
      && inclusion.missingParameterIds.every((parameterId) => formula.input_parameter_ids.includes(parameterId));
    const inclusionResolvedByManualQuantity = effectiveOutput == null && formulaOutputBounds == null && manualQuantity != null
      && inclusionOnlyWaitsForFormulaInputs && !inclusion.missingParameterIds.some(id => effectiveQuantityPlan.owners.has(id));
    assertCanonicalDerivedQuantityAmendmentV1(derivedQuantityEditPolicy, manualQuantity);
    if(manualQuantity != null && compositionPlan.partiallyAllocated(resource.row_id))
      throw compilerError('Сохранённое ручное количество общего ресурса нельзя распределить между изменёнными подработами. Ручные данные сохранены в исходной смете.', 'COMPOSITION_MANUAL_QUANTITY_REVIEW_REQUIRED');
    if (inclusion.value === false) continue;
    if (manualQuantity != null && originalMissingIds(missingFormulaParameterIds).some(id =>
      parameterDefinitionsById.get(id)?.truth_metadata?.value_source_role === 'UNRESOLVED_APPLICATION_NORM')) {
      throw compilerError(`source-owned norm quantity cannot be replaced by a manual row quantity ${resource.row_id}`,
        'ROW_AMENDMENT_INVALID');
    }
    const commercialOwner = commercialCoverage.members.get(resource.row_id);
    const commercialRate = commercialCoverage.owners.get(resource.row_id);
    const commercialScopeParameterId = commercialRate == null ? null : commercialRate.rateBasis.kind === 'PER_MEASURE'
      ? commercialRate.rateBasis.parameterId : commercialRate.rateBasis.scopeParameterId;
    const missingCommercialScopeParameterIds = commercialScopeParameterId != null
      && (parameters[commercialScopeParameterId] == null || parameters[commercialScopeParameterId] === '')
      ? [commercialScopeParameterId] : [];
    let effectiveResourceGraph = canonicalCommercialCoveredResourceGraphV1(compositionPlan.graph(resource.row_id, resource.resource_graph), commercialOwner, resource.row_id,
      commercialRate);
    const scopeRequirementDecision = effectiveResourceGraph.scopeRequirementV1 == null ? null : resolveCanonicalScopeRequirementV1({ graph: effectiveResourceGraph,
      rowId: resource.row_id, parameters, parameterIds: definitionParameterIds,
      resourceIds: scopeResourceIds,
      excludedOperationDefinitionRowIds:scopeExcludedOperationDefinitionIds,
      excludedQuantityRowIds: new Set(rows.filter(r=>(r.calculation_trace as JsonRecord)?.physicalScopeExcludedV1 != null).map(r=>r.row_id)),
      excludedOperationResourceRowIds: new Set(rows.filter(r=>compositionPlan.decision(r.row_id).excludedBy==='OPERATIONS').map(r=>r.row_id)),
      knownQuantityRowIds: new Set(rows.filter(r => r.quantity != null
        && !(r.calculation_trace as JsonRecord)?.physicalScopeExcludedV1).map(r => r.row_id)) });
    if (scopeRequirementDecision) effectiveResourceGraph = {...effectiveResourceGraph,scopeRequirementDecisionV1:scopeRequirementDecision};
    const costInclusion = resolveCanonicalResourceCostInclusion(
      commercialOwner ? { ...resource, resource_graph: effectiveResourceGraph } : resource, override,
    );
    const { inclusionDecision } = costInclusion;
    let { includedInEstimate } = costInclusion;
    let { includedInProcurement } = costInclusion;

    if (compositionDecision.excluded) {
      if(scopeRequirementDecision) effectiveResourceGraph={...effectiveResourceGraph,
        scopeRequirementDecisionV1:{...scopeRequirementDecision,status:'USER_EXCLUDED',missingObjectFactParameterIds:[]}};
      if (commercialOwner || commercialRate) throw compilerError('Исключение физического ресурса требует пересчёта состава комплексной расценки.', 'COMPOSITION_COMMERCIAL_SCOPE_CONFLICT');
      const priceKey = resource.cost_owner_id || resource.row_id;
      const price = prices.get(`${priceKey}:${resource.unit_id}`);
      if (price && price.currency_code !== input.currencyCode) throw compilerError('mixed currency snapshot', 'PRICE_CURRENCY_MISMATCH');
      const unitPrice = override != null && Object.hasOwn(override, 'unitPrice')
        ? nonNegativeNumericText(override.unitPrice, `${resource.row_id}.unitPrice`, true) : price ? String(price.unit_price) : null;
      const excludedMachinePrice=machinePriceRequirement==null?null:resolveCanonicalMachineHourPriceCoverageV1({catalogId:input.catalogId,rowId:resource.row_id,unitId:resource.unit_id,currencyCode:input.currencyCode,unitPrice,
        evidence:override!=null&&Object.hasOwn(override,'unitPrice')?override.machineHourPriceCoverageV1:price?.machine_hour_price_coverage_v1,
        manual:override!=null&&Object.hasOwn(override,'unitPrice'),manualProvenanceReason:provenance?.reason,snapshotId:price?.snapshot_id,priceKey});
      const rowWithoutHash = {row_id:resource.row_id,ordinal:resource.ordinal,resource_spec_id:resource.id,
        section:resource.section,category:resource.category,
        title_ru:override?.titleRu == null ? resource.title_ru : boundedText(override.titleRu,`${resource.row_id}.titleRu`,2000),
        unit_id:resource.unit_id,quantity:'0',unit_price:unitPrice,amount:unitPrice==null?null:'0',currency_code:unitPrice==null?null:input.currencyCode,
        procurement_eligible:resource.procurement_eligible,included_in_estimate:false,included_in_procurement:false,ownership_status:'OWNED_EXCLUDED',
        calculation_trace:{compilerVersion:input.compilerVersion,formulaId:resource.formula_id,formulaAstSha256:formula.ast_sha256,
          inputParameterIds:formula.input_parameter_ids,resourceGraph:effectiveResourceGraph,
          ...(excludedMachinePrice==null?{}:{machineHourPriceCoverageV1:excludedMachinePrice}),
          ...(derivedQuantityEditPolicy == null ? {} : { derivedQuantityEditPolicy }),
          physicalScopeExcludedV1:{reason:'USER_EXCLUDED',previousManualQuantity:manualQuantity},
          ...(provenance?{manualAmendment:provenance}:{}),...(override?.titleRu==null?{}:{manualTitleOverride:true}),
          ...(effectiveOutput?{effectiveQuantityOutput:{...effectiveOutput,sourceRowId:resource.row_id,acceptedQuantity:'0',basis:'USER_EXCLUDED'}}:{})},
        normative_trace:resource.source_metadata?.normativeTrace ?? [],legacy_row_payload:null,
        price_snapshot_id:override != null && Object.hasOwn(override,'unitPrice') ? null : price?.snapshot_id ?? null,
        price_route_id:price?.estimate_price_snapshot?.route_id ?? null,
        price_resolution_trace:{kind:override != null && Object.hasOwn(override,'unitPrice')?'manual_override':'snapshot',...(provenance?{provenance}:{}),priceKey,resolved:unitPrice!=null}};
      rows.push({...rowWithoutHash,row_sha256:await input.hashJson(rowWithoutHash)} as CanonicalEstimateCompiledRow);
      rowIds.add(resource.row_id);
      if (effectiveOutput) {
        parameters[effectiveOutput.parameterId]='0';formulaParameters[effectiveOutput.parameterId]='0';derivedParameters[effectiveOutput.parameterId]='0';
      }
      continue;
    }

    const physicalBinding = resource.resource_graph?.professionalPhysicalNormBindingV1;
    const physicalBindingRecord = physicalBinding != null
      && typeof physicalBinding === "object"
      && !Array.isArray(physicalBinding)
      ? physicalBinding as JsonRecord
      : null;
    const physicalBindingActive = physicalBindingRecord != null
      && isCanonicalEstimatePhysicalNormBindingActiveV1({
        parameters,
        resourceGraph: resource.resource_graph,
      });
    const rawPhysicalApplicabilityParameterIds = physicalBindingRecord?.applicability_parameter_ids
      ?? physicalBindingRecord?.consumed_parameter_ids;
    const physicalApplicabilityParameterIds = Array.isArray(rawPhysicalApplicabilityParameterIds)
      ? rawPhysicalApplicabilityParameterIds.map(String).filter(Boolean)
      : [];
    const missingPhysicalNormParameterIds = physicalBindingActive
      ? physicalApplicabilityParameterIds.filter((parameterId) => {
        const value = parameters[parameterId];
        return value == null || value === "";
      })
      : [];

    let appliedPhysicalNorm: ReturnType<typeof resolveCanonicalEstimatePhysicalNormApplicabilityV1> = null;
    if (physicalBindingActive && missingPhysicalNormParameterIds.length === 0) {
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
    const titleSpecificationValues = titleSpecification.parameterIds.map((parameterId) => {
      const value = parameters[parameterId];
      const declaredType = parameterDefinitionsById.get(parameterId)?.value_type;
      const typedValue = typeof value === "number" && Number.isFinite(value)
        && (declaredType === "decimal" || (declaredType === "integer" && Number.isInteger(value)))
        ? String(value) : value;
      const label = Object.prototype.hasOwnProperty.call(titleSpecification.parameterLabelsRu, parameterId)
        ? titleSpecification.parameterLabelsRu[parameterId] : undefined;
      return label && typeof typedValue === "string" && typedValue.trim()
        ? `${label}: ${typedValue.trim()}` : typedValue;
    });
    if (titleSpecificationValues.some((value) => value != null && typeof value !== "string")) {
      throw compilerError(`title specification parameter invalid ${resource.row_id}`, "DEFINITION_INTEGRITY_FAILED");
    }
    const missingTitleSpecificationParameterIds = titleSpecification.parameterIds.filter((parameterId) => {
      const value = parameters[parameterId];
      return value == null || (typeof value === "string" && value.trim() === "");
    });
    const missingRequiredTitleSpecificationParameterIds = missingTitleSpecificationParameterIds.filter(
      (parameterId) => canonicalParameterRequiredNow(parameterDefinitionsById.get(parameterId), parameters)
        // An explicit spare order still needs an exact product even if installed consumption is zero.
        || (excludeKnownZero === true && manualQuantity != null && compareFormulaGraphDecimals(manualQuantity, '0') > 0),
    );
    const rawConsumerParameterIds = resource.resource_graph?.inputParameterIds;
    if (rawConsumerParameterIds != null && (
      !Array.isArray(rawConsumerParameterIds) ||
      rawConsumerParameterIds.some((parameterId) =>
        typeof parameterId !== "string" || !definitionParameterIds.has(parameterId)
      )
    )) {
      throw compilerError(
        `resource input parameters invalid ${resource.row_id}`,
        "DEFINITION_INTEGRITY_FAILED",
      );
    }
    const missingRequiredConsumerParameterIds = (Array.isArray(rawConsumerParameterIds)
      ? rawConsumerParameterIds
      : []).filter((parameterId): parameterId is string => {
      if (typeof parameterId !== "string") return false;
      const value = parameters[parameterId];
      return (value == null || (typeof value === "string" && value.trim() === ""))
        && canonicalParameterRequiredNow(parameterDefinitionsById.get(parameterId), parameters);
    });
    const normalizedTitleSpecificationValues = titleSpecificationValues.flatMap((value) => {
      if (typeof value !== "string") return [];
      const normalized = value.trim();
      return normalized ? [normalized] : [];
    });
    const missingNumericRelationParameterIds = missingCanonicalNumericRelationParameterIds(
      numericRelationDependencies,
      [
        ...formula.input_parameter_ids,
        ...inclusionGraphEvidenceParameterIds(resource.inclusion_ast, parameters, ids =>
          missingCanonicalNumericRelationParameterIds(numericRelationDependencies, ids, parameters).length),
        ...(Array.isArray(rawConsumerParameterIds) ? rawConsumerParameterIds as string[] : []),
        ...titleSpecification.parameterIds,
        ...(physicalBindingActive ? physicalApplicabilityParameterIds : []),
      ],
      parameters,
    );
    const formulaQuantity = missingFormulaParameterIds.length === 0
      ? compositionPlan.quantity(resource.row_id, formulaParameters, () => evaluateFormulaGraph(formula.ast, formulaParameters))
      : null;
    assertCanonicalCommercialCoveredQuantityV1(commercialOwner, manualQuantity, formulaQuantity);
    const formulaOutputBoundsTrace = formulaOutputBounds != null && inclusion.value === true && formulaQuantity != null
      ? validateCanonicalFormulaOutputBoundsV1(formulaOutputBounds, formulaQuantity, resource.row_id)
      : null;
    const missingEffectiveParameterIds = missingFormulaParameterIds.filter(id => effectiveQuantityPlan.owners.has(id));
    const missingFormulaBlocksQuantity = missingFormulaParameterIds.length > 0
      && (effectiveOutput != null || manualQuantity == null || formulaOutputBounds != null || missingEffectiveParameterIds.length > 0
        || resource.resource_graph?.purchaseBalanceV1 != null || resource.resource_graph?.manualTransportQuantityPolicyV1 != null);

    const joinedTitleSpecification = normalizedTitleSpecificationValues.join(", ");
    // Several individually validated project facts can exceed one field's 500-character limit.
    const boundedTitleSpecification = joinedTitleSpecification
      ? boundedText(joinedTitleSpecification, `${resource.row_id}.titleSpecification`, 2_000)
      : null;
    const canonicalTitleRu = boundedTitleSpecification == null
      ? resource.title_ru
      : titleSpecification.mode === "REPLACE"
        ? boundedTitleSpecification
        : `${resource.title_ru}${titleSpecification.separator}${boundedTitleSpecification}`;

    if ((inclusion.value == null && !inclusionResolvedByManualQuantity)
      || missingFormulaBlocksQuantity
      || (missingPhysicalNormParameterIds.length > 0 && (manualQuantity == null || effectiveOutput != null))
      || missingRequiredTitleSpecificationParameterIds.length > 0
      || missingRequiredConsumerParameterIds.length > 0
      || missingNumericRelationParameterIds.length > 0
      || missingCommercialScopeParameterIds.length > 0) {
      let needState = missingNumericRelationParameterIds.length > 0
        || missingCommercialScopeParameterIds.length > 0
        || (inclusion.value == null && !inclusionOnlyWaitsForFormulaInputs)
        ? "CONDITION_REQUIRED" as const
        : missingFormulaBlocksQuantity
          || (missingPhysicalNormParameterIds.length > 0 && manualQuantity == null)
          ? "QUANTITY_REQUIRED" as const
          : "CONDITION_REQUIRED" as const;
      let missingParameterIds = originalMissingIds([
        ...(needState === "CONDITION_REQUIRED" ? inclusion.missingParameterIds : []),
        ...(missingFormulaBlocksQuantity ? missingFormulaParameterIds : []),
        ...(manualQuantity == null || effectiveOutput != null ? missingPhysicalNormParameterIds : []),
        ...missingRequiredTitleSpecificationParameterIds,
        ...missingRequiredConsumerParameterIds,
        ...missingNumericRelationParameterIds,
        ...missingCommercialScopeParameterIds,
      ]);
      if (scopeRequirementDecision) {
        needState = 'CONDITION_REQUIRED';
        missingParameterIds = scopeRequirementDecision.missingObjectFactParameterIds;
      }
      if (effectiveOutput) unresolvedEffectiveOutputs.set(effectiveOutput.parameterId, missingParameterIds);
      // Required physical facts remain selected even when their payment is covered.
      const selected = includedInEstimate || commercialOwner != null;
      const unitPrice = override != null && Object.prototype.hasOwnProperty.call(override, "unitPrice")
        ? nonNegativeNumericText(override.unitPrice, `${resource.row_id}.unitPrice`, true)
        : null;
      const knownQuantity = manualQuantity ?? formulaQuantity;
      if (manualQuantity != null) {
        validateCanonicalPurchaseOrderQuantityV1(resource.resource_graph?.purchaseBalanceV1,
          resource.row_id, resource.unit_id, manualQuantity, formulaParameters, definitionParameterIds);
      }
      // Known specifications remain part of the same saved need even while
      // its quantity or other conditions are unresolved. An incomplete
      // REPLACE selection retains the original identity until it is complete.
      const preliminaryTitleRu = override?.titleRu != null
        ? boundedText(override.titleRu, `${resource.row_id}.titleRu`, 2_000)
        : titleSpecification.mode === 'REPLACE' && missingRequiredTitleSpecificationParameterIds.length > 0
          ? resource.title_ru : canonicalTitleRu;
      const preliminaryResourceGraph = bindCanonicalPublicResourceSavedTitleV1({ graph: effectiveResourceGraph,
        sourceTitleRu: resource.title_ru, savedTitleRu: preliminaryTitleRu,
        appendedSpecificationRu: titleSpecification.mode === 'APPEND' ? boundedTitleSpecification : null,
        manualTitleOverride: override?.titleRu != null });
      const purchaseRequirement = resolveCanonicalKnownPurchaseRequirementV1(resource.resource_graph?.purchaseBalanceV1,
        resource.row_id, resource.unit_id, formulaParameters, definitionParameterIds, inclusion.value == null, preliminaryParameterIds);
      const needWithoutHash = {
        row_id: resource.row_id,
        ordinal: resource.ordinal,
        resource_spec_id: resource.id,
        section: resource.section,
        category: resource.category,
        title_ru: preliminaryTitleRu,
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
          resourceGraph: preliminaryResourceGraph,
          ...(derivedQuantityEditPolicy == null ? {} : { derivedQuantityEditPolicy }),
          ...(titleSpecification.parameterIds.length === 0 ? {} : { titleSpecification: {
            mode: titleSpecification.mode, parameterIds: titleSpecification.parameterIds,
            resolvedParameterIds: titleSpecification.parameterIds.filter(id => !missingTitleSpecificationParameterIds.includes(id)),
            missingParameterIds: missingTitleSpecificationParameterIds,
          } }),
          preliminaryNeed: true,
          ...(purchaseRequirement == null ? {} : { purchaseRequirementV1: purchaseRequirement }),
          ...(override?.titleRu == null ? {} : { manualTitleOverride: true }),
          needState,
          missingParameterIds,
          ...(inclusionDecision == null ? {} : { inclusionDecision }),
          ...(formulaOutputBoundsTrace == null ? {} : { formulaOutputBounds: formulaOutputBoundsTrace }),
          ...(provenance == null ? {} : { manualAmendment: provenance }),
          ...(manualQuantity == null ? {} : {
            manualQuantityOverride: true,
            calculatedQuantityBeforeOverride: formulaQuantity,
          }),
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

    const calculatedQuantity = manualQuantity ?? formulaQuantity!;
    const priceKey = resource.cost_owner_id || resource.row_id;
    const priceItemKey = `${priceKey}:${resource.unit_id}`;
    const price = commercialOwner ? undefined : commercialRate
      ? scopedPrices.get(JSON.stringify([priceItemKey, commercialRate.scopeId])) ?? prices.get(priceItemKey)
      : prices.get(priceItemKey);
    if (price && commercialRate && price.cost_scope_id !== commercialRate.scopeId
      && !Object.prototype.hasOwnProperty.call(override ?? {}, 'unitPrice')) {
      throw compilerError('Цена комплекса не соответствует подтверждённому составу расценки.', 'PRICE_SCOPE_MISMATCH');
    }
    if (price && price.currency_code !== input.currencyCode) {
      throw compilerError("mixed currency snapshot", "PRICE_CURRENCY_MISMATCH");
    }
    const quantity = override?.quantity == null
      ? calculatedQuantity
      : nonNegativeNumericText(override.quantity, `${resource.row_id}.quantity`)!;
    const purchaseBalance = resolveCanonicalPurchaseBalanceV1(resource.resource_graph?.purchaseBalanceV1,
      resource.row_id, resource.unit_id, quantity, formulaParameters, definitionParameterIds);
    if (purchaseBalance && !purchaseBalance.procurementReady) includedInProcurement = false;
    const transportQuantity = validateCanonicalManualTransportQuantityV1(resource.resource_graph?.manualTransportQuantityPolicyV1,
      resource.row_id, resource.unit_id, manualQuantity, formulaQuantity!);
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
    // Retain the canonical physical row and its trace, but require no price or purchase
    // for a proved zero. A manual spare order or a shortage must remain visible.
    const knownZeroExcluded = excludeKnownZero === true && formulaQuantity != null
      && compareFormulaGraphDecimals(formulaQuantity, '0') === 0
      && compareFormulaGraphDecimals(quantity, '0') === 0
      && (purchaseBalance == null || (compareFormulaGraphDecimals(purchaseBalance.consumed, '0') === 0
        && compareFormulaGraphDecimals(purchaseBalance.reserve, '0') === 0 && purchaseBalance.procurementReady));
    if (knownZeroExcluded) {
      includedInEstimate = false;
      includedInProcurement = false;
    }
    const amount = multiply(quantity, unitPrice);
    addToTotal(amount, includedInEstimate);
    const manualMachinePrice=override!=null&&Object.hasOwn(override,'unitPrice');
    const machineHourPriceCoverageV1=machinePriceRequirement==null?null:resolveCanonicalMachineHourPriceCoverageV1({
      catalogId:input.catalogId,rowId:resource.row_id,unitId:resource.unit_id,currencyCode:input.currencyCode,unitPrice,
      evidence:manualMachinePrice?override?.machineHourPriceCoverageV1:price?.machine_hour_price_coverage_v1,
      manual:manualMachinePrice,manualProvenanceReason:provenance?.reason,snapshotId:price?.snapshot_id,priceKey});
    const calculationTrace = {
      compilerVersion: input.compilerVersion,
      formulaId: resource.formula_id,
      formulaAstSha256: formula.ast_sha256,
      inputParameterIds: formula.input_parameter_ids,
      resourceGraph: resourceGraphForRevision(effectiveResourceGraph, parameters, resource.row_id),
      ...(machineHourPriceCoverageV1==null?{}:{machineHourPriceCoverageV1}),
      ...(derivedQuantityEditPolicy == null ? {} : { derivedQuantityEditPolicy }),
      ...(inclusionDecision == null ? {} : { inclusionDecision }),
      ...(knownZeroExcluded ? { knownZeroExclusionV1: { calculatedQuantity: formulaQuantity, orderedQuantity: quantity } } : {}),
      ...(purchaseBalance == null ? {} : { purchaseBalance }),
      ...(transportQuantity == null ? {} : { transportQuantity }),
      ...(effectiveOutput == null ? {} : { effectiveQuantityOutput: {
        ...effectiveOutput, sourceRowId: resource.row_id, acceptedQuantity: quantity,
        basis: manualQuantity == null ? "formula" : "manual_override",
      } }),
      ...(titleSpecification.parameterIds.length === 0 ? {} : {
        titleSpecification: {
          mode: titleSpecification.mode,
          parameterIds: titleSpecification.parameterIds,
          resolvedParameterIds: titleSpecification.parameterIds.filter(
            (parameterId) => !missingTitleSpecificationParameterIds.includes(parameterId),
          ),
          missingParameterIds: missingTitleSpecificationParameterIds,
        },
      }),
      ...(physicalNormQuantityParity == null ? {} : { physicalNormQuantityParity }),
      ...(formulaOutputBoundsTrace == null ? {} : { formulaOutputBounds: formulaOutputBoundsTrace }),
      ...(provenance == null ? {} : { manualAmendment: provenance }),
      ...(override?.titleRu == null ? {} : { manualTitleOverride: true }),
      ...(manualQuantity == null ? {} : {
        manualQuantityOverride: true,
        calculatedQuantityBeforeOverride: formulaQuantity,
      }),
    };
    const normativeTrace = Array.isArray(resource.source_metadata?.normativeTrace)
      ? resource.source_metadata.normativeTrace
      : [];

    const manuallyPriced = provenance != null && Object.prototype.hasOwnProperty.call(override!, "unitPrice");
    calculationTrace.resourceGraph = bindCanonicalPublicResourceSavedTitleV1({ graph: calculationTrace.resourceGraph,
      sourceTitleRu: resource.title_ru, savedTitleRu: canonicalTitleRu,
      appendedSpecificationRu: titleSpecification.mode === 'APPEND' ? boundedTitleSpecification : null,
      manualTitleOverride: override?.titleRu != null });
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
      ...(purchaseBalance == null ? {} : { procurement_readiness: purchaseBalance.procurementReady ? "READY" : "SHORTAGE" }),
      ownership_status: includedInEstimate ? "OWNED" : "OWNED_EXCLUDED",
      calculation_trace: calculationTrace,
      normative_trace: normativeTrace,
      legacy_row_payload: null,
      price_snapshot_id: manuallyPriced ? null : price?.snapshot_id ?? null,
      price_route_id: manuallyPriced ? null : price?.estimate_price_snapshot?.route_id ?? null,
      price_resolution_trace: manuallyPriced
        ? { kind: "manual_override", provenance, resolved: unitPrice != null }
        : price ? { priceKey, resolved: true,
          ...(commercialRate ? { costScopeId: price.cost_scope_id, costScopeMatched: true } : {})
        } : { priceKey, resolved: false },
    };
    const row = {
      ...rowWithoutHash,
      row_sha256: await input.hashJson(rowWithoutHash),
    } as CanonicalEstimateCompiledRow;
    rows.push(row);
    if (effectiveOutput) {
      parameters[effectiveOutput.parameterId] = quantity;
      formulaParameters[effectiveOutput.parameterId] = quantity;
      derivedParameters[effectiveOutput.parameterId] = quantity;
    }
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
    const submittedCustomQuantity = override != null && Object.prototype.hasOwnProperty.call(override, "quantity")
      ? nonNegativeNumericText(override.quantity, `${rowId}.quantity`, true)
      : nonNegativeNumericText(custom.quantity, `customRows.${index}.quantity`, true);
    const physicallyExcluded=compositionPlan.decision(rowId).excluded;
    const quantity=physicallyExcluded ? '0' : submittedCustomQuantity;
    const unitPrice = override != null && Object.prototype.hasOwnProperty.call(override, "unitPrice")
      ? nonNegativeNumericText(override.unitPrice, `${rowId}.unitPrice`, true)
      : nonNegativeNumericText(custom.unitPrice, `customRows.${index}.unitPrice`, true);
    const includedInEstimate = physicallyExcluded ? false : override?.includedInEstimate ?? custom.includedInEstimate;
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
        ...(physicallyExcluded ? {physicalScopeExcludedV1:{reason:'USER_EXCLUDED',previousManualQuantity:submittedCustomQuantity},
          resourceGraph:compositionPlan.graph(rowId,{costTreatment:'OWN_COST'})} : {}),
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

  assertCanonicalCommercialCostOwnersV1(commercialCoverage, parameters, rows, preliminaryNeeds);
  rows.sort((left, right) => left.ordinal - right.ordinal);
  preliminaryNeeds.sort((left, right) => left.ordinal - right.ordinal);
  const totals = {
    amount: totalAmount,
    includedRowCount: rows.filter((row) => row.included_in_estimate).length,
    excludedRowCount: rows.filter((row) => !row.included_in_estimate).length,
    pricedRowCount: rows.filter((row) => row.included_in_estimate && row.unit_price != null).length,
    unpricedRowCount: rows.filter((row) => row.included_in_estimate && row.unit_price == null).length,
    ...(rows.some(row=>row.included_in_estimate&&canonicalMachineHourPriceNeedsConfirmationV1(row,input.catalogId))?{
      unconfirmedMachinePriceRowCount:rows.filter(row=>row.included_in_estimate&&canonicalMachineHourPriceNeedsConfirmationV1(row,input.catalogId)).length}:{}),
    currencyCode: input.currencyCode,
  };
  const priceSnapshotIds = input.priceSnapshotIds ?? [];
  // Keep the user's explicit "I don't know" in the immutable snapshot. All
  // branch/quantity evaluation above treated it as unknown, never false/zero.
  Object.assign(parameters, explicitUnknownValues);
  return {
    ...(compositionPlan.selection ? {compositionSelectionV1: compositionPlan.selection} : {}),
    parameters,
    derivedParameters,
    rows,
    preliminaryNeeds,
    totals,
    priceSnapshotIds,
    revisionProjection: {
      ...(compositionPlan.selection ? {compositionSelectionV1: compositionPlan.selection} : {}),
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
