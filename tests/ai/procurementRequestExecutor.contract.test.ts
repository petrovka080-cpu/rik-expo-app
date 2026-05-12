import { createProcurementRequestExecutor } from "../../src/features/ai/executors/procurementRequestExecutor";
import {
  createApprovedProcurementAction,
  createCountingProcurementBoundary,
  EXECUTOR_IDEMPOTENCY_KEY,
} from "./approvedProcurementExecutorTestUtils";

describe("procurementRequestExecutor contract", () => {
  it("uses only a route-scoped BFF mutation boundary with idempotency and evidence", async () => {
    const { boundary, calls } = createCountingProcurementBoundary();
    const executor = createProcurementRequestExecutor(boundary);
    expect(executor).toMatchObject({
      domain: "procurement",
      routeScoped: true,
      directSupabaseMutation: false,
      broadMutationRoute: false,
    });

    const result = await executor!.execute(createApprovedProcurementAction(), {
      actionId: "ai-action-approved-procurement-1",
      idempotencyKey: EXECUTOR_IDEMPOTENCY_KEY,
      requestedByRole: "director",
      screenId: "agent.action.execute-approved",
    });

    expect(result.createdEntityRef).toEqual({ entityType: "request", entityIdHash: "request:approved-executor-1" });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      actionType: "submit_request",
      idempotencyKey: EXECUTOR_IDEMPOTENCY_KEY,
      evidenceRefs: ["evidence:procurement:request:1"],
      context: {
        source: "ai_approved_action_executor",
      },
    });
  });

  it("does not create an executor when no safe BFF mutation boundary exists", () => {
    expect(createProcurementRequestExecutor(null)).toBeNull();
  });
});
