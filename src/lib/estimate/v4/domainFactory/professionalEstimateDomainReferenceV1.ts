import { estimateDeterministicHash } from "../../estimateDeterministicHash";

export const PROFESSIONAL_ESTIMATE_DOMAIN_REFERENCE_CONTRACTS_V1 = Object.freeze({
  catalog_binding_contract: "exact-catalog-binding:v1",
  canonical_equivalence_contract: "canonical-equivalence-by-operation-method-material-schema-formula-resource-norm:v1",
  parameter_schema_contract: "work-specific-p0-p1-p2-visible-required-parity:v1",
  normative_source_contract: "construction-normative-registry-and-applicability:v1",
  formula_trace_contract: "formula-input-source-unit-substitution-result:v1",
  resource_row_contract: "typed-resource-row-with-semantic-and-cost-owner:v1",
  conditional_assembly_contract: "explicit-scope-triggered-child-assembly:v4.1",
  cost_ownership_contract: "informational-or-priced-resource-or-priced-unit-rate:v1",
  revision_contract: "one-apply-one-immutable-revision:v1",
  durable_history_contract: "transactional-commit-cold-reopen-exact-snapshot:v1",
  projection_parity_contract: "immutable-revision-pdf-procurement-parity:v1",
  deterministic_audit_contract: "all-record-minimal-full-hash-stable:v1",
  short_runtime_smoke_contract: "exact-select-apply-edit-approve-reload-pdf:v1",
});

export type ProfessionalEstimateDomainReferenceArtifactV1 = {
  artifact_name: string;
  sha256: string;
  bytes: number;
};

export type ProfessionalEstimateDomainReferenceV1 = {
  schema: "professional-estimate-domain-reference:v1";
  reference_domain: "ASPHALT_R63_M44_A19";
  source_sha: string;
  source_tree: string;
  prerequisite_token: "GREEN_ASPHALT_R63_M44_A19_PROFESSIONAL_ESTIMATE_REFERENCE_DURABLE_HISTORY_READY_FOR_11610_SCALE_NO_FULL_JEST_NO_RELEASE";
  contracts: typeof PROFESSIONAL_ESTIMATE_DOMAIN_REFERENCE_CONTRACTS_V1;
  reference_artifacts: readonly ProfessionalEstimateDomainReferenceArtifactV1[];
  prohibited_copy_rule: "ASPHALT_TECHNOLOGY_DATA_MUST_NOT_BE_COPIED_TO_OTHER_DOMAINS";
  compatibility_probe: "FOCUSED_ONLY";
  deterministic_hash: string;
};

export function buildProfessionalEstimateDomainReferenceV1(input: {
  source_sha: string;
  source_tree: string;
  artifacts: readonly ProfessionalEstimateDomainReferenceArtifactV1[];
}): ProfessionalEstimateDomainReferenceV1 {
  if (!/^[0-9a-f]{40}$/.test(input.source_sha) || !/^[0-9a-f]{40}$/.test(input.source_tree)) {
    throw new Error("DOMAIN_REFERENCE_INVALID_GIT_IDENTITY");
  }
  if (input.artifacts.length !== 9) throw new Error(`DOMAIN_REFERENCE_ARTIFACT_COUNT:${input.artifacts.length}`);
  const names = new Set(input.artifacts.map((artifact) => artifact.artifact_name));
  if (names.size !== input.artifacts.length) throw new Error("DOMAIN_REFERENCE_DUPLICATE_ARTIFACT");
  for (const artifact of input.artifacts) {
    if (!/^[0-9a-f]{64}$/.test(artifact.sha256) || artifact.bytes <= 0) {
      throw new Error(`DOMAIN_REFERENCE_INVALID_ARTIFACT:${artifact.artifact_name}`);
    }
  }
  const withoutHash = {
    schema: "professional-estimate-domain-reference:v1" as const,
    reference_domain: "ASPHALT_R63_M44_A19" as const,
    source_sha: input.source_sha,
    source_tree: input.source_tree,
    prerequisite_token: "GREEN_ASPHALT_R63_M44_A19_PROFESSIONAL_ESTIMATE_REFERENCE_DURABLE_HISTORY_READY_FOR_11610_SCALE_NO_FULL_JEST_NO_RELEASE" as const,
    contracts: PROFESSIONAL_ESTIMATE_DOMAIN_REFERENCE_CONTRACTS_V1,
    reference_artifacts: [...input.artifacts].sort((left, right) => left.artifact_name.localeCompare(right.artifact_name)),
    prohibited_copy_rule: "ASPHALT_TECHNOLOGY_DATA_MUST_NOT_BE_COPIED_TO_OTHER_DOMAINS" as const,
    compatibility_probe: "FOCUSED_ONLY" as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}
