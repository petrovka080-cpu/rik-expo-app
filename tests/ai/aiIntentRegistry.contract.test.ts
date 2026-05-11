import {
  AI_INTENT_REGISTRY,
  REQUIRED_AI_INTENTS,
  getAiIntentKnowledge,
} from "../../src/features/ai/knowledge/aiIntentRegistry";

describe("AI intent registry", () => {
  it("registers every required AI intent", () => {
    const registered = new Set(AI_INTENT_REGISTRY.map((entry) => entry.intent));

    for (const intent of REQUIRED_AI_INTENTS) {
      expect(registered.has(intent)).toBe(true);
    }
  });

  it("maps intents to risk policy without direct high-risk execution", () => {
    expect(getAiIntentKnowledge("prepare_request")?.defaultRisk).toBe("draft_only");
    expect(getAiIntentKnowledge("submit_for_approval")?.defaultRisk).toBe("approval_required");
    expect(getAiIntentKnowledge("submit_for_approval")?.executionBoundary).toBe("aiApprovalGate");
    expect(getAiIntentKnowledge("execute_approved")?.requiresApproval).toBe(true);
    expect(getAiIntentKnowledge("execute_approved")?.executionBoundary).toBe("aiApprovalGate");
    expect(getAiIntentKnowledge("execute_approved")?.canBeAnsweredWithoutTool).toBe(false);
  });
});
