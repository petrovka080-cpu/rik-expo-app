import type { AiActionLedgerRecord } from "../../src/features/ai/actionLedger/aiActionLedgerTypes";
import type { AiActionLedgerRepository } from "../../src/features/ai/actionLedger/aiActionLedgerRepository";
import { runGetActionStatusToolSafeRead } from "../../src/features/ai/tools/getActionStatusTool";

const actionId = "22222222-2222-4222-8222-222222222222";
const record: AiActionLedgerRecord = {
  actionId,
  actionType: "draft_request",
  status: "approved",
  riskLevel: "draft_only",
  role: "director",
  screenId: "ai.command.center",
  domain: "procurement",
  summary: "Approved persisted procurement draft",
  redactedPayload: { title: "Approved persisted ledger contract" },
  evidenceRefs: ["evidence:status:persisted-ledger"],
  idempotencyKey: "status-persisted-ledger-0001",
  requestedByUserIdHash: "user:director",
  organizationIdHash: "org:persisted",
  approvedByUserIdHash: "user:director",
  createdAt: "2026-05-13T00:00:00.000Z",
  expiresAt: "2035-01-01T00:00:00.000Z",
};

describe("get_action_status persisted ledger contract", () => {
  it("performs a persisted lookup and does not fall back to local fake status", async () => {
    const repository: AiActionLedgerRepository = {
      async submitForApproval() {
        throw new Error("not used");
      },
      async getStatus(requestedActionId) {
        return {
          status: "approved",
          actionId: requestedActionId,
          persistedLookup: true,
          persistentBackend: true,
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
      async approve() {
        throw new Error("not used");
      },
      async reject() {
        throw new Error("not used");
      },
    };

    await expect(
      runGetActionStatusToolSafeRead({
        auth: { userId: "director-user", role: "director" },
        repository,
        input: { action_id: actionId },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        action_id: actionId,
        action_status: "approved",
        lookup_performed: true,
        local_snapshot_used: false,
        persisted: true,
        db_accessed: true,
        final_execution: 0,
      },
    });
  });
});
