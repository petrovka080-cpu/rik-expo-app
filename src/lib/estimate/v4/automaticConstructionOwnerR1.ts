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

type Json = Record<string, unknown>;

export type AutomaticParameterKind = "ordinary" | "profile" | "conditional";
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
  requiredWhen?: Readonly<{ parameterId: string; value: string }>;
  resourceBranchConsumers?: readonly string[];
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
  inclusion?: Readonly<{ kind: "equals"; parameterId: string; value: string }>;
  titleParameterIds?: readonly string[];
  formulaOutputBounds?: CanonicalFormulaOutputBoundsV1;
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
}>;

function constraints(spec: AutomaticParameterSpec): Json {
  return {
    ...(spec.values ? { values: [...spec.values] } : {}),
    ...(spec.valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
    ...(spec.min == null ? {} : { min: spec.min }),
    ...(spec.max == null ? {} : { max: spec.max }),
    ...spec.numericPeerConstraints,
    ...(spec.requiredWhen ? {
      requiredWhen: { kind: "equals", ...spec.requiredWhen },
      forbiddenWhen: {
        kind: "equals",
        parameterId: spec.requiredWhen.parameterId,
        value: "NOT_REQUIRED",
      },
    } : {}),
  };
}

export function buildAutomaticConstructionOwnerR1(
  config: OwnerConfig,
): AutomaticOwnerDefinition {
  const specs = [...config.ordinary, ...config.profile, ...config.conditional];
  const specsById = new Map(specs.map((spec) => [spec.id, spec]));
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
  const parameters = specs.map((spec, ordinal) => ({
    parameter_id: spec.id,
    ordinal,
    value_type: spec.valueType,
    unit_id: spec.unitId,
    title_ru: spec.title,
    required: spec.kind !== "conditional",
    default_value: null,
    constraints_json: constraints(spec),
    truth_metadata: {
      contract: config.contract,
      semantic_parameter_key: `${config.semanticOwner}:${spec.id}`,
      visibility_role: "USER_INPUT",
      value_source_role: spec.kind === "ordinary" ? "USER_INPUT"
        : spec.kind === "profile" ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
          : "CONDITIONAL_PROJECT_FACT",
      input_origin_class: spec.kind === "ordinary" ? "KNOWN_PRIMARY_WORK_SCOPE"
        : spec.kind === "profile" ? "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE"
          : "APPROVED_PROJECT_OR_METHOD_STATEMENT",
      // A first estimate may use the visible engineering profile, but it must
      // not turn an actually unknown primary/project fact into dozens of
      // resource-level preliminary needs. Those facts belong to the compact
      // parameter collection screen before compile.
      preliminary_compilation_allowed: spec.kind === "profile",
      source_confirmation_required: spec.kind !== "ordinary",
      guide: {
        guide_kind: spec.kind === "ordinary" ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: spec.kind === "ordinary"
          ? `${spec.title}: укажите только фактическое исходное значение.`
          : `${spec.title}: видимое предварительное значение; замените по проекту или спецификации.`,
        source_role: spec.kind === "ordinary" ? "USER_SUPPLIED_PRIMARY_FACT"
          : "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
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
    const formulaOutputBounds = parseCanonicalFormulaOutputBoundsV1(row.formulaOutputBounds, row.unitId, row.unitId, row.rowId);
    const resourceGraph = {
      formulaId: row.formulaId,
      normalizedUom: row.unitId,
      semanticOwnerId: `${config.semanticOwner}:${row.rowId}`,
      costOwner: "resource",
      scopeContextParameterIds: [...ordinaryIds],
      costTreatment: row.costTreatment ?? "OWN_COST",
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
