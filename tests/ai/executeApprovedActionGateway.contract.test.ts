import { executeApprovedActionGateway } from "../../src/features/ai/executors/executeApprovedActionGateway";
import { createContractTestActionLedgerBackend } from "./aiActionLedgerTestBackend";
import {
  createApprovedProcurementAction,
  createCountingProcurementExecutor,
  EXECUTOR_IDEMPOTENCY_KEY,
  EXECUTOR_NOW,
} from "./approvedProcurementExecutorTestUtils";

describe("executeApprovedActionGateway contract", () => {
  it("blocks pending, rejected, expired, blocked, and forbidden actions", async () => {
    for (const record of [
      createApprovedProcurementAction({ actionId: "pending", status: "pending" }),
      createApprovedProcurementAction({ actionId: "rejected", status: "rejected" }),
      createApprovedProcurementAction({ actionId: "expired", status: "expired" }),
      createApprovedProcurementAction({ actionId: "blocked", status: "blocked" }),
      createApprovedProcurementAction({
        actionId: "forbidden",
        actionType: "create_order",
        riskLevel: "approval_required",
      }),
    ]) {
      const { backend, records } = createContractTestActionLedgerBackend();
      records.set(record.actionId, record);

      const result = await executeApprovedActionGateway({
        backend,
        request: {
          actionId: record.actionId,
          idempotencyKey: record.idempotencyKey,
          requestedByRole: "director",
          screenId: "agent.action.execute-approved",
        },
        executors: { procurement: createCountingProcurementExecutor().executor },
        nowIso: EXECUTOR_NOW,
      });

      expect(result.status).toBe("blocked");
      expect(result.directMutationFromUi).toBe(false);
      expect(result.rawDbRowsExposed).toBe(false);
    }
  });

  it("executes an approved procurement action only through the central gate", async () => {
    const { backend, records } = createContractTestActionLedgerBackend();
    const record = createApprovedProcurementAction();
    records.set(record.actionId, record);
    const { executor, calls } = createCountingProcurementExecutor();

    const result = await executeApprovedActionGateway({
      backend,
      request: {
        actionId: record.actionId,
        idempotencyKey: EXECUTOR_IDEMPOTENCY_KEY,
        requestedByRole: "director",
        screenId: "agent.action.execute-approved",
      },
      executors: { procurement: executor },
      nowIso: EXECUTOR_NOW,
    });

    expect(result).toMatchObject({
      status: "executed",
      actionId: record.actionId,
      directMutationFromUi: false,
      directSupabaseFromUi: false,
      duplicateExecutionCreatesDuplicate: false,
    });
    expect(result.createdEntityRef).toEqual({ entityType: "request", entityIdHash: "request:approved-executor-1" });
    expect(records.get(record.actionId)?.status).toBe("executed");
    expect(calls).toHaveLength(1);
  });

  it("returns an exact blocker when the procurement BFF mutation boundary is not mounted", async () => {
    const { backend, records } = createContractTestActionLedgerBackend();
    const record = createApprovedProcurementAction();
    records.set(record.actionId, record);

    const result = await executeApprovedActionGateway({
      backend,
      request: {
        actionId: record.actionId,
        idempotencyKey: record.idempotencyKey,
        requestedByRole: "director",
        screenId: "agent.action.execute-approved",
      },
      executors: { procurement: null },
      nowIso: EXECUTOR_NOW,
    });

    expect(result.status).toBe("domain_executor_not_ready");
    expect(result.blocker).toBe("BLOCKED_PROCUREMENT_BFF_MUTATION_BOUNDARY_NOT_FOUND");
    expect(records.get(record.actionId)?.status).toBe("approved");
  });
});
