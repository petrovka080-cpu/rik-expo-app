import { buildAiCommandCenterViewModel, resolveAiCommandCenterActionBoundary } from "../../src/features/ai/commandCenter/buildAiCommandCenterViewModel";

describe("Command Center runtime action safety", () => {
  it("keeps create_draft draft-only and submit_for_approval approval-gated", () => {
    const vm = buildAiCommandCenterViewModel({
      auth: { userId: "buyer-user", role: "buyer" },
      runtimeEvidence: {
        drafts: [
          {
            draftId: "request-1",
            draftKind: "request",
            domain: "procurement",
            summary: "Draft request ready",
            evidenceRefs: ["draft:request:1"],
          },
        ],
        procurement: {
          summary: "Supplier comparison is needed",
          materialIds: ["material-1"],
          evidenceRefs: ["procurement:material:1"],
        },
      },
    });

    const approvalCard = vm.cards.find((card) => card.recommendedToolName === "submit_for_approval");
    if (!approvalCard) throw new Error("expected approval card");
    expect(resolveAiCommandCenterActionBoundary({
      card: approvalCard,
      action: "submit_for_approval",
    })).toMatchObject({
      boundary: "approval_gate",
      toolName: "submit_for_approval",
      mutationCount: 0,
      executed: false,
      finalMutation: false,
    });

    for (const card of vm.cards) {
      for (const action of card.actionViews) {
        expect(action.mutationCount).toBe(0);
        expect(action.executed).toBe(false);
        expect(action.finalMutation).toBe(false);
      }
    }
    expect(JSON.stringify(vm)).not.toMatch(/create_order|confirm_supplier|change_payment_status/);
  });
});
