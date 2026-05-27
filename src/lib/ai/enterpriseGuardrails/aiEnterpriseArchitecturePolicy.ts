export type AiEnterpriseLayer =
  | "builtInAi"
  | "builtInAi1000"
  | "builtInAi10000"
  | "builtInAi50000"
  | "alwaysOnExternalKnowledge"
  | "appContextGraph"
  | "estimateEngine"
  | "estimateRouting"
  | "estimatePresentation"
  | "estimatePdf"
  | "globalEstimate"
  | "worldConstructionOntology"
  | "worldConstructionInterpreter"
  | "professionalBoq"
  | "localEstimatePolicy"
  | "catalogBinding"
  | "changeControl"
  | "universalRoleQa"
  | "liveScreenCopilot"
  | "domainDataGateway"
  | "contextBudget"
  | "sourceSanitizer"
  | "sourceIntelligence"
  | "contractRuntime"
  | "externalKnowledge"
  | "roleBusinessCopilots"
  | "safeActions"
  | "approvalExecutionBoundary"
  | "evaluation"
  | "enterpriseGuardrails";

export type AiEnterpriseForbiddenPattern =
  | "new_ai_hooks"
  | "use_effect_ai_fetch"
  | "second_ai_framework"
  | "screen_local_ai_logic"
  | "db_write_from_ai_answer"
  | "dangerous_mutation"
  | "approval_bypass"
  | "fake_data"
  | "unbounded_query"
  | "provider_payload_leak"
  | "runtime_debug_leak"
  | "english_user_facing_ai_copy";

export type AiEnterpriseArchitecturePolicy = {
  allowedAiLayers: AiEnterpriseLayer[];
  forbiddenPatterns: AiEnterpriseForbiddenPattern[];
  screenRule: {
    screenMayClassifyIntent: false;
    screenMayPlanSources: false;
    screenMayCallWebDirectly: false;
    screenMayMutateFromAiAnswer: false;
    screenMayFormatRawProviderPayload: false;
    screenMayUseLocalAiFallback: false;
  };
  answerRule: {
    internalFactRequiresSourceRef: true;
    internalObjectRequiresDeepLink: true;
    explicitQuestionBeatsScreenDefault: true;
    generalKnowledgeMarkedAsDraft: true;
    accountingAdviceRequiresReview: true;
  };
  releaseRule: {
    guardrailsMustPass: true;
    fakeGreenForbidden: true;
    proofArtifactsRequired: true;
  };
};

export const AI_ENTERPRISE_GUARDRAILS_WAVE =
  "S_AI_ENTERPRISE_ARCHITECTURE_GUARDRAILS_NO_KOSTYL_POINT_OF_NO_RETURN";

export const AI_ENTERPRISE_GUARDRAILS_ARTIFACT_PREFIX =
  "S_AI_ENTERPRISE_ARCHITECTURE_GUARDRAILS_NO_KOSTYL";

export const AI_ENTERPRISE_GUARDRAILS_GREEN_STATUS =
  "GREEN_AI_ENTERPRISE_ARCHITECTURE_GUARDRAILS_NO_KOSTYL_READY";

export const AI_ENTERPRISE_ARCHITECTURE_POLICY: AiEnterpriseArchitecturePolicy = {
  allowedAiLayers: [
    "builtInAi",
    "builtInAi1000",
    "builtInAi10000",
    "builtInAi50000",
    "alwaysOnExternalKnowledge",
    "appContextGraph",
    "estimateEngine",
    "estimateRouting",
    "estimatePresentation",
    "estimatePdf",
    "globalEstimate",
    "worldConstructionOntology",
    "worldConstructionInterpreter",
    "professionalBoq",
    "localEstimatePolicy",
    "catalogBinding",
    "changeControl",
    "universalRoleQa",
    "liveScreenCopilot",
    "domainDataGateway",
    "contextBudget",
    "sourceSanitizer",
    "sourceIntelligence",
    "contractRuntime",
    "externalKnowledge",
    "roleBusinessCopilots",
    "safeActions",
    "approvalExecutionBoundary",
    "evaluation",
    "enterpriseGuardrails",
  ],
  forbiddenPatterns: [
    "new_ai_hooks",
    "use_effect_ai_fetch",
    "second_ai_framework",
    "screen_local_ai_logic",
    "db_write_from_ai_answer",
    "dangerous_mutation",
    "approval_bypass",
    "fake_data",
    "unbounded_query",
    "provider_payload_leak",
    "runtime_debug_leak",
    "english_user_facing_ai_copy",
  ],
  screenRule: {
    screenMayClassifyIntent: false,
    screenMayPlanSources: false,
    screenMayCallWebDirectly: false,
    screenMayMutateFromAiAnswer: false,
    screenMayFormatRawProviderPayload: false,
    screenMayUseLocalAiFallback: false,
  },
  answerRule: {
    internalFactRequiresSourceRef: true,
    internalObjectRequiresDeepLink: true,
    explicitQuestionBeatsScreenDefault: true,
    generalKnowledgeMarkedAsDraft: true,
    accountingAdviceRequiresReview: true,
  },
  releaseRule: {
    guardrailsMustPass: true,
    fakeGreenForbidden: true,
    proofArtifactsRequired: true,
  },
};
