import { getAiScreenReadyProposals } from "../../src/features/ai/screenProposals/aiScreenReadyProposalEngine";
import { validateAiReadyProposalPolicy } from "../../src/features/ai/screenProposals/aiScreenReadyProposalPolicy";

describe("AI screen ready proposal engine", () => {
  it("returns ready proposals for the major product screens", () => {
    const screens = [
      "buyer.main",
      "warehouse.main",
      "accountant.payment",
      "foreman.main",
      "director.dashboard",
      "documents.main",
    ];

    for (const screenId of screens) {
      const proposals = getAiScreenReadyProposals({ screenId, limit: 5 });
      expect(proposals.length).toBeGreaterThan(0);
      expect(validateAiReadyProposalPolicy(proposals)).toBe(true);
      expect(proposals.every((proposal) => proposal.canExecuteDirectly === false)).toBe(true);
    }
  });

  it("keeps approval-required proposals approval-required", () => {
    const proposals = getAiScreenReadyProposals({ screenId: "buyer.main", limit: 8 });
    const approvalProposal = proposals.find((proposal) => proposal.actionKind === "approval_required");

    expect(approvalProposal).toBeDefined();
    expect(approvalProposal).toMatchObject({
      requiresApproval: true,
      canExecuteDirectly: false,
    });
  });
});
