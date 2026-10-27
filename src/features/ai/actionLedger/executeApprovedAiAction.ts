import {
  assertAiActionLedgerExecutePolicy,
  canTransitionAiActionStatus,
} from "./aiActionLedgerPolicy";
import {
  createAiActionLedgerAuditEvent,
  hasAiActionLedgerAuditEvent,
} from "./aiActionLedgerAudit";
import type {
  AiActionLedgerAuditEvent,
  AiActionLedgerRecord,
  ExecuteApprovedAiActionOutput,
} from "./aiActionLedgerTypes";
import type { AiUserRole } from "../policy/aiRolePolicy";

const SAFE_BLOCKED_METADATA = {
  persistentBackend: true,
  fakeLocalApproval: false,
  finalExecution: false,
  directDomainMutation: false,
  rawDbRowsExposed: false,
  rawPromptExposed: false,
  rawProviderPayloadStored: false,
  credentialsPrinted: false,
} as const;

export type AiActionDomainExecutor = {
  readonly ready: true;
  execute: (record: AiActionLedgerRecord) => Promise<{ executedAt: string }>;
};

export async function executeApprovedAiAction(params: {
  record: AiActionLedgerRecord;
  executorRole: AiUserRole;
  auditEvent?: AiActionLedgerAuditEvent | null;
  domainExecutor?: AiActionDomainExecutor | null;
  nowIso?: string;
}): Promise<ExecuteApprovedAiActionOutput> {
  const executeRequested = createAiActionLedgerAuditEvent({
    eventType: "ai.action.execute_requested",
    actionId: params.record.actionId,
    actionType: params.record.actionType,
    status: params.record.status,
    role: params.executorRole,
    screenId: params.record.screenId,
    domain: params.record.domain,
    reason: "AI action execution requested through central gate.",
    evidenceRefs: params.record.evidenceRefs,
    createdAt: params.nowIso,
  });
  const hasAudit = hasAiActionLedgerAuditEvent(params.auditEvent);
  const policy = assertAiActionLedgerExecutePolicy({
    status: params.record.status,
    actionType: params.record.actionType,
    executorRole: params.executorRole,
    domain: params.record.domain,
    expiresAt: params.record.expiresAt,
    nowIso: params.nowIso,
    hasAuditEvent: hasAudit,
    idempotencyKey: params.record.idempotencyKey,
  });

  if (!policy.allowed) {
    const blocked = createAiActionLedgerAuditEvent({
      eventType: "ai.action.execution_blocked",
      actionId: params.record.actionId,
      actionType: params.record.actionType,
      status: params.record.status,
      role: params.executorRole,
      screenId: params.record.screenId,
      domain: params.record.domain,
      reason: policy.reason,
      evidenceRefs: params.record.evidenceRefs,
      createdAt: params.nowIso,
    });
    return {
      ...SAFE_BLOCKED_METADATA,
      status: "blocked",
      actionId: params.record.actionId,
      record: params.record,
      persisted: true,
      auditEvents: [executeRequested, blocked],
      blocker: policy.reason.includes("audit")
        ? "BLOCKED_APPROVAL_ACTION_AUDIT_REQUIRED"
        : "BLOCKED_APPROVAL_ACTION_TRANSITION_DENIED",
      reason: policy.reason,
      domainExecutorReady: Boolean(params.domainExecutor?.ready),
    };
  }

  if (!params.domainExecutor?.ready) {
    const blocked = createAiActionLedgerAuditEvent({
      eventType: "ai.action.execution_blocked",
      actionId: params.record.actionId,
      actionType: params.record.actionType,
      status: params.record.status,
      role: params.executorRole,
      screenId: params.record.screenId,
      domain: params.record.domain,
      reason: "Domain executor is not mounted for this AI action type.",
      evidenceRefs: params.record.evidenceRefs,
      createdAt: params.nowIso,
    });
    return {
      ...SAFE_BLOCKED_METADATA,
      status: "blocked",
      actionId: params.record.actionId,
      record: params.record,
      persisted: true,
      auditEvents: [executeRequested, blocked],
      blocker: "BLOCKED_DOMAIN_EXECUTOR_NOT_READY",
      reason: "Domain executor is not mounted for this AI action type.",
      domainExecutorReady: false,
    };
  }

  if (!canTransitionAiActionStatus(params.record.status, "executed")) {
    return {
      ...SAFE_BLOCKED_METADATA,
      status: "blocked",
      actionId: params.record.actionId,
      record: params.record,
      persisted: true,
      auditEvents: [executeRequested],
      blocker: "BLOCKED_APPROVAL_ACTION_TRANSITION_DENIED",
      reason: `AI action status ${params.record.status} cannot transition to executed.`,
      domainExecutorReady: true,
    };
  }

  const execution = await params.domainExecutor.execute(params.record);
  const executedRecord: AiActionLedgerRecord = {
    ...params.record,
    status: "executed",
    executedAt: execution.executedAt,
  };
  const executed = createAiActionLedgerAuditEvent({
    eventType: "ai.action.executed",
    actionId: executedRecord.actionId,
    actionType: executedRecord.actionType,
    status: "executed",
    role: params.executorRole,
    screenId: executedRecord.screenId,
    domain: executedRecord.domain,
    reason: "AI action executed through central approved gate.",
    evidenceRefs: executedRecord.evidenceRefs,
    createdAt: execution.executedAt,
  });

  return {
    ...SAFE_BLOCKED_METADATA,
    status: "executed",
    actionId: executedRecord.actionId,
    record: executedRecord,
    persisted: true,
    auditEvents: [executeRequested, executed],
    domainExecutorReady: true,
  };
}
