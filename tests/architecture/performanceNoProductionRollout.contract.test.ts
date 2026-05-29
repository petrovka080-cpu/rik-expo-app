import { read } from "./performanceGuardTestHelpers";

describe("performance no production rollout", () => {
  it("keeps rollout disabled in the matrix contract", () => {
    const proof = read("scripts/e2e/runAiEstimateLoadPerformanceCostProof.ts");
    expect(proof).toContain("production_rollout_enabled: false");
  });
});
