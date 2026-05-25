import { resolveCatalogConfidencePolicy } from "../../src/lib/ai/globalEstimate/sourceGovernance";

describe("catalog confidence policy", () => {
  it("caps confidence by freshness and fails stale high confidence", () => {
    const fresh = resolveCatalogConfidencePolicy({
      sourceId: "catalog_items",
      declaredConfidence: "high",
      checkedAt: "2026-05-20T00:00:00.000Z",
    });
    const stale = resolveCatalogConfidencePolicy({
      sourceId: "catalog_items",
      declaredConfidence: "high",
      checkedAt: "2025-01-01T00:00:00.000Z",
    });
    expect(fresh.effectiveConfidence).toBe("high");
    expect(fresh.failures).toEqual([]);
    expect(stale.effectiveConfidence).toBe("low");
    expect(stale.failures.map((failure) => failure.code)).toContain("HIGH_CONFIDENCE_STALE_SOURCE");
  });
});
