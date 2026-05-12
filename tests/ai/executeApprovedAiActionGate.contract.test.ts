import { createAiActionLedgerAuditEvent } from "../../src/features/ai/actionLedger/aiActionLedgerAudit";
import { executeApprovedAiAction } from "../../src/features/ai/actionLedger/executeApprovedAiAction";
import type { AiActionLedgerRecord } from "../../src/features/ai/actionLedger/aiActionLedgerTypes";

function record(status: AiActionLedgerRecord["status"]): AiActionLedgerRecord {
  return {
    actionId: `action:${status}`,
    actionType: "send_document",
    status,
    riskLevel: "approval_required",
    role: "director",
    screenId: "director.dashboard",
    domain: "documents",
    summary: "Send document",
    redactedPayload: { documentHash: "doc:1" },
    evidenceRefs: ["doc:evidence:1"],
    idempotencyKey: `execute-approved-${status}-0001`,
    requestedByUserIdHash: "user:director",
    organizationIdHash: "org:demo",
    createdAt: "2026-05-12T00:00:00.000Z",
    expiresAt: "2035-01-01T00:00:00.000Z",
  };
}

describe("execute-approved AI action gate contract", () => {
  it("blocks pending, rejected, expired and unaudited actions", async () => {
    for (const status of ["pending", "rejected", "expired"] as const) {
      await expect(
        executeApprovedAiAction({ record: record(status), executorRole: "director" }),
      ).resolves.toMatchObject({ status: "blocked" });
    }
    await expect(
      executeApprovedAiAction({ record: record("approved"), executorRole: "director" }),
    ).resolves.toMatchObject({
      status: "blocked",
      blocker: "BLOCKED_APPROVAL_ACTION_AUDIT_REQUIRED",
    });
  });

  it("requires a mounted domain executor and never fakes execution", async () => {
    const approved = record("approved");
    const auditEvent = createAiActionLedgerAuditEvent({
      eventType: "ai.action.execute_requested",
      actionId: approved.actionId,
      actionType: approved.actionType,
      status: approved.status,
      role: "director",
      screenId: approved.screenId,
      domain: approved.domain,
      reason: "execute approved",
      evidenceRefs: approved.evidenceRefs,
    });

    await expect(
      executeApprovedAiAction({
        record: approved,
        executorRole: "director",
        auditEvent,
        domainExecutor: null,
      }),
    ).resolves.toMatchObject({
      status: "blocked",
      blocker: "BLOCKED_DOMAIN_EXECUTOR_NOT_READY",
      finalExecution: false,
      directDomainMutation: false,
      domainExecutorReady: false,
    });
  });
});
