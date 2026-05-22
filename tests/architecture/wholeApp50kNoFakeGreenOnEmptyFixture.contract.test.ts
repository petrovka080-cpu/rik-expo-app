import {
  FINAL_50K_92_GREEN_STATUS,
  evaluateFinal50k92GreenReleaseGuard,
} from "../../scripts/release/releaseGuard.shared";
import {
  buildWholeApp50kTzLockMatrix,
  evaluateWholeApp50kFixtureSufficiency,
} from "../../src/lib/proofFixtures/50kProofFixtureMatrix";

describe("whole-app 50k architecture: no fake green on empty fixture", () => {
  it("blocks final 9.2 green when fixture_sufficient is false", () => {
    const empty = evaluateWholeApp50kFixtureSufficiency();
    const guard = evaluateFinal50k92GreenReleaseGuard({
      finalStatus: FINAL_50K_92_GREEN_STATUS,
      fixtureSufficient: empty.fixtureSufficient,
      proofRunId: "proof_50k_live_001",
      wholeApp50kLiveProofPassed: true,
      rlsGreen: true,
      fullJestPassed: true,
      releaseVerifyPassed: true,
    });

    expect(empty.blocker).toBe("BLOCKED_EXTERNAL_ONLY_50K_FIXTURE_DATA_REQUIRED");
    expect(guard.passed).toBe(false);
    expect(guard.blockers).toContain("BLOCKED_EXTERNAL_ONLY_50K_FIXTURE_DATA_REQUIRED");
    expect(buildWholeApp50kTzLockMatrix({ fullJestPassed: true, releaseVerifyPassed: true })).toMatchObject({
      fake_green_on_empty_fixture_blocked: true,
      empty_db_status: "BLOCKED_EXTERNAL_ONLY_50K_FIXTURE_DATA_REQUIRED",
      empty_db_marked_as_perf_failure: false,
    });
  });
});
