import type { AiActionLedgerActionType } from "../actionLedger/aiActionLedgerTypes";
import type { ApprovedActionCreatedEntityRef } from "./approvedActionExecutorTypes";

export type ProcurementRequestExecutorItem = {
  materialLabel: string;
  quantity?: number;
  unit?: string;
  supplierLabel?: string;
};

export type ProcurementRequestExecutorPayload = {
  title: string;
  items: ProcurementRequestExecutorItem[];
  notes: string[];
};

export type ProcurementRequestBffMutationInput = {
  actionType: Extract<AiActionLedgerActionType, "draft_request" | "submit_request">;
  idempotencyKey: string;
  payload: ProcurementRequestExecutorPayload;
  evidenceRefs: string[];
  context: {
    screenId: string;
    requestedByRole: string;
    source: "ai_approved_action_executor";
  };
};

export type ProcurementRequestMutationBoundary = {
  readonly boundaryId: "existing_bff_procurement_request_mutation_boundary";
  readonly routeScoped: true;
  readonly idempotencyRequired: true;
  readonly auditRequired: true;
  readonly directSupabaseMutation: false;
  executeApprovedProcurementRequest: (
    input: ProcurementRequestBffMutationInput,
  ) => Promise<{
    createdEntityRef: ApprovedActionCreatedEntityRef;
  }>;
};
