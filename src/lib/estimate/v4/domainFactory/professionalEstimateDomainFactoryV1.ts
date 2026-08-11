import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import {
  compileProfessionalProjectAssemblyV4,
  type ProfessionalChildAssemblyV4,
  type ProfessionalEstimateScopeModeV4,
  type ProfessionalParameterValueV4,
  type ProfessionalProjectAssemblyCompilationV4,
} from "../professionalProjectAssemblyV4";
import type {
  ConstructionNormativeSourceTypeV1,
  NormativeApplicabilityRequestV1,
  NormativeApplicabilityResolutionV1,
} from "./constructionNormativeRegistryV1";
import { ConstructionNormativeRegistryV1 } from "./constructionNormativeRegistryV1";

export type DomainPackageReadinessV1 =
  | "INVENTORY_FROZEN"
  | "IMPLEMENTATION_READY"
  | "DOMAIN_GREEN";

export type ProfessionalEstimateDomainManifestV1 = {
  domain_id: string;
  domain_version: string;
  catalog_record_count: number;
  canonical_technology_count: number;
  alias_count: number;
  excluded_count: number;
  supported_scopes: readonly ProfessionalEstimateScopeModeV4[];
  supported_jurisdictions: readonly string[];
  passports: readonly string[];
  schemas: readonly string[];
  formula_packs: readonly string[];
  normative_profiles: readonly string[];
  child_assembly_dependencies: readonly string[];
  readiness: DomainPackageReadinessV1;
};

export type ProfessionalCatalogBindingV1 = {
  catalog_id: string;
  work_key: string;
  canonical_technology_id: string;
  scope_capability: string;
  alias_of: string | null;
  exact_identity_required: true;
};

export type ProfessionalCanonicalTechnologyV1 = {
  technology_id: string;
  operation_class: string;
  method: string;
  material_system: string;
  output: { dimension: string; unit_id: string };
  required_stages: readonly string[];
  optional_stages: readonly string[];
  forbidden_stages: readonly string[];
  parameter_schema_id: string;
  formula_pack_id: string;
  assembly_profile_id: string;
  normative_profile_ids: readonly string[];
  resource_completeness_policy_id: string;
};

export type ProfessionalParameterConditionV1 =
  | { kind: "ALWAYS" }
  | { kind: "EQUALS"; parameter_id: string; value: string | number | boolean }
  | { kind: "ANY_OF"; conditions: readonly { parameter_id: string; value: string | number | boolean }[] };

export type ProfessionalDomainParameterDefinitionV1 = {
  parameter_id: string;
  label_ru: string;
  unit_id: string | null;
  priority: "P0" | "P1" | "P2";
  input_type: "number" | "boolean" | "choice" | "text";
  choices?: readonly { value: string; label_ru: string }[];
  minimum?: number;
  maximum?: number;
  visible_when: ProfessionalParameterConditionV1;
  required_when: ProfessionalParameterConditionV1;
  formula_consumers: readonly string[];
  source_ownership: readonly string[];
};

export type ProfessionalDomainParameterSchemaV1 = {
  schema_id: string;
  schema_version: string;
  technology_id: string;
  parameters: readonly ProfessionalDomainParameterDefinitionV1[];
  quantity_alternatives: readonly (readonly string[])[];
};

export type ProfessionalNormativeProfileV1 = {
  profile_id: string;
  profile_version: string;
  technology_id: string;
  jurisdiction: string;
  requested_source_ids: readonly string[];
  requested_source_types: readonly ConstructionNormativeSourceTypeV1[];
  rejected_foreign_source_ids: readonly string[];
};

export type ProfessionalFormulaPackV1 = {
  formula_pack_id: string;
  formula_pack_version: string;
  technology_id: string;
  formula_ids: readonly string[];
  unit_trace_contract: readonly string[];
};

export type ProfessionalAssemblyProfileV1 = {
  assembly_profile_id: string;
  assembly_profile_version: string;
  technology_id: string;
  child_assemblies: readonly ProfessionalChildAssemblyV4[];
};

