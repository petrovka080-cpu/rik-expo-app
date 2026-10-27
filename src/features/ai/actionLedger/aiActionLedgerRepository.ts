import { canUseAiCapability, type AiDomain, type AiUserRole } from "../policy/aiRolePolicy";
import {
  assertAiActionLedgerApprovePolicy,
  assertAiActionLedgerSubmitPolicy,
  canTransitionAiActionStatus,
  getAiActionLedgerRiskLevel,
} from "./aiActionLedgerPolicy";
import { createAiActionLedgerAuditEvent } from "./aiActionLedgerAudit";
import { normalizeAiActionLedgerEvidenceRefs } from "./aiActionLedgerEvidence";
import { redactAiActionLedgerPayload } from "./aiActionLedgerRedaction";
import type {
  AiActionDecisionOutput,
  AiActionLedgerActionType,
  AiActionLedgerAuditEvent,
  AiActionLedgerBlockedCode,
  AiActionLedgerRecord,
  AiActionStatus,
  AiActionStatusOutput,
  SubmitAiActionForApprovalInput,
  SubmitAiActionForApprovalOutput,
} from "./aiActionLedgerTypes";

export type AiActionLedgerPersistentBackend = {
  readonly mounted: true;
  readonly canPersistExecutedStatus?: true;
  listByOrganization: (
    organizationIdHash: string,
    page: { cursor?: string | null; limit: number },
  ) => Promise<{ records: AiActionLedgerRecord[]; nextCursor: string | null }>;
  findByIdempotencyKey: (
    organizationIdHash: string,
    idempotencyKey: string,
  ) => Promise<AiActionLedgerRecord | null>;
  findByActionId: (actionId: string) => Promise<AiActionLedgerRecord | null>;
  insertPending: (
    record: AiActionLedgerRecord,
    auditEvent: AiActionLedgerAuditEvent,
  ) => Promise<AiActionLedgerRecord>;
  updateStatus: (
    actionId: string,
    status: AiActionStatus,
    patch: Partial<Pick<AiActionLedgerRecord, "approvedByUserIdHash" | "executedAt" | "redactedPayload">>,
    auditEvent: AiActionLedgerAuditEvent,
  ) => Promise<AiActionLedgerRecord>;
};

export class AiActionLedgerBackendBlockedError extends Error {
  readonly blocker: AiActionLedgerBlockedCode;

  constructor(blocker: AiActionLedgerBlockedCode, reason: string) {
    super(reason);
    this.name = "AiActionLedgerBackendBlockedError";
    this.blocker = blocker;
  }
}

export function isAiActionLedgerBackendBlockedError(
  value: unknown,
): value is AiActionLedgerBackendBlockedError {
  return value instanceof AiActionLedgerBackendBlockedError;
}

export type AiActionLedgerRepository = {
  submitForApproval: (
    input: SubmitAiActionForApprovalInput,
    role: AiUserRole,
  ) => Promise<SubmitAiActionForApprovalOutput>;
  getStatus: (actionId: string, role: AiUserRole) => Promise<AiActionStatusOutput>;
  approve: (params: {
    actionId: string;
    approverRole: AiUserRole;
    approvedByUserIdHash: string;
    nowIso?: string;
  }) => Promise<AiActionDecisionOutput>;
  reject: (params: {
    actionId: string;
    rejectorRole: AiUserRole;
    rejectedByUserIdHash: string;
    nowIso?: string;
    reason?: string;
  }) => Promise<AiActionDecisionOutput>;
};

const SAFE_BLOCKED_METADATA = {
  persistentBackend: false,
  fakeLocalApproval: false,
  finalExecution: false,
  directDomainMutation: false,
  rawDbRowsExposed: false,
  rawPromptExposed: false,
  rawProviderPayloadStored: false,
  credentialsPrinted: false,
} as const;

const SAFE_PERSISTED_METADATA = {
  persistentBackend: true,
  fakeLocalApproval: false,
  finalExecution: false,
  directDomainMutation: false,
  rawDbRowsExposed: false,
  rawPromptExposed: false,
  rawProviderPayloadStored: false,
  credentialsPrinted: false,
} as const;

const DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1000;

function blockedSubmit(
  blocker: AiActionLedgerBlockedCode,
  reason: string,
  auditEvents: AiActionLedgerAuditEvent[] = [],
): SubmitAiActionForApprovalOutput {
  return {
    ...SAFE_BLOCKED_METADATA,
    status: "blocked",
    reason,
    requiresApproval: true,
    persisted: false,
    idempotencyReused: false,
    auditEvents,
    blocker,
  };
}

function blockedStatus(
  actionId: string,
  blocker: AiActionLedgerBlockedCode,
  reason: string,
  auditEvents: AiActionLedgerAuditEvent[] = [],
): AiActionStatusOutput {
  return {
    ...SAFE_BLOCKED_METADATA,
    status: "blocked",
    actionId,
    persistedLookup: false,
    auditEvents,
    blocker,
    reason,
  };
}

function blockedDecision(
  actionId: string,
  blocker: AiActionLedgerBlockedCode,
  reason: string,
  auditEvents: AiActionLedgerAuditEvent[] = [],
): AiActionDecisionOutput {
  return {
    ...SAFE_BLOCKED_METADATA,
    status: "blocked",
    actionId,
    persisted: false,
    auditEvents,
    blocker,
    reason,
  };
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function buildActionId(params: {
  actionType: AiActionLedgerActionType;
  screenId: string;
  role: AiUserRole;
  idempotencyKey: string;
}): string {
  return [
    "ai_action",
    params.actionType,
    params.screenId,
    params.role,
    params.idempotencyKey,
  ]
    .join(":")
    .replace(/[^a-zA-Z0-9:._-]+/g, "_")
    .slice(0, 180);
}

function buildPendingRecord(
  input: SubmitAiActionForApprovalInput,
  role: AiUserRole,
  evidenceRefs: string[],
): AiActionLedgerRecord {
  const createdAt = input.nowIso ?? new Date().toISOString();
  const expiresAt = new Date(new Date(createdAt).getTime() + DEFAULT_EXPIRY_MS).toISOString();

  return {
    actionId: buildActionId({
      actionType: input.actionType,
      screenId: input.screenId,
      role,
      idempotencyKey: input.idempotencyKey,
    }),
    actionType: input.actionType,
    status: "pending",
    riskLevel: getAiActionLedgerRiskLevel(input.actionType),
    role,
    screenId: normalizeText(input.screenId),
    domain: input.domain,
    summary: normalizeText(input.summary),
    redactedPayload: redactAiActionLedgerPayload(input.redactedPayload),
    evidenceRefs,
    idempotencyKey: normalizeText(input.idempotencyKey),
    requestedByUserIdHash: normalizeText(input.requestedByUserIdHash),
    organizationIdHash: normalizeText(input.organizationIdHash),
    createdAt,
    expiresAt,
  };
}

export function createAiActionLedgerRepository(
  backend: AiActionLedgerPersistentBackend | null,
): AiActionLedgerRepository {
  return {
    async submitForApproval(input, role) {
      if (!backend) {
        return blockedSubmit(
          "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
          "AI action ledger persistence backend is not mounted.",
        );
      }

      const evidenceRefs = normalizeAiActionLedgerEvidenceRefs(input.evidenceRefs);
      const policy = assertAiActionLedgerSubmitPolicy({
        actionType: input.actionType,
        role,
        domain: input.domain,
        evidenceRefs,
        idempotencyKey: input.idempotencyKey,
      });
      if (!policy.allowed) {
        return blockedSubmit(
          evidenceRefs.length === 0
            ? "BLOCKED_APPROVAL_ACTION_EVIDENCE_REQUIRED"
            : input.idempotencyKey.trim().length < 16
              ? "BLOCKED_APPROVAL_ACTION_IDEMPOTENCY_REQUIRED"
              : "BLOCKED_APPROVAL_ACTION_POLICY_DENIED",
          policy.reason,
        );
      }

      let existing: AiActionLedgerRecord | null;
      try {
        existing = await backend.findByIdempotencyKey(
          input.organizationIdHash,
          normalizeText(input.idempotencyKey),
        );
      } catch (error) {
        if (isAiActionLedgerBackendBlockedError(error)) {
          return blockedSubmit(error.blocker, error.message);
        }
        throw error;
      }
      if (existing) {
        const auditEvent = createAiActionLedgerAuditEvent({
          eventType: "ai.action.idempotency_reused",
          actionId: existing.actionId,
          actionType: existing.actionType,
          status: existing.status,
          role,
          screenId: existing.screenId,
          domain: existing.domain,
          reason: "AI action idempotency key reused; returning existing action.",
          evidenceRefs: existing.evidenceRefs,
          createdAt: input.nowIso,
        });
        return {
          ...SAFE_PERSISTED_METADATA,
          status: existing.status === "pending" ? "pending" : "blocked",
          actionId: existing.actionId,
          reason: existing.status === "pending" ? undefined : `Existing action status is ${existing.status}`,
          requiresApproval: true,
          persisted: true,
          idempotencyReused: true,
          auditEvents: [auditEvent],
          record: existing,
          blocker: existing.status === "pending" ? undefined : "BLOCKED_APPROVAL_ACTION_TRANSITION_DENIED",
        };
      }

      const record = buildPendingRecord(input, role, evidenceRefs);
      const auditEvent = createAiActionLedgerAuditEvent({
        eventType: "ai.action.submitted_for_approval",
        actionId: record.actionId,
        actionType: record.actionType,
        status: record.status,
        role,
        screenId: record.screenId,
        domain: record.domain,
        reason: "AI action persisted as pending approval.",
        evidenceRefs,
        createdAt: record.createdAt,
      });
      let persisted: AiActionLedgerRecord;
      try {
        persisted = await backend.insertPending(record, auditEvent);
      } catch (error) {
        if (isAiActionLedgerBackendBlockedError(error)) {
          return blockedSubmit(error.blocker, error.message, [auditEvent]);
        }
        throw error;
      }

      return {
        ...SAFE_PERSISTED_METADATA,
        status: "pending",
        actionId: persisted.actionId,
        requiresApproval: true,
        persisted: true,
        idempotencyReused: false,
        auditEvents: [auditEvent],
        record: persisted,
      };
    },

    async getStatus(actionId, role) {
      if (!backend) {
        return blockedStatus(
          actionId,
          "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
          "AI action ledger persistence backend is not mounted.",
        );
      }

      let record: AiActionLedgerRecord | null;
      try {
        record = await backend.findByActionId(actionId);
      } catch (error) {
        if (isAiActionLedgerBackendBlockedError(error)) {
          return blockedStatus(actionId, error.blocker, error.message);
        }
        throw error;
      }
      if (!record) {
        return {
          ...SAFE_PERSISTED_METADATA,
          status: "not_found",
          actionId,
          persistedLookup: true,
          auditEvents: [],
        };
      }
      if (!canUseStatus(role, record.domain)) {
        return blockedStatus(
          actionId,
          "BLOCKED_APPROVAL_ACTION_POLICY_DENIED",
          `AI role ${role} cannot read action status in ${record.domain}.`,
        );
      }

      return {
        ...SAFE_PERSISTED_METADATA,
        status: record.status,
        actionId,
        record,
        persistedLookup: true,
        auditEvents: [],
      };
    },

    async approve(params) {
      if (!backend) {
        return blockedDecision(
          params.actionId,
          "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
          "AI action ledger persistence backend is not mounted.",
        );
      }
      let record: AiActionLedgerRecord | null;
      try {
        record = await backend.findByActionId(params.actionId);
      } catch (error) {
        if (isAiActionLedgerBackendBlockedError(error)) {
          return blockedDecision(params.actionId, error.blocker, error.message);
        }
        throw error;
      }
      if (!record) {
        return blockedDecision(
          params.actionId,
          "BLOCKED_APPROVAL_ACTION_NOT_FOUND",
          "AI action was not found in the persistent ledger.",
        );
      }
      const policy = assertAiActionLedgerApprovePolicy({
        status: record.status,
        actionType: record.actionType,
        approverRole: params.approverRole,
        domain: record.domain,
      });
      if (!policy.allowed) {
        return blockedDecision(
          params.actionId,
          "BLOCKED_APPROVAL_ACTION_POLICY_DENIED",
          policy.reason,
        );
      }

      const auditEvent = createAiActionLedgerAuditEvent({
        eventType: "ai.action.approved",
        actionId: record.actionId,
        actionType: record.actionType,
        status: "approved",
        role: params.approverRole,
        screenId: record.screenId,
        domain: record.domain,
        reason: "AI action approved through persistent ledger.",
        evidenceRefs: record.evidenceRefs,
        createdAt: params.nowIso,
      });
      let updated: AiActionLedgerRecord;
      try {
        updated = await backend.updateStatus(
          record.actionId,
          "approved",
          { approvedByUserIdHash: params.approvedByUserIdHash },
          auditEvent,
        );
      } catch (error) {
        if (isAiActionLedgerBackendBlockedError(error)) {
          return blockedDecision(params.actionId, error.blocker, error.message, [auditEvent]);
        }
        throw error;
      }

      return {
        ...SAFE_PERSISTED_METADATA,
        status: "approved",
        actionId: updated.actionId,
        record: updated,
        persisted: true,
        auditEvents: [auditEvent],
      };
    },

    async reject(params) {
      if (!backend) {
        return blockedDecision(
          params.actionId,
          "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
          "AI action ledger persistence backend is not mounted.",
        );
      }
      let record: AiActionLedgerRecord | null;
      try {
        record = await backend.findByActionId(params.actionId);
      } catch (error) {
        if (isAiActionLedgerBackendBlockedError(error)) {
          return blockedDecision(params.actionId, error.blocker, error.message);
        }
        throw error;
      }
      if (!record) {
        return blockedDecision(
          params.actionId,
          "BLOCKED_APPROVAL_ACTION_NOT_FOUND",
          "AI action was not found in the persistent ledger.",
        );
      }
      if (!canTransitionAiActionStatus(record.status, "rejected")) {
        return blockedDecision(
          params.actionId,
          "BLOCKED_APPROVAL_ACTION_TRANSITION_DENIED",
          `AI action status ${record.status} cannot transition to rejected.`,
        );
      }
      if (!canUseStatus(params.rejectorRole, record.domain, "approve_action")) {
        return blockedDecision(
          params.actionId,
          "BLOCKED_APPROVAL_ACTION_POLICY_DENIED",
          `AI role ${params.rejectorRole} cannot reject action in ${record.domain}.`,
        );
      }

      const auditEvent = createAiActionLedgerAuditEvent({
        eventType: "ai.action.rejected",
        actionId: record.actionId,
        actionType: record.actionType,
        status: "rejected",
        role: params.rejectorRole,
        screenId: record.screenId,
        domain: record.domain,
        reason: params.reason ?? "AI action rejected through persistent ledger.",
        evidenceRefs: record.evidenceRefs,
        createdAt: params.nowIso,
      });
      let updated: AiActionLedgerRecord;
      try {
        updated = await backend.updateStatus(record.actionId, "rejected", {}, auditEvent);
      } catch (error) {
        if (isAiActionLedgerBackendBlockedError(error)) {
          return blockedDecision(params.actionId, error.blocker, error.message, [auditEvent]);
        }
        throw error;
      }

      return {
        ...SAFE_PERSISTED_METADATA,
        status: "rejected",
        actionId: updated.actionId,
        record: updated,
        persisted: true,
        auditEvents: [auditEvent],
      };
    },
  };
}

function canUseStatus(
  role: AiUserRole,
  domain: AiDomain,
  capability: "read_context" | "approve_action" = "read_context",
): boolean {
  return canUseAiCapability({ role, domain, capability });
}
