import {
  AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_REQUIRED_FLOWS,
  AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_REQUIRED_ROLES,
  type AiEstimateControlledPilotDryRun,
  type AiEstimateControlledPilotDryRunValidation,
} from "./aiEstimateControlledPilotDryRunContract";
import { buildAiEstimateControlledPilotDryRunPlan } from "./buildAiEstimateControlledPilotDryRunPlan";

function hasRole(input: AiEstimateControlledPilotDryRun, role: AiEstimateControlledPilotDryRun["roles"][number]): boolean {
  return input.roles.includes(role);
}

export function validateAiEstimateControlledPilotDryRun(
  input: AiEstimateControlledPilotDryRun = buildAiEstimateControlledPilotDryRunPlan({ sourceSha: "contract-source" }),
): AiEstimateControlledPilotDryRunValidation {
  const runtimeInput = input as unknown as {
    ownerApproved?: boolean;
    productionReleaseStarted?: boolean;
    publicBetaStarted?: boolean;
  };
  const allRequiredRolesIncluded = AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_REQUIRED_ROLES.every((role) =>
    hasRole(input, role),
  );
  const allRequiredFlowsIncluded = AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_REQUIRED_FLOWS.every((flow) =>
    input.flows[flow] === true,
  );
  const ownerApprovalNotFaked = runtimeInput.ownerApproved !== true;
  const productionReleaseNotStarted = runtimeInput.productionReleaseStarted !== true;
  const publicBetaNotStarted = runtimeInput.publicBetaStarted !== true;
  const failures = [
    input.dryRunId.trim().length > 0 ? "" : "dry_run_id_missing",
    input.sourceSha.trim().length > 0 ? "" : "source_sha_missing",
    allRequiredRolesIncluded ? "" : "required_role_missing",
    input.flows.consumerRequestEstimate ? "" : "consumer_request_estimate_missing",
    input.flows.foremanMaterialsEstimate && input.flows.foremanSubcontractsEstimate ? "" : "foreman_flows_missing",
    input.flows.directorReview ? "" : "director_review_missing",
    input.flows.buyerHandoff ? "" : "buyer_handoff_missing",
    input.flows.approvedHistoryReload ? "" : "approved_history_reload_missing",
    input.flows.pdfOpen ? "" : "pdf_open_missing",
    input.flows.killSwitch ? "" : "kill_switch_missing",
    input.flows.rollback ? "" : "rollback_missing",
    allRequiredFlowsIncluded ? "" : "required_flow_missing",
    ownerApprovalNotFaked ? "" : "owner_approval_faked",
    productionReleaseNotStarted ? "" : "production_release_started",
    publicBetaNotStarted ? "" : "public_beta_started",
  ].filter(Boolean);

  return {
    controlled_pilot_dry_run_contract_created: true,
    controlled_pilot_plan_created: input.dryRunId.trim().length > 0 && input.sourceSha.trim().length > 0,
    consumer_flow_included: hasRole(input, "consumer") && input.flows.consumerRequestEstimate,
    foreman_flows_included:
      hasRole(input, "foreman") &&
      input.flows.foremanMaterialsEstimate &&
      input.flows.foremanSubcontractsEstimate,
    director_flow_included: hasRole(input, "director") && input.flows.directorReview,
    buyer_flow_included: hasRole(input, "buyer") && input.flows.buyerHandoff,
    history_flow_included: input.flows.approvedHistoryReload,
    pdf_flow_included: input.flows.pdfOpen,
    kill_switch_flow_included: input.flows.killSwitch,
    rollback_flow_included: input.flows.rollback,
    owner_approval_not_faked: ownerApprovalNotFaked,
    production_release_not_started: productionReleaseNotStarted,
    public_beta_not_started: publicBetaNotStarted,
    passed: failures.length === 0,
    failures,
  };
}