export type ProfessionalResourceCompletenessPolicyV1 = {
  policy_id: string;
  technology_id: string;
  required_categories: readonly string[];
  optional_categories: readonly string[];
  forbidden_generic_rows: readonly string[];
  one_bundle_resource_replacement_forbidden: true;
};

export type ProfessionalEstimateDomainPackageV1 = {
  manifest: ProfessionalEstimateDomainManifestV1;
  catalog_bindings: readonly ProfessionalCatalogBindingV1[];
  canonical_technologies: readonly ProfessionalCanonicalTechnologyV1[];
  parameter_schemas: readonly ProfessionalDomainParameterSchemaV1[];
  normative_profiles: readonly ProfessionalNormativeProfileV1[];
  formula_packs: readonly ProfessionalFormulaPackV1[];
  assembly_profiles: readonly ProfessionalAssemblyProfileV1[];
  resource_completeness_policies: readonly ProfessionalResourceCompletenessPolicyV1[];
};

export type ProfessionalEstimateDomainFactoryV1 = {
  package: ProfessionalEstimateDomainPackageV1;
  package_hash: string;
  binding_by_catalog_id: ReadonlyMap<string, ProfessionalCatalogBindingV1>;
  technology_by_id: ReadonlyMap<string, ProfessionalCanonicalTechnologyV1>;
  schema_by_id: ReadonlyMap<string, ProfessionalDomainParameterSchemaV1>;
  normative_profile_by_id: ReadonlyMap<string, ProfessionalNormativeProfileV1>;
  assembly_profile_by_id: ReadonlyMap<string, ProfessionalAssemblyProfileV1>;
};

export type ProfessionalDomainCompileRequestV1 = {
  catalog_id: string;
  work_key: string;
  scope_mode: ProfessionalEstimateScopeModeV4;
  parent_revision_id: string | null;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
  normative_request: Omit<NormativeApplicabilityRequestV1, "requested_source_ids" | "requested_source_types">;
};

export type ProfessionalDomainCompileResultV1 = {
  exact_identity: {
    catalog_id: string;
    work_key: string;
    canonical_technology_id: string;
  };
  normative_resolution: NormativeApplicabilityResolutionV1;
  compilation: ProfessionalProjectAssemblyCompilationV4 | null;
  blockers: readonly string[];
  status: "COMPILED" | "BLOCKED_SOURCE_REQUIRED" | "NEEDS_REQUIRED_INPUTS";
  deterministic_hash: string;
};

function uniqueBy<T>(values: readonly T[], key: (value: T) => string, errorCode: string): Map<string, T> {
  const result = new Map<string, T>();
  for (const value of values) {
    const id = key(value);
    if (result.has(id)) throw new Error(`${errorCode}:${id}`);
    result.set(id, value);
  }
  return result;
}

function conditionKey(condition: ProfessionalParameterConditionV1): string {
  return JSON.stringify(condition);
}

function validateSchema(schema: ProfessionalDomainParameterSchemaV1): void {
  uniqueBy(schema.parameters, (item) => item.parameter_id, "DOMAIN_PARAMETER_DUPLICATE");
  for (const parameter of schema.parameters) {
    if (conditionKey(parameter.visible_when) !== conditionKey(parameter.required_when) && parameter.priority === "P0") {
      throw new Error(`DOMAIN_P0_VISIBLE_REQUIRED_MISMATCH:${schema.schema_id}:${parameter.parameter_id}`);
    }
    if (parameter.input_type === "number" && (parameter.minimum == null || parameter.maximum == null)) {
      throw new Error(`DOMAIN_NUMERIC_TOLERANCE_MISSING:${schema.schema_id}:${parameter.parameter_id}`);
    }
  }
}

