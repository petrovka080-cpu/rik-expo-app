import {
  AI_DOMAINS,
  AI_USER_ROLES,
  type AiDomain,
  type AiUserRole,
} from "../policy/aiRolePolicy";
import {
  AI_ACTION_LEDGER_ACTION_TYPES,
  AI_ACTION_LEDGER_STATUSES,
  getAiActionLedgerRiskLevel,
  stableHashOpaqueId,
} from "./aiActionLedgerPolicy";
import {
  AiActionLedgerBackendBlockedError,
  type AiActionLedgerPersistentBackend,
} from "./aiActionLedgerRepository";
import {
  AI_ACTION_LEDGER_RPC_FUNCTIONS,
  type AiActionLedgerRpcBlockedPayload,
  type AiActionLedgerRpcFunctionName,
  type AiActionLedgerRpcTransport,
} from "./aiActionLedgerRpcTypes";
import type {
  AiActionLedgerActionType,
  AiActionLedgerAuditEvent,
  AiActionLedgerRecord,
  AiActionRiskLevel,
  AiActionStatus,
} from "./aiActionLedgerTypes";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type JsonRecord = Record<string, unknown>;

export type AiActionLedgerRpcBackendOptions = {
  organizationId: string;
  organizationIdHash?: string;
  actorUserId: string;
  actorUserIdHash?: string;
  actorRole: AiUserRole;
  transport?: AiActionLedgerRpcTransport;
  executeApprovedStatusTransitionMounted?: true;
};

export type AiActionLedgerRpcBackendReadiness = {
  ready: boolean;
  mounted: boolean;
  reason?: string;
  blocker?: "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND";
  rawIdsExposed: false;
  finalExecution: false;
};

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function optionalText(value: unknown): string | undefined {
  const normalized = text(value);
  return normalized.length > 0 ? normalized : undefined;
}

function arrayOfText(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(text).filter(Boolean).slice(0, 20);
}

function recordValue(record: JsonRecord, camelKey: string, snakeKey: string): unknown {
  return record[camelKey] ?? record[snakeKey];
}

function normalizeActionType(value: unknown): AiActionLedgerActionType | null {
  return AI_ACTION_LEDGER_ACTION_TYPES.find((actionType) => actionType === value) ?? null;
}

function normalizeStatus(value: unknown): AiActionStatus | null {
  return AI_ACTION_LEDGER_STATUSES.find((status) => status === value) ?? null;
}

function normalizeRole(value: unknown, fallback: AiUserRole): AiUserRole {
  return AI_USER_ROLES.find((role) => role === value) ?? fallback;
}

function normalizeDomain(value: unknown): AiDomain | null {
  return AI_DOMAINS.find((domain) => domain === value) ?? null;
}

