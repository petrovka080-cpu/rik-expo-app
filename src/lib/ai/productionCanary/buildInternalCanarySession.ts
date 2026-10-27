import {
  AI_ESTIMATE_KILL_SWITCH_DEFAULT_POLICY,
  applyAiEstimateKillSwitchPolicy,
  isAiEstimateKillSwitchBlocking,
  type AiEstimateKillSwitchPolicy,
} from "../killSwitch/aiEstimateKillSwitch";
import {
  AI_ESTIMATE_CANARY_DEFAULT_CONFIG,
  type AiEstimateCanaryConfig,
  type AiEstimateCanaryEntrypoint,
} from "./aiEstimateCanaryConfig";
import {
  type AiEstimateInternalCanaryExecutionSession,
  type AiEstimateInternalCanaryUserCohort,
} from "./internalCanaryExecutionTypes";
import { resolveInternalCanaryEligibility } from "./resolveInternalCanaryEligibility";

export type BuildInternalCanarySessionInput = {
  runtimeTraceId: string;
  userCohort: AiEstimateInternalCanaryUserCohort;
  internalStaffFlag: boolean;
  route: AiEstimateCanaryEntrypoint;
  manualOptIn: boolean;
  percentBucket: number;
  config?: AiEstimateCanaryConfig;
  killSwitch?: AiEstimateKillSwitchPolicy;
};

export function buildInternalCanarySession(
  input: BuildInternalCanarySessionInput,
): AiEstimateInternalCanaryExecutionSession {
  const config = input.config ?? AI_ESTIMATE_CANARY_DEFAULT_CONFIG;
  const killSwitch = input.killSwitch ?? AI_ESTIMATE_KILL_SWITCH_DEFAULT_POLICY;
  const eligibility = resolveInternalCanaryEligibility({
    config,
    killSwitch,
    internalStaffFlag: input.internalStaffFlag,
    manualOptIn: input.manualOptIn,
    percentBucket: input.percentBucket,
  });
  const entrypoint = input.route;
  const embedded = input.route !== "/request";
  const estimateGate = applyAiEstimateKillSwitchPolicy({
    policy: killSwitch,
    entrypoint: embedded ? "embedded_ai" : "request",
    action: "estimate",
  });

  return {
    runtimeTraceId: input.runtimeTraceId,
    userCohort: input.userCohort,
    internalStaffFlag: input.internalStaffFlag,
    route: input.route,
    entrypoint,
    canaryEnabled: eligibility.eligible,
    canaryStatus: eligibility.status,
    killSwitchState: isAiEstimateKillSwitchBlocking(killSwitch) || estimateGate.blocked ? "blocking" : "clear",
    dynamicBoqEnabled: eligibility.eligible && !killSwitch.disable_dynamic_boq_compiler && !estimateGate.blocked,
    pdfEnabled: eligibility.eligible && !killSwitch.disable_pdf_generation && !estimateGate.blocked,
    catalogBindingEnabled: eligibility.eligible && !killSwitch.disable_catalog_binding && !estimateGate.blocked,
    localRateSourceEnabled: eligibility.eligible && !killSwitch.disable_local_rate_source_lookup && !estimateGate.blocked,
  };
}
