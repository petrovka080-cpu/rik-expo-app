import type {
  RequestDraftSyncLineInput,
  RequestDraftSyncResult,
} from "../../../lib/api/requestDraftSync.service";
import { stableHashOpaqueId } from "../actionLedger/aiActionLedgerPolicy";
import type {
  ProcurementRequestBffMutationInput,
  ProcurementRequestExecutorItem,
  ProcurementRequestMutationBoundary,
} from "./procurementRequestExecutorTypes";

export const APPROVED_PROCUREMENT_REQUEST_BOUNDARY_RPC = "request_sync_draft_v2" as const;

export type ApprovedProcurementRequestBffMutationBoundaryOptions = {
  syncRequestDraft?: (params: {
    requestId?: string | null;
    meta?: { comment?: string | null } | null;
    lines: RequestDraftSyncLineInput[];
    submit?: boolean;
  }) => Promise<RequestDraftSyncResult>;
};

const normalizeText = (value: unknown): string =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

const normalizePositiveNumber = (value: unknown): number | null => {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

function buildExecutionComment(input: ProcurementRequestBffMutationInput): string {
  const idempotencyHash = stableHashOpaqueId("ai_action_idempotency", input.idempotencyKey);
  return [
    normalizeText(input.payload.title) || "Approved AI procurement request",
    ...input.payload.notes.map(normalizeText).filter(Boolean),
    `ai_action_idempotency_ref:${idempotencyHash}`,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 1200);
}

function itemToDraftLine(item: ProcurementRequestExecutorItem): RequestDraftSyncLineInput {
  const rikCode = normalizeText(item.rikCode);
  const qty = normalizePositiveNumber(item.quantity);
  if (!rikCode) {
    throw new Error("approved procurement execution requires rikCode for every new request item");
  }
  if (qty == null) {
    throw new Error("approved procurement execution requires positive quantity for every request item");
  }

  return {
    rik_code: rikCode,
    qty,
    name_human: normalizeText(item.materialLabel),
    uom: normalizeText(item.unit) || null,
    app_code: normalizeText(item.appCode) || null,
    kind: normalizeText(item.kind) || "ai_approved_procurement",
    note: [
      normalizeText(item.supplierLabel) ? `supplier_label:${normalizeText(item.supplierLabel)}` : "",
    ]
      .filter(Boolean)
      .join("\n") || null,
  };
}

export function createApprovedProcurementRequestBffMutationBoundary(
  options: ApprovedProcurementRequestBffMutationBoundaryOptions = {},
): ProcurementRequestMutationBoundary {
  const syncDraft = options.syncRequestDraft ?? (async (params) => {
    const service = await import("../../../lib/api/requestDraftSync.service");
    return await service.syncRequestDraftViaRpc(params);
  });

  return {
    boundaryId: "existing_bff_procurement_request_mutation_boundary",
    routeScoped: true,
    idempotencyRequired: true,
    auditRequired: true,
    directSupabaseMutation: false,
    async executeApprovedProcurementRequest(input) {
      if (input.actionType !== "draft_request" && input.actionType !== "submit_request") {
        throw new Error("approved procurement boundary supports only draft_request and submit_request");
      }
      if (!normalizeText(input.idempotencyKey)) {
        throw new Error("approved procurement boundary requires idempotencyKey");
      }
      if (!input.evidenceRefs.some((ref) => normalizeText(ref))) {
        throw new Error("approved procurement boundary requires evidenceRefs");
      }

      const lines = input.payload.items.slice(0, 50).map(itemToDraftLine);
      if (!lines.length) {
        throw new Error("approved procurement boundary requires at least one request item");
      }

      const result = await syncDraft({
        requestId: null,
        meta: {
          comment: buildExecutionComment(input),
        },
        lines,
        submit: input.actionType === "submit_request",
      });
      const requestId = normalizeText(result.request.id);
      if (!requestId) {
        throw new Error("approved procurement boundary returned empty request identity");
      }

      return {
        createdEntityRef: {
          entityType: "request",
          entityIdHash: stableHashOpaqueId("request", requestId),
        },
      };
    },
  };
}
