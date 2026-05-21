import { AI_ENTERPRISE_ENTRYPOINT_REGISTRY, resolveAiEnterpriseEntrypoint } from "../../src/lib/ai/enterpriseGuardrails";

describe("AI enterprise entrypoint registry", () => {
  it("defines one official screen AI entrypoint and pipeline", () => {
    expect(AI_ENTERPRISE_ENTRYPOINT_REGISTRY).toHaveLength(1);
    const entrypoint = resolveAiEnterpriseEntrypoint("screen_button");
    expect(entrypoint.officialPipeline).toEqual([
      "AiEnterpriseRequest",
      "LiveScreenCopilotAdapter",
      "UniversalRoleQa",
      "AppContextGraph",
      "AnswerComposer",
      "SemanticGuard",
      "AnswerPresenter",
    ]);
    expect(entrypoint.directProviderAccessAllowed).toBe(false);
    expect(entrypoint.finalMutationAllowed).toBe(false);
  });
});
