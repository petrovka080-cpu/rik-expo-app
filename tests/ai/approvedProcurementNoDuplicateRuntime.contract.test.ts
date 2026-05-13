import { executeApprovedActionGateway } from "../../src/features/ai/executors/executeApprovedActionGateway";
import { createContractTestActionLedgerBackend } from "./aiActionLedgerTestBackend";
import {
  createApprovedProcurementAction,
  createCountingProcurementExecutor,
  EXECUTOR_IDEMPOTENCY_KEY,
  EXECUTOR_NOW,
} from "./approvedProcurementExecutorTestUtils";

describe("approved procurement execution no duplicate runtime", () => {
  it("reuses executed action status and never creates a duplicate procurement request", async () => {
    const { backend, records } = createContractTestActionLedgerBackend();
    const record = createApprovedProcurementAction();
    records.set(record.actionId, record);
    const { executor, calls } = createCountingProcurementExecutor();
    const request = {
      actionId: record.actionId,
      idempotencyKey: EXECUTOR_IDEMPOTENCY_KEY,
      requestedByRole: "director" as const,
      screenId: "agent.action.execute-approved",
    };

    const first = await executeApprovedActionGateway({
      backend,
      request,
      executors: { procurement: executor },
      nowIso: EXECUTOR_NOW,
    });
    const second = await executeApprovedActionGateway({
      backend,
      request,
      executors: { procurement: executor },
      nowIso: EXECUTOR_NOW,
    });

    expect(first.status).toBe("executed");
    expect(second.status).toBe("already_executed");
    expect(second.duplicateExecutionCreatesDuplicate).toBe(false);
    expect(calls).toHaveLength(1);
    expect(records.get(record.actionId)?.status).toBe("executed");
  });
});
