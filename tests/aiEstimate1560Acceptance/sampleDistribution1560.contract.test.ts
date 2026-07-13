import { REQUIRED_SAMPLE_DISTRIBUTION_1560 } from "../../src/lib/ai/estimateTemplate10000";
import { distribution1560, sample1560 } from "./aiEstimate1560AcceptanceTestHelpers";

describe("1560 acceptance sample distribution", () => {
  it("selects 1560 unique canonical work keys with the required stratified distribution", () => {
    expect(distribution1560.sample_total).toBe(1560);
    expect(distribution1560.sample_unique_work_keys).toBe(1560);
    expect(distribution1560.sample_distribution_matches_required).toBe(true);
    expect(distribution1560.actual).toEqual(REQUIRED_SAMPLE_DISTRIBUTION_1560);
    expect(distribution1560.sampling_policy.aliases_counted_as_templates).toBe(false);
    expect(distribution1560.sampling_policy.prompt_variants_counted_as_templates).toBe(false);
    expect(distribution1560.sampling_policy.duplicate_work_keys).toBe(0);
    expect(distribution1560.bucket_distribution.deterministic_random).toBe(936);
    expect(distribution1560.bucket_distribution.high_risk_confusion).toBe(390);
    expect(distribution1560.bucket_distribution.previously_risky_user_visible).toBe(234);
    expect(sample1560.filter((entry) => entry.selectedBy.startsWith("mandatory:"))).toHaveLength(34);
  });
});
