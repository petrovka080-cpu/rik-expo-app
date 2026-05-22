import { resolveGlobalPriceSourceFreshness } from "../../src/lib/ai/globalEstimate";

describe("Global Estimate Data Ops source freshness contract", () => {
  it("lowers confidence for stale and expired sources instead of blocking estimates", () => {
    const fresh = resolveGlobalPriceSourceFreshness(new Date().toISOString());
    const expired = resolveGlobalPriceSourceFreshness("2024-01-01T00:00:00Z");

    expect(fresh.status).toBe("fresh");
    expect(fresh.confidence).toBe("high");
    expect(expired.confidence).toBe("low");
    expect(expired.blocksEstimate).toBe(false);
    expect(expired.userWarning).toContain("ориентировочные");
  });
});
