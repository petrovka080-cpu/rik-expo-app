export type AiEstimateKillSwitchState = {
  embeddedAiEstimatesEnabled: boolean;
  requestAiEstimateDraftEnabled: boolean;
  pdfGenerationEnabled: boolean;
  catalogBindingEnabled: boolean;
  localRateSourceRefreshEnabled: boolean;
  canaryCohortEnabled: boolean;
};

export const AI_ESTIMATE_SAFE_KILL_SWITCH_STATE: AiEstimateKillSwitchState = {
  embeddedAiEstimatesEnabled: false,
  requestAiEstimateDraftEnabled: false,
  pdfGenerationEnabled: false,
  catalogBindingEnabled: false,
  localRateSourceRefreshEnabled: false,
  canaryCohortEnabled: false,
};

export function evaluateAiEstimateKillSwitchReadiness(state = AI_ESTIMATE_SAFE_KILL_SWITCH_STATE) {
  return {
    kill_switch_ready:
      state.embeddedAiEstimatesEnabled === false &&
      state.requestAiEstimateDraftEnabled === false &&
      state.pdfGenerationEnabled === false &&
      state.catalogBindingEnabled === false &&
      state.localRateSourceRefreshEnabled === false &&
      state.canaryCohortEnabled === false,
    fallback_to_safe_triage_mode: true,
  };
}

