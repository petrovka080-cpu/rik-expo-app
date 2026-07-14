import type {
  EstimateSourcePolicyFailure,
  EstimateSourceQuality,
  EstimateSourceRegistryRecord,
  EstimateSourceVerificationStatus,
} from "./sourceRegistryContract";

const TRUSTED_QUALITIES = new Set<EstimateSourceQuality>([
  "official_online_verified",
  "manufacturer_datasheet_reviewed",
  "internal_estimator_reviewed",
  "expert_engineering_reviewed",
]);

const TRUSTED_VERIFICATION_STATUSES = new Set<EstimateSourceVerificationStatus>([
  "OFFICIAL_ACTIVE",
  "MANUFACTURER_TECHNICAL_DATA",
  "LICENSED_COMMERCIAL_SOURCE",
]);

export function isTrustedEstimateSource(record: EstimateSourceRegistryRecord): boolean {
  return record.trusted_for_production_norms &&
    record.trust_level === "trusted" &&
    record.license_state !== "LICENSE_REQUIRED" &&
    TRUSTED_QUALITIES.has(record.source_quality) &&
    TRUSTED_VERIFICATION_STATUSES.has(record.verification_status);
}

export function estimateSourceRequiresDisclosure(record: EstimateSourceRegistryRecord): boolean {
  return record.preliminary_disclosure_required ||
    record.trust_level !== "trusted" ||
    !record.trusted_for_production_norms;
}

export function isUnverifiedSourceUsedAsTrusted(record: EstimateSourceRegistryRecord): boolean {
  return record.trusted_for_production_norms && !isTrustedEstimateSource(record);
}

export function validateEstimateSourceRecordPolicy(
  record: EstimateSourceRegistryRecord,
  path = `sources.${record.source_id}`,
): EstimateSourcePolicyFailure[] {
  const failures: EstimateSourcePolicyFailure[] = [];
  const requiredMetadata: (keyof EstimateSourceRegistryRecord)[] = [
    "issuer",
    "document_title",
    "document_number",
    "edition",
    "effective_date",
    "jurisdiction",
    "applicability",
    "accessed_at",
    "content_hash",
    "license_state",
    "verification_status",
  ];
  for (const field of requiredMetadata) {
    const value = record[field];
    if (typeof value !== "string" || !value.trim()) {
      failures.push({
        code: "SOURCE_REGISTRY_METADATA_MISSING",
        path: `${path}.${field}`,
        message: "Source registry records require versioned source metadata.",
      });
    }
  }
  if (!record.source_id.trim()) {
    failures.push({
      code: "SOURCE_ID_MISSING",
      path: `${path}.source_id`,
      message: "Source record requires source_id.",
    });
  }
  if (!record.title.trim() || !record.citation.label.trim()) {
    failures.push({
      code: "SOURCE_CITATION_MISSING",
      path: `${path}.citation`,
      message: "Source record requires a human citation label.",
    });
  }
  if (record.raw_copyrighted_norm_book_committed !== false) {
    failures.push({
      code: "RAW_COPYRIGHTED_NORM_BOOK_COMMITTED",
      path,
      message: "Raw copyrighted norm books must not be committed.",
    });
  }
  if (isUnverifiedSourceUsedAsTrusted(record)) {
    failures.push({
      code: "UNVERIFIED_SOURCE_USED_AS_TRUSTED",
      path: `${path}.verification_status`,
      message: "Trusted production norm sources require trusted quality and verification.",
    });
  }
  if (record.license_state === "LICENSE_REQUIRED" && record.trusted_for_production_norms) {
    failures.push({
      code: "BLOCKED_OWNER_NORMATIVE_DATABASE_LICENSE_REQUIRED",
      path: `${path}.license_state`,
      message: "Licensed commercial norm sources cannot be trusted without an explicit owner license.",
    });
  }
  if (
    (record.verification_status === "OFFICIAL_REQUIRES_APPLICABILITY_REVIEW" ||
      record.verification_status === "SUPERSEDED" ||
      record.verification_status === "SOURCE_NOT_VERIFIED") &&
    record.trusted_for_production_norms
  ) {
    failures.push({
      code: "SOURCE_VERIFICATION_STATUS_CANNOT_BE_TRUSTED",
      path: `${path}.verification_status`,
      message: "Sources requiring review, superseded sources, and unverified sources cannot back production norms.",
    });
  }
  if (record.source_quality === "official_online_verified") {
    if (!record.citation.url?.trim() || !record.official_url?.trim()) {
      failures.push({
        code: "OFFICIAL_SOURCE_URL_MISSING",
        path: `${path}.official_url`,
        message: "Official online sources require a public URL.",
      });
    }
    if (record.allowed_domains.length === 0) {
      failures.push({
        code: "OFFICIAL_SOURCE_DOMAIN_POLICY_MISSING",
        path: `${path}.allowed_domains`,
        message: "Official online sources require allowed domain governance.",
      });
    }
  }
  if (record.source_quality === "preliminary_engineering_reference" && !record.preliminary_disclosure_required) {
    failures.push({
      code: "PRELIMINARY_SOURCE_DISCLOSURE_MISSING",
      path: `${path}.preliminary_disclosure_required`,
      message: "Preliminary engineering formula sources must be visibly disclosed.",
    });
  }
  return failures;
}
