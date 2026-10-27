import type { AiUserRole } from "../policy/aiRolePolicy";
import { canUseAiCapability } from "../policy/aiRolePolicy";
import {
  getAiRolePermissionActionMatrixEntry,
  listAiRolePermissionActionMatrixEntries,
  type AiRolePermissionActionMatrixEntry,
} from "./aiRolePermissionActionMatrix";

export type AiRoleEscalationFinding = {
  actionId: string;
  screenId: string;
  role: AiUserRole;
  code:
    | "ROLE_ALLOWED_OUTSIDE_AUDIT_SCOPE"
    | "UNKNOWN_ROLE_ALLOWED"
    | "FORBIDDEN_ACTION_ALLOWED"
    | "EXECUTE_APPROVED_WITHOUT_LEDGER_GATE"
    | "NON_CONTROL_EXECUTE_APPROVED_ALLOWED";
  exactReason: string;
};

export type AiApprovedActionExecutionBoundaryDecision = {
  actionId: string;
  role: AiUserRole;
  status: "allowed_after_approved_ledger_status" | "denied";
  canExecuteApproved: boolean;
  directExecuteAllowed: false;
  requiresApprovedLedgerStatus: true;
  exactReason: string;
};

function hasRoleScope(entry: AiRolePermissionActionMatrixEntry, role: AiUserRole): boolean {
  return entry.roleScope.includes(role);
}

export function scanAiRolePermissionEscalation(
  entries: readonly AiRolePermissionActionMatrixEntry[] = listAiRolePermissionActionMatrixEntries(),
): AiRoleEscalationFinding[] {
  return entries.flatMap((entry) =>
    entry.roleDecisions.flatMap((decision) => {
      const findings: AiRoleEscalationFinding[] = [];
      if (decision.status === "allowed" && !hasRoleScope(entry, decision.role)) {
        findings.push({
          actionId: entry.actionId,
          screenId: entry.screenId,
          role: decision.role,
          code: "ROLE_ALLOWED_OUTSIDE_AUDIT_SCOPE",
          exactReason: "Role was allowed even though it is outside the audited roleScope.",
        });
      }
      if (decision.status === "allowed" && decision.role === "unknown") {
        findings.push({
          actionId: entry.actionId,
          screenId: entry.screenId,
          role: decision.role,
          code: "UNKNOWN_ROLE_ALLOWED",
          exactReason: "Unknown role must never be allowed.",
        });
      }
      if (decision.status === "allowed" && entry.actionKind === "forbidden") {
        findings.push({
          actionId: entry.actionId,
          screenId: entry.screenId,
          role: decision.role,
          code: "FORBIDDEN_ACTION_ALLOWED",
          exactReason: "Forbidden audited action must be denied for every role.",
        });
      }
      return findings;
    }),
  );
}

export function canExecuteApprovedAiActionThroughLedger(params: {
  actionId: string;
  role: AiUserRole;
  ledgerStatus: "approved" | "pending" | "rejected" | "not_found";
  viaApprovalGate: boolean;
}): AiApprovedActionExecutionBoundaryDecision {
  const entry = getAiRolePermissionActionMatrixEntry(params.actionId);
  if (!entry || entry.actionKind !== "approval_required") {
    return {
      actionId: params.actionId,
      role: params.role,
      status: "denied",
      canExecuteApproved: false,
      directExecuteAllowed: false,
      requiresApprovedLedgerStatus: true,
      exactReason: "Only audited approval-required actions can request approved execution.",
    };
  }
  if (params.ledgerStatus !== "approved" || params.viaApprovalGate !== true) {
    return {
      actionId: params.actionId,
      role: params.role,
      status: "denied",
      canExecuteApproved: false,
      directExecuteAllowed: false,
      requiresApprovedLedgerStatus: true,
      exactReason: "Approved execution requires approved ledger status and the approval gate.",
    };
  }
  const allowed = canUseAiCapability({
    role: params.role,
    domain: entry.domain,
    capability: "execute_approved_action",
    viaApprovalGate: true,
  });
  if (!allowed) {
    return {
      actionId: params.actionId,
      role: params.role,
      status: "denied",
      canExecuteApproved: false,
      directExecuteAllowed: false,
      requiresApprovedLedgerStatus: true,
      exactReason: "Role cannot execute approved actions for this domain.",
    };
  }
  return {
    actionId: params.actionId,
    role: params.role,
    status: "allowed_after_approved_ledger_status",
    canExecuteApproved: true,
    directExecuteAllowed: false,
    requiresApprovedLedgerStatus: true,
    exactReason: "Director/control execution is allowed only through approved ledger status.",
  };
}

export function scanAiApprovedExecutionEscalation(
  entries: readonly AiRolePermissionActionMatrixEntry[] = listAiRolePermissionActionMatrixEntries(),
): AiRoleEscalationFinding[] {
  const approvalEntries = entries.filter((entry) => entry.actionKind === "approval_required");
  return approvalEntries.flatMap((entry) =>
    entry.roleDecisions.flatMap((decision) => {
      const directAttempt = canExecuteApprovedAiActionThroughLedger({
        actionId: entry.actionId,
        role: decision.role,
        ledgerStatus: "approved",
        viaApprovalGate: false,
      });
      const gatedAttempt = canExecuteApprovedAiActionThroughLedger({
        actionId: entry.actionId,
        role: decision.role,
        ledgerStatus: "approved",
        viaApprovalGate: true,
      });
      const findings: AiRoleEscalationFinding[] = [];
      if (directAttempt.canExecuteApproved) {
        findings.push({
          actionId: entry.actionId,
          screenId: entry.screenId,
          role: decision.role,
          code: "EXECUTE_APPROVED_WITHOUT_LEDGER_GATE",
          exactReason: "Approved execution was allowed without the approval gate.",
        });
      }
      if (gatedAttempt.canExecuteApproved && decision.role !== "director" && decision.role !== "control") {
        findings.push({
          actionId: entry.actionId,
          screenId: entry.screenId,
          role: decision.role,
          code: "NON_CONTROL_EXECUTE_APPROVED_ALLOWED",
          exactReason: "Only director/control may execute approved ledger actions.",
        });
      }
      return findings;
    }),
  );
}