function conditionMatches(
  condition: ProfessionalParameterConditionV1,
  values: Readonly<Record<string, ProfessionalParameterValueV4>>,
): boolean {
  if (condition.kind === "ALWAYS") return true;
  if (condition.kind === "EQUALS") return values[condition.parameter_id]?.value === condition.value;
  return condition.conditions.some((item) => values[item.parameter_id]?.value === item.value);
}

function schemaBlockers(
  schema: ProfessionalDomainParameterSchemaV1,
  values: Readonly<Record<string, ProfessionalParameterValueV4>>,
): string[] {
  const blockers = schema.parameters
    .filter((parameter) => parameter.priority === "P0" && conditionMatches(parameter.required_when, values))
    .filter((parameter) => {
      const value = values[parameter.parameter_id]?.value;
      return value == null || (typeof value === "string" && value.trim().length === 0);
    })
    .map((parameter) => `PROJECT_VALUE_REQUIRED:${parameter.parameter_id}`);
  if (schema.quantity_alternatives.length > 0) {
    const alternativeComplete = schema.quantity_alternatives.some((alternative) => alternative.every((parameterId) => {
      const value = values[parameterId]?.value;
      return value != null && !(typeof value === "string" && value.trim().length === 0);
    }));
    if (!alternativeComplete) blockers.push(`PROJECT_VALUE_REQUIRED_ONE_OF:${schema.quantity_alternatives.map((item) => item.join("+")).join("|")}`);
  }
  return [...new Set(blockers)];
}

export function createProfessionalEstimateDomainFactoryV1(
  domainPackage: ProfessionalEstimateDomainPackageV1,
): ProfessionalEstimateDomainFactoryV1 {
  const bindings = uniqueBy(domainPackage.catalog_bindings, (item) => item.catalog_id, "DOMAIN_CATALOG_BINDING_DUPLICATE");
  const technologies = uniqueBy(domainPackage.canonical_technologies, (item) => item.technology_id, "DOMAIN_TECHNOLOGY_DUPLICATE");
  const schemas = uniqueBy(domainPackage.parameter_schemas, (item) => item.schema_id, "DOMAIN_SCHEMA_DUPLICATE");
  const normProfiles = uniqueBy(domainPackage.normative_profiles, (item) => item.profile_id, "DOMAIN_NORM_PROFILE_DUPLICATE");
  const formulaPacks = uniqueBy(domainPackage.formula_packs, (item) => item.formula_pack_id, "DOMAIN_FORMULA_PACK_DUPLICATE");
  const assemblyProfiles = uniqueBy(domainPackage.assembly_profiles, (item) => item.assembly_profile_id, "DOMAIN_ASSEMBLY_PROFILE_DUPLICATE");
  const resourcePolicies = uniqueBy(domainPackage.resource_completeness_policies, (item) => item.policy_id, "DOMAIN_RESOURCE_POLICY_DUPLICATE");

  if (bindings.size !== domainPackage.manifest.catalog_record_count) throw new Error("DOMAIN_MANIFEST_CATALOG_COUNT_MISMATCH");
  if (technologies.size !== domainPackage.manifest.canonical_technology_count) throw new Error("DOMAIN_MANIFEST_TECHNOLOGY_COUNT_MISMATCH");
  if (domainPackage.manifest.alias_count !== domainPackage.catalog_bindings.filter((item) => item.alias_of !== null).length) {
    throw new Error("DOMAIN_MANIFEST_ALIAS_COUNT_MISMATCH");
  }
  for (const schema of domainPackage.parameter_schemas) validateSchema(schema);
  for (const binding of domainPackage.catalog_bindings) {
    if (!technologies.has(binding.canonical_technology_id)) throw new Error(`DOMAIN_BINDING_ORPHAN:${binding.catalog_id}`);
  }
  for (const technology of domainPackage.canonical_technologies) {
    const schema = schemas.get(technology.parameter_schema_id);
    if (!schema || schema.technology_id !== technology.technology_id) throw new Error(`DOMAIN_TECHNOLOGY_SCHEMA_ORPHAN:${technology.technology_id}`);
    if (!formulaPacks.has(technology.formula_pack_id)) throw new Error(`DOMAIN_TECHNOLOGY_FORMULA_ORPHAN:${technology.technology_id}`);
    if (!assemblyProfiles.has(technology.assembly_profile_id)) throw new Error(`DOMAIN_TECHNOLOGY_ASSEMBLY_ORPHAN:${technology.technology_id}`);
    if (!resourcePolicies.has(technology.resource_completeness_policy_id)) throw new Error(`DOMAIN_TECHNOLOGY_RESOURCE_POLICY_ORPHAN:${technology.technology_id}`);
    for (const profileId of technology.normative_profile_ids) {
      if (!normProfiles.has(profileId)) throw new Error(`DOMAIN_TECHNOLOGY_NORM_PROFILE_ORPHAN:${technology.technology_id}:${profileId}`);
    }
  }

  return {
    package: domainPackage,
    package_hash: estimateDeterministicHash(domainPackage),
    binding_by_catalog_id: bindings,
    technology_by_id: technologies,
    schema_by_id: schemas,
    normative_profile_by_id: normProfiles,
    assembly_profile_by_id: assemblyProfiles,
  };
}

