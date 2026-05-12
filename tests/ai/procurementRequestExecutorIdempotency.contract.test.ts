import { executeApprovedActionGateway } from "../../src/features/ai/executors/executeApprovedActionGateway";
import { createContractTestActionLedgerBackend } from "./aiActionLedgerTestBackend";
import {
  createApprovedProcurementAction,
  createCountingProcurementExecutor,
  EXECUTOR_IDEMPOTENCY_KEY,
  EXECUTOR_NOW,
} from "./approvedProcurementExecutorTestUtils";

describe("procurementRequestExecutor idempotency contract", () => {
  it("requires the approved action idempotency key", async () => {
    const { backend, records } = createContractTestActionLedgerBackend();
    const record = createApprovedProcurementAction();
    records.set(record.actionId, record);

    const result = await executeApprovedActionGateway({
      backend,
      request: {
        actionId: record.actionId,
        idempotencyKey: "wrong-idempotency-key-0001",
        requestedByRole: "director",
        screenId: "agent.action.execute-approved",
      },
      executors: { procurement: createCountingProcurementExecutor().executor },
      nowIso: EXECUTOR_NOW,
    });

    expect(result.status).toBe("blocked");
    expect(result.blocker).toBe("BLOCKED_APPROVAL_ACTION_IDEMPOTENCY_REQUIRED");
  });

  it("returns already_executed for the same action and idempotency key", async () => {
    const { backend, records } = createContractTestActionLedgerBackend();
    const record = createApprovedProcurementAction({ status: "executed", executedAt: EXECUTOR_NOW });
    records.set(record.actionId, record);

    const result = await executeApprovedActionGateway({
      backend,
      request: {
        actionId: record.actionId,
        idempotencyKey: EXECUTOR_IDEMPOTENCY_KEY,
        requestedByRole: "director",
        screenId: "agent.action.execute-approved",
      },
      executors: { procurement: createCountingProcurementExecutor().executor },
      nowIso: EXECUTOR_NOW,
    });

    expect(result.status).toBe("already_executed");
    expect(result.duplicateExecutionCreatesDuplicate).toBe(false);
    expect(result.createdEntityRef).toEqual({ entityType: "request", entityIdHash: "request:approved-executor-1" });
  });
});
