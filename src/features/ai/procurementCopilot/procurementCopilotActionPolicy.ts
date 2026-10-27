import type {
  ProcurementApprovalPreviewOutput,
  ProcurementAuthContext,
} from "../procurement/procurementContextTypes";
import type {
  ProcurementCopilotNoMutationProof,
  ProcurementCopilotRoleDecision,
  ProcurementCopilotSubmitPreviewInput,
} from "./procurementCopilotTypes";
import {
  normalizeProcurementCopilotText,
  uniqueProcurementCopilotRefs,
} from "./procurementCopilotRedaction";

export const PROCUREMENT_COPILOT_ALLOWED_ROLES = ["buyer", "director", "control"] as const;

export function canUseProcurementCopilotRole(role: ProcurementAuthContext["role"]): boolean {
  return PROCUREMENT_COPILOT_ALLOWED_ROLES.some((allowedRole) => allowedRole === role);
}

export function resolveProcurementCopilotRoleDecision(
  auth: ProcurementAuthContext | null,
): ProcurementCopilotRoleDecision {
  if (!auth || !normalizeProcurementCopilotText(auth.userId) || auth.role === "unknown") {
    return {
      allowed: false,
      role: auth?.role ?? "unknown",
      reason: "auth_required",
      approvalRequired: true,
      finalMutationAllowed: false,
    };
  }
  if (!canUseProcurementCopilotRole(auth.role)) {
    return {
      allowed: false,
      role: auth.role,
      reason: "role_scope_denied",
      approvalRequired: true,
      finalMutationAllowed: false,
    };
  }
  return {
    allowed: true,
    role: auth.role,
    reason: "allowed",
    approvalRequired: true,
    finalMutationAllowed: false,
  };
}

export function buildProcurementCopilotNoMutationProof(
  toolsCalled: ProcurementCopilotNoMutationProof["toolsCalled"] = [],
): ProcurementCopilotNoMutationProof {
  return {
    toolsCalled,
    mutationCount: 0,
    finalMutationAllowed: false,
    supplierConfirmationAllowed: false,
    orderCreationAllowed: false,
    warehouseMutationAllowed: false,
    documentSendAllowed: false,
    externalResultCanFinalize: false,
  };
}

export function previewProcurementCopilotSubmitForApproval(
  input: ProcurementCopilotSubmitPreviewInput,
): ProcurementApprovalPreviewOutput {
  return {
    status: "blocked",
    blocker: "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_READY",
    approvalRequired: true,
    idempotencyRequired: true,
    auditRequired: true,
    redactedPayloadOnly: true,
    persisted: false,
    mutationCount: 0,
    finalExecution: 0,
    evidenceRefs: uniqueProcurementCopilotRefs([...input.evidenceRefs]),
  };
}
