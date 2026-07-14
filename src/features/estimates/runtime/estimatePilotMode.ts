import pilotModePolicyJson from "../../../../data/estimate-governance/pilot-mode-policy.json";
import {
  isEstimateFeatureEnabled,
  type EstimateRuntimeEnv,
} from "./estimateFeatureFlags";

export type EstimatePilotModePolicy = {
  policy_id: string;
  mode: "pilot";
  enabled_by_default: boolean;
  requires_badge: boolean;
  requires_pdf_watermark: boolean;
  allows_final_total_only_when_trust_level: string;
  badge_label_ru: string;
  disclosure_ru: string;
  pdf_watermark_ru: string;
  operator_runbook: string;
};

export type EstimatePilotModeViewState = {
  enabled: boolean;
  badgeLabelRu: string | null;
  disclosureRu: string | null;
  pdfWatermarkRu: string | null;
  shouldWatermarkPdf: boolean;
};

export function getEstimatePilotModePolicy(): EstimatePilotModePolicy {
  return pilotModePolicyJson as EstimatePilotModePolicy;
}

export function isEstimatePilotModeEnabled(env?: EstimateRuntimeEnv): boolean {
  const policy = getEstimatePilotModePolicy();
  return policy.enabled_by_default && isEstimateFeatureEnabled("AI_ESTIMATE_PILOT_MODE", env);
}

export function buildEstimatePilotModeViewState(input: {
  trustLevel?: string | null;
  fullTotalStatus?: string | null;
  env?: EstimateRuntimeEnv;
} = {}): EstimatePilotModeViewState {
  const policy = getEstimatePilotModePolicy();
  const enabled = isEstimatePilotModeEnabled(input.env);
  const trustedProduction = input.trustLevel === policy.allows_final_total_only_when_trust_level &&
    input.fullTotalStatus === "FINAL_TOTAL_ALLOWED";
  return {
    enabled,
    badgeLabelRu: enabled && policy.requires_badge ? policy.badge_label_ru : null,
    disclosureRu: enabled ? policy.disclosure_ru : null,
    pdfWatermarkRu: enabled && policy.requires_pdf_watermark ? policy.pdf_watermark_ru : null,
    shouldWatermarkPdf: enabled && policy.requires_pdf_watermark && !trustedProduction,
  };
}
