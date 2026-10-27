export const AGENT_SCREEN_ASSISTANT_BFF_CONTRACT = Object.freeze({
  contractId: "agent_screen_assistant_bff_v1",
  documentType: "agent_screen_assistant",
  endpoints: [
    "GET /agent/screen-assistant/:screenId/context",
    "POST /agent/screen-assistant/:screenId/ask",
    "POST /agent/screen-assistant/:screenId/action-plan",
    "POST /agent/screen-assistant/:screenId/draft-preview",
    "POST /agent/screen-assistant/:screenId/submit-for-approval-preview",
  ],
  screenLocalScopeRequired: true,
  crossScreenNonDirectorCode: "FORBIDDEN_CROSS_SCREEN_ACTION",
  crossScreenDirectorControlMode: "HANDOFF_PLAN_ONLY",
  readOnly: true,
  roleScoped: true,
  evidenceBacked: true,
  internalFirst: true,
  mutationCount: 0,
  dbWrites: 0,
  directDatabaseAccess: 0,
  externalLiveFetchEnabled: false,
  modelProviderImports: 0,
  executionEnabled: false,
  finalMutationAllowed: false,
  fakeAiAnswer: false,
  hardcodedAiResponse: false,
} as const);

export type AgentScreenAssistantBffContract = typeof AGENT_SCREEN_ASSISTANT_BFF_CONTRACT;
