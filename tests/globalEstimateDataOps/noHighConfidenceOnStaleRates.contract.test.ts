import { resolveGlobalPriceSourceFreshness } from "../../src/lib/ai/globalEstimate";

describe("Global Estimate Data Ops stale confidence contract", () => {
  it("never returns high confidence for stale or expired source checks", () => {
    expect(resolveGlobalPriceSourceFreshness("2025-01-01T00:00:00Z").confidence).not.toBe("high");
    expect(resolveGlobalPriceSourceFreshness(null).confidence).toBe("low");
  });
});
