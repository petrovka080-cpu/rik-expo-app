import { buildApprovalPendingCommandCenterSummary } from "../../src/features/ai/approvalInbox/approvalInboxViewModel";
import {
  approvalInboxAuth,
  createApprovalInboxRecord,
} from "./approvalInboxTestUtils";

describe("Approval Inbox Command Center integration contract", () => {
  it("summarizes pending actions without enabling direct approve from a card", () => {
    const summary = buildApprovalPendingCommandCenterSummary({
      status: "loaded",
      role: approvalInboxAuth("director").role,
      actions: [
        {
          actionId: "approval-command-center",
          actionType: "draft_request",
          status: "pending",
          riskLevel: "draft_only",
          domain: "procurement",
          screenId: "buyer.main",
          title: "AI draft request",
          summary: "Prepared procurement draft",
          riskFlags: [],
          evidenceRefs: ["evidence:1"],
          createdAt: "2026-05-13T00:00:00.000Z",
          expiresAt: "2035-01-01T00:00:00.000Z",
          allowedReviewActions: ["view", "ask_why", "edit_preview", "approve", "reject"],
          executionAvailable: false,
          executionStatus: "not_ready",
          requiresApproval: true,
          rawDbRowsExposed: false,
          rawPromptExposed: false,
          rawProviderPayloadStored: false,
        },
      ],
      counts: { pending: 1, approved: 0, rejected: 0, expired: 0 },
      nextCursor: null,
      persistentLedgerUsed: true,
      fakeLocalApproval: false,
      mutationCount: 0,
      finalMutationAllowed: false,
      directSupabaseFromUi: false,
      modelProviderFromUi: false,
      rawDbRowsExposed: false,
      rawPromptExposed: false,
    });

    expect(summary).toMatchObject({
      type: "approval_pending",
      pendingCount: 1,
      directApproveAllowed: false,
      reviewPanelRequired: true,
      fakeLocalApproval: false,
      mutationCount: 0,
    });
  });

  it("preserves honest empty state for Command Center when there are no actions", () => {
    const record = createApprovalInboxRecord();
    expect(record.evidenceRefs).toHaveLength(1);

    const summary = buildApprovalPendingCommandCenterSummary({
      status: "empty",
      role: "director",
      actions: [],
      counts: { pending: 0, approved: 0, rejected: 0, expired: 0 },
      nextCursor: null,
      persistentLedgerUsed: true,
      fakeLocalApproval: false,
      mutationCount: 0,
      finalMutationAllowed: false,
      directSupabaseFromUi: false,
      modelProviderFromUi: false,
      rawDbRowsExposed: false,
      rawPromptExposed: false,
    });

    expect(summary).toMatchObject({
      type: "approval_empty",
      pendingCount: 0,
      fakeLocalApproval: false,
    });
  });
});
