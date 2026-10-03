import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { parseCanonicalFormulaOutputBoundsV1, type CanonicalFormulaOutputBoundsV1 } from "../backendPlatform/canonicalFormulaOutputBounds";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import { NUMERIC_PARAMETER_RELATIONS, type NumericParameterPeerConstraints } from "../backendPlatform/numericParameterRelations";
import { resolveInclusionGraph } from "../backendPlatform/inclusionGraph";
import type { CanonicalPurchaseBalanceV1 } from "../backendPlatform/canonicalPurchaseBalanceV1";

type Json = Record<string, unknown>;

export type AutomaticParameterKind = "ordinary" | "profile" | "conditional" | "internal";
type AutomaticPeerCondition = Readonly<{
  kind: "greater_than";
  parameterId: string;
  valueParameterId: string;
  value?: never;
}>;
export type AutomaticInclusionCondition = AutomaticPeerCondition
  | Readonly<{ kind: "formula_greater_than"; expression: string; unitId: string; value: number }>
  | Readonly<{ kind: "equals"; parameterId: string; value: string }>
  | Readonly<{ kind: "greater_than"; parameterId: string; value: number; valueParameterId?: never }>
  | Readonly<{ kind: "less_than_or_equal"; parameterId: string; value: number; valueParameterId?: never }>
  | Readonly<{ kind: "and" | "or"; operands: readonly AutomaticInclusionCondition[] }>;
export type AutomaticParameterSpec = Readonly<{
  id: string;
  title: string;
  valueType: "decimal" | "integer" | "text" | "enum";
  unitId: string | null;
  kind: AutomaticParameterKind;
  defaultValue?: string | number;
  values?: readonly string[];
  min?: number;
  max?: number;
  numericPeerConstraints?: NumericParameterPeerConstraints;
  requiredWhen?: Readonly<{ parameterId: string; value: string }> | AutomaticInclusionCondition;
  resourceBranchConsumers?: readonly string[];
  effectiveQuantitySourceRowId?: string;
}>;

export type AutomaticRowSpec = Readonly<{
  rowId: string;
  section: string;
  category: string;
  title: string;
  unitId: string;
  formulaId: string;
  expression: string;
  procurement?: boolean;
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS";
  inclusion?: AutomaticInclusionCondition;
  titleParameterIds?: readonly string[];
  /** Required product/method facts consumed by this resource even when they
   * are not arithmetic operands. Uses the canonical compiler's existing gate. */
  inputParameterIds?: readonly string[];
  formulaOutputBounds?: CanonicalFormulaOutputBoundsV1;
  effectiveQuantityOutput?: Readonly<{ parameterId: string; unitId: string }>;
  purchaseBalance?: CanonicalPurchaseBalanceV1;
  manualTransportQuantityPolicy?: Readonly<{ unitId: string; minimum: "calculated_quantity"; integer: boolean }>;
  purchaseBalanceOwnerRowId?: string;
}>;

export type AutomaticOwnerDefinition = Readonly<{
  parameters: readonly (CanonicalEstimateParameterDefinition & {
    ordinal: number;
    unit_id: string | null;
    title_ru: string;
    truth_metadata: Json;
  })[];
  formulas: readonly CanonicalEstimateFormulaDefinition[];
  resources: readonly CanonicalEstimateResourceDefinition[];
  runtimeInput: Readonly<Record<string, string | number>>;
  runtimeClassification: Readonly<Record<string, "ASSUMPTION">>;
  runtimeSourceIds: Readonly<Record<string, readonly string[]>>;
  ordinaryParameterIds: readonly string[];
}>;

type OwnerConfig = Readonly<{
  contract: string;
  semanticOwner: string;
  sourceId: string;
  normId: string;
  sourceMetadata: Readonly<{
    source_title: string;
    source_document_version: string;
    definition_hash: string;
    exact_locator: string;
    artifact_sha256: string;
  }>;
  applicabilityRu: string;
  ordinary: readonly AutomaticParameterSpec[];
  profile: readonly AutomaticParameterSpec[];
  conditional: readonly AutomaticParameterSpec[];
  rows: readonly AutomaticRowSpec[];
  excludedUnownedAssumptions: readonly string[];
  /** Explicit selected-owner opt-in: absent facts become original row needs;
   * supplied invalid facts and original resource safety gates stay blocking. */
  deferMissingProjectFactsToRows?: boolean;
  /** Actual unconditional project inventory/physical ratios, never norms,
   * manufacturer passports or compiler-derived quantities. */
  unconditionalProjectFactParameterIds?: readonly string[];
}>;

