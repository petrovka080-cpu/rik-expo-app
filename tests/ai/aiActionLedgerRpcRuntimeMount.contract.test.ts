import {
  createAiActionLedgerRuntimeMount,
  AI_ACTION_LEDGER_RUNTIME_MOUNT_CONTRACT,
} from "../../src/features/ai/actionLedger/aiActionLedgerRuntimeMount";
import { AI_ACTION_LEDGER_RPC_FUNCTIONS } from "../../src/features/ai/actionLedger/aiActionLedgerRpcTypes";
import type { AiActionLedgerRpcTransport } from "../../src/features/ai/actionLedger/aiActionLedgerRpcTypes";

const organizationId = "11111111-1111-4111-8111-111111111111";
const actionId = "22222222-2222-4222-8222-222222222222";

function rpcRecord(status: "pending" | "approved" = "pending") {
  return {
    actionId,
    actionType: "draft_request",
    status,
    riskLevel: "draft_only",
    role: "buyer",
    screenId: "buyer.main",
    domain: "procurement",
    summary: "Submit draft request for approval",
    redactedPayload: { draftHash: "draft:runtime:1" },
    evidenceRefs: ["draft:evidence:runtime:1"],
    idempotencyKey: "runtime-idempotency-0001",
    requestedByUserIdHash: "user:runtime",
    organizationIdHash: "org:runtime",
    createdAt: "2026-05-13T10:00:00.000Z",
    expiresAt: "2026-05-14T10:00:00.000Z",
  };
}

describe("AI action ledger RPC runtime mount", () => {
  it("mounts submit/status/approve/reject/execute through server-side RPC contracts", async () => {
    const calls: string[] = [];
    const transport: AiActionLedgerRpcTransport = async (fn) => {
      calls.push(fn);
      if (fn === AI_ACTION_LEDGER_RPC_FUNCTIONS.findByIdempotencyKey) {
        return { data: { status: "not_found", finalExecution: false }, error: null };
      }
      if (fn === AI_ACTION_LEDGER_RPC_FUNCTIONS.submitForApproval) {
        return { data: rpcRecord("pending"), error: null };
      }
      if (fn === AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus) {
        return { data: rpcRecord("pending"), error: null };
      }
      if (fn === AI_ACTION_LEDGER_RPC_FUNCTIONS.approve) {
        return { data: rpcRecord("approved"), error: null };
      }
      if (fn === AI_ACTION_LEDGER_RPC_FUNCTIONS.reject) {
        return { data: { ...rpcRecord("pending"), status: "rejected" }, error: null };
      }
      return { data: null, error: { message: `unexpected ${fn}` } };
    };
    const mount = createAiActionLedgerRuntimeMount({
      auth: { userId: "director-user", role: "director" },
      organizationId,
      transport,
    });

    expect(mount.contract).toBe(AI_ACTION_LEDGER_RUNTIME_MOUNT_CONTRACT);
    await expect(
      mount.submitForApproval({
        actionType: "draft_request",
        screenId: "buyer.main",
        domain: "procurement",
        summary: "Submit draft request for approval",
        redactedPayload: { draftHash: "draft:runtime:1" },
        evidenceRefs: ["draft:evidence:runtime:1"],
        idempotencyKey: "runtime-idempotency-0001",
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        result: {
          status: "pending",
          persistentBackend: true,
          fakeLocalApproval: false,
          finalExecution: false,
        },
      },
    });
    await expect(mount.getStatus(actionId)).resolves.toMatchObject({ ok: true });
    await expect(mount.approve(actionId, "approved in test")).resolves.toMatchObject({
      ok: true,
      data: { result: { status: "approved" } },
    });
    expect(calls).toEqual([
      AI_ACTION_LEDGER_RPC_FUNCTIONS.findByIdempotencyKey,
      AI_ACTION_LEDGER_RPC_FUNCTIONS.submitForApproval,
      AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus,
      AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus,
      AI_ACTION_LEDGER_RPC_FUNCTIONS.approve,
    ]);
  });

  it("blocks unauthenticated runtime mount before repository access", async () => {
    const mount = createAiActionLedgerRuntimeMount({
      auth: null,
      organizationId,
    });

    await expect(mount.getStatus(actionId)).resolves.toMatchObject({
      ok: false,
      error: { code: "AI_ACTION_LEDGER_AUTH_REQUIRED" },
    });
  });
});
