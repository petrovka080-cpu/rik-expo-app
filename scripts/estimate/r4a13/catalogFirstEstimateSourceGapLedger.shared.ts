export type CatalogSourceRegistration = {
  sourceId: string;
  databaseRegistered: boolean;
  officialUrl: string | null;
  artifactSha256: string | null;
  registryReviewed: boolean;
  registryPhysicalNormPack: boolean;
  useRestriction?: string | null;
  independentArtifactSha256?: string | null;
};

export type CatalogSourceGapClassification =
  | "NO_PROFESSIONAL_SOURCE_DECLARED"
  | "SOURCE_METADATA_DECLARED_ONLY_CLAIM_UNBOUND"
  | "SOURCE_DOCUMENT_REGISTERED_NO_ARTIFACT_HASH_CLAIM_UNBOUND"
  | "SOURCE_ARTIFACT_HASH_PRESENT_CLAIM_UNBOUND";

export type CatalogGapClaimKind =
  | "MANAGED_PROFESSIONAL_SOURCE"
  | "PROJECT_SPECIFIC_REFINEMENT";

export type CatalogGapResolutionRoute =
  | "PROJECT_EVIDENCE_REQUIRED"
  | "PROFESSIONAL_SOURCE_SELECTION_AND_EXACT_RATE_BINDING_REQUIRED"
  | "SOURCE_ARTIFACT_ACQUISITION_AND_EXACT_RATE_BINDING_REQUIRED"
  | "VERIFIED_ARTIFACT_REGISTRATION_AND_EXACT_RATE_BINDING_REQUIRED"
  | "EXACT_VARIANT_SELECTION_AND_RATE_BINDING_FROM_HASHED_ARTIFACT_REQUIRED"
  | "EXACT_RATE_BINDING_FROM_HASHED_ARTIFACT_REQUIRED";

const NON_PROFESSIONAL_SOURCE = /(?:^|_)(?:project|user|customer|quantity_inputs?|drawing|design|ppr|validation_fixture)(?:_|$)/iu;

export function normalizeDeclaredSourceIds(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return [...new Set(values
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean))].sort();
}

export function isProfessionalDeclaredSourceId(sourceId: string): boolean {
  return !NON_PROFESSIONAL_SOURCE.test(sourceId);
}

export function classifyCatalogSourceGap(
  registrations: CatalogSourceRegistration[],
): CatalogSourceGapClassification {
  if (registrations.length === 0) return "NO_PROFESSIONAL_SOURCE_DECLARED";
  if (registrations.some((source) =>
    source.artifactSha256 != null || source.independentArtifactSha256 != null)) {
    return "SOURCE_ARTIFACT_HASH_PRESENT_CLAIM_UNBOUND";
  }
  if (registrations.some((source) =>
    source.databaseRegistered
    || source.registryReviewed
    || source.officialUrl != null)) {
    return "SOURCE_DOCUMENT_REGISTERED_NO_ARTIFACT_HASH_CLAIM_UNBOUND";
  }
  return "SOURCE_METADATA_DECLARED_ONLY_CLAIM_UNBOUND";
}

export function classifyCatalogGapResolutionRoute(
  claimKind: CatalogGapClaimKind,
  classification: CatalogSourceGapClassification,
  registrations: readonly CatalogSourceRegistration[] = [],
): CatalogGapResolutionRoute {
  if (claimKind === "PROJECT_SPECIFIC_REFINEMENT") {
    return "PROJECT_EVIDENCE_REQUIRED";
  }
  if (classification === "SOURCE_ARTIFACT_HASH_PRESENT_CLAIM_UNBOUND") {
    if (registrations.some((source) =>
      /EXACT_VARIANT_REQUIRED/iu.test(String(source.useRestriction ?? "")))) {
      return "EXACT_VARIANT_SELECTION_AND_RATE_BINDING_FROM_HASHED_ARTIFACT_REQUIRED";
    }
    if (registrations.some((source) =>
      source.artifactSha256 == null && source.independentArtifactSha256 != null)) {
      return "VERIFIED_ARTIFACT_REGISTRATION_AND_EXACT_RATE_BINDING_REQUIRED";
    }
    return "EXACT_RATE_BINDING_FROM_HASHED_ARTIFACT_REQUIRED";
  }
  if (classification === "SOURCE_DOCUMENT_REGISTERED_NO_ARTIFACT_HASH_CLAIM_UNBOUND") {
    return "SOURCE_ARTIFACT_ACQUISITION_AND_EXACT_RATE_BINDING_REQUIRED";
  }
  return "PROFESSIONAL_SOURCE_SELECTION_AND_EXACT_RATE_BINDING_REQUIRED";
}