function constraints(spec: AutomaticParameterSpec): Json {
  return {
    ...(spec.values ? { values: [...spec.values] } : {}),
    ...(spec.valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
    ...(spec.min == null ? {} : { min: spec.min }),
    ...(spec.max == null ? {} : { max: spec.max }),
    ...spec.numericPeerConstraints,
    ...(spec.requiredWhen ? {
      requiredWhen: "kind" in spec.requiredWhen
        ? { ...spec.requiredWhen } : { kind: "equals", ...spec.requiredWhen },
      ...("kind" in spec.requiredWhen ? {} : { forbiddenWhen: {
        kind: "equals",
        parameterId: spec.requiredWhen.parameterId,
        value: "NOT_REQUIRED",
      } }),
    } : {}),
  };
}

export function buildAutomaticConstructionOwnerR1(
  config: OwnerConfig,
): AutomaticOwnerDefinition {
  const internalSpecs: AutomaticParameterSpec[] = config.rows.flatMap(row => row.effectiveQuantityOutput ? [{
    id: row.effectiveQuantityOutput.parameterId, title: `Принятое количество: ${row.title}`, valueType: "decimal", kind: "internal",
    unitId: row.effectiveQuantityOutput.unitId, effectiveQuantitySourceRowId: row.rowId,
  }] : []);
  const specs = [...config.ordinary, ...config.profile, ...config.conditional, ...internalSpecs];
  if (new Set(specs.map(spec => spec.id)).size !== specs.length) throw new Error("AUTOMATIC_EFFECTIVE_PARAMETER_DUPLICATE");
  const specsById = new Map(specs.map((spec) => [spec.id, spec]));
  const validatePeerCondition = (condition: AutomaticPeerCondition): void => {
    const left = specsById.get(condition.parameterId);
    const right = specsById.get(condition.valueParameterId);
    if (!left || !right || !["decimal", "integer"].includes(left.valueType)
      || !["decimal", "integer"].includes(right.valueType) || left.unitId !== right.unitId) {
      throw new Error(`AUTOMATIC_INCLUSION_PEER_INVALID:${condition.parameterId}:${condition.valueParameterId}`);
    }
  };
  const validateConditionReferences = (condition: AutomaticInclusionCondition): void => {
    if (condition.kind === "and" || condition.kind === "or") {
      condition.operands.forEach(validateConditionReferences);
    } else if (condition.kind === "formula_greater_than") {
      for (const id of compileFormulaGraph(condition.expression).inputParameterIds) {
        const subject = specsById.get(id);
        if (!subject || !["decimal", "integer"].includes(subject.valueType)) {
          throw new Error(`AUTOMATIC_INCLUSION_FORMULA_INPUT_INVALID:${id}`);
        }
      }
    } else if (condition.kind === "greater_than" || condition.kind === "less_than_or_equal") {
      if (condition.valueParameterId !== undefined) validatePeerCondition(condition);
      else {
        const subject = specsById.get(condition.parameterId);
        if (!subject || !["decimal", "integer"].includes(subject.valueType)) {
          throw new Error(`AUTOMATIC_INCLUSION_LITERAL_INVALID:${condition.parameterId}`);
        }
      }
    }
  };
  const validateCondition = (condition: AutomaticInclusionCondition): void => {
    // The existing graph validates logical shape and finite literals, even
    // with unknown values. This adapter only validates declared input types.
    resolveInclusionGraph(condition, {});
    validateConditionReferences(condition);
  };
  for (const spec of specs) {
    if (spec.requiredWhen && "kind" in spec.requiredWhen) validateCondition(spec.requiredWhen);
  }
  for (const row of config.rows) {
    if (row.inclusion) validateCondition(row.inclusion);
  }
  for (const spec of specs) {
    for (const [rule] of NUMERIC_PARAMETER_RELATIONS) {
      const peerId = spec.numericPeerConstraints?.[rule];
      if (peerId == null) continue;
      const peer = specsById.get(peerId);
      if (!peer || !["decimal", "integer"].includes(spec.valueType)
        || !["decimal", "integer"].includes(peer.valueType) || spec.unitId !== peer.unitId) {
        throw new Error(`AUTOMATIC_NUMERIC_PEER_CONSTRAINT_INVALID:${spec.id}.${rule}=${peerId}`);
      }
    }
  }
  const ordinaryIds = config.ordinary.map((spec) => spec.id);
  const unconditionalProjectFacts = new Set(config.unconditionalProjectFactParameterIds ?? []);
  for (const id of unconditionalProjectFacts) {
    const spec = specsById.get(id);
    if (config.deferMissingProjectFactsToRows !== true || !spec || spec.kind !== "ordinary"
      || spec.requiredWhen != null || !["decimal", "integer"].includes(spec.valueType)) {
      throw new Error(`AUTOMATIC_UNCONDITIONAL_PROJECT_FACT_INVALID:${id}`);
    }
  }
  const parameters = specs.map((spec, ordinal) => ({
    parameter_id: spec.id,
    ordinal,
    value_type: spec.valueType,
    unit_id: spec.unitId,
    title_ru: spec.title,
    required: spec.kind === "ordinary" || spec.kind === "profile",
    default_value: null,
    constraints_json: constraints(spec),
    truth_metadata: {
      contract: config.contract,
      semantic_parameter_key: `${config.semanticOwner}:${spec.id}`,
      visibility_role: spec.kind === "internal" ? "INTERNAL_ONLY" : "USER_INPUT",
      value_source_role: unconditionalProjectFacts.has(spec.id) ? "PROJECT_SPECIFIC_INPUT" : spec.kind === "ordinary" ? "USER_INPUT"
        : spec.kind === "profile" ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
          : spec.kind === "internal" ? "COMPILER_DERIVED_RESOURCE_QUANTITY" : "CONDITIONAL_PROJECT_FACT",
      ...(spec.effectiveQuantitySourceRowId ? { effective_resource_quantity_v1: {
        sourceRowId: spec.effectiveQuantitySourceRowId, unitId: spec.unitId,
      } } : {}),
      input_origin_class: spec.kind === "ordinary" ? "KNOWN_PRIMARY_WORK_SCOPE"
        : spec.kind === "profile" ? "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE"
          : "APPROVED_PROJECT_OR_METHOD_STATEMENT",
      // Existing owners collect missing exact facts before compile. An
      // explicitly selected owner may expose its first immutable composition
      // with local row needs, retaining the same invalid-value/source guards.
      preliminary_compilation_allowed: spec.kind === "profile" || (config.deferMissingProjectFactsToRows === true && spec.kind !== "internal"),
      source_confirmation_required: spec.kind !== "ordinary" || unconditionalProjectFacts.has(spec.id),
      guide: {
        guide_kind: spec.kind === "ordinary" && !unconditionalProjectFacts.has(spec.id) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: spec.kind === "ordinary"
          ? `${spec.title}: укажите только фактическое исходное значение.`
          : spec.kind === "profile"
            ? `${spec.title}: видимое предварительное значение; замените по проекту или спецификации.`
            : `${spec.title}: укажите подтверждённое значение из проекта, спецификации или технологической карты.`,
        source_role: spec.kind === "ordinary" && !unconditionalProjectFacts.has(spec.id) ? "USER_SUPPLIED_PRIMARY_FACT"
          : spec.kind === "profile" ? "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION"
            : "PROJECT_DOCUMENTATION",
        source_document: config.sourceId,
        source_locator: config.sourceMetadata.exact_locator,
        guide_version: config.contract,
        source_snapshot_hash: config.sourceMetadata.artifact_sha256,
        applicability: config.applicabilityRu,
        verified_at: "2026-10-02T00:00:00+06:00",
        guide_validation_policy: spec.kind === "profile"
          ? "ADVISORY_REASON_REQUIRED"
          : "MANDATORY_BLOCK",
      },
      hidden_default_forbidden: true,
      runtime_profile_value: spec.kind === "profile",
      ...(spec.resourceBranchConsumers ? {
        resource_branch_consumers: [...spec.resourceBranchConsumers],
      } : {}),
      synthetic: false,
    },
  }));

  const formulas = config.rows.map((row) => {
    const compiled = compileFormulaGraph(row.expression);
    return {
      formula_id: row.formulaId,
      output_unit_id: row.unitId,
      expression_source: row.expression,
      ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
    } satisfies CanonicalEstimateFormulaDefinition;
  });

  const resources = config.rows.map((row, ordinal) => {
    if (row.inputParameterIds?.some((id) => !specsById.has(id))) {
      throw new Error(`AUTOMATIC_RESOURCE_INPUT_PARAMETER_INVALID:${row.rowId}`);
    }
    const formulaOutputBounds = parseCanonicalFormulaOutputBoundsV1(row.formulaOutputBounds, row.unitId, row.unitId, row.rowId);
    const resourceGraph = {
      formulaId: row.formulaId,
      normalizedUom: row.unitId,
      semanticOwnerId: `${config.semanticOwner}:${row.rowId}`,
      costOwner: "resource",
      scopeContextParameterIds: [...ordinaryIds],
      costTreatment: row.costTreatment ?? "OWN_COST",
      ...(row.effectiveQuantityOutput ? { effectiveQuantityOutputV1: row.effectiveQuantityOutput } : {}),
      ...(row.purchaseBalance ? { purchaseBalanceV1: row.purchaseBalance } : {}),
      ...(row.manualTransportQuantityPolicy ? { manualTransportQuantityPolicyV1: row.manualTransportQuantityPolicy } : {}),
      ...(row.purchaseBalanceOwnerRowId ? { purchaseBalanceOwnerRowId: row.purchaseBalanceOwnerRowId } : {}),
      ...(row.inputParameterIds ? { inputParameterIds: [...row.inputParameterIds] } : {}),
      ...(formulaOutputBounds == null ? {} : { formulaOutputBoundsV1: formulaOutputBounds }),
      ...(row.titleParameterIds ? {
        titleSpecificationParameterIds: [...row.titleParameterIds],
        titleSpecificationMode: "APPEND",
        titleSpecificationSeparator: " — ",
      } : {}),
    };
    const result: CanonicalEstimateResourceDefinition = {
      id: `resource-${row.rowId.replace(/:/gu, "-")}`,
      row_id: row.rowId,
      ordinal,
      section: row.section,
      category: row.category,
      title_ru: row.title,
      unit_id: row.unitId,
      formula_id: row.formulaId,
      inclusion_ast: row.inclusion ?? { kind: "literal", value: true },
      resource_graph: resourceGraph,
      procurement_eligible: row.procurement ?? false,
      cost_owner_id: row.rowId,
      source_metadata: {
        truth_contract_version: "R3",
        synthetic: false,
        sourceRole: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
        normativeTrace: [{
          sourceId: config.sourceId,
          source_id: config.sourceId,
          normId: config.normId,
          norm_id: config.normId,
          normVersion: config.sourceMetadata.source_document_version,
          source_title: config.sourceMetadata.source_title,
          exact_locator: config.sourceMetadata.exact_locator,
          source_definition_hash: config.sourceMetadata.definition_hash,
          sourceRole: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
        }],
        excludedUnownedAssumptions: [...config.excludedUnownedAssumptions],
      },
      row_sha256: "",
    };
    return { ...result, row_sha256: estimateDeterministicHash(result) };
  });

  const runtimeInput = Object.fromEntries(config.profile.map((spec) => {
    if (spec.defaultValue == null) throw new Error(`AUTOMATIC_PROFILE_DEFAULT_MISSING:${spec.id}`);
    return [spec.id, spec.defaultValue];
  }));
  const runtimeClassification = Object.fromEntries(
    Object.keys(runtimeInput).map((id) => [id, "ASSUMPTION" as const]),
  );
  const runtimeSourceIds = Object.fromEntries(
    Object.keys(runtimeInput).map((id) => [id, [config.sourceId]]),
  );

  return Object.freeze({
    parameters: Object.freeze(parameters),
    formulas: Object.freeze(formulas),
    resources: Object.freeze(resources),
    runtimeInput: Object.freeze(runtimeInput),
    runtimeClassification: Object.freeze(runtimeClassification),
    runtimeSourceIds: Object.freeze(runtimeSourceIds),
    ordinaryParameterIds: Object.freeze(ordinaryIds),
  });
}

export async function compileAutomaticConstructionOwnerR1(input: Readonly<{
  compilerVersion: string;
  catalogId: string;
  primaryMeasureParameterId: string;
  definition: AutomaticOwnerDefinition;
  submittedParameters: Record<string, unknown>;
}>): Promise<CanonicalEstimateCompileCoreResult> {
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: input.compilerVersion,
    catalogId: input.catalogId,
    primaryMeasureParameterId: input.primaryMeasureParameterId,
    parameterDefinitions: [...input.definition.parameters],
    formulaDefinitions: [...input.definition.formulas],
    resourceDefinitions: [...input.definition.resources],
    submittedParameters: input.submittedParameters,
    confirmedParameters: { ...input.definition.runtimeInput },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: input.definition.resources.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}
