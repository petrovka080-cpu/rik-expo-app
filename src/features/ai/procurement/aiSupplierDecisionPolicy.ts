import type { ProcurementCopilotResolvedPlan } from "../procurementCopilot/procurementCopilotTypes";

export type AiProcurementSupplierDecisionBlocker =
  | "BLOCKED_PROCUREMENT_INTERNAL_FIRST_NOT_PROVEN"
  | "BLOCKED_PROCUREMENT_MARKETPLACE_SECOND_NOT_PROVEN"
  | "BLOCKED_PROCUREMENT_SUPPLIER_EVIDENCE_MISSING"
  | "BLOCKED_PROCUREMENT_DRAFT_NOT_READY"
  | "BLOCKED_PROCUREMENT_APPROVAL_BOUNDARY_NOT_REACHED"
  | "BLOCKED_PROCUREMENT_FINAL_MUTATION_ATTEMPT";

export type AiProcurementSupplierDecisionValidation = {
  ok: boolean;
  blockers: readonly AiProcurementSupplierDecisionBlocker[];
  internalFirst: boolean;
  marketplaceSecond: boolean;
  supplierCardsHaveEvidence: boolean;
  draftRequestReady: boolean;
  submitForApprovalBoundaryReached: boolean;
  highRiskRequiresApproval: true;
  supplierConfirmationAllowed: false;
  orderCreationAllowed: false;
  warehouseMutationAllowed: false;
  paymentCreationAllowed: false;
  externalLiveFetch: false;
  mutationCount: 0;
  finalExecution: 0;
};

export const AI_PROCUREMENT_SUPPLIER_DECISION_POLICY = Object.freeze({
  policyId: "ai_procurement_supplier_decision_policy_v1",
  internalFirstRequired: true,
  marketplaceSecondRequired: true,
  evidenceRequired: true,
  draftOnlyBeforeApproval: true,
  submitForApprovalBoundaryRequired: true,
  highRiskRequiresApproval: true,
  supplierConfirmationAllowed: false,
  orderCreationAllowed: false,
  warehouseMutationAllowed: false,
  paymentCreationAllowed: false,
  externalLiveFetch: false,
  mutationCount: 0,
  finalExecution: 0,
  fakeSuppliersAllowed: false,
} as const);

export function validateAiProcurementSupplierDecision(
  resolved: ProcurementCopilotResolvedPlan,
): AiProcurementSupplierDecisionValidation {
  const blockers = new Set<AiProcurementSupplierDecisionBlocker>();
  const internalFirst =
    resolved.plan.internalDataChecked === true &&
    resolved.context.internalEvidenceRefs.length > 0;
  const marketplaceSecond = resolved.plan.marketplaceChecked === true;
  const supplierCardsHaveEvidence = resolved.plan.supplierCards.every(
    (card) => card.evidenceRefs.length > 0,
  );
  const draftRequestReady = resolved.draftPreview.status === "draft_ready";
  const submitForApprovalBoundaryReached =
    resolved.submitForApprovalPreview.approvalRequired === true &&
    resolved.submitForApprovalPreview.idempotencyRequired === true &&
    resolved.submitForApprovalPreview.auditRequired === true &&
    resolved.submitForApprovalPreview.redactedPayloadOnly === true;
  const mutationAttempted =
    resolved.proof.mutationCount !== 0 ||
    resolved.proof.finalMutationAllowed !== false ||
    resolved.proof.supplierConfirmationAllowed !== false ||
    resolved.proof.orderCreationAllowed !== false ||
    resolved.proof.warehouseMutationAllowed !== false ||
    resolved.submitForApprovalPreview.mutationCount !== 0 ||
    resolved.submitForApprovalPreview.finalExecution !== 0;

  if (!internalFirst) blockers.add("BLOCKED_PROCUREMENT_INTERNAL_FIRST_NOT_PROVEN");
  if (!marketplaceSecond) blockers.add("BLOCKED_PROCUREMENT_MARKETPLACE_SECOND_NOT_PROVEN");
  if (!supplierCardsHaveEvidence) blockers.add("BLOCKED_PROCUREMENT_SUPPLIER_EVIDENCE_MISSING");
  if (!draftRequestReady) blockers.add("BLOCKED_PROCUREMENT_DRAFT_NOT_READY");
  if (!submitForApprovalBoundaryReached) {
    blockers.add("BLOCKED_PROCUREMENT_APPROVAL_BOUNDARY_NOT_REACHED");
  }
  if (mutationAttempted) blockers.add("BLOCKED_PROCUREMENT_FINAL_MUTATION_ATTEMPT");

  return {
    ok: blockers.size === 0,
    blockers: [...blockers],
    internalFirst,
    marketplaceSecond,
    supplierCardsHaveEvidence,
    draftRequestReady,
    submitForApprovalBoundaryReached,
    highRiskRequiresApproval: true,
    supplierConfirmationAllowed: false,
    orderCreationAllowed: false,
    warehouseMutationAllowed: false,
    paymentCreationAllowed: false,
    externalLiveFetch: false,
    mutationCount: 0,
    finalExecution: 0,
  };
}
