import {
  buildAiScreenLocalActionSourcePolicyMatrix,
  resolveAiScreenLocalActionSourcePolicy,
} from "../../src/features/ai/assistantOrchestrator/aiScreenLocalActionSourcePolicy";
import {
  planAiScreenLocalAssistantAction,
} from "../../src/features/ai/assistantOrchestrator/aiScreenLocalAssistantOrchestrator";
import {
  resolveAiScreenLocalAssistantContext,
} from "../../src/features/ai/assistantOrchestrator/aiScreenLocalContextResolver";
import { getAiScreenActionEntry } from "../../src/features/ai/screenActions/aiScreenActionRegistry";

const foremanAuth = { userId: "foreman-user", role: "foreman" } as const;
const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

describe("AI screen-local action source policy", () => {
  it("covers every screen-local assistant profile with an audited screen action map", () => {
    expect(buildAiScreenLocalActionSourcePolicyMatrix()).toMatchObject({
      final_status: "GREEN_AI_SCREEN_LOCAL_ACTION_SOURCE_POLICY_READY",
      all_screen_local_profiles_have_action_map: true,
      missing_action_map_screens: [],
      action_policy_source: "ai_screen_button_action_registry_v1",
      runtime_intent_fallback_allowed: false,
      fallback_used: false,
    });
    expect(getAiScreenActionEntry("foreman.subcontract")).toMatchObject({
      screenId: "foreman.subcontract",
      domain: "subcontracts",
    });
  });

  it("resolves local plans only from explicit audited screen actions", () => {
    expect(
      resolveAiScreenLocalActionSourcePolicy({
        auth: buyerAuth,
        screenId: "buyer.main",
        actionId: "buyer.main.draft_request",
      }),
    ).toMatchObject({
      status: "resolved",
      actionPolicySource: "ai_screen_button_action_registry_v1",
      fallbackUsed: false,
      runtimeIntentFallbackAllowed: false,
      action: expect.objectContaining({
        actionId: "buyer.main.draft_request",
        source: "ai_screen_button_action_registry_v1",
      }),
    });
  });

  it("blocks runtime-only intents instead of creating a fallback action plan", () => {
    const context = resolveAiScreenLocalAssistantContext({
      auth: foremanAuth,
      screenId: "foreman.subcontract",
    });
    expect(context.availableIntents).toEqual(
      expect.arrayContaining(["check_status", "draft_act", "draft_report", "submit_for_approval"]),
    );
    expect(context.availableIntents).not.toContain("read");

    expect(
      planAiScreenLocalAssistantAction({
        auth: foremanAuth,
        screenId: "foreman.subcontract",
        intent: "read",
      }),
    ).toMatchObject({
      status: "blocked",
      planMode: "forbidden",
      actionPolicySource: null,
      mutationCount: 0,
      finalExecution: 0,
      directMutationAllowed: false,
    });

    expect(
      planAiScreenLocalAssistantAction({
        auth: foremanAuth,
        screenId: "foreman.subcontract",
        actionId: "foreman.subcontract.draft_act",
      }),
    ).toMatchObject({
      status: "planned",
      actionId: "foreman.subcontract.draft_act",
      planMode: "draft_only",
      actionPolicySource: "ai_screen_button_action_registry_v1",
      executable: false,
      mutationCount: 0,
      finalExecution: 0,
    });
  });
});