export function compileProfessionalEstimateDomainV1(
  factory: ProfessionalEstimateDomainFactoryV1,
  registry: ConstructionNormativeRegistryV1,
  request: ProfessionalDomainCompileRequestV1,
): ProfessionalDomainCompileResultV1 {
  const binding = factory.binding_by_catalog_id.get(request.catalog_id);
  if (!binding) throw new Error(`DOMAIN_EXACT_BINDING_NOT_FOUND:${request.catalog_id}`);
  if (binding.work_key !== request.work_key) throw new Error(`DOMAIN_EXACT_WORK_KEY_MISMATCH:${request.catalog_id}:${request.work_key}`);
  const technology = factory.technology_by_id.get(binding.canonical_technology_id);
  if (!technology) throw new Error(`DOMAIN_TECHNOLOGY_NOT_FOUND:${binding.canonical_technology_id}`);
  const schema = factory.schema_by_id.get(technology.parameter_schema_id);
  if (!schema) throw new Error(`DOMAIN_SCHEMA_NOT_FOUND:${technology.parameter_schema_id}`);
  if (schema.parameters.some((parameter) => parameter.parameter_id === "scope_capability")) {
    const requestedScopeCapability = request.parameter_values.scope_capability?.value;
    if (requestedScopeCapability !== binding.scope_capability) {
      throw new Error(`DOMAIN_SCOPE_CAPABILITY_MISMATCH:${binding.catalog_id}:${String(requestedScopeCapability)}:${binding.scope_capability}`);
    }
  }
  if (schema.parameters.some((parameter) => parameter.parameter_id === "estimate_scope_mode")) {
    const requestedScopeMode = request.parameter_values.estimate_scope_mode?.value;
    if (requestedScopeMode !== request.scope_mode) {
      throw new Error(`DOMAIN_ESTIMATE_SCOPE_MODE_MISMATCH:${binding.catalog_id}:${String(requestedScopeMode)}:${request.scope_mode}`);
    }
  }
  const normProfiles = technology.normative_profile_ids.map((profileId) => {
    const profile = factory.normative_profile_by_id.get(profileId);
    if (!profile) throw new Error(`DOMAIN_NORM_PROFILE_NOT_FOUND:${profileId}`);
    return profile;
  });
  const normativeResolution = registry.resolve({
    ...request.normative_request,
    requested_source_ids: [...new Set(normProfiles.flatMap((profile) => profile.requested_source_ids))],
    requested_source_types: [...new Set(normProfiles.flatMap((profile) => profile.requested_source_types))],
  });
  if (schema.parameters.some((parameter) => parameter.parameter_id === "normative_rate_code")) {
    const explicitRateCode = String(request.parameter_values.normative_rate_code?.value ?? "").trim();
    const mismatchedRateSource = normativeResolution.applicable_sources
      .filter((source) => source.exact_rate_code_required)
      .find((source) => (request.normative_request.rate_code_by_source_id?.[source.source_id] ?? "").trim() !== explicitRateCode);
    if (explicitRateCode && mismatchedRateSource) {
      throw new Error(`DOMAIN_NORMATIVE_RATE_CODE_MISMATCH:${mismatchedRateSource.source_id}`);
    }
  }
  const exactIdentity = {
    catalog_id: binding.catalog_id,
    work_key: binding.work_key,
    canonical_technology_id: binding.canonical_technology_id,
  };
  const inputBlockers = schemaBlockers(schema, request.parameter_values);
  if (inputBlockers.length > 0) {
    const withoutHash = {
      exact_identity: exactIdentity,
      normative_resolution: normativeResolution,
      compilation: null,
      blockers: inputBlockers,
      status: "NEEDS_REQUIRED_INPUTS" as const,
    };
    return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
  }
  if (normativeResolution.status !== "APPLICABLE") {
    const withoutHash = {
      exact_identity: exactIdentity,
      normative_resolution: normativeResolution,
      compilation: null,
      blockers: normativeResolution.required_project_inputs,
      status: "BLOCKED_SOURCE_REQUIRED" as const,
    };
    return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
  }
  const assembly = factory.assembly_profile_by_id.get(technology.assembly_profile_id);
  if (!assembly) throw new Error(`DOMAIN_ASSEMBLY_PROFILE_NOT_FOUND:${technology.assembly_profile_id}`);
  const rawCompilation = compileProfessionalProjectAssemblyV4({
    project_assembly_id: `domain-project:${factory.package.manifest.domain_id}:${binding.catalog_id}`,
    parent_passport_id: `domain-passport:${technology.technology_id}`,
    parent_revision_id: request.parent_revision_id,
    requested_catalog_id: binding.catalog_id,
    requested_work_key: binding.work_key,
    scope_mode: request.scope_mode,
    parameter_values: request.parameter_values,
    child_assemblies: assembly.child_assemblies,
  });
  const applicableSourceIds = normativeResolution.applicable_sources.map((source) => source.source_id).sort();
  const applicableSourceIdSet = new Set(applicableSourceIds);
  const compilationWithoutHash = {
    ...rawCompilation,
    compiled_rows: rawCompilation.compiled_rows.map((compiledRow) => {
      // Row definitions carry candidate quantity sources. The domain boundary
      // keeps only candidates proven applicable for this exact project; a
      // material-safety regulation must not become a labor productivity source.
      const provenRowSourceIds = compiledRow.normative_source_ids
        .filter((sourceId) => applicableSourceIdSet.has(sourceId))
        .sort();
      if (provenRowSourceIds.length === 0) {
        throw new Error(`DOMAIN_ROW_NORMATIVE_SOURCE_NOT_APPLICABLE:${compiledRow.row_id}`);
      }
      return { ...compiledRow, normative_source_ids: provenRowSourceIds };
    }),
  };
  const compilation = {
    ...compilationWithoutHash,
    deterministic_hash: estimateDeterministicHash({
      ...compilationWithoutHash,
      deterministic_hash: undefined,
    }),
  };
  const emptyCompilation = compilation.requirements.length === 0 && compilation.compiled_rows.length === 0;
  const compilationBlockers = [
    ...compilation.requirements.map((item) => `${item.code}:${item.parameter_id}`),
    ...(emptyCompilation ? ["EMPTY_PROFESSIONAL_BOQ"] : []),
  ];
  const withoutHash = {
    exact_identity: exactIdentity,
    normative_resolution: normativeResolution,
    compilation,
    blockers: compilationBlockers,
    status: compilationBlockers.length === 0 ? "COMPILED" as const : "NEEDS_REQUIRED_INPUTS" as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}
