import { getAiToolDefinition } from "../../src/features/ai/tools/aiToolRegistry";
import { planAiToolUse } from "../../src/features/ai/tools/aiToolPlanPolicy";
import {
  SUBMIT_FOR_APPROVAL_MAX_EVIDENCE_REFS,
  runSubmitForApprovalToolGate,
} from "../../src/features/ai/tools/submitForApprovalTool";

describe("submit_for_approval no-execution contract", () => {
  it("registers submit_for_approval as approval_required with idempotency and evidence", () => {
    expect(getAiToolDefinition("submit_for_approval")).toMatchObject({
      name: "submit_for_approval",
      domain: "documents",
      riskLevel: "approval_required",
      approvalRequired: true,
      idempotencyRequired: true,
      evidenceRequired: true,
      auditEvent: "ai.action.approval_required",
    });
  });

  it("keeps visible roles inside non-executing approval-gate plans", () => {
    for (const role of [
      "director",
      "control",
      "foreman",
      "buyer",
      "accountant",
      "warehouse",
      "contractor",
      "office",
      "admin",
    ] as const) {
      expect(planAiToolUse({ toolName: "submit_for_approval", role })).toMatchObject({
        allowed: true,
        mode: "approval_gate_plan",
        riskLevel: "approval_required",
        capability: "submit_for_approval",
        approvalRequired: true,
        directExecutionEnabled: false,
        mutationAllowed: false,
        providerCallAllowed: false,
        dbAccessAllowed: false,
        rawRowsAllowed: false,
        rawPromptStorageAllowed: false,
      });
    }

    expect(planAiToolUse({ toolName: "submit_for_approval", role: "unknown" })).toMatchObject({
      allowed: false,
      mode: "blocked",
    });
  });

  it("requires idempotency and evidence before creating a local approval gate envelope", async () => {
    await expect(
      runSubmitForApprovalToolGate({
        auth: { userId: "foreman-user", role: "foreman" },
        input: {
          draft_id: "draft-act-1",
          approval_target: "act",
          screen_id: "foreman.subcontract",
          domain: "subcontracts",
          summary: "submit act",
          idempotency_key: "short",
          evidence_refs: [],
        },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "SUBMIT_FOR_APPROVAL_INVALID_INPUT",
        message: expect.stringContaining("idempotency_key"),
      },
    });
  });

  it("bounds evidence refs and never claims final execution or persistence", async () => {
    const refs = Array.from(
      { length: SUBMIT_FOR_APPROVAL_MAX_EVIDENCE_REFS + 5 },
      (_, index) => `approval:evidence:${index + 1}`,
    );

    const result = await runSubmitForApprovalToolGate({
      auth: { userId: "contractor-user", role: "contractor" },
      input: {
        draft_id: "draft-act-contractor",
        approval_target: "act",
        screen_id: "contractor.main",
        domain: "subcontracts",
        summary: "send own act for approval",
        idempotency_key: "contractor-act-approval-0001",
        evidence_refs: refs,
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        approval_target: "act",
        action_type: "send_document",
        action_status: "pending",
        approval_required: true,
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
    expect(result.data.evidence_refs).toHaveLength(SUBMIT_FOR_APPROVAL_MAX_EVIDENCE_REFS);
    expect(result.data.evidence_refs).toContain("approval:evidence:1");
    expect(result.data.evidence_refs).not.toContain(`approval:evidence:${SUBMIT_FOR_APPROVAL_MAX_EVIDENCE_REFS + 1}`);
  });
});
