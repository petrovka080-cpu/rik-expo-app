import { createProcurementRequestExecutor } from "../../src/features/ai/executors/procurementRequestExecutor";
import { createApprovedProcurementRequestBffMutationBoundary } from "../../src/features/ai/executors/approvedProcurementRequestBffMutationBoundary";
import { stableHashOpaqueId } from "../../src/features/ai/actionLedger/aiActionLedgerPolicy";
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

  it("mounts the existing request_sync_draft_v2 boundary without exposing raw request ids", async () => {
    const syncCalls: unknown[] = [];
    const boundary = createApprovedProcurementRequestBffMutationBoundary({
      async syncRequestDraft(params) {
        syncCalls.push(params);
        return {
          request: {
            id: "11111111-1111-4111-8111-111111111111",
            status: "submitted",
            display_no: "REQ-1",
          },
          items: [],
          submitted: params.submit === true,
          requestCreated: true,
          branchMeta: { sourceBranch: "rpc_v2", rpcVersion: "v2" },
        };
      },
    });

    const result = await boundary.executeApprovedProcurementRequest({
      actionType: "submit_request",
      idempotencyKey: EXECUTOR_IDEMPOTENCY_KEY,
      evidenceRefs: ["evidence:procurement:request:1"],
      payload: {
        title: "Approved request",
        notes: ["Director approved"],
        items: [
          {
            materialLabel: "Concrete B25",
            quantity: 12,
            unit: "m3",
            rikCode: "CONCRETE-B25",
            supplierLabel: "Approved marketplace supplier",
          },
        ],
      },
      context: {
        screenId: "agent.action.execute-approved",
        requestedByRole: "director",
        source: "ai_approved_action_executor",
      },
    });

    expect(result.createdEntityRef).toEqual({
      entityType: "request",
      entityIdHash: stableHashOpaqueId("request", "11111111-1111-4111-8111-111111111111"),
    });
    expect(JSON.stringify(result)).not.toContain("11111111-1111-4111-8111-111111111111");
    expect(syncCalls).toHaveLength(1);
    expect(syncCalls[0]).toMatchObject({
      requestId: null,
      submit: true,
      lines: [
        expect.objectContaining({
          rik_code: "CONCRETE-B25",
          qty: 12,
          name_human: "Concrete B25",
        }),
      ],
    });
  });

  it("blocks approved request execution when ERP catalog code is missing", async () => {
    const boundary = createApprovedProcurementRequestBffMutationBoundary({
      async syncRequestDraft() {
        throw new Error("sync should not be called");
      },
    });

    await expect(
      boundary.executeApprovedProcurementRequest({
        actionType: "submit_request",
        idempotencyKey: EXECUTOR_IDEMPOTENCY_KEY,
        evidenceRefs: ["evidence:procurement:request:1"],
        payload: {
          title: "Approved request",
          notes: [],
          items: [{ materialLabel: "Concrete B25", quantity: 12, unit: "m3" }],
        },
        context: {
          screenId: "agent.action.execute-approved",
          requestedByRole: "director",
          source: "ai_approved_action_executor",
        },
      }),
    ).rejects.toThrow("rikCode");
  });
});
