import type {
  AiActionLedgerAuditEvent,
  AiActionLedgerRecord,
} from "../actionLedger/aiActionLedgerTypes";
import type { AiActionLedgerPersistentBackend } from "../actionLedger/aiActionLedgerRepository";
import {
  createApprovedActionExecutionAuditEvent,
} from "./executeApprovedActionAudit";
import {
  approvedActionPayloadHasForbiddenFields,
  readRedactedCreatedEntityRef,
} from "./executeApprovedActionRedaction";
import {
  evaluateApprovedActionExecutionPolicy,
} from "./approvedActionExecutorPolicy";
import type {
  ApprovedActionExecutionRequest,
  ApprovedActionExecutionResult,
  ApprovedActionExecutorRegistry,
} from "./approvedActionExecutorTypes";

const safeResultBase = (record: AiActionLedgerRecord | null, request: ApprovedActionExecutionRequest) => ({
  actionId: record?.actionId ?? request.actionId,
  domain: "procurement" as const,
  actionType: (record?.actionType === "draft_request" ? "draft_request" : "submit_request") as "draft_request" | "submit_request",
  idempotencyKey: request.idempotencyKey,
  evidenceRefs: record?.evidenceRefs ?? [],
  directMutationFromUi: false as const,
  directSupabaseFromUi: false as const,
  modelProviderFromExecutor: false as const,
  rawDbRowsExposed: false as const,
  rawPromptExposed: false as const,
  rawProviderPayloadStored: false as const,
  duplicateExecutionCreatesDuplicate: false as const,
});

function blocked(params: {
  record: AiActionLedgerRecord | null;
  request: ApprovedActionExecutionRequest;
  reason: string;
  auditEvents?: AiActionLedgerAuditEvent[];
  blocker?: ApprovedActionExecutionResult["blocker"];
  status?: "blocked" | "domain_executor_not_ready";
}): ApprovedActionExecutionResult {
  return {
    ...safeResultBase(params.record, params.request),
    status: params.status ?? "blocked",
    reason: params.reason,
    blocker: params.blocker,
    auditEvents: params.auditEvents ?? [],
  };
}

