import {
  createAiActionLedgerRuntimeMount,
} from "../../src/features/ai/actionLedger/aiActionLedgerRuntimeMount";
import { AI_ACTION_LEDGER_RPC_FUNCTIONS } from "../../src/features/ai/actionLedger/aiActionLedgerRpcTypes";
import type { AiActionLedgerRpcTransport } from "../../src/features/ai/actionLedger/aiActionLedgerRpcTypes";
import {
  createCountingProcurementExecutor,
  EXECUTOR_CREATED_REF,
} from "./approvedProcurementExecutorTestUtils";

const organizationId = "33333333-3333-4333-8333-333333333333";
const actionId = "44444444-4444-4444-8444-444444444444";
const idempotencyKey = "execute-approved-ledger-lifecycle-0001";

function record(status: "approved" | "executed") {
  return {
    actionId,
    actionType: "draft_request",
    status,
    riskLevel: "draft_only",
    role: "director",
    screenId: "ai.command.center",
    domain: "procurement",
    summary: "Execute approved persisted draft",
    redactedPayload: {
      title: "Execute approved persisted draft",
      items: [
        {
          materialLabel: "Concrete B25",
          quantity: 1,
          unit: "m3",
          rikCode: "CONCRETE-B25",
        },
      ],
      ...(status === "executed" ? { createdEntityRef: EXECUTOR_CREATED_REF } : {}),
    },
    evidenceRefs: ["evidence:execute:persisted-ledger"],
    idempotencyKey,
    requestedByUserIdHash: "user:director",
    organizationIdHash: "org:persisted",
    approvedByUserIdHash: "user:director",
    createdAt: "2026-05-13T00:00:00.000Z",
    expiresAt: "2035-01-01T00:00:00.000Z",
    executedAt: status === "executed" ? "2026-05-13T00:05:00.000Z" : undefined,
  };
}

describe("execute_approved persisted ledger lifecycle", () => {
  it("executes through central gateway and replays idempotently without duplicate executor calls", async () => {
    let status: "approved" | "executed" = "approved";
    const rpcCalls: string[] = [];
    const transport: AiActionLedgerRpcTransport = async (fn) => {
      rpcCalls.push(fn);
      if (fn === AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus) {
        return { data: record(status), error: null };
      }
      if (fn === AI_ACTION_LEDGER_RPC_FUNCTIONS.executeApproved) {
        status = "executed";
        return { data: record(status), error: null };
      }
      return { data: null, error: { message: `unexpected ${fn}` } };
    };
    const { executor, calls } = createCountingProcurementExecutor();
    const mount = createAiActionLedgerRuntimeMount({
      auth: { userId: "director-user", role: "director" },
      organizationId,
      transport,
      executeApprovedStatusTransitionMounted: true,
      procurementExecutor: executor,
    });

    const executed = await mount.executeApproved(actionId, idempotencyKey);
    const replay = await mount.executeApproved(actionId, idempotencyKey);

    expect(executed).toMatchObject({
      ok: true,
      data: {
        result: {
          status: "executed",
          createdEntityRef: EXECUTOR_CREATED_REF,
          duplicateExecutionCreatesDuplicate: false,
          directMutationFromUi: false,
          directSupabaseFromUi: false,
        },
      },
    });
    expect(replay).toMatchObject({
      ok: true,
      data: {
        result: {
          status: "already_executed",
          duplicateExecutionCreatesDuplicate: false,
        },
      },
    });
    expect(calls).toHaveLength(1);
    expect(rpcCalls).toEqual([
      AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus,
      AI_ACTION_LEDGER_RPC_FUNCTIONS.executeApproved,
      AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus,
    ]);
  });
});
