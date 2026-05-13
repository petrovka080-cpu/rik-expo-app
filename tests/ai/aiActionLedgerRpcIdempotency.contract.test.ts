import { createAiActionLedgerRuntimeMount } from "../../src/features/ai/actionLedger/aiActionLedgerRuntimeMount";
import { AI_ACTION_LEDGER_RPC_FUNCTIONS } from "../../src/features/ai/actionLedger/aiActionLedgerRpcTypes";
import type { AiActionLedgerRpcTransport } from "../../src/features/ai/actionLedger/aiActionLedgerRpcTypes";

describe("AI action ledger RPC idempotency", () => {
  it("reuses existing pending action when the idempotency key already exists", async () => {
    const actionId = "22222222-2222-4222-8222-222222222222";
    const transport: AiActionLedgerRpcTransport = async (fn) => {
      if (fn === AI_ACTION_LEDGER_RPC_FUNCTIONS.findByIdempotencyKey) {
        return {
          data: {
            actionId,
            actionType: "draft_request",
            status: "pending",
            riskLevel: "draft_only",
            role: "buyer",
            screenId: "buyer.main",
            domain: "procurement",
            summary: "Existing action",
            redactedPayload: {},
            evidenceRefs: ["draft:evidence:runtime:1"],
            idempotencyKey: "runtime-idempotency-0001",
            requestedByUserIdHash: "user:runtime",
            organizationIdHash: "org:runtime",
            createdAt: "2026-05-13T10:00:00.000Z",
            expiresAt: "2026-05-14T10:00:00.000Z",
          },
          error: null,
        };
      }
      return { data: null, error: { message: "submit should not be called" } };
    };
    const mount = createAiActionLedgerRuntimeMount({
      auth: { userId: "buyer-user", role: "buyer" },
      organizationId: "11111111-1111-4111-8111-111111111111",
      transport,
    });

    await expect(
      mount.submitForApproval({
        actionType: "draft_request",
        screenId: "buyer.main",
        domain: "procurement",
        summary: "Submit draft request for approval",
        redactedPayload: {},
        evidenceRefs: ["draft:evidence:runtime:1"],
        idempotencyKey: "runtime-idempotency-0001",
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        result: {
          actionId,
          idempotencyReused: true,
          finalExecution: false,
        },
      },
    });
  });
});
