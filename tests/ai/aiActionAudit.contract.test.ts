import { createAiActionAuditEvent, hasAiActionAuditEvent } from "../../src/features/ai/audit/aiActionAudit";

describe("AI action audit events", () => {
  it("creates redacted audit events without raw prompt or provider payload", () => {
    const event = createAiActionAuditEvent({
      eventType: "ai.action.approval_required",
      actionType: "submit_request",
      screenId: "foreman.ai.quick_modal",
      domain: "procurement",
      role: "foreman",
      riskLevel: "approval_required",
      decision: "approval_required",
      reason: "raw prompt: Authorization header Bearer eyJabc.def.ghi",
    });
    expect(event.redacted).toBe(true);
    expect(event.reason).not.toContain("eyJabc");
    expect(hasAiActionAuditEvent(event)).toBe(true);
  });
});
