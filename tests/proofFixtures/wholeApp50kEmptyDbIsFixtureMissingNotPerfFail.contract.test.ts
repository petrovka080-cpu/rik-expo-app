import {
  assertFixtureMissingIsNotPerformanceFailure,
  evaluateWholeApp50kFixtureSufficiency,
} from "../../src/lib/proofFixtures/50kProofFixtureMatrix";

describe("whole-app 50k empty DB classification contract", () => {
  it("reports missing fixture data instead of query-plan or p95 failure", () => {
    const sufficiency = evaluateWholeApp50kFixtureSufficiency();

    expect(sufficiency.fixtureSufficient).toBe(false);
    expect(sufficiency.blocker).toBe("BLOCKED_EXTERNAL_ONLY_50K_FIXTURE_DATA_REQUIRED");
    expect(() => assertFixtureMissingIsNotPerformanceFailure({
      fixtureSufficient: false,
      p95FailureClaimed: true,
    })).toThrow("fixtureSufficient=false");
  });
});
