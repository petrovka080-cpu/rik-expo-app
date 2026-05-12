import { resolveAiActionGraph } from "../../src/features/ai/appGraph/aiActionGraphResolver";

describe("AI app action graph resolver", () => {
  it("allows a buyer to plan procurement search and draft actions without direct execution", () => {
    const decision = resolveAiActionGraph({
      role: "buyer",
      screenId: "buyer.main",
      buttonId: "buyer.rfq.open",
    });

    expect(decision).toMatchObject({
      status: "allowed",
      domain: "procurement",
      intent: "draft",
      riskLevel: "draft_only",
      approvalRequired: false,
      directExecutionAllowed: false,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
      rawRowsExposed: false,
      rawPromptStored: false,
    });
    expect(decision.evidenceRefs.length).toBeGreaterThan(0);
  });

  it("blocks unknown screens, unknown buttons, and unknown roles by default", () => {
    expect(resolveAiActionGraph({ role: "unknown", screenId: "buyer.main" })).toMatchObject({
      status: "blocked",
      blockedReason: "unknown_role",
    });
    expect(resolveAiActionGraph({ role: "buyer", screenId: "unknown.screen" })).toMatchObject({
      status: "blocked",
      blockedReason: "unknown_screen",
    });
    expect(
      resolveAiActionGraph({
        role: "buyer",
        screenId: "buyer.main",
        buttonId: "missing.button",
      }),
    ).toMatchObject({
      status: "blocked",
      blockedReason: "unknown_button",
    });
  });

  it("blocks cross-role and forbidden action attempts", () => {
    expect(
      resolveAiActionGraph({
        role: "accountant",
        screenId: "buyer.main",
        buttonId: "buyer.rfq.open",
      }),
    ).toMatchObject({
      status: "blocked",
      blockedReason: "screen_role_denied",
    });
    expect(
      resolveAiActionGraph({
        role: "buyer",
        screenId: "buyer.main",
        buttonId: "buyer.confirm_supplier.direct",
      }),
    ).toMatchObject({
      status: "blocked",
      blockedReason: "forbidden_action",
      directExecutionAllowed: false,
      mutationCount: 0,
    });
  });
});
