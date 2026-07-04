import { validateExpertReviewStatus } from "../../scripts/estimate/validateExpertReviewStatus";

describe("expert review workflow", () => {
  it("blocks rejected and deprecated evidence from production trust", () => {
    const result = validateExpertReviewStatus();

    expect(result.expert_review_registry_created).toBe(true);
    expect(result.every_production_trusted_family_reviewed).toBe(true);
    expect(result.not_reviewed_families_not_production_trusted).toBe(true);
    expect(result.rejected_sources_blocked).toBe(true);
    expect(result.deprecated_sources_warn_or_block).toBe(true);
    expect(result.expert_review_status_validation_passed).toBe(true);
    expect(result.blockers).toEqual([]);
  });
});
