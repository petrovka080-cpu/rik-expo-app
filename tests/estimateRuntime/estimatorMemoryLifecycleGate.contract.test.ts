import { evaluateEstimatorMemoryLifecycle } from "../../scripts/estimate/runEstimatorMemoryLifecycleGate";

describe("estimator memory lifecycle gate", () => {
  it("accepts a bounded post-GC plateau", () => {
    const result = evaluateEstimatorMemoryLifecycle([
      200_000_000,
      220_000_000,
      225_000_000,
      228_000_000,
      230_000_000,
      231_000_000,
    ]);

    expect(result.passed).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("rejects retained growth that process sharding could otherwise hide", () => {
    const result = evaluateEstimatorMemoryLifecycle([
      200_000_000,
      210_000_000,
      215_000_000,
      300_000_000,
      380_000_000,
      450_000_000,
    ]);

    expect(result.passed).toBe(false);
    expect(result.blockers.some((blocker) => blocker.startsWith("retained_growth_exceeded:"))).toBe(true);
  });
});
