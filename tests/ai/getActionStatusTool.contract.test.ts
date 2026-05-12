import { readFileSync } from "fs";
import { join } from "path";
import {
  getActionStatusInputSchema,
  getActionStatusOutputSchema,
} from "../../src/features/ai/schemas/aiToolSchemas";
import {
  GET_ACTION_STATUS_AUDIT_EVENT,
  GET_ACTION_STATUS_ROUTE_OPERATION,
  runGetActionStatusToolSafeRead,
} from "../../src/features/ai/tools/getActionStatusTool";

const sourcePath = "src/features/ai/tools/getActionStatusTool.ts";
const directorAuth = { userId: "director-user", role: "director" } as const;
const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;
const contractorAuth = { userId: "contractor-user", role: "contractor" } as const;

describe("get_action_status safe-read tool", () => {
  it("keeps the permanent schema on snake_case redacted status inputs and no-execution output", () => {
    expect(getActionStatusInputSchema).toMatchObject({
      type: "object",
      required: ["action_id"],
      additionalProperties: false,
    });
    expect(getActionStatusInputSchema.properties).toHaveProperty("action_id");
    expect(getActionStatusInputSchema.properties).toHaveProperty("status_snapshot");
    expect(getActionStatusInputSchema.properties).not.toHaveProperty("actionId");
    expect(getActionStatusInputSchema.properties).not.toHaveProperty("raw_payload");
    expect(getActionStatusInputSchema.properties).not.toHaveProperty("prompt");

    expect(getActionStatusOutputSchema.required).toEqual([
      "action_id",
      "status",
      "action_status",
      "action_type",
      "screen_id",
      "domain",
      "evidence_refs",
      "route_operation",
      "audit_event",
      "lookup_performed",
      "local_snapshot_used",
      "persisted",
      "mutation_count",
      "final_execution",
      "provider_called",
      "db_accessed",
      "raw_payload_exposed",
      "direct_execution_enabled",
    ]);
    expect(getActionStatusOutputSchema.properties).toMatchObject({
      status: expect.objectContaining({
        enum: ["not_found", "draft", "approval_required", "approved", "rejected", "executed", "expired", "blocked"],
      }),
      route_operation: expect.objectContaining({ enum: [GET_ACTION_STATUS_ROUTE_OPERATION] }),
      audit_event: expect.objectContaining({ enum: [GET_ACTION_STATUS_AUDIT_EVENT] }),
      mutation_count: expect.objectContaining({ minimum: 0, maximum: 0 }),
      final_execution: expect.objectContaining({ minimum: 0, maximum: 0 }),
    });
    expect(getActionStatusOutputSchema.properties).not.toHaveProperty("evidenceRefs");
  });

  it("maps a local pending approval snapshot to approval_required without executing anything", async () => {
    const actionId = "ai:submit_request:buyer.main:buyer:approval-0001";
    const result = await runGetActionStatusToolSafeRead({
      auth: buyerAuth,
      input: {
        action_id: actionId,
        status_snapshot: {
          action_id: actionId,
          action_status: "pending",
          action_type: "submit_request",
          screen_id: "buyer.main",
          domain: "procurement",
          evidence_refs: ["draft_request:input:project", "draft_request:source:materials"],
        },
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        action_id: actionId,
        status: "approval_required",
        action_status: "pending",
        action_type: "submit_request",
        screen_id: "buyer.main",
        domain: "procurement",
        route_operation: GET_ACTION_STATUS_ROUTE_OPERATION,
        audit_event: GET_ACTION_STATUS_AUDIT_EVENT,
        lookup_performed: false,
        local_snapshot_used: true,
        persisted: false,
        mutation_count: 0,
        final_execution: 0,
        provider_called: false,
        db_accessed: false,
        raw_payload_exposed: false,
        direct_execution_enabled: false,
      },
    });
    if (!result.ok) throw new Error("expected get_action_status success");
    expect(result.data.evidence_refs).toEqual([
      "action_status:local:snapshot",
      "draft_request:input:project",
      "draft_request:source:materials",
    ]);
  });

  it("returns an honest local not_found status when no persisted status contract exists", async () => {
    const result = await runGetActionStatusToolSafeRead({
      auth: directorAuth,
      input: { action_id: "missing-action-1" },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        action_id: "missing-action-1",
        status: "not_found",
        action_status: "not_found",
        action_type: "unknown",
        screen_id: "unknown",
        domain: "unknown",
        evidence_refs: ["action_status:local:no_persisted_lookup"],
        lookup_performed: false,
        local_snapshot_used: false,
        persisted: false,
        mutation_count: 0,
        final_execution: 0,
        provider_called: false,
        db_accessed: false,
      },
    });
  });

  it("fails closed on auth, invalid input, mismatched snapshots, and role scope leakage", async () => {
    await expect(runGetActionStatusToolSafeRead({ auth: null, input: { action_id: "a-1" } })).resolves.toMatchObject({
      ok: false,
      error: { code: "GET_ACTION_STATUS_AUTH_REQUIRED" },
    });
    await expect(runGetActionStatusToolSafeRead({ auth: directorAuth, input: {} })).resolves.toMatchObject({
      ok: false,
      error: { code: "GET_ACTION_STATUS_INVALID_INPUT" },
    });
    await expect(
      runGetActionStatusToolSafeRead({
        auth: directorAuth,
        input: {
          action_id: "a-1",
          status_snapshot: { action_id: "a-2", action_status: "pending" },
        },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "GET_ACTION_STATUS_INVALID_INPUT" },
    });
    await expect(
      runGetActionStatusToolSafeRead({
        auth: contractorAuth,
        input: {
          action_id: "finance-action-1",
          status_snapshot: {
            action_id: "finance-action-1",
            action_status: "pending",
            action_type: "change_payment_status",
            screen_id: "accountant.main",
            domain: "finance",
            evidence_refs: ["finance:summary:redacted"],
          },
        },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "GET_ACTION_STATUS_SCOPE_DENIED" },
    });
  });

  it("contains no direct database, provider, raw payload, or execution boundary", () => {
    const source = readFileSync(join(process.cwd(), sourcePath), "utf8");
    expect(source).not.toMatch(/@supabase\/supabase-js|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i);
    expect(source).not.toMatch(/\.(?:from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(source).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b/);
    expect(source).not.toMatch(/openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider|assistantClient/i);
    expect(source).not.toMatch(/canExecuteAiApprovedAction|executeApproved|approveAction|toolExecutor|invokeTool/i);
    expect(source).not.toMatch(/redactedPayload|rawPrompt|providerPayload|contextPayload/i);
  });
});
