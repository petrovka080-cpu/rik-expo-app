import { createAiActionLedgerRepository } from "../../src/features/ai/actionLedger/aiActionLedgerRepository";
import {
  createAiActionLedgerRpcBackend,
  resolveAiActionLedgerRpcBackendReadiness,
} from "../../src/features/ai/actionLedger/aiActionLedgerRpcBackend";
import { AI_ACTION_LEDGER_RPC_FUNCTIONS } from "../../src/features/ai/actionLedger/aiActionLedgerRpcTypes";
import type { AiActionLedgerRpcTransport } from "../../src/features/ai/actionLedger/aiActionLedgerRpcTypes";

const organizationId = "11111111-1111-4111-8111-111111111111";
const actionId = "22222222-2222-4222-8222-222222222222";
const organizationIdHash = "org:rpc-safe";
const requestedByUserIdHash = "user:rpc-safe";

const pendingInput = {
  actionType: "draft_request" as const,
  screenId: "buyer.main",
  domain: "procurement" as const,
  summary: "Submit draft request for approval",
  redactedPayload: { draftHash: "draft:rpc:1" },
  evidenceRefs: ["draft:evidence:rpc:1"],
  idempotencyKey: "rpc-ledger-idempotency-0001",
  requestedByUserIdHash,
  organizationIdHash,
};

function buildRpcRecord(overrides: Record<string, unknown> = {}) {
  return {
    actionId,
    actionType: "draft_request",
    status: "pending",
    riskLevel: "draft_only",
    role: "buyer",
    screenId: "buyer.main",
    domain: "procurement",
    summary: "Submit draft request for approval",
    redactedPayload: { draftHash: "draft:rpc:1" },
    evidenceRefs: ["draft:evidence:rpc:1"],
    idempotencyKey: "rpc-ledger-idempotency-0001",
    requestedByUserIdHash,
    organizationIdHash,
    createdAt: "2026-05-13T10:00:00.000Z",
    expiresAt: "2026-05-14T10:00:00.000Z",
    finalExecution: false,
    ...overrides,
  };
}

function createRpcBackend(transport: AiActionLedgerRpcTransport) {
  const backend = createAiActionLedgerRpcBackend({
    organizationId,
    organizationIdHash,
    actorUserId: "buyer-user",
    actorUserIdHash: requestedByUserIdHash,
    actorRole: "buyer",
    transport,
  });
  if (!backend) throw new Error("expected RPC backend to be ready");
  return backend;
}

describe("AI action ledger RPC backend contract", () => {
  it("requires server-resolved organization, actor, and role scope", () => {
    expect(
      resolveAiActionLedgerRpcBackendReadiness({
        organizationId: "not-a-uuid",
        actorUserId: "buyer-user",
        actorRole: "buyer",
      }),
    ).toMatchObject({
      ready: false,
      mounted: false,
      blocker: "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
      rawIdsExposed: false,
      finalExecution: false,
    });
  });

  it("persists pending actions through backend-owned RPCs without exposing raw IDs", async () => {
    const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
    const transport: AiActionLedgerRpcTransport = async (fn, args) => {
      calls.push({ fn, args });
      if (fn === AI_ACTION_LEDGER_RPC_FUNCTIONS.findByIdempotencyKey) {
        return { data: { status: "not_found", finalExecution: false }, error: null };
      }
      if (fn === AI_ACTION_LEDGER_RPC_FUNCTIONS.submitForApproval) {
        return { data: buildRpcRecord(), error: null };
      }
      return { data: null, error: { message: `unexpected rpc ${fn}` } };
    };

    const result = await createAiActionLedgerRepository(createRpcBackend(transport)).submitForApproval(
      pendingInput,
      "buyer",
    );

    expect(result).toMatchObject({
      status: "pending",
      persisted: true,
      persistentBackend: true,
      fakeLocalApproval: false,
      finalExecution: false,
      actionId,
      record: {
        actionId,
        requestedByUserIdHash,
        organizationIdHash,
      },
    });
    expect(calls.map((call) => call.fn)).toEqual([
      AI_ACTION_LEDGER_RPC_FUNCTIONS.findByIdempotencyKey,
      AI_ACTION_LEDGER_RPC_FUNCTIONS.submitForApproval,
    ]);
    expect(calls[1]?.args).toMatchObject({
      p_organization_id: organizationId,
      p_requested_by_user_id_hash: requestedByUserIdHash,
      p_organization_id_hash: organizationIdHash,
    });
    expect(JSON.stringify(result.record)).not.toContain(organizationId);
  });

  it("returns the exact migration blocker when RPC write migration is not approved", async () => {
    const transport: AiActionLedgerRpcTransport = async () => ({
      data: {
        status: "blocked",
        blocker: "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED",
        reason: "AI action ledger write RPC is still a contract stub.",
        finalExecution: false,
      },
      error: null,
    });

    await expect(
      createAiActionLedgerRepository(createRpcBackend(transport)).submitForApproval(
        pendingInput,
        "buyer",
      ),
    ).resolves.toMatchObject({
      status: "blocked",
      blocker: "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED",
      persisted: false,
      fakeLocalApproval: false,
      finalExecution: false,
    });
  });

  it("lists bounded approval records through the persistent RPC backend", async () => {
    const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
    const transport: AiActionLedgerRpcTransport = async (fn, args) => {
      calls.push({ fn, args });
      return {
        data: {
          status: "loaded",
          records: [buildRpcRecord()],
          nextCursor: "20",
          finalExecution: false,
        },
        error: null,
      };
    };

    const page = await createRpcBackend(transport).listByOrganization(organizationIdHash, {
      limit: 99,
      cursor: null,
    });

    expect(page).toMatchObject({
      nextCursor: "20",
      records: [
        {
          actionId,
          evidenceRefs: ["draft:evidence:rpc:1"],
          organizationIdHash,
        },
      ],
    });
    expect(calls[0]).toMatchObject({
      fn: AI_ACTION_LEDGER_RPC_FUNCTIONS.listByOrganization,
      args: {
        p_limit: 20,
        p_offset: 0,
        p_actor_role: "buyer",
      },
    });
  });
});
