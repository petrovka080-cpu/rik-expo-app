import {
  AI_ENTERPRISE_ARCHITECTURE_POLICY,
  AI_ENTERPRISE_GUARDRAILS_WAVE,
} from "../../src/lib/ai/enterpriseGuardrails";

describe("AI enterprise architecture policy", () => {
  it("locks approved layers and non-negotiable answer/screen rules", () => {
    expect(AI_ENTERPRISE_GUARDRAILS_WAVE).toBe("S_AI_ENTERPRISE_ARCHITECTURE_GUARDRAILS_NO_KOSTYL_POINT_OF_NO_RETURN");
    expect(AI_ENTERPRISE_ARCHITECTURE_POLICY.allowedAiLayers).toEqual([
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
      "globalLocalContext",
      "worldConstructionOntology",
      "worldConstructionInterpreter",
      "professionalBoq",
      "localEstimatePolicy",
      "localRateSources",
      "globalCatalogPolicy",
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
    ]);
    expect(AI_ENTERPRISE_ARCHITECTURE_POLICY.screenRule).toMatchObject({
      screenMayClassifyIntent: false,
      screenMayPlanSources: false,
      screenMayCallWebDirectly: false,
      screenMayMutateFromAiAnswer: false,
      screenMayFormatRawProviderPayload: false,
      screenMayUseLocalAiFallback: false,
    });
    expect(AI_ENTERPRISE_ARCHITECTURE_POLICY.answerRule).toMatchObject({
      internalFactRequiresSourceRef: true,
      internalObjectRequiresDeepLink: true,
      explicitQuestionBeatsScreenDefault: true,
      generalKnowledgeMarkedAsDraft: true,
      accountingAdviceRequiresReview: true,
    });
  });
});
