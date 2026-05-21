export type AiLayerBoundaryPolicy = {
  screenLayer: {
    maySendQuestion: true;
    maySendButtonId: true;
    maySendVisibleContextRefs: true;
    mayRenderAnswer: true;
    mayClassifyIntent: false;
    mayPlanSources: false;
    mayCallDomainProvider: false;
    mayCallDb: false;
    mayCallExternalWeb: false;
    mayFormatRawProviderPayload: false;
    mayMutateFromAiAnswer: false;
  };
  universalQaLayer: {
    mayClassifyIntent: true;
    mayPlanSources: true;
    mayCallDomainGateway: true;
    mayComposeAnswer: true;
  };
  domainGatewayLayer: {
    mayCallDomainProviders: true;
    mayReturnRawRows: false;
    mustReturnSourceRefs: true;
    mustReturnOpenLinks: true;
    mustEnforceBounds: true;
    mustEnforcePermissions: true;
  };
  documentMediaLayers: {
    aiAnalysisIsFinalFact: false;
    finalLinkRequiresHuman: true;
  };
  safeActionLayer: {
    finalSubmitRequiresHuman: true;
    approvalRequiredForBusinessMutation: true;
  };
};

export const AI_LAYER_BOUNDARY_POLICY: AiLayerBoundaryPolicy = {
  screenLayer: {
    maySendQuestion: true,
    maySendButtonId: true,
    maySendVisibleContextRefs: true,
    mayRenderAnswer: true,
    mayClassifyIntent: false,
    mayPlanSources: false,
    mayCallDomainProvider: false,
    mayCallDb: false,
    mayCallExternalWeb: false,
    mayFormatRawProviderPayload: false,
    mayMutateFromAiAnswer: false,
  },
  universalQaLayer: {
    mayClassifyIntent: true,
    mayPlanSources: true,
    mayCallDomainGateway: true,
    mayComposeAnswer: true,
  },
  domainGatewayLayer: {
    mayCallDomainProviders: true,
    mayReturnRawRows: false,
    mustReturnSourceRefs: true,
    mustReturnOpenLinks: true,
    mustEnforceBounds: true,
    mustEnforcePermissions: true,
  },
  documentMediaLayers: {
    aiAnalysisIsFinalFact: false,
    finalLinkRequiresHuman: true,
  },
  safeActionLayer: {
    finalSubmitRequiresHuman: true,
    approvalRequiredForBusinessMutation: true,
  },
};