function normalizeRiskLevel(
  value: unknown,
  actionType: AiActionLedgerActionType,
): AiActionRiskLevel {
  if (
    value === "safe_read" ||
    value === "draft_only" ||
    value === "approval_required" ||
    value === "forbidden"
  ) {
    return value;
  }
  return getAiActionLedgerRiskLevel(actionType);
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

const defaultAiActionLedgerRpcTransport: AiActionLedgerRpcTransport = async (fn, args) => {
  const transport = await import("./aiActionLedgerRpcTransport");
  return await transport.runAiActionLedgerRpcTransport(fn, args);
};

function normalizeCursorOffset(cursor?: string | null): number {
  if (!cursor || !/^\d+$/.test(cursor)) return 0;
  return Math.max(0, Number(cursor));
}

function normalizeLimit(limit: number): number {
  if (!Number.isFinite(limit)) return 20;
  const whole = Math.trunc(limit);
  if (whole < 1) return 1;
  if (whole > 20) return 20;
  return whole;
}

function isBlockedPayload(value: unknown): value is AiActionLedgerRpcBlockedPayload {
  return isJsonRecord(value) && value.status === "blocked";
}

function blockerFromRpc(value: unknown): AiActionLedgerBackendBlockedError | null {
  if (isBlockedPayload(value)) {
    const blocker =
      text(value.blocker) === "BLOCKED_DOMAIN_EXECUTOR_NOT_READY"
        ? "BLOCKED_DOMAIN_EXECUTOR_NOT_READY"
        : "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED";
    return new AiActionLedgerBackendBlockedError(
      blocker,
      optionalText(value.reason) ?? "AI action ledger RPC backend is not ready.",
    );
  }
  return null;
}

function blockerFromTransportError(error: unknown): AiActionLedgerBackendBlockedError {
  const message = isJsonRecord(error)
    ? optionalText(error.message) ?? optionalText(error.details)
    : optionalText(error);
  return new AiActionLedgerBackendBlockedError(
    "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED",
    message
      ? `AI action ledger RPC backend is not mounted: ${message}`
      : "AI action ledger RPC backend is not mounted.",
  );
}

function ensureRecordFromRpc(params: {
  value: unknown;
  fallbackRole: AiUserRole;
  fallbackOrganizationIdHash: string;
  fallbackUserIdHash: string;
}): AiActionLedgerRecord | null {
  const source = isJsonRecord(params.value) && isJsonRecord(params.value.record)
    ? params.value.record
    : params.value;
  if (!isJsonRecord(source)) return null;

  const actionType = normalizeActionType(recordValue(source, "actionType", "action_type"));
  const status = normalizeStatus(recordValue(source, "status", "status"));
  const domain = normalizeDomain(recordValue(source, "domain", "domain"));
  if (!actionType || !status || !domain) return null;

  const actionId = text(recordValue(source, "actionId", "action_id"));
  const screenId = text(recordValue(source, "screenId", "screen_id"));
  const summary = text(recordValue(source, "summary", "summary"));
  const idempotencyKey = text(recordValue(source, "idempotencyKey", "idempotency_key"));
  const createdAt = text(recordValue(source, "createdAt", "created_at"));
  const expiresAt = text(recordValue(source, "expiresAt", "expires_at"));
  if (!actionId || !screenId || !summary || !idempotencyKey || !createdAt || !expiresAt) {
    return null;
  }

  return {
    actionId,
    actionType,
    status,
    riskLevel: normalizeRiskLevel(recordValue(source, "riskLevel", "risk_level"), actionType),
    role: normalizeRole(recordValue(source, "role", "requested_role"), params.fallbackRole),
    screenId,
    domain,
    summary,
    redactedPayload: recordValue(source, "redactedPayload", "redacted_payload") ?? {},
    evidenceRefs: arrayOfText(recordValue(source, "evidenceRefs", "evidence_refs")),
    idempotencyKey,
    requestedByUserIdHash:
      optionalText(recordValue(source, "requestedByUserIdHash", "requested_by_user_id_hash")) ??
      params.fallbackUserIdHash,
    organizationIdHash:
      optionalText(recordValue(source, "organizationIdHash", "organization_id_hash")) ??
      params.fallbackOrganizationIdHash,
    createdAt,
    expiresAt,
    approvedByUserIdHash: optionalText(
      recordValue(source, "approvedByUserIdHash", "approved_by_user_id_hash"),
    ),
    executedAt: optionalText(recordValue(source, "executedAt", "executed_at")),
  };
}

export function resolveAiActionLedgerRpcBackendReadiness(
  options: Pick<AiActionLedgerRpcBackendOptions, "organizationId" | "actorUserId" | "actorRole">,
): AiActionLedgerRpcBackendReadiness {
  const ready =
    isUuid(options.organizationId) &&
    Boolean(options.actorUserId.trim()) &&
    options.actorRole !== "unknown";
  return {
    ready,
    mounted: ready,
    reason: ready
      ? undefined
      : "Persistent AI action ledger RPC backend requires server-resolved organization, actor, and role scope.",
    blocker: ready ? undefined : "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
    rawIdsExposed: false,
    finalExecution: false,
  };
}

export function createAiActionLedgerRpcBackend(
  options: AiActionLedgerRpcBackendOptions,
): AiActionLedgerPersistentBackend | null {
  const readiness = resolveAiActionLedgerRpcBackendReadiness(options);
  if (!readiness.ready) return null;

  const transport = options.transport ?? defaultAiActionLedgerRpcTransport;
  const organizationIdHash =
    options.organizationIdHash ?? stableHashOpaqueId("org", options.organizationId);
  const actorUserIdHash =
    options.actorUserIdHash ?? stableHashOpaqueId("user", options.actorUserId);

  const call = async (
    fn: AiActionLedgerRpcFunctionName,
    args: Record<string, unknown>,
  ): Promise<unknown> => {
    const result = await transport(fn, args);
    if (result.error) throw blockerFromTransportError(result.error);
    const blocked = blockerFromRpc(result.data);
    if (blocked) throw blocked;
    return result.data;
  };

  const mapRecord = (value: unknown): AiActionLedgerRecord | null =>
    ensureRecordFromRpc({
      value,
      fallbackRole: options.actorRole,
      fallbackOrganizationIdHash: organizationIdHash,
      fallbackUserIdHash: actorUserIdHash,
    });

  return {
    mounted: true,
    ...(options.executeApprovedStatusTransitionMounted === true
      ? { canPersistExecutedStatus: true as const }
      : {}),
    async listByOrganization(requestedOrganizationIdHash, page) {
      if (requestedOrganizationIdHash !== organizationIdHash) {
        return { records: [], nextCursor: null };
      }
      const limit = normalizeLimit(page.limit);
      const offset = normalizeCursorOffset(page.cursor);
      const payload = await call(AI_ACTION_LEDGER_RPC_FUNCTIONS.listByOrganization, {
        p_organization_id: options.organizationId,
        p_limit: limit,
        p_offset: offset,
        p_actor_role: options.actorRole,
      });
      const records = isJsonRecord(payload) && Array.isArray(payload.records)
        ? payload.records.map(mapRecord).filter((record): record is AiActionLedgerRecord => record !== null)
        : [];
      const nextCursor = isJsonRecord(payload) ? optionalText(payload.nextCursor) ?? null : null;
      return { records, nextCursor };
    },
    async findByIdempotencyKey(requestedOrganizationIdHash, idempotencyKey) {
      if (requestedOrganizationIdHash !== organizationIdHash) return null;
      const payload = await call(AI_ACTION_LEDGER_RPC_FUNCTIONS.findByIdempotencyKey, {
        p_organization_id: options.organizationId,
        p_idempotency_key: idempotencyKey,
        p_actor_role: options.actorRole,
      });
      if (isJsonRecord(payload) && payload.status === "not_found") return null;
      return mapRecord(payload);
    },
    async findByActionId(actionId) {
      if (!isUuid(actionId)) return null;
      const payload = await call(AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus, {
        p_action_id: actionId,
        p_actor_role: options.actorRole,
      });
      if (isJsonRecord(payload) && payload.status === "not_found") return null;
      return mapRecord(payload);
    },
    async insertPending(record, auditEvent) {
      const payload = await call(AI_ACTION_LEDGER_RPC_FUNCTIONS.submitForApproval, {
        p_organization_id: options.organizationId,
        p_action_type: record.actionType,
        p_risk_level: record.riskLevel,
        p_screen_id: record.screenId,
        p_domain: record.domain,
        p_summary: record.summary,
        p_redacted_payload: record.redactedPayload,
        p_evidence_refs: record.evidenceRefs,
        p_idempotency_key: record.idempotencyKey,
        p_expires_at: record.expiresAt,
        p_actor_role: options.actorRole,
        p_requested_by_user_id_hash: record.requestedByUserIdHash,
        p_organization_id_hash: record.organizationIdHash,
        p_audit_reason: auditEvent.reason,
      });
      const persisted = mapRecord(payload);
      if (!persisted) {
        throw new AiActionLedgerBackendBlockedError(
          "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED",
          "AI action ledger submit RPC returned an invalid persistent record.",
        );
      }
      return persisted;
    },
    async updateStatus(actionId, status, patch, auditEvent: AiActionLedgerAuditEvent) {
      if (!isUuid(actionId)) {
        throw new AiActionLedgerBackendBlockedError(
          "BLOCKED_APPROVAL_ACTION_INVALID_INPUT",
          "AI action ledger RPC backend requires a UUID actionId.",
        );
      }
      const fn =
        status === "approved"
          ? AI_ACTION_LEDGER_RPC_FUNCTIONS.approve
          : status === "rejected"
            ? AI_ACTION_LEDGER_RPC_FUNCTIONS.reject
            : status === "executed" && options.executeApprovedStatusTransitionMounted === true
              ? AI_ACTION_LEDGER_RPC_FUNCTIONS.executeApproved
              : null;
      if (!fn) {
        throw new AiActionLedgerBackendBlockedError(
          "BLOCKED_APPROVAL_ACTION_TRANSITION_DENIED",
          `AI action ledger RPC backend does not support transition to ${status}.`,
        );
      }
      if (status === "executed" && (!patch.executedAt || patch.redactedPayload == null)) {
        throw new AiActionLedgerBackendBlockedError(
          "BLOCKED_APPROVAL_ACTION_INVALID_INPUT",
          "AI action ledger execute-approved RPC requires executedAt and redactedPayload.",
        );
      }
      const payload = await call(
        fn,
        status === "executed"
          ? {
              p_action_id: actionId,
              p_actor_role: options.actorRole,
              p_reason: auditEvent.reason,
              p_executed_at: patch.executedAt,
              p_redacted_payload: patch.redactedPayload,
            }
          : {
              p_action_id: actionId,
              p_actor_role: options.actorRole,
              p_reason: auditEvent.reason,
              p_approved_by_user_id_hash: patch.approvedByUserIdHash,
            },
      );
      const updated = mapRecord(payload);
      if (!updated) {
        throw new AiActionLedgerBackendBlockedError(
          "BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED",
          "AI action ledger decision RPC returned an invalid persistent record.",
        );
      }
      return updated;
    },
  };
}
