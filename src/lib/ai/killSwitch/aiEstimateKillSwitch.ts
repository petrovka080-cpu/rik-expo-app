export type AiEstimateKillSwitchState = {
  embeddedAiEstimatesEnabled: boolean;
  requestAiEstimateDraftEnabled: boolean;
  pdfGenerationEnabled: boolean;
  catalogBindingEnabled: boolean;
  localRateSourceRefreshEnabled: boolean;
  canaryCohortEnabled: boolean;
};

export type AiEstimateKillSwitchPolicy = {
  disable_all_ai_estimates: boolean;
  disable_request_ai_estimate: boolean;
  disable_embedded_ai_estimate: boolean;
  disable_dynamic_boq_compiler: boolean;
  disable_pdf_generation: boolean;
  disable_catalog_binding: boolean;
  disable_local_rate_source_lookup: boolean;
  disable_regulated_work_estimates: boolean;
  fallback_to_safe_triage_only: boolean;
};

export type AiEstimateKillSwitchCapability = keyof AiEstimateKillSwitchPolicy;
export type AiEstimateKillSwitchEntrypoint = "request" | "embedded_ai";
export type AiEstimateKillSwitchAction =
  | "estimate"
  | "dynamic_boq"
  | "pdf"
  | "catalog_binding"
  | "local_rate_source_lookup"
  | "regulated_work";

export const AI_ESTIMATE_SAFE_KILL_SWITCH_STATE: AiEstimateKillSwitchState = {
  embeddedAiEstimatesEnabled: false,
  requestAiEstimateDraftEnabled: false,
  pdfGenerationEnabled: false,
  catalogBindingEnabled: false,
  localRateSourceRefreshEnabled: false,
  canaryCohortEnabled: false,
};

export const AI_ESTIMATE_KILL_SWITCH_DEFAULT_POLICY: AiEstimateKillSwitchPolicy = Object.freeze({
  disable_all_ai_estimates: false,
  disable_request_ai_estimate: false,
  disable_embedded_ai_estimate: false,
  disable_dynamic_boq_compiler: false,
  disable_pdf_generation: false,
  disable_catalog_binding: false,
  disable_local_rate_source_lookup: false,
  disable_regulated_work_estimates: false,
  fallback_to_safe_triage_only: false,
});

export const AI_ESTIMATE_REQUIRED_KILL_SWITCHES: readonly AiEstimateKillSwitchCapability[] = Object.freeze([
  "disable_all_ai_estimates",
  "disable_request_ai_estimate",
  "disable_embedded_ai_estimate",
  "disable_dynamic_boq_compiler",
  "disable_pdf_generation",
  "disable_catalog_binding",
  "disable_local_rate_source_lookup",
  "disable_regulated_work_estimates",
  "fallback_to_safe_triage_only",
]);

export function isAiEstimateKillSwitchBlocking(
  policy: AiEstimateKillSwitchPolicy = AI_ESTIMATE_KILL_SWITCH_DEFAULT_POLICY,
): boolean {
  return Object.values(policy).some(Boolean);
}

export function applyAiEstimateKillSwitchPolicy(params: {
  policy?: AiEstimateKillSwitchPolicy;
  entrypoint: AiEstimateKillSwitchEntrypoint;
  action: AiEstimateKillSwitchAction;
}) {
  const policy = params.policy ?? AI_ESTIMATE_KILL_SWITCH_DEFAULT_POLICY;
  const reason =
    policy.disable_all_ai_estimates ? "disable_all_ai_estimates" :
      params.entrypoint === "request" && policy.disable_request_ai_estimate ? "disable_request_ai_estimate" :
        params.entrypoint === "embedded_ai" && policy.disable_embedded_ai_estimate ? "disable_embedded_ai_estimate" :
          params.action === "dynamic_boq" && policy.disable_dynamic_boq_compiler ? "disable_dynamic_boq_compiler" :
            params.action === "pdf" && policy.disable_pdf_generation ? "disable_pdf_generation" :
              params.action === "catalog_binding" && policy.disable_catalog_binding ? "disable_catalog_binding" :
                params.action === "local_rate_source_lookup" && policy.disable_local_rate_source_lookup ? "disable_local_rate_source_lookup" :
                  params.action === "regulated_work" && policy.disable_regulated_work_estimates ? "disable_regulated_work_estimates" :
                    policy.fallback_to_safe_triage_only ? "fallback_to_safe_triage_only" :
                      null;
  const blocked = reason !== null;

  return {
    allowed: !blocked,
    blocked,
    fallback_to_safe_triage_only: policy.fallback_to_safe_triage_only || blocked,
    reason: reason ?? "AI_ESTIMATE_KILL_SWITCH_CLEAR",
  };
}

export function validateAiEstimateKillSwitch(policy: AiEstimateKillSwitchPolicy = AI_ESTIMATE_KILL_SWITCH_DEFAULT_POLICY) {
  const missing = AI_ESTIMATE_REQUIRED_KILL_SWITCHES.filter((key) => !(key in policy));
  const overrideCanary = applyAiEstimateKillSwitchPolicy({
    policy: { ...policy, disable_all_ai_estimates: true },
    entrypoint: "request",
    action: "estimate",
  }).blocked;

  return {
    kill_switch_ready: missing.length === 0 && overrideCanary,
    required_switches: [...AI_ESTIMATE_REQUIRED_KILL_SWITCHES],
    missing_switches: missing,
    kill_switch_overrides_canary: overrideCanary,
    default_policy_blocks_estimates: isAiEstimateKillSwitchBlocking(policy),
  };
}

export function evaluateAiEstimateKillSwitchReadiness(
  state = AI_ESTIMATE_SAFE_KILL_SWITCH_STATE,
  policy: AiEstimateKillSwitchPolicy = AI_ESTIMATE_KILL_SWITCH_DEFAULT_POLICY,
) {
  const validation = validateAiEstimateKillSwitch(policy);
  return {
    kill_switch_ready:
      state.embeddedAiEstimatesEnabled === false &&
      state.requestAiEstimateDraftEnabled === false &&
      state.pdfGenerationEnabled === false &&
      state.catalogBindingEnabled === false &&
      state.localRateSourceRefreshEnabled === false &&
      state.canaryCohortEnabled === false &&
      validation.kill_switch_ready,
    fallback_to_safe_triage_mode: true,
    required_switches: validation.required_switches,
    missing_switches: validation.missing_switches,
    kill_switch_overrides_canary: validation.kill_switch_overrides_canary,
  };
}
