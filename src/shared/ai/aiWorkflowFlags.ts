export type AiWorkflowFlags = {
  directorProposalRiskSummaryEnabled: boolean;
  externalAiCallsEnabled: boolean;
};

type EnvLike = Record<string, string | undefined>;

const truthy = (value: unknown): boolean => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
};

export function readAiWorkflowFlags(env: EnvLike = process.env): AiWorkflowFlags {
  return {
    directorProposalRiskSummaryEnabled: truthy(
      env.EXPO_PUBLIC_AI_DIRECTOR_PROPOSAL_RISK_SUMMARY,
    ),
    externalAiCallsEnabled: truthy(env.EXPO_PUBLIC_AI_EXTERNAL_CALLS_ENABLED),
  };
}

export function isDirectorProposalRiskSummaryUiEnabled(
  flags: AiWorkflowFlags = readAiWorkflowFlags(),
): boolean {
  return flags.directorProposalRiskSummaryEnabled === true;
}

export function areExternalAiCallsEnabled(
  flags: AiWorkflowFlags = readAiWorkflowFlags(),
): boolean {
  return flags.externalAiCallsEnabled === true;
}
