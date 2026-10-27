import type { AiActionLedgerRecord } from "../actionLedger/aiActionLedgerTypes";
import type {
  ApprovedActionDomainExecutor,
  ApprovedActionExecutionRequest,
} from "./approvedActionExecutorTypes";
import { hasProcurementRequestExecutorEvidence } from "./procurementRequestExecutorEvidence";
import { redactProcurementRequestExecutorPayload } from "./procurementRequestExecutorRedaction";
import type { ProcurementRequestMutationBoundary } from "./procurementRequestExecutorTypes";

export function createProcurementRequestExecutor(
  boundary: ProcurementRequestMutationBoundary | null,
): ApprovedActionDomainExecutor | null {
  if (!boundary) return null;
  return {
    domain: "procurement",
    actionTypes: ["draft_request", "submit_request"],
    routeScoped: true,
    directSupabaseMutation: false,
    broadMutationRoute: false,
    async execute(record: AiActionLedgerRecord, request: ApprovedActionExecutionRequest) {
      if (record.domain !== "procurement" || (record.actionType !== "draft_request" && record.actionType !== "submit_request")) {
        throw new Error("procurement executor received unsupported action");
      }
      if (!hasProcurementRequestExecutorEvidence(record.evidenceRefs)) {
        throw new Error("procurement executor requires evidence");
      }
      const payload = redactProcurementRequestExecutorPayload(record.redactedPayload);
      if (!payload || payload.items.length === 0) {
        throw new Error("procurement executor requires redacted request items");
      }
      const result = await boundary.executeApprovedProcurementRequest({
        actionType: record.actionType,
        idempotencyKey: request.idempotencyKey,
        payload,
        evidenceRefs: record.evidenceRefs,
        context: {
          screenId: request.screenId,
          requestedByRole: request.requestedByRole,
          source: "ai_approved_action_executor",
        },
      });
      return {
        createdEntityRef: result.createdEntityRef,
        executedAt: new Date().toISOString(),
      };
    },
  };
}
