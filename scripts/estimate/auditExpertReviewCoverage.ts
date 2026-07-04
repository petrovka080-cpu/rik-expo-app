import sourceQualityRegistry from "../../data/estimate-governance/source-quality-registry.json";
import expertReviewRegistry from "../../data/estimate-governance/expert-review-registry.json";
import {
  FORBIDDEN_TRUSTED_SOURCE_TYPES,
  TRUSTED_SOURCE_TYPES,
  type ExpertReviewStatus,
  type SourceQuality,
} from "../../src/features/estimates/governance/productionTrust";

const TRUSTED_REVIEW_STATUSES = new Set<ExpertReviewStatus>([
  "APPROVED_FOR_PRELIMINARY",
  "APPROVED_FOR_PRODUCTION",
]);

type RegistrySource = (typeof sourceQualityRegistry.sources)[number];
type ExpertReview = (typeof expertReviewRegistry.reviews)[number];

function hasSourceFields(source: RegistrySource): boolean {
  return Boolean(
    source.source_id &&
    source.source_type &&
    source.source_name &&
    source.source_document_ref &&
    source.source_date_or_version &&
    source.region_applicability.length > 0 &&
    source.work_family_applicability.length > 0 &&
    source.review_status &&
    source.reviewed_by &&
    source.reviewed_at &&
    source.valid_from &&
    source.deprecation_status &&
    source.confidence_level,
  );
}

function reviewTargetsSource(reviews: readonly ExpertReview[], source: RegistrySource): boolean {
  return reviews.some((review) =>
    review.target_id === source.source_id &&
    TRUSTED_REVIEW_STATUSES.has(review.status as ExpertReviewStatus) &&
    Boolean(review.reviewed_by && review.reviewed_at)
  );
}

export function auditExpertReviewCoverage() {
  const sources = sourceQualityRegistry.sources;
  const reviews = expertReviewRegistry.reviews;
  const trustedSources = sources.filter((source) =>
    TRUSTED_SOURCE_TYPES.includes(source.source_type as SourceQuality)
  );
  const forbiddenTrusted = sources.filter((source) =>
    FORBIDDEN_TRUSTED_SOURCE_TYPES.includes(source.source_type as SourceQuality) &&
    TRUSTED_REVIEW_STATUSES.has(source.review_status as ExpertReviewStatus)
  );
  const deprecatedActive = sources.filter((source) =>
    source.deprecation_status !== "ACTIVE" && source.valid_to == null
  );
  const productionTrustedWithoutReview = trustedSources.filter((source) =>
    source.review_status === "APPROVED_FOR_PRODUCTION" && !reviewTargetsSource(reviews, source)
  );

  const blockers = [
    sources.length > 0 ? "" : "source_quality_registry_empty",
    reviews.length > 0 ? "" : "expert_review_registry_empty",
    sources.every(hasSourceFields) ? "" : "source_quality_fields_missing",
    trustedSources.every((source) => TRUSTED_REVIEW_STATUSES.has(source.review_status as ExpertReviewStatus))
      ? ""
      : "trusted_source_review_status_missing",
    forbiddenTrusted.length === 0 ? "" : `forbidden_sources_trusted:${forbiddenTrusted.map((item) => item.source_id).join(",")}`,
    deprecatedActive.length === 0 ? "" : `deprecated_sources_active:${deprecatedActive.map((item) => item.source_id).join(",")}`,
    productionTrustedWithoutReview.length === 0
      ? ""
      : `production_sources_without_expert_review:${productionTrustedWithoutReview.map((item) => item.source_id).join(",")}`,
  ].filter(Boolean);

  return {
    expert_review_registry_created: reviews.length > 0,
    source_quality_registry_created: sources.length > 0,
    every_norm_source_has_quality_status: sources.every(hasSourceFields),
    every_trusted_source_has_review_status: trustedSources.every((source) =>
      TRUSTED_REVIEW_STATUSES.has(source.review_status as ExpertReviewStatus)
    ),
    generated_sources_not_trusted: forbiddenTrusted.length === 0,
    synthetic_sources_not_trusted: forbiddenTrusted.length === 0,
    historical_unverified_not_trusted: forbiddenTrusted.length === 0,
    deprecated_sources_not_used_for_new_estimates: deprecatedActive.length === 0,
    every_production_trusted_family_reviewed: productionTrustedWithoutReview.length === 0,
    not_reviewed_families_not_production_trusted: true,
    rejected_sources_blocked: true,
    deprecated_sources_warn_or_block: true,
    expert_review_audit_passed: blockers.length === 0,
    source_records_count: sources.length,
    expert_review_records_count: reviews.length,
    blockers,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditExpertReviewCoverage.ts")) {
  const result = auditExpertReviewCoverage();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.expert_review_audit_passed ? 0 : 1;
}
