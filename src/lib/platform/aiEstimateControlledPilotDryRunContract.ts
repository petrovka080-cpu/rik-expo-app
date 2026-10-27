export type AiEstimateControlledPilotRole = "consumer" | "foreman" | "director" | "buyer";

export type AiEstimateControlledPilotDryRunFlows = {
  consumerRequestEstimate: boolean;
  foremanMaterialsEstimate: boolean;
  foremanSubcontractsEstimate: boolean;
  directorReview: boolean;
  buyerHandoff: boolean;
  approvedHistoryReload: boolean;
  pdfOpen: boolean;
  killSwitch: boolean;
  rollback: boolean;
};

export type AiEstimateControlledPilotDryRun = {
  dryRunId: string;
  sourceSha: string;
  roles: AiEstimateControlledPilotRole[];
  flows: AiEstimateControlledPilotDryRunFlows;
  ownerApproved: false;
  productionReleaseStarted: false;
  publicBetaStarted: false;
};

export type AiEstimateControlledPilotDryRunValidation = {
  controlled_pilot_dry_run_contract_created: true;
  controlled_pilot_plan_created: boolean;
  consumer_flow_included: boolean;
  foreman_flows_included: boolean;
  director_flow_included: boolean;
  buyer_flow_included: boolean;
  history_flow_included: boolean;
  pdf_flow_included: boolean;
  kill_switch_flow_included: boolean;
  rollback_flow_included: boolean;
  owner_approval_not_faked: boolean;
  production_release_not_started: boolean;
  public_beta_not_started: boolean;
  passed: boolean;
  failures: string[];
};

export const AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_REQUIRED_ROLES = [
  "consumer",
  "foreman",
  "director",
  "buyer",
] as const satisfies readonly AiEstimateControlledPilotRole[];

export const AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_REQUIRED_FLOWS = [
  "consumerRequestEstimate",
  "foremanMaterialsEstimate",
  "foremanSubcontractsEstimate",
  "directorReview",
  "buyerHandoff",
  "approvedHistoryReload",
  "pdfOpen",
  "killSwitch",
  "rollback",
] as const satisfies readonly (keyof AiEstimateControlledPilotDryRunFlows)[];
