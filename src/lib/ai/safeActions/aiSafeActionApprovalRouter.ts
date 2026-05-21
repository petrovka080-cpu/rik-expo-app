import { AI_ACTION_LEDGER_BFF_CONTRACT } from "../../../features/ai/actionLedger/aiActionLedgerBff";
import { getAiSafeActionRegistryEntry } from "./aiSafeActionRegistry";
import type { AiSafeActionApprovalRoute, AiSafeActionKind } from "./aiSafeActionTypes";

export function routeAiSafeActionApproval(actionKind: AiSafeActionKind): AiSafeActionApprovalRoute {
  const entry = getAiSafeActionRegistryEntry(actionKind);
  const required = entry.mode === "approval_required";
  return {
    required,
    approvalType: required ? entry.approvalType : "none",
    approverRoles: required ? [...entry.approverRoles] : [],
    reasonRu: required
      ? `Действие "${entry.titleRu}" требует маршрута согласования через action ledger.`
      : `Действие "${entry.titleRu}" остается черновиком без финального выполнения.`,
    ledgerRequired: required,
    canBypass: false,
  };
}

export function getAiSafeActionExistingApprovalLedgerContract() {
  return {
    submitEndpoint: AI_ACTION_LEDGER_BFF_CONTRACT.submitEndpoint,
    statusEndpoint: AI_ACTION_LEDGER_BFF_CONTRACT.statusEndpoint,
    approveEndpoint: AI_ACTION_LEDGER_BFF_CONTRACT.approveEndpoint,
    rejectEndpoint: AI_ACTION_LEDGER_BFF_CONTRACT.rejectEndpoint,
    executeApprovedEndpoint: AI_ACTION_LEDGER_BFF_CONTRACT.executeApprovedEndpoint,
    redactedPayloadOnly: AI_ACTION_LEDGER_BFF_CONTRACT.redactedPayloadOnly,
    finalExecution: AI_ACTION_LEDGER_BFF_CONTRACT.finalExecution,
    directDomainMutation: AI_ACTION_LEDGER_BFF_CONTRACT.directDomainMutation,
  };
}
