import { auditExpertReviewCoverage } from "../../scripts/estimate/auditExpertReviewCoverage";

describe("source quality governance", () => {
  it("keeps trusted sources reviewed and forbids generated sources as production evidence", () => {
    const audit = auditExpertReviewCoverage();

    expect(audit.source_quality_registry_created).toBe(true);
    expect(audit.every_norm_source_has_quality_status).toBe(true);
    expect(audit.every_trusted_source_has_review_status).toBe(true);
    expect(audit.generated_sources_not_trusted).toBe(true);
    expect(audit.synthetic_sources_not_trusted).toBe(true);
    expect(audit.historical_unverified_not_trusted).toBe(true);
    expect(audit.deprecated_sources_not_used_for_new_estimates).toBe(true);
    expect(audit.blockers).toEqual([]);
  });
});
