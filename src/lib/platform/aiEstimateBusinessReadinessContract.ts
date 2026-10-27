export type AiEstimateBusinessReadiness = {
  technicalPilotReady: boolean;
  ownerApproved: false;
  productionReleaseStarted: false;
  contractTotalClaimed: false;
  controlledPilotAllowed: boolean;
  publicBetaAllowed: false;
  knownLimitationsVisible: boolean;
  pricebookLimitationsVisible: boolean;
  highRiskWorkLimitationsVisible: boolean;
  killSwitchAvailable: boolean;
  rollbackPlanAvailable: boolean;
  supportPlaybookAvailable: boolean;
};

export type AiEstimateBusinessReadinessValidation = {
  business_readiness_contract_created: true;
  owner_approval_not_faked: boolean;
  production_release_not_started: boolean;
  contract_total_not_claimed: boolean;
  known_limitations_visible: boolean;
  pricebook_limitations_visible: boolean;
  high_risk_work_limitations_visible: boolean;
  kill_switch_available: boolean;
  rollback_plan_available: boolean;
  support_playbook_available: boolean;
  controlled_pilot_allowed: boolean;
  public_beta_forbidden: boolean;
  owner_approved_true_without_owner: boolean;
  production_release_started: boolean;
  contract_total_claimed_without_owner: boolean;
  known_limitations_hidden: boolean;
  pricebook_limitations_hidden: boolean;
  kill_switch_missing: boolean;
  support_playbook_missing: boolean;
  passed: boolean;
  failures: string[];
};

export const AI_ESTIMATE_OWNER_REVIEW_BUSINESS_READINESS: AiEstimateBusinessReadiness = {
  technicalPilotReady: true,
  ownerApproved: false,
  productionReleaseStarted: false,
  contractTotalClaimed: false,
  controlledPilotAllowed: true,
  publicBetaAllowed: false,
  knownLimitationsVisible: true,
  pricebookLimitationsVisible: true,
  highRiskWorkLimitationsVisible: true,
  killSwitchAvailable: true,
  rollbackPlanAvailable: true,
  supportPlaybookAvailable: true,
};
