import type {
  ApprovalInboxActionCard,
  ApprovalInboxResponse,
  ApprovalInboxStatus,
} from "./approvalInboxTypes";

export type ApprovalInboxSectionId =
  | "urgent"
  | "requests"
  | "documents"
  | "finance"
  | "warehouse"
  | "contractors";

export type ApprovalInboxSectionView = {
  id: ApprovalInboxSectionId;
  title: string;
  actions: readonly ApprovalInboxActionCard[];
};

export type ApprovalInboxViewModel = {
  contractId: "ai_approval_inbox_view_model_v1";
  status: ApprovalInboxStatus;
  role: ApprovalInboxResponse["role"];
  actions: readonly ApprovalInboxActionCard[];
  sections: readonly ApprovalInboxSectionView[];
  emptyMessage: string;
  pendingCount: number;
  reviewPanelRequired: true;
  approveWithoutReviewAllowed: false;
  fakeActions: false;
  mutationCount: 0;
  directMutationAllowed: false;
  rawDbRowsExposed: false;
  rawPromptExposed: false;
};

const SECTION_TITLES: Record<ApprovalInboxSectionId, string> = {
  urgent: "\u0421\u0440\u043e\u0447\u043d\u043e",
  requests: "\u0417\u0430\u044f\u0432\u043a\u0438",
  documents: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b",
  finance: "\u0424\u0438\u043d\u0430\u043d\u0441\u044b",
  warehouse: "\u0421\u043a\u043b\u0430\u0434",
  contractors: "\u041f\u043e\u0434\u0440\u044f\u0434\u0447\u0438\u043a\u0438",
};

const SECTION_ORDER: readonly ApprovalInboxSectionId[] = [
  "urgent",
  "requests",
  "documents",
  "finance",
  "warehouse",
  "contractors",
];

function sectionForAction(action: ApprovalInboxActionCard): ApprovalInboxSectionId {
  if (action.riskFlags.includes("approval_required") || action.status === "pending") return "urgent";
  if (action.domain === "procurement" || action.actionType === "draft_request") return "requests";
  if (action.domain === "finance") return "finance";
  if (action.domain === "warehouse") return "warehouse";
  if (action.domain === "subcontracts" || action.domain === "projects") return "contractors";
  return "documents";
}

function sortActions(actions: readonly ApprovalInboxActionCard[]): ApprovalInboxActionCard[] {
  return [...actions].sort((left, right) => {
    if (left.status === "pending" && right.status !== "pending") return -1;
    if (right.status === "pending" && left.status !== "pending") return 1;
    const dateDelta = Date.parse(right.createdAt) - Date.parse(left.createdAt);
    if (Number.isFinite(dateDelta) && dateDelta !== 0) return dateDelta;
    return left.actionId.localeCompare(right.actionId);
  });
}

function buildSections(actions: readonly ApprovalInboxActionCard[]): ApprovalInboxSectionView[] {
  return SECTION_ORDER.map((id) => ({
    id,
    title: SECTION_TITLES[id],
    actions: sortActions(actions.filter((action) => sectionForAction(action) === id)),
  }));
}

export function buildApprovalInboxViewModel(
  response: ApprovalInboxResponse,
): ApprovalInboxViewModel {
  return {
    contractId: "ai_approval_inbox_view_model_v1",
    status: response.status,
    role: response.role,
    actions: sortActions(response.actions),
    sections: buildSections(response.actions),
    emptyMessage: "\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439 \u043d\u0430 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435",
    pendingCount: response.counts.pending,
    reviewPanelRequired: true,
    approveWithoutReviewAllowed: false,
    fakeActions: false,
    mutationCount: 0,
    directMutationAllowed: false,
    rawDbRowsExposed: false,
    rawPromptExposed: false,
  };
}

export function buildApprovalPendingCommandCenterSummary(
  response: ApprovalInboxResponse,
): {
  type: "approval_pending" | "approval_empty";
  count: number;
  pendingCount: number;
  openAction: "open_approval_inbox";
  directApproveAllowed: false;
  reviewPanelRequired: true;
  fakeLocalApproval: false;
  mutationCount: 0;
} {
  return {
    type: response.counts.pending > 0 ? "approval_pending" : "approval_empty",
    count: response.counts.pending,
    pendingCount: response.counts.pending,
    openAction: "open_approval_inbox",
    directApproveAllowed: false,
    reviewPanelRequired: true,
    fakeLocalApproval: false,
    mutationCount: 0,
  };
}
