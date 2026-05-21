import { AI_LAYER_BOUNDARY_POLICY } from "../../../src/lib/ai/contractRuntime";

describe("AI layer boundary policy", () => {
  it("keeps screens render-only and forces gateway/provider boundaries", () => {
    expect(AI_LAYER_BOUNDARY_POLICY.screenLayer).toMatchObject({
      maySendQuestion: true,
      mayRenderAnswer: true,
      mayClassifyIntent: false,
      mayPlanSources: false,
      mayCallDomainProvider: false,
      mayCallDb: false,
      mayCallExternalWeb: false,
      mayMutateFromAiAnswer: false,
    });
    expect(AI_LAYER_BOUNDARY_POLICY.domainGatewayLayer.mustReturnSourceRefs).toBe(true);
    expect(AI_LAYER_BOUNDARY_POLICY.documentMediaLayers.aiAnalysisIsFinalFact).toBe(false);
  });
});
