import {
  BOUNDED_1K_STAGING_LOAD_STOP_CONDITIONS,
  BOUNDED_5K_STAGING_LOAD_STOP_CONDITIONS,
  type StagingLoadRunProfile,
  type StagingLoadStopConditions,
} from "./stagingLoadCore";

export const S_LOAD_01_WAVE = "S_LOAD_01_STAGING_READONLY_LADDER_AND_5K_PROOF" as const;

export const S_LOAD_01_ARTIFACT_PATHS = {
  matrix: "artifacts/S_LOAD_01_STAGING_READONLY_LADDER_AND_5K_PROOF_matrix.json",
  proof: "artifacts/S_LOAD_01_STAGING_READONLY_LADDER_AND_5K_PROOF_proof.md",
  results: "artifacts/S_LOAD_01_STAGING_READONLY_LADDER_AND_5K_PROOF_results.json",
} as const;

export const S_LOAD_01_PHASE_A_REQUEST_COUNTS = [100, 250, 500, 1_000] as const;
export const S_LOAD_01_PHASE_B_REQUEST_COUNTS = [2_000, 5_000] as const;

export type SLoad01RequestCount =
  | (typeof S_LOAD_01_PHASE_A_REQUEST_COUNTS)[number]
  | (typeof S_LOAD_01_PHASE_B_REQUEST_COUNTS)[number];

export type SLoad01Phase = "phase_a_ladder" | "phase_b_5k";

export type SLoad01FinalStatus =
  | "GREEN_STAGING_READONLY_LADDER_AND_5K_PASS"
  | "GREEN_STAGING_READONLY_LADDER_1K_PASS_5K_NOT_RUN"
  | "BLOCKED_STAGING_LOAD_ABORTED_SAFELY"
  | "BLOCKED_STAGING_HEALTH_FAILED";

export type SLoad01StepPlan = {
  id: string;
  phase: SLoad01Phase;
  requestCount: SLoad01RequestCount;
  profile: StagingLoadRunProfile;
  maxConcurrency: number;
  rampSteps: number[];
  phaseBApprovalRequired: boolean;
  stopConditions: StagingLoadStopConditions;
};

const BOUNDED_1K_RAMP_STEPS = [5, 10, 15, 20, 25, 50, 100, 250, 500, 750, 1_000] as const;

const BOUNDED_5K_RAMP_STEPS = [
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
] as const;

const rampStepsForRequestCount = (requestCount: SLoad01RequestCount): number[] => {
  const source = requestCount <= 1_000 ? BOUNDED_1K_RAMP_STEPS : BOUNDED_5K_RAMP_STEPS;
  return source.filter((step) => step <= requestCount);
};

const stopConditionsForRequestCount = (
  requestCount: SLoad01RequestCount,
): StagingLoadStopConditions => ({
  ...(requestCount <= 1_000
    ? BOUNDED_1K_STAGING_LOAD_STOP_CONDITIONS
    : BOUNDED_5K_STAGING_LOAD_STOP_CONDITIONS),
  maxTotalRequests: requestCount,
});

const buildStepPlan = (requestCount: SLoad01RequestCount): SLoad01StepPlan => {
  const isPhaseB = requestCount > 1_000;
  return {
    id: `staging_readonly_${requestCount}`,
    phase: isPhaseB ? "phase_b_5k" : "phase_a_ladder",
    requestCount,
    profile: isPhaseB ? "bounded-5k" : "bounded-1k",
    maxConcurrency: requestCount,
    rampSteps: rampStepsForRequestCount(requestCount),
    phaseBApprovalRequired: isPhaseB,
    stopConditions: stopConditionsForRequestCount(requestCount),
  };
};

export const buildSLoad01StepPlan = (): SLoad01StepPlan[] => [
  ...S_LOAD_01_PHASE_A_REQUEST_COUNTS.map(buildStepPlan),
  ...S_LOAD_01_PHASE_B_REQUEST_COUNTS.map(buildStepPlan),
];

export const resolveSLoad01FinalStatus = (params: {
  phaseAGreen: boolean;
  phaseBStarted: boolean;
  allStepsGreen: boolean;
  healthFailed: boolean;
  blockedBeforeLoad: boolean;
  loadAborted: boolean;
}): SLoad01FinalStatus => {
  if (params.healthFailed) return "BLOCKED_STAGING_HEALTH_FAILED";
  if (params.allStepsGreen) return "GREEN_STAGING_READONLY_LADDER_AND_5K_PASS";
  if (params.phaseAGreen && !params.phaseBStarted && !params.loadAborted && !params.blockedBeforeLoad) {
    return "GREEN_STAGING_READONLY_LADDER_1K_PASS_5K_NOT_RUN";
  }
  return "BLOCKED_STAGING_LOAD_ABORTED_SAFELY";
};
