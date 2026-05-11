import {
  assertNoDirectAiMutation,
  canExecuteAiApprovedAction,
  createAiApprovalDraft,
  submitAiActionForApproval,
} from "../../src/features/ai/approval/aiApprovalGate";
import { createAiActionAuditEvent } from "../../src/features/ai/audit/aiActionAudit";

const baseActionParams = {
  actionType: "submit_request" as const,
  screenId: "director.dashboard",
  domain: "control" as const,
  requestedByRole: "director" as const,
  summary: "Submit controlled request",
  redactedPayload: { requestRef: "opaque" },
  idempotencyKey: "ai-approval-idempotency",
};

describe("AI approval gate", () => {
  it("blocks non-approved statuses and missing controls", () => {
    const pending = submitAiActionForApproval(baseActionParams);
    expect(pending.status).toBe("pending");
    expect(canExecuteAiApprovedAction(pending).allowed).toBe(false);

    const rejected = { ...pending, status: "rejected" as const };
    expect(canExecuteAiApprovedAction(rejected).allowed).toBe(false);

    const expired = {
      ...pending,
      status: "approved" as const,
      expiresAt: "2020-01-01T00:00:00.000Z",
    };
    expect(canExecuteAiApprovedAction(expired, {
      auditEvent: createAiActionAuditEvent({
        eventType: "ai.action.allowed",
        decision: "allow",
        reason: "approved",
      }),
      now: "2026-05-11T00:00:00.000Z",
    }).allowed).toBe(false);
  });

  it("requires idempotency, audit, approved status, and gate execution", () => {
    const missingIdempotency = submitAiActionForApproval({
      ...baseActionParams,
      idempotencyKey: "",
    });
    expect(missingIdempotency.status).toBe("blocked");

    const approved = {
      ...createAiApprovalDraft(baseActionParams),
      status: "approved" as const,
    };
    expect(canExecuteAiApprovedAction(approved).reason).toContain("audit event");
    const auditEvent = createAiActionAuditEvent({
      eventType: "ai.action.allowed",
      actionType: "submit_request",
      screenId: "director.dashboard",
      domain: "control",
      role: "director",
      riskLevel: "approval_required",
      decision: "allow",
      reason: "explicitly approved",
    });
    expect(canExecuteAiApprovedAction(approved, { auditEvent }).allowed).toBe(true);
  });

  it("blocks direct mutation and forbidden approval", () => {
    expect(assertNoDirectAiMutation({
      actionType: "submit_request",
      role: "director",
      screenId: "director.dashboard",
      domain: "control",
    })).toMatchObject({
      allowed: false,
      requiresApproval: true,
    });

    const forbidden = submitAiActionForApproval({
      ...baseActionParams,
      actionType: "direct_supabase_query",
    });
    expect(forbidden.status).toBe("blocked");
    expect(canExecuteAiApprovedAction({ ...forbidden, status: "approved" }).allowed).toBe(false);
  });
});
