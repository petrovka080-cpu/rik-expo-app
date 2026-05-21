export type AiEnterpriseRequestMode =
  | "free_text_question"
  | "screen_button"
  | "document_question"
  | "marketplace_photo_draft"
  | "safe_action_draft";

export type AiEnterpriseRequest = {
  requestId: string;
  screenId: string;
  role: string;
  userId: string;
  companyId: string;
  questionRu?: string;
  buttonId?: string;
  visibleContextRefs: string[];
  mode: AiEnterpriseRequestMode;
  locale: "ru";
  safetyMode: "read_only" | "draft_only" | "approval_required";
};

export type AiEnterpriseEntrypointDefinition = {
  id: string;
  accepts: AiEnterpriseRequestMode[];
  officialPipeline: readonly [
    "AiEnterpriseRequest",
    "LiveScreenCopilotAdapter",
    "UniversalRoleQa",
    "AppContextGraph",
    "AnswerComposer",
    "SemanticGuard",
    "AnswerPresenter",
  ];
  screenImportsAllowed: boolean;
  directProviderAccessAllowed: false;
  finalMutationAllowed: false;
};

export const AI_ENTERPRISE_ENTRYPOINT_REGISTRY: AiEnterpriseEntrypointDefinition[] = [
  {
    id: "enterprise_screen_ai",
    accepts: ["free_text_question", "screen_button", "document_question", "marketplace_photo_draft", "safe_action_draft"],
    officialPipeline: [
      "AiEnterpriseRequest",
      "LiveScreenCopilotAdapter",
      "UniversalRoleQa",
      "AppContextGraph",
      "AnswerComposer",
      "SemanticGuard",
      "AnswerPresenter",
    ],
    screenImportsAllowed: true,
    directProviderAccessAllowed: false,
    finalMutationAllowed: false,
  },
];

export function resolveAiEnterpriseEntrypoint(mode: AiEnterpriseRequestMode): AiEnterpriseEntrypointDefinition {
  const entrypoint = AI_ENTERPRISE_ENTRYPOINT_REGISTRY.find((item) => item.accepts.includes(mode));
  if (!entrypoint) {
    throw new Error(`Unsupported AI enterprise request mode: ${mode}`);
  }
  return entrypoint;
}
