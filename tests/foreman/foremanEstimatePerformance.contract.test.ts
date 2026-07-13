import { runAiEstimateCoreBenchmark } from "../../scripts/estimate/benchmarkAiEstimateCore";

describe("foreman estimate performance", () => {
  it("keeps materials and subcontracts estimate open operations inside SLO", () => {
    const benchmark = runAiEstimateCoreBenchmark({
      casesLimit: 20,
      iterations: 5,
      writeLedger: false,
      writeSummary: false,
      sourceSha: "test-source-sha",
    }).artifact;
    const materials = benchmark.slo_records.find((record) => record.operation === "foreman_materials_estimate_open");
    const subcontracts = benchmark.slo_records.find((record) => record.operation === "foreman_subcontracts_estimate_open");

    expect(materials?.p95Ms).toBeLessThanOrEqual(2000);
    expect(subcontracts?.p95Ms).toBeLessThanOrEqual(2000);
    expect(materials?.sampleSize).toBeGreaterThanOrEqual(5);
    expect(subcontracts?.sampleSize).toBeGreaterThanOrEqual(5);
  });
});
