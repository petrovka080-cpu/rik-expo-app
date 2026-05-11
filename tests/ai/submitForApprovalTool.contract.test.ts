import fs from "fs";
import path from "path";

import {
  SUBMIT_FOR_APPROVAL_AUDIT_EVENT,
  SUBMIT_FOR_APPROVAL_MAX_EVIDENCE_REFS,
  SUBMIT_FOR_APPROVAL_RISK_LEVEL,
  SUBMIT_FOR_APPROVAL_STATUS,
  runSubmitForApprovalToolGate,
} from "../../src/features/ai/tools/submitForApprovalTool";
import type { SubmitForApprovalToolAuthContext } from "../../src/features/ai/tools/submitForApprovalTool";
import {
  submitForApprovalInputSchema,
  submitForApprovalOutputSchema,
} from "../../src/features/ai/schemas/aiToolSchemas";

const ROOT = process.cwd();
const sourcePath = path.join(ROOT, "src/features/ai/tools/submitForApprovalTool.ts");

const buyerAuth = {
  userId: "buyer-user",
  role: "buyer",
} satisfies SubmitForApprovalToolAuthContext;

const contractorAuth = {
  userId: "contractor-user",
  role: "contractor",
} satisfies SubmitForApprovalToolAuthContext;

describe("submit_for_approval approval-gate tool", () => {
  it("keeps the permanent submit_for_approval schema on redacted approval input and no-execution output", () => {
    expect(submitForApprovalInputSchema).toMatchObject({
      required: [
        "draft_id",
        "approval_target",
        "screen_id",
        "domain",
        "summary",
        "idempotency_key",
        "evidence_refs",
      ],
      additionalProperties: false,
      properties: {
        draft_id: expect.objectContaining({ type: "string", minLength: 1 }),
        approval_target: expect.objectContaining({
          enum: ["request", "report", "act", "supplier_selection", "payment_status_change"],
        }),
        screen_id: expect.objectContaining({ type: "string", minLength: 1 }),
        summary: expect.objectContaining({ type: "string", minLength: 1 }),
        idempotency_key: expect.objectContaining({ type: "string", minLength: 16 }),
        evidence_refs: expect.objectContaining({
          type: "array",
          maxItems: SUBMIT_FOR_APPROVAL_MAX_EVIDENCE_REFS,
        }),
      },
    });
    expect(submitForApprovalInputSchema.properties).not.toHaveProperty("draftId");
    expect(submitForApprovalInputSchema.properties).not.toHaveProperty("approvalTarget");
    expect(submitForApprovalInputSchema.properties).not.toHaveProperty("raw_payload");
    expect(submitForApprovalInputSchema.properties).not.toHaveProperty("prompt_payload");

    expect(submitForApprovalOutputSchema).toMatchObject({
      required: [
        "status",
        "action_id",
        "action_status",
        "approval_required",
        "audit_event",
        "approval_target",
        "action_type",
        "screen_id",
        "domain",
        "evidence_refs",
        "risk_level",
        "idempotency_key_present",
        "persisted",
        "local_gate_only",
        "mutation_count",
        "final_execution",
        "provider_called",
        "db_accessed",
        "direct_execution_enabled",
      ],
      additionalProperties: false,
      properties: {
        status: expect.objectContaining({ enum: [SUBMIT_FOR_APPROVAL_STATUS] }),
        action_status: expect.objectContaining({ enum: ["pending"] }),
        approval_required: expect.objectContaining({ type: "boolean" }),
        audit_event: expect.objectContaining({ enum: [SUBMIT_FOR_APPROVAL_AUDIT_EVENT] }),
        risk_level: expect.objectContaining({ enum: [SUBMIT_FOR_APPROVAL_RISK_LEVEL] }),
        mutation_count: expect.objectContaining({ minimum: 0, maximum: 0 }),
      },
    });
    expect(submitForApprovalOutputSchema.properties).not.toHaveProperty("approvalRequired");
    expect(submitForApprovalOutputSchema.properties).not.toHaveProperty("auditEvent");
    expect(submitForApprovalOutputSchema.properties).not.toHaveProperty("evidenceRefs");
  });

  it("returns an approval-required local gate envelope without persistence or final execution", async () => {
    const result = await runSubmitForApprovalToolGate({
      auth: buyerAuth,
      input: {
        draft_id: " draft-request-1 ",
        approval_target: "request",
        screen_id: "buyer.main",
        domain: "procurement",
        summary: " Submit prepared buyer request for review ",
        idempotency_key: "buyer-request-approval-0001",
        approval_reason: "needs human approval",
        evidence_refs: [" draft_request:input:project ", "draft_request:input:item:1"],
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        status: SUBMIT_FOR_APPROVAL_STATUS,
        action_status: "pending",
        approval_required: true,
        audit_event: SUBMIT_FOR_APPROVAL_AUDIT_EVENT,
        approval_target: "request",
        action_type: "submit_request",
        screen_id: "buyer.main",
        domain: "procurement",
        evidence_refs: ["draft_request:input:project", "draft_request:input:item:1"],
        risk_level: SUBMIT_FOR_APPROVAL_RISK_LEVEL,
        idempotency_key_present: true,
        persisted: false,
        local_gate_only: true,
        mutation_count: 0,
        final_execution: 0,
        provider_called: false,
        db_accessed: false,
        direct_execution_enabled: false,
      },
    });
    if (!result.ok) throw new Error("expected submit_for_approval success");
    expect(result.data.action_id).toContain("submit_request");
    expect(result.data.action_id).toContain("buyer.main");
  });

  it("requires auth, object input, and policy-compatible role/domain/screen", async () => {
    await expect(
      runSubmitForApprovalToolGate({
        auth: null,
        input: {
          draft_id: "draft-1",
          approval_target: "request",
          screen_id: "buyer.main",
          domain: "procurement",
          summary: "submit",
          idempotency_key: "idempotency-key-0001",
          evidence_refs: ["draft:evidence"],
        },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "SUBMIT_FOR_APPROVAL_AUTH_REQUIRED" },
    });

    await expect(
      runSubmitForApprovalToolGate({
        auth: buyerAuth,
        input: "approval",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "SUBMIT_FOR_APPROVAL_INVALID_INPUT" },
    });

    await expect(
      runSubmitForApprovalToolGate({
        auth: contractorAuth,
        input: {
          draft_id: "payment-draft-1",
          approval_target: "payment_status_change",
          screen_id: "accountant.main",
          domain: "finance",
          summary: "change payment status",
          idempotency_key: "payment-status-approval-0001",
          evidence_refs: ["finance:summary:redacted"],
        },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "SUBMIT_FOR_APPROVAL_POLICY_BLOCKED" },
    });
  });

  it("has no direct database, model provider, persisted approval write, or final execution surface", () => {
    const source = fs.readFileSync(sourcePath, "utf8");
    expect(source).not.toMatch(/@supabase|auth\.admin|listUsers|service_role/i);
    expect(source).not.toMatch(/\.(from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(source).not.toMatch(/executeApproved|execute_approved|finalExecution\s*:\s*1/i);
    expect(source).not.toMatch(/approveAction|approve_action|status\s*:\s*"approved"/i);
    expect(source).not.toMatch(/createOrder|create_order|confirmSupplier|confirm_supplier\s*\(/i);
    expect(source).not.toMatch(/changePaymentStatus|applyPaymentStatus|executePayment|paymentStatus\s*\(/i);
    expect(source).not.toMatch(/reserveStock|reserve_stock|applyIssue|apply_issue/i);
    expect(source).not.toMatch(/openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider/i);
  });
});
