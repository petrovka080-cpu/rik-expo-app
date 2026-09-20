import { evaluateInclusionGraph } from "./inclusionGraph";

export type CanonicalParameterDefinitionRecord = {
  parameter_id?: unknown;
  value_type?: unknown;
  required?: unknown;
  default_value?: unknown;
  constraints_json?: unknown;
  truth_metadata?: unknown;
  approved_template_baseline_id?: unknown;
};

type JsonRecord = Record<string, unknown>;

export type CanonicalParameterResolutionOptions = {
  confirmedParameters?: JsonRecord;
  baselineContext?: {
    catalogId: string;
  };
};

export class CanonicalParameterValidationError extends Error {
  readonly code = "PARAMETER_VALIDATION_FAILED" as const;

  constructor(message: string) {
    super(message);
    this.name = "CanonicalParameterValidationError";
  }
}

function fail(message: string): never {
  throw new CanonicalParameterValidationError(message);
}

function conditionMatches(raw: unknown, values: JsonRecord): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const condition = raw as JsonRecord;
  if (typeof condition.kind === "string" && condition.kind.trim()) {
    try {
      return evaluateInclusionGraph(condition, values);
    } catch {
      return fail("invalid conditional parameter constraint");
    }
  }
  const parameterId = String(condition.parameterId ?? "");
  if (!parameterId || !Object.prototype.hasOwnProperty.call(condition, "equals")) return false;
  return values[parameterId] === condition.equals;
}

function finiteNumber(value: unknown, field: string): number {
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(String(value)) || !Number.isFinite(Number(value))) {
    return fail(`invalid number ${field}`);
  }
  return Number(value);
}

