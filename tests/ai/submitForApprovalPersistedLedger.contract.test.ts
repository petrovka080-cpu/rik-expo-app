import type { AiActionLedgerRecord } from "../../src/features/ai/actionLedger/aiActionLedgerTypes";
import type { AiActionLedgerRepository } from "../../src/features/ai/actionLedger/aiActionLedgerRepository";
import { runSubmitForApprovalToolGate } from "../../src/features/ai/tools/submitForApprovalTool";

const record: AiActionLedgerRecord = {
  actionId: "11111111-1111-4111-8111-111111111111",
  actionType: "submit_request",
  status: "pending",
  riskLevel: "approval_required",
  role: "director",
  screenId: "ai.command.center",
  domain: "procurement",
  summary: "Submit persisted procurement draft",
  redactedPayload: { title: "Persisted ledger contract" },
  evidenceRefs: ["evidence:submit:persisted-ledger"],
  idempotencyKey: "submit-persisted-ledger-0001",
  requestedByUserIdHash: "user:director",
  organizationIdHash: "org:persisted",
  createdAt: "2026-05-13T00:00:00.000Z",
  expiresAt: "2035-01-01T00:00:00.000Z",
};

describe("submit_for_approval persisted ledger contract", () => {
  it("returns persisted pending output from the mounted ledger repository", async () => {
    const repository: AiActionLedgerRepository = {
      async submitForApproval() {
        return {
          status: "pending",
          actionId: record.actionId,
          requiresApproval: true,
          persisted: true,
          persistentBackend: true,
          idempotencyReused: false,
          fakeLocalApproval: false,
          finalExecution: false,
          directDomainMutation: false,
          rawDbRowsExposed: false,
          rawPromptExposed: false,
          rawProviderPayloadStored: false,
          credentialsPrinted: false,
          auditEvents: [],
          record,
        };
      },
      async getStatus() {
        throw new Error("not used");
      },
      async approve() {
        throw new Error("not used");
      },
      async reject() {
        throw new Error("not used");
      },
    };

    await expect(
      runSubmitForApprovalToolGate({
        auth: { userId: "director-user", role: "director" },
        organizationId: "22222222-2222-4222-8222-222222222222",
        repository,
        input: {
          draft_id: "draft:persisted-ledger",
          approval_target: "request",
          screen_id: "ai.command.center",
          domain: "procurement",
          summary: "Submit persisted procurement draft",
          idempotency_key: "submit-persisted-ledger-0001",
          evidence_refs: ["evidence:submit:persisted-ledger"],
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        action_id: record.actionId,
        action_status: "pending",
        persisted: true,
        local_gate_only: false,
        db_accessed: true,
        final_execution: 0,
        direct_execution_enabled: false,
      },
    });
  });
});
