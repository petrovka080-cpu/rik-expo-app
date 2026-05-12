import type { AiActionLedgerRecord } from "../../src/features/ai/actionLedger/aiActionLedgerTypes";
import type {
  ApprovedActionCreatedEntityRef,
} from "../../src/features/ai/executors/approvedActionExecutorTypes";
import {
  createProcurementRequestExecutor,
} from "../../src/features/ai/executors/procurementRequestExecutor";
import type {
  ProcurementRequestBffMutationInput,
  ProcurementRequestMutationBoundary,
} from "../../src/features/ai/executors/procurementRequestExecutorTypes";

export const EXECUTOR_NOW = "2026-05-13T00:00:00.000Z";
export const EXECUTOR_EXPIRES = "2035-01-01T00:00:00.000Z";
export const EXECUTOR_IDEMPOTENCY_KEY = "approved-procurement-executor-idempotency-0001";
export const EXECUTOR_CREATED_REF: ApprovedActionCreatedEntityRef = {
  entityType: "request",
  entityIdHash: "request:approved-executor-1",
};

export function createApprovedProcurementAction(
  overrides: Partial<AiActionLedgerRecord> = {},
): AiActionLedgerRecord {
  return {
    actionId: "ai-action-approved-procurement-1",
    actionType: "submit_request",
    status: "approved",
    riskLevel: "approval_required",
    role: "buyer",
    screenId: "buyer.main",
    domain: "procurement",
    summary: "Submit approved procurement request",
    redactedPayload: {
      title: "Approved procurement request",
      items: [
        {
          materialLabel: "Concrete B25",
          quantity: 12,
          unit: "m3",
          supplierLabel: "Approved marketplace supplier",
        },
      ],
      notes: ["Created from approved AI draft"],
      createdEntityRef: EXECUTOR_CREATED_REF,
    },
    evidenceRefs: ["evidence:procurement:request:1"],
    idempotencyKey: EXECUTOR_IDEMPOTENCY_KEY,
    requestedByUserIdHash: "user:buyer:1",
    organizationIdHash: "org:executor:1",
    createdAt: EXECUTOR_NOW,
    expiresAt: EXECUTOR_EXPIRES,
    approvedByUserIdHash: "user:director:1",
    ...overrides,
  };
}

export function createCountingProcurementBoundary(): {
  boundary: ProcurementRequestMutationBoundary;
  calls: ProcurementRequestBffMutationInput[];
} {
  const calls: ProcurementRequestBffMutationInput[] = [];
  return {
    calls,
    boundary: {
      boundaryId: "existing_bff_procurement_request_mutation_boundary",
      routeScoped: true,
      idempotencyRequired: true,
      auditRequired: true,
      directSupabaseMutation: false,
      async executeApprovedProcurementRequest(input) {
        calls.push(input);
        return { createdEntityRef: EXECUTOR_CREATED_REF };
      },
    },
  };
}

export function createCountingProcurementExecutor() {
  const { boundary, calls } = createCountingProcurementBoundary();
  const executor = createProcurementRequestExecutor(boundary);
  if (!executor) throw new Error("expected procurement executor");
  return { executor, calls };
}
