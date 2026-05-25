import { validateRateSourceEvidence } from "../../src/lib/ai/globalEstimate/sourceGovernance";
import { STALE_HIGH_SOURCE } from "./sourceGovernanceTestHelpers";

describe("source governance stale source confidence", () => {
  it("fails high confidence stale source evidence", () => {
    const validation = validateRateSourceEvidence(STALE_HIGH_SOURCE);
    expect(validation.ok).toBe(false);
    expect(validation.highConfidenceStaleSourceFound).toBe(true);
    expect(validation.failures.map((failure) => failure.code)).toContain("HIGH_CONFIDENCE_STALE_SOURCE");
  });
});
