import {
  approveApprovalInboxAction,
  executeApprovedApprovalInboxActionBff,
  rejectApprovalInboxAction,
} from "../../src/features/ai/approvalInbox/approvalInboxRuntime";
import { createAiActionLedgerRepository } from "../../src/features/ai/actionLedger/aiActionLedgerRepository";
import { createContractTestActionLedgerBackend } from "./aiActionLedgerTestBackend";
import {
  APPROVAL_INBOX_ORG_ID,
  approvalInboxAuth,
  createApprovalInboxRecord,
} from "./approvalInboxTestUtils";

describe("Approval Inbox action lifecycle contract", () => {
  it("requires review panel confirmation before approve or reject", async () => {
    const { backend, records } = createContractTestActionLedgerBackend();
    const record = createApprovalInboxRecord({ actionId: "needs-review-panel" });
    records.set(record.actionId, record);

    await expect(
      approveApprovalInboxAction({
        auth: approvalInboxAuth("director"),
        organizationId: APPROVAL_INBOX_ORG_ID,
        backend,
        actionId: record.actionId,
        reviewPanelConfirmed: false,
      }),
    ).resolves.toMatchObject({
      status: "blocked",
      blocker: "BLOCKED_APPROVAL_ACTION_POLICY_DENIED",
      finalExecution: false,
    });

    expect(records.get(record.actionId)?.status).toBe("pending");
  });

  it("approves pending actions without final execution", async () => {
    const { backend, records, auditEvents } = createContractTestActionLedgerBackend();
    const record = createApprovalInboxRecord({ actionId: "approve-from-inbox" });
    records.set(record.actionId, record);

    await expect(
      approveApprovalInboxAction({
        auth: approvalInboxAuth("director"),
        organizationId: APPROVAL_INBOX_ORG_ID,
        backend,
        actionId: record.actionId,
        reviewPanelConfirmed: true,
      }),
    ).resolves.toMatchObject({
      status: "approved",
      persisted: true,
      finalExecution: false,
      directDomainMutation: false,
    });

    expect(records.get(record.actionId)?.status).toBe("approved");
    expect(auditEvents.map((event) => event.eventType)).toContain("ai.action.approved");
  });

  it("rejects pending actions and blocks later execution", async () => {
    const { backend, records, auditEvents } = createContractTestActionLedgerBackend();
    const record = createApprovalInboxRecord({ actionId: "reject-from-inbox" });
    records.set(record.actionId, record);

    await rejectApprovalInboxAction({
      auth: approvalInboxAuth("director"),
      organizationId: APPROVAL_INBOX_ORG_ID,
      backend,
      actionId: record.actionId,
      reviewPanelConfirmed: true,
      reason: "not needed",
    });

    await expect(
      executeApprovedApprovalInboxActionBff({
        auth: approvalInboxAuth("director"),
        organizationId: APPROVAL_INBOX_ORG_ID,
        backend,
        actionId: record.actionId,
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        result: {
          status: "blocked",
          finalExecution: false,
          directDomainMutation: false,
        },
      },
    });

    expect(records.get(record.actionId)?.status).toBe("rejected");
    expect(auditEvents.map((event) => event.eventType)).toContain("ai.action.rejected");
  });

  it("blocks execute-approved honestly when the domain executor is not mounted", async () => {
    const { backend } = createContractTestActionLedgerBackend();
    const repository = createAiActionLedgerRepository(backend);
    const submitted = await repository.submitForApproval(
      {
        actionType: "send_document",
        screenId: "director.dashboard",
        domain: "documents",
        summary: "Send prepared document",
        redactedPayload: { documentHash: "doc:approval:1" },
        evidenceRefs: ["doc:evidence:1"],
        idempotencyKey: "approval-inbox-execute-approved-0001",
        requestedByUserIdHash: "user:director",
        organizationIdHash: "org:approval-inbox-execute",
      },
      "director",
    );
    expect(submitted.status).toBe("pending");
    const approved = await repository.approve({
      actionId: submitted.actionId!,
      approverRole: "director",
      approvedByUserIdHash: "user:director",
    });
    expect(approved.status).toBe("approved");

    await expect(
      executeApprovedApprovalInboxActionBff({
        auth: approvalInboxAuth("director"),
        backend,
        actionId: submitted.actionId!,
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        documentType: "ai_approval_inbox_execute_approved",
        result: {
          status: "blocked",
          blocker: "BLOCKED_DOMAIN_EXECUTOR_NOT_READY",
          domainExecutorReady: false,
          finalExecution: false,
        },
      },
    });
  });
});
