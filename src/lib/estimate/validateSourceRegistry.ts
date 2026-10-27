import {
  getEstimateSourceRecord,
  loadEstimateSourceRegistry,
  loadEstimateSourceRegistryRecords,
} from "./sourceRegistry";
import { validateEstimateSourceRecordPolicy } from "./sourceQualityPolicy";
import type { EstimateSourcePolicyFailure } from "./sourceRegistryContract";

export type EstimateSourceRegistryValidationSummary = {
  sources_total: number;
  mapping_rules_total: number;
  official_sources_count: number;
  online_verifiable_sources_count: number;
  trusted_sources_count: number;
  preliminary_sources_count: number;
  official_source_verified_count: number;
  manufacturer_source_verified_count: number;
  external_norm_requires_kg_validation_count: number;
  source_missing_count: number;
  license_blocked_count: number;
  domain_expert_review_required_count: number;
  raw_copyrighted_norm_books_committed_count: number;
  unverified_sources_used_as_trusted_count: number;
  duplicate_source_ids_count: number;
  mapping_rules_with_missing_target_count: number;
  mapping_rules_invalid_regex_count: number;
  source_registry_valid: boolean;
  blockers: string[];
  failures: EstimateSourcePolicyFailure[];
};

export function validateEstimateSourceRegistry(): EstimateSourceRegistryValidationSummary {
  const registry = loadEstimateSourceRegistry();
  const records = loadEstimateSourceRegistryRecords();
  const failures: EstimateSourcePolicyFailure[] = [];
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const [index, record] of records.entries()) {
    if (seen.has(record.source_id)) duplicates.add(record.source_id);
    seen.add(record.source_id);
    failures.push(...validateEstimateSourceRecordPolicy(record, `sources.${index}`));
  }

  let missingTargets = 0;
  let invalidRegex = 0;
  for (const [index, rule] of registry.source_id_mapping_rules.entries()) {
    try {
      new RegExp(rule.norm_source_id_pattern);
    } catch {
      invalidRegex += 1;
      failures.push({
        code: "MAPPING_RULE_REGEX_INVALID",
        path: `source_id_mapping_rules.${index}.norm_source_id_pattern`,
        message: "Source mapping rule regex must compile.",
      });
    }
    if (!getEstimateSourceRecord(rule.source_id)) {
      missingTargets += 1;
      failures.push({
        code: "MAPPING_RULE_TARGET_MISSING",
        path: `source_id_mapping_rules.${index}.source_id`,
        message: "Source mapping rule points to a missing registry source.",
      });
    }
  }

  const rawCopyrighted = records.filter((record) => record.raw_copyrighted_norm_book_committed !== false).length;
  const unverifiedTrusted = failures.filter((failure) => failure.code === "UNVERIFIED_SOURCE_USED_AS_TRUSTED").length;
  const licenseBlocked = records.filter((record) => record.license_state === "LICENSE_REQUIRED").length;
  const officialVerified = records.filter((record) => record.verification_status === "OFFICIAL_ACTIVE").length;
  const manufacturerVerified = records.filter((record) => record.verification_status === "MANUFACTURER_TECHNICAL_DATA").length;
  const externalRequiresKgValidation = records.filter((record) =>
    record.verification_status === "OFFICIAL_REQUIRES_APPLICABILITY_REVIEW"
  ).length;
  const sourceMissing = records.filter((record) => record.source_quality === "unknown_untrusted").length;
  const domainExpertReviewRequired = records.filter((record) =>
    record.preliminary_disclosure_required ||
    record.verification_status === "OFFICIAL_REQUIRES_APPLICABILITY_REVIEW" ||
    record.verification_status === "SOURCE_NOT_VERIFIED" ||
    record.trust_level !== "trusted" ||
    !record.trusted_for_production_norms
  ).length;
  const blockers = [
    records.length === 0 ? "source_registry_empty" : "",
    duplicates.size > 0 ? `duplicate_source_ids:${[...duplicates].join(",")}` : "",
    rawCopyrighted > 0 ? `raw_copyrighted_norm_books_committed:${rawCopyrighted}` : "",
    unverifiedTrusted > 0 ? `unverified_sources_used_as_trusted:${unverifiedTrusted}` : "",
    licenseBlocked > 0 ? `BLOCKED_OWNER_NORMATIVE_DATABASE_LICENSE_REQUIRED:${licenseBlocked}` : "",
    missingTargets > 0 ? `mapping_rules_with_missing_target:${missingTargets}` : "",
    invalidRegex > 0 ? `mapping_rules_invalid_regex:${invalidRegex}` : "",
    records.some((record) => record.source_quality === "official_online_verified") ? "" : "official_online_source_missing",
    officialVerified > 0 ? "" : "official_active_source_missing",
    registry.source_id_mapping_rules.length > 0 ? "" : "source_mapping_rules_missing",
  ].filter(Boolean);

  return {
    sources_total: records.length,
    mapping_rules_total: registry.source_id_mapping_rules.length,
    official_sources_count: records.filter((record) => record.source_quality === "official_online_verified").length,
    online_verifiable_sources_count: records.filter((record) =>
      record.online_verification_required && (record.citation.url || record.official_url)
    ).length,
    trusted_sources_count: records.filter((record) => record.trust_level === "trusted").length,
    preliminary_sources_count: records.filter((record) => record.trust_level === "preliminary").length,
    official_source_verified_count: officialVerified,
    manufacturer_source_verified_count: manufacturerVerified,
    external_norm_requires_kg_validation_count: externalRequiresKgValidation,
    source_missing_count: sourceMissing,
    license_blocked_count: licenseBlocked,
    domain_expert_review_required_count: domainExpertReviewRequired,
    raw_copyrighted_norm_books_committed_count: rawCopyrighted,
    unverified_sources_used_as_trusted_count: unverifiedTrusted,
    duplicate_source_ids_count: duplicates.size,
    mapping_rules_with_missing_target_count: missingTargets,
    mapping_rules_invalid_regex_count: invalidRegex,
    source_registry_valid: blockers.length === 0 && failures.length === 0,
    blockers: [...blockers, ...failures.map((failure) => `${failure.path}:${failure.code}`)],
    failures,
  };
}
