import type { RateSourceEvidence } from "../../src/lib/ai/globalEstimate/sourceGovernance";
import { validateRateSourceEvidence } from "../../src/lib/ai/globalEstimate/sourceGovernance";
import { FRESH_SOURCE } from "./sourceGovernanceTestHelpers";

describe("rate source evidence shape", () => {
  it("requires explicit source identity, freshness and confidence", () => {
    const evidence: RateSourceEvidence = FRESH_SOURCE;
    const validation = validateRateSourceEvidence(evidence);
    expect(evidence).toMatchObject({
      sourceId: "catalog_items",
      sourceType: "catalog_item",
      label: "catalog_items",
      checkedAt: expect.any(String),
      freshness: "fresh",
      confidence: "high",
    });
    expect(validation.ok).toBe(true);
  });
});
