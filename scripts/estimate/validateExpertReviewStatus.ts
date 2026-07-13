import { auditExpertReviewCoverage } from "./auditExpertReviewCoverage";
import { classifyProductionTrust } from "../../src/features/estimates/governance/productionTrust";

function sampleEstimate(reviewStatus: "NOT_REVIEWED" | "REJECTED" | "DEPRECATED" | "APPROVED_FOR_PRELIMINARY") {
  return classifyProductionTrust({
    estimate_id: `expert-review-${reviewStatus}`,
    revision_id: "r1",
    source_prompt: "expert review validation",
    region: "KG",
    currency: "KGS",
    pricebook_version: null,
    date_of_estimate: "2026-07-04",
    source_quality: "company_verified_norm",
    expert_review_status: reviewStatus,
    rows: [{
      row_id: "row-1",
      name: "Material row",
      item_type: "material",
      quantity: 1,
      unit: "pcs",
      unit_price: null,
      total: null,
      included_in_procurement: true,
    }],
  });
}

export function validateExpertReviewStatus() {
  const audit = auditExpertReviewCoverage();
  const notReviewed = sampleEstimate("NOT_REVIEWED");
  const rejected = sampleEstimate("REJECTED");
  const deprecated = sampleEstimate("DEPRECATED");
  const preliminary = sampleEstimate("APPROVED_FOR_PRELIMINARY");
  const blockers = [
    audit.expert_review_audit_passed ? "" : "expert_review_audit_failed",
    notReviewed.trust_level === "NEEDS_EXPERT_REVIEW" ? "" : `not_reviewed_trust:${notReviewed.trust_level}`,
    rejected.trust_level === "BLOCKED_FAKE_SOURCE" ? "" : `rejected_trust:${rejected.trust_level}`,
    deprecated.trust_level === "NEEDS_EXPERT_REVIEW" ? "" : `deprecated_trust:${deprecated.trust_level}`,
    preliminary.trust_level === "QUANTITY_ONLY_PRICE_MISSING" ? "" : `preliminary_trust:${preliminary.trust_level}`,
    ...audit.blockers,
  ].filter(Boolean);

  return {
    ...audit,
    not_reviewed_families_not_production_trusted: notReviewed.trust_level === "NEEDS_EXPERT_REVIEW",
    rejected_sources_blocked: rejected.trust_level === "BLOCKED_FAKE_SOURCE",
    deprecated_sources_warn_or_block: deprecated.trust_level === "NEEDS_EXPERT_REVIEW",
    approved_preliminary_not_called_production: preliminary.trust_level !== "TRUSTED_PRODUCTION",
    expert_review_status_validation_passed: blockers.length === 0,
    blockers,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/validateExpertReviewStatus.ts")) {
  const result = validateExpertReviewStatus();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.expert_review_status_validation_passed ? 0 : 1;
}
