import { createAiActionLedgerAuditEvent } from "../actionLedger/aiActionLedgerAudit";
import type {
  AiActionLedgerAuditEvent,
  AiActionLedgerRecord,
} from "../actionLedger/aiActionLedgerTypes";
import type { ApprovedActionExecutionRequest } from "./approvedActionExecutorTypes";

function eventId(record: AiActionLedgerRecord, suffix: string): string {
  return `${record.actionId}:${suffix}`.replace(/[^a-zA-Z0-9:._-]+/g, "_").slice(0, 180);
}

export function createApprovedActionExecutionAuditEvent(params: {
  eventType:
    | "ai.action.execute_requested"
    | "ai.action.execution_started"
    | "ai.action.executed"
    | "ai.action.execution_blocked"
    | "ai.action.idempotency_reused";
  record: AiActionLedgerRecord;
  request: ApprovedActionExecutionRequest;
  reason: string;
  createdAt?: string;
}): AiActionLedgerAuditEvent & { auditEventId: string } {
  return {
    ...createAiActionLedgerAuditEvent({
      eventType: params.eventType === "ai.action.execution_started"
        ? "ai.action.execute_requested"
        : params.eventType,
      actionId: params.record.actionId,
      actionType: params.record.actionType,
      status: params.record.status,
      role: params.request.requestedByRole,
      screenId: params.record.screenId,
      domain: params.record.domain,
      reason: params.reason,
      evidenceRefs: params.record.evidenceRefs,
      createdAt: params.createdAt,
    }),
    auditEventId: eventId(params.record, params.eventType.split(".").pop() ?? "event"),
  };
}
