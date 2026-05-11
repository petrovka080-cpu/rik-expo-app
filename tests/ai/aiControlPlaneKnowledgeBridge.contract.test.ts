import { evaluateAiControlPlaneKnowledgeBridge } from "../../src/features/ai/controlPlane/aiControlPlaneKnowledgeBridge";

describe("AI control plane knowledge bridge", () => {
  it("allows safe role-screen knowledge and returns prompt-safe context", () => {
    const decision = evaluateAiControlPlaneKnowledgeBridge({
      role: "buyer",
      screenId: "buyer.main",
      requestedIntent: "prepare_request",
    });

    expect(decision.allowed).toBe(true);
    expect(decision.riskLevel).toBe("draft_only");
    expect(decision.promptSafeKnowledgeBlock).toContain("screenId: buyer.main");
    expect(decision.promptSafeKnowledgeBlock).not.toContain("raw_provider_payload");
  });

  it("blocks unknown roles and prevents execute_approved bypass", () => {
    const unknown = evaluateAiControlPlaneKnowledgeBridge({
      role: "unknown",
      screenId: "buyer.main",
      requestedIntent: "find",
    });
    const execute = evaluateAiControlPlaneKnowledgeBridge({
      role: "director",
      screenId: "director.dashboard",
      requestedIntent: "execute_approved",
    });

    expect(unknown.allowed).toBe(false);
    expect(unknown.blocked).toBe(true);
    expect(execute.requiresApproval).toBe(true);
    expect(execute.reason).toContain("aiApprovalGate");
    expect(execute.actionTypes).toEqual(
      expect.arrayContaining(["submit_request", "confirm_supplier", "create_order"]),
    );
  });

  it("blocks non-role finance access through role-screen policy", () => {
    const buyerFinance = evaluateAiControlPlaneKnowledgeBridge({
      role: "buyer",
      screenId: "accountant.main",
      requestedIntent: "summarize",
    });

    expect(buyerFinance.allowed).toBe(false);
    expect(buyerFinance.blocked).toBe(true);
  });
});
