import { getAiSafeReadToolBinding } from "../../src/features/ai/tools/aiToolReadBindings";
import { getAiToolDefinition } from "../../src/features/ai/tools/aiToolRegistry";
import { planAiToolUse } from "../../src/features/ai/tools/aiToolPlanPolicy";
import {
  GET_ACTION_STATUS_MAX_EVIDENCE_REFS,
  runGetActionStatusToolSafeRead,
} from "../../src/features/ai/tools/getActionStatusTool";

const allowedRoles = [
  "director",
  "control",
  "foreman",
  "buyer",
  "accountant",
  "warehouse",
  "contractor",
  "office",
  "admin",
] as const;

describe("get_action_status no-mutation contract", () => {
  it("registers get_action_status as a safe-read local status tool", () => {
    expect(getAiToolDefinition("get_action_status")).toMatchObject({
      name: "get_action_status",
      domain: "documents",
      riskLevel: "safe_read",
      approvalRequired: false,
      idempotencyRequired: false,
      auditEvent: "ai.policy.checked",
      rateLimitScope: "ai.tool.get_action_status",
      cacheAllowed: false,
      evidenceRequired: true,
    });
    expect(getAiSafeReadToolBinding("get_action_status")?.contracts).toEqual([
      expect.objectContaining({
        contractId: "ai_approval_action_status_local_v1",
        routeOperation: "ai.approval.action.status.local",
        source: "local:aiApprovalAction",
        operations: ["approval.action.status.read"],
        readOnly: true,
        trafficEnabledByDefault: false,
        productionTrafficEnabled: false,
      }),
    ]);
  });

  it("plans all allowed roles as read-only with no direct execution or storage access", () => {
    for (const role of allowedRoles) {
      expect(planAiToolUse({ toolName: "get_action_status", role })).toMatchObject({
        allowed: true,
        mode: "read_contract_plan",
        riskLevel: "safe_read",
        capability: "read_context",
        approvalRequired: false,
        directExecutionEnabled: false,
        mutationAllowed: false,
        providerCallAllowed: false,
        dbAccessAllowed: false,
        rawRowsAllowed: false,
        rawPromptStorageAllowed: false,
        evidenceRequired: true,
        blockReason: null,
      });
    }
    expect(planAiToolUse({ toolName: "get_action_status", role: "unknown" })).toMatchObject({
      allowed: false,
      mode: "blocked",
      directExecutionEnabled: false,
      mutationAllowed: false,
    });
  });

  it("bounds evidence refs and never returns raw payload, idempotency key, or user hashes", async () => {
    const actionId = "ai:send_document:contractor.main:contractor:approval-0001";
    const result = await runGetActionStatusToolSafeRead({
      auth: { userId: "contractor-user", role: "contractor" },
      input: {
        action_id: actionId,
        status_snapshot: {
          action_id: actionId,
          action_status: "approved",
          action_type: "send_document",
          screen_id: "contractor.main",
          domain: "subcontracts",
          evidence_refs: Array.from({ length: 30 }, (_, index) => `contractor:evidence:${index}`),
          raw_payload: { secret: "must-not-return" },
          idempotency_key: "must-not-return",
          requested_by_user_id_hash: "must-not-return",
        },
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        status: "approved",
        action_status: "approved",
        action_type: "send_document",
        local_snapshot_used: true,
        mutation_count: 0,
        final_execution: 0,
        persisted: false,
        provider_called: false,
        db_accessed: false,
        raw_payload_exposed: false,
        direct_execution_enabled: false,
      },
    });
    if (!result.ok) throw new Error("expected get_action_status success");
    expect(result.data.evidence_refs).toHaveLength(GET_ACTION_STATUS_MAX_EVIDENCE_REFS);
    expect(result.data.evidence_refs[0]).toBe("action_status:local:snapshot");
    expect(JSON.stringify(result.data)).not.toContain("must-not-return");
    expect(JSON.stringify(result.data)).not.toContain("idempotency_key");
    expect(JSON.stringify(result.data)).not.toContain("requested_by_user_id_hash");
  });

  it("does not claim a persisted lookup or action execution for any status", async () => {
    for (const action_status of ["draft", "pending", "approved", "rejected", "executed", "expired", "blocked"] as const) {
      const actionId = `ai:status:${action_status}`;
      const result = await runGetActionStatusToolSafeRead({
        auth: { userId: "director-user", role: "director" },
        input: {
          action_id: actionId,
          status_snapshot: {
            action_id: actionId,
            action_status,
            action_type: "submit_request",
            screen_id: "director.dashboard",
            domain: "control",
            evidence_refs: ["action_status:test:snapshot"],
          },
        },
      });

      expect(result).toMatchObject({
        ok: true,
        data: {
          lookup_performed: false,
          local_snapshot_used: true,
          persisted: false,
          mutation_count: 0,
          final_execution: 0,
          provider_called: false,
          db_accessed: false,
          direct_execution_enabled: false,
        },
      });
    }
  });
});
