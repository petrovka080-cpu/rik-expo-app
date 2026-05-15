import {
  normalizeAiScreenLocalAssistantScreenId,
  resolveAiRoleScreenBoundary,
} from "../../src/features/ai/assistantOrchestrator/aiRoleScreenBoundary";

describe("AI role screen boundary", () => {
  it("allows same-screen work for scoped roles", () => {
    expect(normalizeAiScreenLocalAssistantScreenId("ai.command.center")).toBe("ai.command_center");

    expect(
      resolveAiRoleScreenBoundary({
        auth: { userId: "buyer-user", role: "buyer" },
        screenId: "buyer.requests",
      }),
    ).toMatchObject({
      status: "allowed",
      decision: "SAME_SCREEN_ALLOWED",
      sameScreenOnly: true,
      actionMayExecuteHere: false,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
    });
  });

  it("blocks non-director cross-screen actions with the required code", () => {
    expect(
      resolveAiRoleScreenBoundary({
        auth: { userId: "buyer-user", role: "buyer" },
        screenId: "buyer.requests",
        targetScreenId: "accountant.main",
      }),
    ).toMatchObject({
      status: "blocked",
      decision: "FORBIDDEN_CROSS_SCREEN_ACTION",
      actionMayExecuteHere: false,
      mutationCount: 0,
    });
  });

  it("limits director/control cross-screen work to handoff plans", () => {
    expect(
      resolveAiRoleScreenBoundary({
        auth: { userId: "director-user", role: "director" },
        screenId: "director.dashboard",
        targetScreenId: "warehouse.main",
      }),
    ).toMatchObject({
      status: "handoff_plan_only",
      decision: "HANDOFF_PLAN_ONLY",
      directorControlMayHandoff: true,
      actionMayExecuteHere: false,
      mutationCount: 0,
    });
  });
});
