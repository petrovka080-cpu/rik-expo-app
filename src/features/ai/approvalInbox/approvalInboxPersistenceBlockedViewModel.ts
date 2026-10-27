import type { ApprovalInboxResponse } from "./approvalInboxTypes";
import { buildApprovalInboxViewModel } from "./approvalInboxViewModel";

const approvalPersistenceBlockedResponse: ApprovalInboxResponse = {
  status: "blocked",
  role: "control",
  actions: [],
  counts: {
    pending: 0,
    approved: 0,
    rejected: 0,
    expired: 0,
  },
  nextCursor: null,
  blocker: "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
  reason: "Persistent action ledger backend is not mounted.",
  persistentLedgerUsed: false,
  fakeLocalApproval: false,
  mutationCount: 0,
  finalMutationAllowed: false,
  directSupabaseFromUi: false,
  modelProviderFromUi: false,
  rawDbRowsExposed: false,
  rawPromptExposed: false,
};

export function buildApprovalPersistenceBlockedViewModel() {
  return buildApprovalInboxViewModel(approvalPersistenceBlockedResponse);
}
