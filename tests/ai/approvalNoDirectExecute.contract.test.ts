import { createAiActionAuditEvent } from "../../src/features/ai/audit/aiActionAudit";
import { canExecuteAiApprovedAction } from "../../src/features/ai/approval/aiApprovalGate";
import type {
  AiApprovalAction,
  AiApprovalStatus,
} from "../../src/features/ai/approval/aiApprovalTypes";
import { AI_PERSISTENT_APPROVAL_QUEUE_READINESS } from "../../src/features/ai/approval/aiApprovalTypes";

function buildAction(status: AiApprovalStatus, expiresAt: string): AiApprovalAction {
  return {
    actionId: `ai:send_document:director.dashboard:director:${status}`,
    actionType: "send_document",
    status,
    riskLevel: "approval_required",
    screenId: "director.dashboard",
    domain: "control",
    requestedByRole: "director",
    requestedByUserIdHash: "present_redacted",
    organizationIdHash: "present_redacted",
    summary: "Send approved document",
    redactedPayload: { document_id: "redacted-document" },
    evidenceRefs: ["approval:evidence:document"],
    idempotencyKey: `approval-no-direct-execute-${status}`,
    createdAt: "2026-05-12T00:00:00.000Z",
    expiresAt,
  };
}

describe("approval direct execution guard", () => {
  it("blocks pending, rejected, and expired statuses before execution", () => {
    const future = "2035-01-01T00:00:00.000Z";
    const blockedStatuses: AiApprovalStatus[] = ["pending", "rejected", "expired"];

    for (const status of blockedStatuses) {
      expect(canExecuteAiApprovedAction(buildAction(status, future))).toMatchObject({
        allowed: false,
        requiresApproval: true,
      });
    }
  });

  it("blocks approved actions without audit and expired approved actions with audit", () => {
    const auditEvent = createAiActionAuditEvent({
      eventType: "ai.action.submitted_for_approval",
      actionType: "send_document",
      screenId: "director.dashboard",
      domain: "control",
      role: "director",
      riskLevel: "approval_required",
      decision: "approval_required",
      reason: "approved action execution audit",
      timestamp: "2026-05-12T00:00:00.000Z",
    });

    expect(canExecuteAiApprovedAction(buildAction("approved", "2035-01-01T00:00:00.000Z"))).toMatchObject({
      allowed: false,
      reason: expect.stringContaining("missing audit event"),
    });
    expect(
      canExecuteAiApprovedAction(buildAction("approved", "2020-01-01T00:00:00.000Z"), {
        auditEvent,
        now: "2026-05-12T00:00:00.000Z",
      }),
    ).toMatchObject({
      allowed: false,
      reason: expect.stringContaining("expired"),
    });
  });

  it("only allows an approved non-expired action through the audited gate", () => {
    const auditEvent = createAiActionAuditEvent({
      eventType: "ai.action.submitted_for_approval",
      actionType: "send_document",
      screenId: "director.dashboard",
      domain: "control",
      role: "director",
      riskLevel: "approval_required",
      decision: "approval_required",
      reason: "approved action execution audit",
      timestamp: "2026-05-12T00:00:00.000Z",
    });

    expect(
      canExecuteAiApprovedAction(buildAction("approved", "2035-01-01T00:00:00.000Z"), {
        auditEvent,
        now: "2026-05-12T00:00:00.000Z",
      }),
    ).toMatchObject({
      allowed: true,
      requiresApproval: true,
      reason: "AI action can execute through approved gate",
    });
  });

  it("does not claim persistent approve or reject endpoints until storage is found", () => {
    expect(AI_PERSISTENT_APPROVAL_QUEUE_READINESS.finalStatus).toBe(
      "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
    );
    expect(AI_PERSISTENT_APPROVAL_QUEUE_READINESS.requiredEndpoints).toEqual([
      "POST /agent/action/submit-for-approval",
      "GET /agent/action/:id/status",
      "POST /agent/action/:id/approve",
      "POST /agent/action/:id/reject",
    ]);
    expect(AI_PERSISTENT_APPROVAL_QUEUE_READINESS.fakeLocalApproval).toBe(false);
  });
});
