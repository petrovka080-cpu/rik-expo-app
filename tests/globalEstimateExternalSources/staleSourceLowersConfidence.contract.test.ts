import { scoreGlobalEstimateSourceEvidence } from "../../src/lib/ai/globalEstimate";

describe("stale source lowers confidence", () => {
  it("does not allow stale evidence to stay high confidence", () => {
    const score = scoreGlobalEstimateSourceEvidence({
      sourceId: "old_supplier_price",
      label: "Approved supplier catalog",
      checkedAt: "2024-01-01T00:00:00+06:00",
      confidence: "high",
    });

    expect(score.freshness).not.toBe("fresh");
    expect(score.confidence).not.toBe("high");
  });
});
