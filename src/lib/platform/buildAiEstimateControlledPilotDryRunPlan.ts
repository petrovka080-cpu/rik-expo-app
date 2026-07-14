import {
  AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_REQUIRED_FLOWS,
  AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_REQUIRED_ROLES,
  type AiEstimateControlledPilotDryRun,
} from "./aiEstimateControlledPilotDryRunContract";

function flowDefaults(): AiEstimateControlledPilotDryRun["flows"] {
  return AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_REQUIRED_FLOWS.reduce(
    (flows, flowName) => {
      flows[flowName] = true;
      return flows;
    },
    {} as AiEstimateControlledPilotDryRun["flows"],
  );
}

export function buildAiEstimateControlledPilotDryRunPlan(input: {
  sourceSha: string;
  dryRunId?: string;
  roles?: AiEstimateControlledPilotDryRun["roles"];
  flows?: Partial<AiEstimateControlledPilotDryRun["flows"]>;
}): AiEstimateControlledPilotDryRun {
  return {
    dryRunId: input.dryRunId ?? `ai-estimate-controlled-pilot-dry-run:${input.sourceSha}`,
    sourceSha: input.sourceSha,
    roles: input.roles ?? [...AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_REQUIRED_ROLES],
    flows: {
      ...flowDefaults(),
      ...input.flows,
    },
    ownerApproved: false,
    productionReleaseStarted: false,
    publicBetaStarted: false,
  };
}