export async function executeApprovedActionGateway(params: {
  backend: AiActionLedgerPersistentBackend | null;
  request: ApprovedActionExecutionRequest;
  executors?: ApprovedActionExecutorRegistry;
  nowIso?: string;
}): Promise<ApprovedActionExecutionResult> {
  if (!params.backend) {
    return blocked({
      record: null,
      request: params.request,
      reason: "Persistent AI action ledger backend is not mounted.",
      blocker: "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
    });
  }

  const record = await params.backend.findByActionId(params.request.actionId);
  if (!record) {
    return blocked({
      record: null,
      request: params.request,
      reason: "Approved action was not found in the persistent ledger.",
      blocker: "BLOCKED_APPROVAL_ACTION_NOT_FOUND",
    });
  }

  if (record.status === "executed" && record.idempotencyKey !== params.request.idempotencyKey) {
    return blocked({
      record,
      request: params.request,
      reason: "Execution idempotency key does not match the approved action.",
      blocker: "BLOCKED_APPROVAL_ACTION_IDEMPOTENCY_REQUIRED",
    });
  }

  if (record.status === "executed") {
    const reused = createApprovedActionExecutionAuditEvent({
      eventType: "ai.action.idempotency_reused",
      record,
      request: params.request,
      reason: "Approved action execution idempotency reused; no duplicate entity was created.",
      createdAt: params.nowIso,
    });
    return {
      ...safeResultBase(record, params.request),
      status: "already_executed",
      createdEntityRef: readRedactedCreatedEntityRef(record.redactedPayload),
      auditEventId: reused.auditEventId,
      auditEvents: [reused],
    };
  }

  const requested = createApprovedActionExecutionAuditEvent({
    eventType: "ai.action.execute_requested",
    record,
    request: params.request,
    reason: "Approved action execution requested through central gateway.",
    createdAt: params.nowIso,
  });

  if (approvedActionPayloadHasForbiddenFields(record.redactedPayload)) {
    const blockedEvent = createApprovedActionExecutionAuditEvent({
      eventType: "ai.action.execution_blocked",
      record,
      request: params.request,
      reason: "Approved action payload contains forbidden raw fields.",
      createdAt: params.nowIso,
    });
    return blocked({
      record,
      request: params.request,
      reason: "Approved action payload contains forbidden raw fields.",
      blocker: "BLOCKED_APPROVAL_ACTION_POLICY_DENIED",
      auditEvents: [requested, blockedEvent],
    });
  }

  const policy = evaluateApprovedActionExecutionPolicy({
    record,
    request: params.request,
    hasAuditEvent: true,
    nowIso: params.nowIso,
  });
  if (!policy.allowed) {
    const blockedEvent = createApprovedActionExecutionAuditEvent({
      eventType: "ai.action.execution_blocked",
      record,
      request: params.request,
      reason: policy.reason,
      createdAt: params.nowIso,
    });
    return blocked({
      record,
      request: params.request,
      reason: policy.reason,
      blocker: policy.blocker,
      auditEvents: [requested, blockedEvent],
    });
  }

  const executor = params.executors?.procurement ?? null;
  if (!executor) {
    const blockedEvent = createApprovedActionExecutionAuditEvent({
      eventType: "ai.action.execution_blocked",
      record,
      request: params.request,
      reason: "Procurement BFF mutation boundary is not mounted.",
      createdAt: params.nowIso,
    });
    return blocked({
      record,
      request: params.request,
      status: "domain_executor_not_ready",
      reason: "Procurement BFF mutation boundary is not mounted.",
      blocker: "BLOCKED_PROCUREMENT_BFF_MUTATION_BOUNDARY_NOT_FOUND",
      auditEvents: [requested, blockedEvent],
    });
  }

  const started = createApprovedActionExecutionAuditEvent({
    eventType: "ai.action.execution_started",
    record,
    request: params.request,
    reason: "Approved procurement executor started through route-scoped BFF boundary.",
    createdAt: params.nowIso,
  });
  const execution = await executor.execute(record, params.request);
  const executed = createApprovedActionExecutionAuditEvent({
    eventType: "ai.action.executed",
    record,
    request: params.request,
    reason: "Approved procurement action executed through central gateway.",
    createdAt: execution.executedAt,
  });
  const updated = await params.backend.updateStatus(
    record.actionId,
    "executed",
    { executedAt: execution.executedAt },
    executed,
  );

  return {
    ...safeResultBase(updated, params.request),
    status: "executed",
    createdEntityRef: execution.createdEntityRef,
    auditEventId: execution.auditEventId ?? executed.auditEventId,
    auditEvents: [requested, started, executed],
  };
}

export async function getApprovedActionExecutionStatus(params: {
  backend: AiActionLedgerPersistentBackend | null;
  actionId: string;
  idempotencyKey: string;
}): Promise<ApprovedActionExecutionResult> {
  const request: ApprovedActionExecutionRequest = {
    actionId: params.actionId,
    idempotencyKey: params.idempotencyKey,
    requestedByRole: "director",
    screenId: "agent.action.execution-status",
  };
  if (!params.backend) {
    return blocked({
      record: null,
      request,
      reason: "Persistent AI action ledger backend is not mounted.",
      blocker: "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
    });
  }
  const record = await params.backend.findByActionId(params.actionId);
  if (!record) {
    return blocked({
      record: null,
      request,
      reason: "Approved action was not found in the persistent ledger.",
      blocker: "BLOCKED_APPROVAL_ACTION_NOT_FOUND",
    });
  }
  if (record.status === "executed") {
    return {
      ...safeResultBase(record, request),
      status: "already_executed",
      createdEntityRef: readRedactedCreatedEntityRef(record.redactedPayload),
      auditEvents: [],
    };
  }
  return blocked({
    record,
    request,
    reason: `Action execution status is ${record.status}.`,
  });
}
