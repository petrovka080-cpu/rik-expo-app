export type AiEstimatePilotRole = "consumer" | "foreman" | "director" | "buyer";

export type AiEstimatePilotOperatingModel = {
  cohortSizeLimit: number;
  allowedRoles: AiEstimatePilotRole[];
  allowedWorkFamilies: string[];
  blockedWorkFamilies: string[];
  dailyReviewRequired: boolean;
  p0AutoStop: boolean;
  p1ReviewRequired: boolean;
  ownerGoNoGoRequired: true;
  publicBetaForbidden: true;
};

export type AiEstimatePilotOperatingModelValidation = {
  pilot_operating_model_created: true;
  cohort_size_limited: boolean;
  allowed_roles_defined: boolean;
  allowed_work_families_defined: boolean;
  high_risk_controls_defined: boolean;
  daily_review_required: boolean;
  p0_auto_stop_enabled: boolean;
  p1_review_required: boolean;
  owner_go_no_go_required: boolean;
  public_beta_forbidden: boolean;
  passed: boolean;
  failures: string[];
};

export const AI_ESTIMATE_OWNER_REVIEW_PILOT_OPERATING_MODEL: AiEstimatePilotOperatingModel = {
  cohortSizeLimit: 20,
  allowedRoles: ["consumer", "foreman", "director", "buyer"],
  allowedWorkFamilies: [
    "consumer_repair",
    "apartment_renovation",
    "finishing_works",
    "low_voltage_electrical",
    "plumbing_repair",
    "foreman_materials_estimate",
    "foreman_subcontracts_estimate",
  ],
  blockedWorkFamilies: [
    "structural_design",
    "gas_work",
    "high_voltage_electrical",
    "fire_safety_systems",
    "medical_or_industrial_facilities",
    "regulated_public_infrastructure",
  ],
  dailyReviewRequired: true,
  p0AutoStop: true,
  p1ReviewRequired: true,
  ownerGoNoGoRequired: true,
  publicBetaForbidden: true,
};

export function validateAiEstimatePilotOperatingModel(
  input: AiEstimatePilotOperatingModel = AI_ESTIMATE_OWNER_REVIEW_PILOT_OPERATING_MODEL,
): AiEstimatePilotOperatingModelValidation {
  const failures = [
    input.cohortSizeLimit > 0 && input.cohortSizeLimit <= 25 ? "" : "cohort_size_not_limited",
    input.allowedRoles.length >= 4 ? "" : "allowed_roles_missing",
    input.allowedWorkFamilies.length > 0 ? "" : "allowed_work_families_missing",
    input.blockedWorkFamilies.length > 0 ? "" : "high_risk_controls_missing",
    input.dailyReviewRequired ? "" : "daily_review_not_required",
    input.p0AutoStop ? "" : "p0_auto_stop_disabled",
    input.p1ReviewRequired ? "" : "p1_review_not_required",
    input.ownerGoNoGoRequired === true ? "" : "owner_go_no_go_not_required",
    input.publicBetaForbidden === true ? "" : "public_beta_not_forbidden",
  ].filter(Boolean);
  return {
    pilot_operating_model_created: true,
    cohort_size_limited: input.cohortSizeLimit > 0 && input.cohortSizeLimit <= 25,
    allowed_roles_defined: input.allowedRoles.length >= 4,
    allowed_work_families_defined: input.allowedWorkFamilies.length > 0,
    high_risk_controls_defined: input.blockedWorkFamilies.length > 0,
    daily_review_required: input.dailyReviewRequired,
    p0_auto_stop_enabled: input.p0AutoStop,
    p1_review_required: input.p1ReviewRequired,
    owner_go_no_go_required: input.ownerGoNoGoRequired === true,
    public_beta_forbidden: input.publicBetaForbidden === true,
    passed: failures.length === 0,
    failures,
  };
}
