export const AGENT_SCREEN_ACTION_BFF_CONTRACT = Object.freeze({
  contractId: "agent_screen_action_bff_v1",
  documentType: "agent_screen_actions",
  endpoints: [
    "GET /agent/screen-actions/:screenId",
    "POST /agent/screen-actions/:screenId/intent-preview",
    "POST /agent/screen-actions/:screenId/action-plan",
  ],
  readOnly: true,
  roleScoped: true,
  evidenceBacked: true,
  mutationCount: 0,
  dbWrites: 0,
  directDatabaseAccess: 0,
  externalLiveFetchEnabled: false,
  modelProviderImports: 0,
  executionEnabled: false,
  finalMutationAllowed: false,
  forbiddenActionsExecutable: false,
} as const);

export type AgentScreenActionBffContract = typeof AGENT_SCREEN_ACTION_BFF_CONTRACT;
