import type { AiApprovalStatus } from "../approval/aiApprovalTypes";
import {
  AI_DOMAINS,
  canUseAiCapability,
  type AiDomain,
  type AiUserRole,
} from "../policy/aiRolePolicy";
import type { AiActionType } from "../policy/aiRiskPolicy";
import {
  decideAiToolRateLimit,
  explainAiToolRateLimitBlock,
  measureAiToolPayloadBytes,
} from "../rateLimit/aiToolRateLimitDecision";
import { planAiToolUse } from "./aiToolPlanPolicy";
import {
  ledgerActionToToolAction,
  readActionStatusTransport,
  type AiActionLedgerRepository,
} from "./transport/getActionStatus.transport";

export const GET_ACTION_STATUS_TOOL_NAME = "get_action_status" as const;
export const GET_ACTION_STATUS_ROUTE_OPERATION = "ai.approval.action.status.local" as const;
export const GET_ACTION_STATUS_AUDIT_EVENT = "ai.policy.checked" as const;
export const GET_ACTION_STATUS_MAX_EVIDENCE_REFS = 20;

export type GetActionStatusReadableStatus =
  | "not_found"
  | "draft"
  | "approval_required"
  | "approved"
  | "rejected"
  | "executed"
  | "expired"
  | "blocked";

export type GetActionStatusSnapshot = {
  action_id?: string;
  action_status?: AiApprovalStatus;
  action_type?: AiActionType;
  screen_id?: string;
  domain?: AiDomain;
  evidence_refs?: string[];
  created_at?: string;
  expires_at?: string;
};

export type GetActionStatusToolInput = {
  action_id?: string;
  status_snapshot?: GetActionStatusSnapshot;
};

export type GetActionStatusToolOutput = {
  action_id: string;
  status: GetActionStatusReadableStatus;
  action_status: AiApprovalStatus | "not_found";
  action_type: AiActionType | "unknown";
  screen_id: string;
  domain: AiDomain | "unknown";
  evidence_refs: string[];
  route_operation: typeof GET_ACTION_STATUS_ROUTE_OPERATION;
  audit_event: typeof GET_ACTION_STATUS_AUDIT_EVENT;
  lookup_performed: boolean;
  local_snapshot_used: boolean;
  persisted: boolean;
  mutation_count: 0;
  final_execution: 0;
  provider_called: false;
  db_accessed: boolean;
  raw_payload_exposed: false;
  direct_execution_enabled: false;
};

export type GetActionStatusToolAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type GetActionStatusToolRequest = {
  auth: GetActionStatusToolAuthContext | null;
  input: unknown;
  repository?: AiActionLedgerRepository;
};

export type GetActionStatusToolErrorCode =
  | "GET_ACTION_STATUS_AUTH_REQUIRED"
  | "GET_ACTION_STATUS_ROLE_NOT_ALLOWED"
  | "GET_ACTION_STATUS_INVALID_INPUT"
  | "GET_ACTION_STATUS_SCOPE_DENIED";

export type GetActionStatusToolEnvelope =
  | {
      ok: true;
      data: GetActionStatusToolOutput;
    }
  | {
      ok: false;
      error: {
        code: GetActionStatusToolErrorCode;
        message: string;
      };
    };

type NormalizedActionStatusSnapshot = {
  action_id: string;
  action_status: AiApprovalStatus;
  action_type: AiActionType | null;
  screen_id: string | null;
  domain: AiDomain | null;
  evidence_refs: string[];
  created_at: string | null;
  expires_at: string | null;
};

type NormalizedGetActionStatusInput = {
  action_id: string;
  status_snapshot: NormalizedActionStatusSnapshot | null;
};

type InputValidationResult =
  | { ok: true; value: NormalizedGetActionStatusInput }
  | { ok: false; message: string };

const ACTION_STATUSES: readonly AiApprovalStatus[] = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "executed",
  "expired",
  "blocked",
];

