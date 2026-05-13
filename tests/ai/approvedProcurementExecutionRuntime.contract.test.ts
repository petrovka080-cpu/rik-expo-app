import {
  createAiActionLedgerRuntimeMount,
} from "../../src/features/ai/actionLedger/aiActionLedgerRuntimeMount";
import { AI_ACTION_LEDGER_RPC_FUNCTIONS } from "../../src/features/ai/actionLedger/aiActionLedgerRpcTypes";
import type { AiActionLedgerRpcTransport } from "../../src/features/ai/actionLedger/aiActionLedgerRpcTypes";
import {
  createCountingProcurementExecutor,
  EXECUTOR_CREATED_REF,
} from "./approvedProcurementExecutorTestUtils";

const organizationId = "11111111-1111-4111-8111-111111111111";
const actionId = "33333333-3333-4333-8333-333333333333";
const idempotencyKey = "approved-procurement-execution-0001";

function ledgerRecord(status: "pending" | "approved" | "executed") {
  return {
    actionId,
    actionType: "submit_request",
    status,
    riskLevel: "approval_required",
    role: "buyer",
    screenId: "buyer.procurement",
    domain: "procurement",
    summary: "Submit approved procurement request",
    redactedPayload: {
      title: "Approved procurement execution request",
      items: [
        {
          materialLabel: "Concrete B25",
          quantity: 12,
          unit: "m3",
          rikCode: "CONCRETE-B25",
        },
      ],
      ...(status === "executed" ? { createdEntityRef: EXECUTOR_CREATED_REF } : {}),
    },
    evidenceRefs: ["evidence:procurement:execution:1"],
    idempotencyKey,
    requestedByUserIdHash: "user:buyer:execution",
    organizationIdHash: "org:execution",
    createdAt: "2026-05-13T10:00:00.000Z",
    expiresAt: "2035-01-01T00:00:00.000Z",
    approvedByUserIdHash: status === "pending" ? undefined : "user:director:execution",
    executedAt: status === "executed" ? "2026-05-13T10:05:00.000Z" : undefined,
  };
}

describe("approved procurement execution runtime", () => {
  it("runs submit, pending status, approve, execute-approved, and persisted executed status through bounded runtime mount", async () => {
    let status: "pending" | "approved" | "executed" = "pending";
    const rpcCalls: string[] = [];
    const transport: AiActionLedgerRpcTransport = async (fn) => {
      rpcCalls.push(fn);
      if (fn === AI_ACTION_LEDGER_RPC_FUNCTIONS.findByIdempotencyKey) {
        return { data: { status: "not_found", finalExecution: false }, error: null };
      }
      if (fn === AI_ACTION_LEDGER_RPC_FUNCTIONS.submitForApproval) {
        status = "pending";
        return { data: ledgerRecord(status), error: null };
      }
      if (fn === AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus) {
        return { data: ledgerRecord(status), error: null };
      }
      if (fn === AI_ACTION_LEDGER_RPC_FUNCTIONS.approve) {
        status = "approved";
        return { data: ledgerRecord(status), error: null };
      }
      if (fn === AI_ACTION_LEDGER_RPC_FUNCTIONS.executeApproved) {
        status = "executed";
        return { data: ledgerRecord(status), error: null };
      }
      return { data: null, error: { message: `unexpected rpc ${fn}` } };
    };
    const buyerMount = createAiActionLedgerRuntimeMount({
      auth: { userId: "buyer-user", role: "buyer" },
      organizationId,
      transport,
    });
    const { executor, calls } = createCountingProcurementExecutor();
    const directorMount = createAiActionLedgerRuntimeMount({
      auth: { userId: "director-user", role: "director" },
      organizationId,
      transport,
      executeApprovedStatusTransitionMounted: true,
      procurementExecutor: executor,
    });

    const submitted = await buyerMount.submitForApproval({
      actionType: "submit_request",
      screenId: "buyer.procurement",
      domain: "procurement",
      summary: "Submit approved procurement request",
      redactedPayload: ledgerRecord("pending").redactedPayload,
      evidenceRefs: ["evidence:procurement:execution:1"],
      idempotencyKey,
    });
    const pending = await directorMount.getStatus(actionId);
    const approved = await directorMount.approve(actionId, "approved by director");
    const executed = await directorMount.executeApproved(actionId, idempotencyKey);

    expect(submitted).toMatchObject({
      ok: true,
      data: { result: { status: "pending", persisted: true, finalExecution: false } },
    });
    expect(pending).toMatchObject({ ok: true, data: { result: { status: "pending" } } });
    expect(approved).toMatchObject({ ok: true, data: { result: { status: "approved" } } });
    expect(executed).toMatchObject({
      ok: true,
      data: {
        result: {
          status: "executed",
          createdEntityRef: EXECUTOR_CREATED_REF,
          duplicateExecutionCreatesDuplicate: false,
          directDomainMutation: false,
          directMutationFromUi: false,
          directSupabaseFromUi: false,
        },
      },
    });
    expect(calls).toHaveLength(1);
    expect(rpcCalls).toEqual([
      AI_ACTION_LEDGER_RPC_FUNCTIONS.findByIdempotencyKey,
      AI_ACTION_LEDGER_RPC_FUNCTIONS.submitForApproval,
      AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus,
      AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus,
      AI_ACTION_LEDGER_RPC_FUNCTIONS.approve,
      AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus,
      AI_ACTION_LEDGER_RPC_FUNCTIONS.executeApproved,
    ]);
  });
});
