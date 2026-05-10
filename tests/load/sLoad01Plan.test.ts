import {
  S_LOAD_01_ARTIFACT_PATHS,
  S_LOAD_01_PHASE_A_REQUEST_COUNTS,
  S_LOAD_01_PHASE_B_REQUEST_COUNTS,
  buildSLoad01StepPlan,
  resolveSLoad01FinalStatus,
} from "../../scripts/load/sLoad01Plan";

describe("S_LOAD_01 staging readonly ladder plan", () => {
  it("uses the requested artifact paths", () => {
    expect(S_LOAD_01_ARTIFACT_PATHS).toEqual({
      matrix: "artifacts/S_LOAD_01_STAGING_READONLY_LADDER_AND_5K_PROOF_matrix.json",
      proof: "artifacts/S_LOAD_01_STAGING_READONLY_LADDER_AND_5K_PROOF_proof.md",
      results: "artifacts/S_LOAD_01_STAGING_READONLY_LADDER_AND_5K_PROOF_results.json",
    });
  });

  it("keeps the ladder exact and phase B gated after the 1K proof", () => {
    const plan = buildSLoad01StepPlan();

    expect(S_LOAD_01_PHASE_A_REQUEST_COUNTS).toEqual([100, 250, 500, 1_000]);
    expect(S_LOAD_01_PHASE_B_REQUEST_COUNTS).toEqual([2_000, 5_000]);
    expect(plan.map((step) => step.requestCount)).toEqual([100, 250, 500, 1_000, 2_000, 5_000]);
    expect(plan.filter((step) => step.phase === "phase_a_ladder").map((step) => step.requestCount)).toEqual([
      100,
      250,
      500,
      1_000,
    ]);
    expect(plan.filter((step) => step.phase === "phase_b_5k").map((step) => step.requestCount)).toEqual([
      2_000,
      5_000,
    ]);
    expect(plan.filter((step) => step.phaseBApprovalRequired).map((step) => step.requestCount)).toEqual([
      2_000,
      5_000,
    ]);
  });

  it("keeps every step staging readonly bounded without changing safety thresholds", () => {
    const plan = buildSLoad01StepPlan();

    expect(plan.every((step) => step.maxConcurrency === step.requestCount)).toBe(true);
    expect(plan.every((step) => step.stopConditions.maxTotalRequests === step.requestCount)).toBe(true);
    expect(plan.every((step) => step.stopConditions.abortOnHealthFailure)).toBe(true);
    expect(plan.every((step) => step.stopConditions.abortOnReadyFailure)).toBe(true);
    expect(plan.every((step) => step.stopConditions.abortOnErrorRateExceeded)).toBe(true);
    expect(plan.every((step) => step.stopConditions.maxErrorRate === 0.02)).toBe(true);
    expect(plan.every((step) => step.stopConditions.maxP95LatencyMs === 1_500)).toBe(true);
    expect(plan.find((step) => step.requestCount === 5_000)?.rampSteps).toEqual([
      5,
      10,
      15,
      20,
      25,
      50,
      100,
      250,
      500,
      750,
      1_000,
      1_500,
      2_000,
      3_000,
      4_000,
      5_000,
    ]);
  });

  it("resolves only the approved final statuses", () => {
    expect(
      resolveSLoad01FinalStatus({
        phaseAGreen: true,
        phaseBStarted: true,
        allStepsGreen: true,
        healthFailed: false,
        blockedBeforeLoad: false,
        loadAborted: false,
      }),
    ).toBe("GREEN_STAGING_READONLY_LADDER_AND_5K_PASS");

    expect(
      resolveSLoad01FinalStatus({
        phaseAGreen: true,
        phaseBStarted: false,
        allStepsGreen: false,
        healthFailed: false,
        blockedBeforeLoad: false,
        loadAborted: false,
      }),
    ).toBe("GREEN_STAGING_READONLY_LADDER_1K_PASS_5K_NOT_RUN");

    expect(
      resolveSLoad01FinalStatus({
        phaseAGreen: false,
        phaseBStarted: false,
        allStepsGreen: false,
        healthFailed: true,
        blockedBeforeLoad: false,
        loadAborted: false,
      }),
    ).toBe("BLOCKED_STAGING_HEALTH_FAILED");

    expect(
      resolveSLoad01FinalStatus({
        phaseAGreen: true,
        phaseBStarted: true,
        allStepsGreen: false,
        healthFailed: false,
        blockedBeforeLoad: false,
        loadAborted: true,
      }),
    ).toBe("BLOCKED_STAGING_LOAD_ABORTED_SAFELY");
  });
});