const ACTION_TYPES: readonly AiActionType[] = [
  "search_catalog",
  "compare_suppliers",
  "summarize_project",
  "summarize_finance",
  "summarize_warehouse",
  "explain_status",
  "draft_request",
  "draft_report",
  "draft_act",
  "draft_supplier_message",
  "submit_request",
  "confirm_supplier",
  "create_order",
  "change_warehouse_status",
  "send_document",
  "change_payment_status",
  "generate_final_pdf_if_it_changes_status",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeActionStatus(value: unknown): AiApprovalStatus | null {
  return ACTION_STATUSES.find((status) => status === value) ?? null;
}

function normalizeActionType(value: unknown): AiActionType | null {
  return ACTION_TYPES.find((actionType) => actionType === value) ?? null;
}

function normalizeDomain(value: unknown): AiDomain | null {
  return AI_DOMAINS.find((domain) => domain === value) ?? null;
}

function normalizeDateText(value: unknown): string | null {
  const text = normalizeOptionalText(value);
  if (!text) return null;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function normalizeEvidenceRefs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeOptionalText)
    .filter((ref): ref is string => ref !== null)
    .slice(0, GET_ACTION_STATUS_MAX_EVIDENCE_REFS);
}

function normalizeSnapshot(
  actionId: string,
  value: unknown,
): { ok: true; snapshot: NormalizedActionStatusSnapshot | null } | { ok: false; message: string } {
  if (value === undefined || value === null) return { ok: true, snapshot: null };
  if (!isRecord(value)) {
    return { ok: false, message: "get_action_status status_snapshot must be an object" };
  }

  const snapshotActionId = normalizeOptionalText(value.action_id);
  const status = normalizeActionStatus(value.action_status);
  if (!snapshotActionId || snapshotActionId !== actionId) {
    return {
      ok: false,
      message: "get_action_status status_snapshot action_id must match action_id",
    };
  }
  if (!status) {
    return {
      ok: false,
      message: "get_action_status status_snapshot action_status is required",
    };
  }

  return {
    ok: true,
    snapshot: {
      action_id: snapshotActionId,
      action_status: status,
      action_type: normalizeActionType(value.action_type),
      screen_id: normalizeOptionalText(value.screen_id),
      domain: normalizeDomain(value.domain),
      evidence_refs: normalizeEvidenceRefs(value.evidence_refs),
      created_at: normalizeDateText(value.created_at),
      expires_at: normalizeDateText(value.expires_at),
    },
  };
}

function normalizeInput(input: unknown): InputValidationResult {
  if (!isRecord(input)) {
    return { ok: false, message: "get_action_status input must be an object" };
  }

  const actionId = normalizeOptionalText(input.action_id);
  if (!actionId) {
    return { ok: false, message: "get_action_status action_id is required" };
  }

  const snapshot = normalizeSnapshot(actionId, input.status_snapshot);
  if (!snapshot.ok) return { ok: false, message: snapshot.message };

  return {
    ok: true,
    value: {
      action_id: actionId,
      status_snapshot: snapshot.snapshot,
    },
  };
}

function isAuthenticated(
  auth: GetActionStatusToolAuthContext | null,
): auth is GetActionStatusToolAuthContext {
  return auth !== null && auth.userId.trim().length > 0 && auth.role !== "unknown";
}

function toReadableStatus(status: AiApprovalStatus | "not_found"): GetActionStatusReadableStatus {
  if (status === "pending") return "approval_required";
  return status;
}

function buildEvidenceRefs(snapshot: NormalizedActionStatusSnapshot | null): string[] {
  if (!snapshot) return ["action_status:local:no_persisted_lookup"];
  const refs = [
    "action_status:local:snapshot",
    ...snapshot.evidence_refs,
  ].slice(0, GET_ACTION_STATUS_MAX_EVIDENCE_REFS);
  return refs.length > 0 ? refs : ["action_status:local:snapshot"];
}

