import type {
  AiEstimateBusinessReadiness,
  AiEstimateBusinessReadinessValidation,
} from "./aiEstimateBusinessReadinessContract";
import { AI_ESTIMATE_OWNER_REVIEW_BUSINESS_READINESS } from "./aiEstimateBusinessReadinessContract";

export function validateAiEstimateBusinessReadiness(
  input: AiEstimateBusinessReadiness = AI_ESTIMATE_OWNER_REVIEW_BUSINESS_READINESS,
): AiEstimateBusinessReadinessValidation {
  const runtimeInput = input as unknown as {
    ownerApproved: boolean;
    productionReleaseStarted: boolean;
    contractTotalClaimed: boolean;
  };
  const ownerApproved = runtimeInput.ownerApproved === true;
  const productionReleaseStarted = runtimeInput.productionReleaseStarted === true;
  const contractTotalClaimed = runtimeInput.contractTotalClaimed === true;
  const failures = [
    ownerApproved ? "owner_approved_true_without_owner" : "",
    productionReleaseStarted ? "production_release_started" : "",
    contractTotalClaimed ? "contract_total_claimed_without_owner" : "",
    input.knownLimitationsVisible ? "" : "known_limitations_hidden",
    input.pricebookLimitationsVisible ? "" : "pricebook_limitations_hidden",
    input.highRiskWorkLimitationsVisible ? "" : "high_risk_work_limitations_hidden",
    input.killSwitchAvailable ? "" : "kill_switch_missing",
    input.rollbackPlanAvailable ? "" : "rollback_plan_missing",
    input.supportPlaybookAvailable ? "" : "support_playbook_missing",
    input.publicBetaAllowed === false ? "" : "public_beta_allowed_without_owner",
  ].filter(Boolean);
  return {
    business_readiness_contract_created: true,
    owner_approval_not_faked: !ownerApproved,
    production_release_not_started: !productionReleaseStarted,
    contract_total_not_claimed: !contractTotalClaimed,
    known_limitations_visible: input.knownLimitationsVisible,
    pricebook_limitations_visible: input.pricebookLimitationsVisible,
    high_risk_work_limitations_visible: input.highRiskWorkLimitationsVisible,
    kill_switch_available: input.killSwitchAvailable,
    rollback_plan_available: input.rollbackPlanAvailable,
    support_playbook_available: input.supportPlaybookAvailable,
    controlled_pilot_allowed: input.controlledPilotAllowed,
    public_beta_forbidden: input.publicBetaAllowed === false,
    owner_approved_true_without_owner: ownerApproved,
    production_release_started: productionReleaseStarted,
    contract_total_claimed_without_owner: contractTotalClaimed,
    known_limitations_hidden: !input.knownLimitationsVisible,
    pricebook_limitations_hidden: !input.pricebookLimitationsVisible,
    kill_switch_missing: !input.killSwitchAvailable,
    support_playbook_missing: !input.supportPlaybookAvailable,
    passed: failures.length === 0,
    failures,
  };
}
