import type { AiReadyProposal } from "./aiScreenReadyProposalTypes";

export const AI_READY_PROPOSAL_POLICY = Object.freeze({
  directOrderAllowed: false,
  directPaymentAllowed: false,
  directWarehouseMutationAllowed: false,
  approvalRequiredActionsCanExecuteDirectly: false,
  fakeGreenAllowed: false,
});

export function enforceAiReadyProposalPolicy(proposal: AiReadyProposal): AiReadyProposal {
  return {
    ...proposal,
    requiresApproval: proposal.actionKind === "approval_required" ? true : proposal.requiresApproval,
    canExecuteDirectly: false,
  };
}

export function validateAiReadyProposalPolicy(proposals: readonly AiReadyProposal[]): boolean {
  return proposals.every((proposal) =>
    proposal.canExecuteDirectly === false
    && (proposal.actionKind !== "approval_required" || proposal.requiresApproval === true),
  );
}