function isRecord(value: unknown): value is JsonRecord {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function definitionAllowsPreliminaryCompilation(
  _definition: CanonicalParameterDefinitionRecord,
): boolean {
  // Missing values are an explicit preliminary state for every catalogue
  // definition. The compiler converts affected rows to preliminary needs;
  // provided-but-invalid values and contradictory conditions are still errors.
  // A legacy `preliminary_compilation_allowed: false` remains provenance for
  // exact acceptance and must not block creation of the first estimate.
  return true;
}

function acceptedBaselineDefault(
  definition: CanonicalParameterDefinitionRecord,
  parameterId: string,
  context: CanonicalParameterResolutionOptions["baselineContext"],
): unknown {
  const value = definition.default_value;
  if (value == null) return value;
  if (!isRecord(definition.truth_metadata) || Object.keys(definition.truth_metadata).length === 0) {
    // Historical releases predate the truth contract. They remain readable,
    // but this branch never labels them as an R5.3 accepted baseline.
    return value;
  }
  const truth = definition.truth_metadata;
  const provenance = truth.provenance;
  const formulaConsumers = truth.formula_consumers;
  const resourceConsumers = truth.resource_branch_consumers;
  if (!context?.catalogId
    || truth.value_source_role !== "VISIBLE_BASELINE_ASSUMPTION"
    || typeof truth.baseline_assumption_id !== "string"
    || !truth.baseline_assumption_id
    || !isRecord(provenance)
    || provenance.sourceCatalogId !== context.catalogId
    || !Array.isArray(formulaConsumers)
    || !Array.isArray(resourceConsumers)
    || resourceConsumers.length === 0) {
    return fail(`invalid accepted baseline provenance ${parameterId}`);
  }
  const valueFingerprint = JSON.stringify(value);
  if (provenance.baselineOwner === "approved-template-baseline:r54") {
    const baselineId = definition.approved_template_baseline_id;
    const binding = provenance.approvedTemplateBinding;
    const classification = isRecord(binding) ? binding.inputClassification : null;
    const bindingFormulaConsumers = isRecord(binding) ? binding.formulaConsumerIds : null;
    const bindingResourceConsumers = isRecord(binding) ? binding.resourceConsumerRowIds : null;
    const normativeSourceIds = isRecord(binding) ? binding.normativeSourceIds : null;
    if (typeof baselineId !== "string"
      || !baselineId
      || provenance.approvedTemplateBaselineId !== baselineId
      || typeof provenance.acceptanceEvidenceSha256 !== "string"
      || !/^[0-9a-f]{64}$/.test(provenance.acceptanceEvidenceSha256)
      || !isRecord(binding)
      || binding.baselineId !== baselineId
      || binding.catalogId !== context.catalogId
      || binding.parameterId !== parameterId
      || binding.definitionVersionId !== provenance.sourceDefinitionVersionId
      || binding.parameterSchemaSha256 !== provenance.sourceParameterSchemaId
      || binding.acceptanceEvidenceSha256 !== provenance.acceptanceEvidenceSha256
      || !["ASSUMPTION", "NORMATIVE", "DERIVED"].includes(String(classification))
      || !Array.isArray(bindingFormulaConsumers)
      || !bindingFormulaConsumers.every((formulaId) => formulaConsumers.includes(formulaId))
      || !formulaConsumers.every((formulaId) => bindingFormulaConsumers.includes(formulaId))
      || !Array.isArray(bindingResourceConsumers)
      || bindingResourceConsumers.length === 0
      || !bindingResourceConsumers.every((rowId) => resourceConsumers.includes(rowId))
      || !resourceConsumers.every((rowId) => bindingResourceConsumers.includes(rowId))
      || !Array.isArray(normativeSourceIds)
      || (classification === "NORMATIVE" && normativeSourceIds.length === 0)
      || JSON.stringify(binding.value) !== valueFingerprint) {
      return fail(`invalid approved template baseline binding ${parameterId}`);
    }
    return value;
  }
  if (provenance.baselineOwner !== "accepted-batch-formula-graph-v3-baseline:r53"
    || !Array.isArray(provenance.acceptedTraceBindings)
    || provenance.acceptedTraceBindings.length === 0) {
    return fail(`invalid accepted baseline provenance ${parameterId}`);
  }
  for (const rawBinding of provenance.acceptedTraceBindings) {
    if (!isRecord(rawBinding)
      || rawBinding.catalogId !== context.catalogId
      || rawBinding.parameterId !== parameterId
      || rawBinding.releaseId !== provenance.sourceReleaseId
      || rawBinding.definitionVersionId !== provenance.sourceDefinitionVersionId
      || rawBinding.definitionVersion !== provenance.sourceDefinitionVersion
      || rawBinding.parameterSchemaId !== provenance.sourceParameterSchemaId
      || rawBinding.parameterSchemaVersion !== provenance.sourceParameterSchemaVersion
      || typeof rawBinding.traceId !== "string"
      || !rawBinding.traceId
      || typeof rawBinding.formulaId !== "string"
      || !formulaConsumers.includes(rawBinding.formulaId)
      || typeof rawBinding.resourceRowId !== "string"
      || !resourceConsumers.includes(rawBinding.resourceRowId)
      || !Array.isArray(rawBinding.normativeSourceIds)
      || rawBinding.normativeSourceIds.length === 0
      || typeof rawBinding.acceptedBatch !== "string"
      || !/^BATCH00[1-8]$/u.test(rawBinding.acceptedBatch)
      || JSON.stringify(rawBinding.value) !== valueFingerprint) {
      return fail(`invalid accepted baseline binding ${parameterId}`);
    }
  }
  return value;
}

export function validateCanonicalEstimateParameters(
  definitions: readonly CanonicalParameterDefinitionRecord[],
  input: JsonRecord,
  options: CanonicalParameterResolutionOptions = {},
): JsonRecord {
  if (!input || typeof input !== "object" || Array.isArray(input)) return fail("parameters must be an object");
  const byId = new Map(definitions.map((definition) => [String(definition.parameter_id ?? ""), definition]));
  const accepted = new Set(byId.keys());
  const confirmed = options.confirmedParameters ?? {};
  if (!isRecord(confirmed)) return fail("confirmed parameters must be an object");
  const unknownConfirmed = Object.keys(confirmed).filter((key) => !accepted.has(key));
  if (unknownConfirmed.length) return fail(`unknown confirmed estimate parameters: ${unknownConfirmed.slice(0, 10).join(",")}`);
  const values = { ...confirmed, ...input };
  const unknown = Object.keys(input).filter((key) => !accepted.has(key));
  if (unknown.length) return fail(`unknown estimate parameters: ${unknown.slice(0, 10).join(",")}`);

  // Declared defaults are resolved before conditional rules. Numeric project
  // quantities in canonical content intentionally have no hidden defaults.
  for (const definition of definitions) {
    const id = String(definition.parameter_id ?? "");
    if (!id) return fail("parameter definition identity is empty");
    if (values[id] == null && definition.default_value != null) {
      values[id] = acceptedBaselineDefault(definition, id, options.baselineContext);
    }
  }

  for (const definition of definitions) {
    const id = String(definition.parameter_id);
    const constraints = definition.constraints_json && typeof definition.constraints_json === "object" && !Array.isArray(definition.constraints_json)
      ? definition.constraints_json as JsonRecord
      : {};
    const requiredByCondition = conditionMatches(constraints.requiredWhen, values);
    const forbiddenByCondition = conditionMatches(constraints.forbiddenWhen, values);
    const value = values[id];
    if (value == null) {
      const preliminaryCompilationAllowed = definitionAllowsPreliminaryCompilation(definition);
      if ((definition.required === true || requiredByCondition) && !preliminaryCompilationAllowed) {
        return fail(`missing parameter ${id}`);
      }
      continue;
    }
    if (forbiddenByCondition) return fail(`parameter ${id} is forbidden by cross-field rule`);

    const valueType = String(definition.value_type ?? "");
    if (valueType === "boolean" && typeof value !== "boolean") return fail(`invalid boolean ${id}`);
    if (valueType === "text") {
      if (typeof value !== "string" || !value.trim()) return fail(`invalid text ${id}`);
      if (constraints.maxLength != null && value.length > Number(constraints.maxLength)) return fail(`text too long ${id}`);
    }
    if (valueType === "enum") {
      if (!Array.isArray(constraints.values) || constraints.values.length < 1 || !constraints.values.includes(value)) {
        return fail(`invalid enum ${id}`);
      }
    }
    if (valueType === "decimal" || valueType === "integer") {
      const numeric = finiteNumber(value, id);
      if (valueType === "integer" && !Number.isInteger(numeric)) return fail(`invalid integer ${id}`);
      if (constraints.min != null && numeric < Number(constraints.min)) return fail(`parameter below minimum ${id}`);
      if (constraints.max != null && numeric > Number(constraints.max)) return fail(`parameter above maximum ${id}`);
      for (const [rule, compare] of [
        ["equalToParameter", (left: number, right: number) => left === right],
        ["greaterThanOrEqualParameter", (left: number, right: number) => left >= right],
        ["greaterThanParameter", (left: number, right: number) => left > right],
        ["lessThanOrEqualParameter", (left: number, right: number) => left <= right],
        ["lessThanParameter", (left: number, right: number) => left < right],
      ] as const) {
        const peerId = constraints[rule];
        if (peerId == null) continue;
        const peerValue = values[String(peerId)];
        if (peerValue == null || !compare(numeric, finiteNumber(peerValue, String(peerId)))) {
          return fail(`cross-field rule ${id}.${rule}=${String(peerId)} failed`);
        }
      }
    }
  }

  const booleanGroups = new Map<string, string[]>();
  for (const definition of definitions) {
    const constraints = definition.constraints_json && typeof definition.constraints_json === "object" && !Array.isArray(definition.constraints_json)
      ? definition.constraints_json as JsonRecord
      : {};
    const group = constraints.mutuallyExclusiveBooleanGroup;
    if (group == null || values[String(definition.parameter_id)] !== true) continue;
    const members = booleanGroups.get(String(group)) ?? [];
    members.push(String(definition.parameter_id));
    booleanGroups.set(String(group), members);
  }
  for (const [group, members] of booleanGroups) {
    if (members.length > 1) return fail(`mutually exclusive boolean group ${group} enabled simultaneously: ${members.join(",")}`);
  }
  return values;
}
