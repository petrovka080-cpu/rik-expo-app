import { createAiActionLedgerRepository } from "../../src/features/ai/actionLedger/aiActionLedgerRepository";
import {
  buildSubmitForApprovalAuditTrail,
  createSubmitForApprovalSubmittedAuditEvent,
} from "../../src/features/ai/approvalAudit/submitForApprovalAuditEvent";
import { assertSubmitForApprovalAuditPolicy } from "../../src/features/ai/approvalAudit/submitForApprovalAuditPolicy";
import { hasForbiddenSubmitForApprovalAuditKeys } from "../../src/features/ai/approvalAudit/submitForApprovalRedaction";
import type { SubmitForApprovalAuditInput } from "../../src/features/ai/approvalAudit/submitForApprovalAuditTypes";
import { runSubmitForApprovalToolGate } from "../../src/features/ai/tools/submitForApprovalTool";
import { createContractTestActionLedgerBackend } from "./aiActionLedgerTestBackend";

const auditInput = {
  actionType: "submit_request",
  role: "buyer",
  screenId: "buyer.main",
  domain: "procurement",
  summary: "Submit procurement request for approval",
  redactedPayload: {
    draft_id: "draft-1",
    approval_target: "request",
  },
  evidenceRefs: ["draft:evidence:1"],
  idempotencyKey: "audit-trail-key-0001",
} satisfies SubmitForApprovalAuditInput;

describe("submit_for_approval audit trail", () => {
  it("allows only redacted evidence-backed idempotent approval submissions", () => {
    expect(assertSubmitForApprovalAuditPolicy(auditInput)).toMatchObject({
      allowed: true,
      reason: "allowed",
      riskLevel: "approval_required",
      auditRequired: true,
      evidenceRequired: true,
      idempotencyRequired: true,
      finalExecution: false,
      directDomainMutation: false,
    });

    expect(
      assertSubmitForApprovalAuditPolicy({
        ...auditInput,
        redactedPayload: { raw_prompt: "do not store me" },
      }),
    ).toMatchObject({
      allowed: false,
      reason: "redaction_failed",
    });
    expect(hasForbiddenSubmitForApprovalAuditKeys({ provider_payload: { token: "redacted" } })).toBe(true);
  });

  it("builds a redacted audit trail without raw prompt/provider/db exposure", () => {
    const event = createSubmitForApprovalSubmittedAuditEvent({
      input: auditInput,
      actionId: "ai_action_submit_request",
      createdAt: "2026-05-13T00:00:00.000Z",
    });
    const trail = buildSubmitForApprovalAuditTrail({
      input: auditInput,
      status: "pending",
      actionId: "ai_action_submit_request",
      auditEvents: [event],
    });

    expect(trail).toMatchObject({
      contractId: "submit_for_approval_audit_trail_v1",
      status: "pending",
      riskLevel: "approval_required",
      auditEventCount: 1,
      idempotencyKeyPresent: true,
      redacted: true,
      redactedPayloadOnly: true,
      finalExecution: false,
      directDomainMutation: false,
      mutationCount: 0,
      providerCalled: false,
      rawDbRowsExposed: false,
      rawPromptExposed: false,
      rawProviderPayloadStored: false,
      credentialsPrinted: false,
    });
    expect(trail.auditTrailRef).toMatch(/^audit:/);
    expect(event).toMatchObject({
      eventType: "ai.action.submitted_for_approval",
      redacted: true,
      rawPromptExposed: false,
      rawProviderPayloadExposed: false,
      rawDbRowsExposed: false,
      credentialsExposed: false,
    });
  });

  it("returns audit proof from the submit_for_approval tool envelope", async () => {
    const { backend, auditEvents } = createContractTestActionLedgerBackend();

    const result = await runSubmitForApprovalToolGate({
      auth: { userId: "buyer-user", role: "buyer" },
      repository: createAiActionLedgerRepository(backend),
      input: {
        draft_id: "draft-request-audit",
        approval_target: "request",
        screen_id: "buyer.main",
        domain: "procurement",
        summary: "Submit audited request",
        idempotency_key: "tool-audit-trail-key-0001",
        evidence_refs: ["draft:evidence:audit"],
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        action_status: "pending",
        audit_trail_ref: expect.stringMatching(/^audit:/),
        audit_event_count: 1,
        audit_redacted: true,
        persisted: true,
        local_gate_only: false,
        final_execution: 0,
        mutation_count: 0,
      },
    });
    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0]).toMatchObject({
      eventType: "ai.action.submitted_for_approval",
      redacted: true,
    });
  });
});