export async function runGetActionStatusToolSafeRead(
  request: GetActionStatusToolRequest,
): Promise<GetActionStatusToolEnvelope> {
  if (!isAuthenticated(request.auth)) {
    return {
      ok: false,
      error: {
        code: "GET_ACTION_STATUS_AUTH_REQUIRED",
        message: "get_action_status requires authenticated role context",
      },
    };
  }

  const plan = planAiToolUse({
    toolName: GET_ACTION_STATUS_TOOL_NAME,
    role: request.auth.role,
  });
  if (!plan.allowed || plan.mode !== "read_contract_plan") {
    return {
      ok: false,
      error: {
        code: "GET_ACTION_STATUS_ROLE_NOT_ALLOWED",
        message: "get_action_status is not visible for this role",
      },
    };
  }

  const input = normalizeInput(request.input);
  if (!input.ok) {
    return {
      ok: false,
      error: {
        code: "GET_ACTION_STATUS_INVALID_INPUT",
        message: input.message,
      },
    };
  }

  const rateDecision = decideAiToolRateLimit({
    toolName: GET_ACTION_STATUS_TOOL_NAME,
    role: request.auth.role,
    payloadBytes: measureAiToolPayloadBytes(request.input),
    requestedLimit: 1,
  });
  if (!rateDecision.allowed) {
    return {
      ok: false,
      error: {
        code: "GET_ACTION_STATUS_INVALID_INPUT",
        message: explainAiToolRateLimitBlock(rateDecision),
      },
    };
  }

  if (request.repository) {
    const status = await readActionStatusTransport({
      actionId: input.value.action_id,
      role: request.auth.role,
      repository: request.repository,
    });
    const record = status.record;
    return {
      ok: true,
      data: {
        action_id: input.value.action_id,
        status: status.status === "pending" ? "approval_required" : status.status === "blocked" ? "blocked" : status.status,
        action_status:
          status.status === "not_found" || status.status === "blocked"
            ? status.status === "not_found"
              ? "not_found"
              : "blocked"
            : status.status,
        action_type: ledgerActionToToolAction(record?.actionType),
        screen_id: record?.screenId ?? "unknown",
        domain: record?.domain ?? "unknown",
        evidence_refs: record?.evidenceRefs ?? ["action_status:persistent:lookup"],
        route_operation: GET_ACTION_STATUS_ROUTE_OPERATION,
        audit_event: GET_ACTION_STATUS_AUDIT_EVENT,
        lookup_performed: true,
        local_snapshot_used: false,
        persisted: status.persistedLookup,
        mutation_count: 0,
        final_execution: 0,
        provider_called: false,
        db_accessed: status.persistentBackend,
        raw_payload_exposed: false,
        direct_execution_enabled: false,
      },
    };
  }

  const snapshot = input.value.status_snapshot;
  if (
    snapshot?.domain &&
    !canUseAiCapability({
      role: request.auth.role,
      domain: snapshot.domain,
      capability: "read_context",
    })
  ) {
    return {
      ok: false,
      error: {
        code: "GET_ACTION_STATUS_SCOPE_DENIED",
        message: "get_action_status snapshot is outside the authenticated role scope",
      },
    };
  }

  const actionStatus = snapshot?.action_status ?? "not_found";

  return {
    ok: true,
    data: {
      action_id: input.value.action_id,
      status: toReadableStatus(actionStatus),
      action_status: actionStatus,
      action_type: snapshot?.action_type ?? "unknown",
      screen_id: snapshot?.screen_id ?? "unknown",
      domain: snapshot?.domain ?? "unknown",
      evidence_refs: buildEvidenceRefs(snapshot),
      route_operation: GET_ACTION_STATUS_ROUTE_OPERATION,
      audit_event: GET_ACTION_STATUS_AUDIT_EVENT,
      lookup_performed: false,
      local_snapshot_used: snapshot !== null,
      persisted: false,
      mutation_count: 0,
      final_execution: 0,
      provider_called: false,
      db_accessed: false,
      raw_payload_exposed: false,
      direct_execution_enabled: false,
    },
  };
}
