import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import type { AiActionType } from "../policy/aiRiskPolicy";
import {
  type AiActionLedgerRepository,
  actionTypeForApprovalTransportTarget,
  submitForApprovalTransport,
} from "./transport/submitForApproval.transport";
import { planAiToolUse } from "./aiToolPlanPolicy";
import {
  decideAiToolRateLimit,
  explainAiToolRateLimitBlock,
  measureAiToolPayloadBytes,
} from "../rateLimit/aiToolRateLimitDecision";

export const SUBMIT_FOR_APPROVAL_TOOL_NAME = "submit_for_approval" as const;
export const SUBMIT_FOR_APPROVAL_MAX_EVIDENCE_REFS = 20;
export const SUBMIT_FOR_APPROVAL_AUDIT_EVENT = "ai.action.approval_required" as const;
export const SUBMIT_FOR_APPROVAL_STATUS = "approval_required" as const;
export const SUBMIT_FOR_APPROVAL_RISK_LEVEL = "approval_required" as const;

export type SubmitForApprovalTarget =
  | "request"
  | "report"
  | "act"
  | "supplier_selection"
  | "payment_status_change";

export type SubmitForApprovalToolInput = {
  draft_id?: string;
  approval_target?: SubmitForApprovalTarget;
  screen_id?: string;
  domain?: AiDomain;
  summary?: string;
  idempotency_key?: string;
  evidence_refs?: string[];
  approval_reason?: string;
};

export type SubmitForApprovalToolOutput = {
  status: typeof SUBMIT_FOR_APPROVAL_STATUS;
  action_id: string;
  action_status: "pending";
  approval_required: true;
  audit_event: typeof SUBMIT_FOR_APPROVAL_AUDIT_EVENT;
  approval_target: SubmitForApprovalTarget;
  action_type: AiActionType;
  screen_id: string;
  domain: AiDomain;
  evidence_refs: string[];
  risk_level: typeof SUBMIT_FOR_APPROVAL_RISK_LEVEL;
  idempotency_key_present: true;
  persisted: true;
  local_gate_only: false;
  mutation_count: 0;
  final_execution: 0;
  provider_called: false;
  db_accessed: true;
  direct_execution_enabled: false;
};

export type SubmitForApprovalToolAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type SubmitForApprovalToolRequest = {
  auth: SubmitForApprovalToolAuthContext | null;
  input: unknown;
  organizationId?: string;
  repository?: AiActionLedgerRepository;
};

export type SubmitForApprovalToolErrorCode =
  | "SUBMIT_FOR_APPROVAL_AUTH_REQUIRED"
  | "SUBMIT_FOR_APPROVAL_ROLE_NOT_ALLOWED"
  | "SUBMIT_FOR_APPROVAL_INVALID_INPUT"
  | "SUBMIT_FOR_APPROVAL_POLICY_BLOCKED"
  | "SUBMIT_FOR_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND";

export type SubmitForApprovalToolEnvelope =
  | {
      ok: true;
      data: SubmitForApprovalToolOutput;
    }
  | {
      ok: false;
      error: {
        code: SubmitForApprovalToolErrorCode;
        message: string;
      };
    };

type NormalizedSubmitForApprovalInput = {
  draft_id: string;
  approval_target: SubmitForApprovalTarget;
  screen_id: string;
  domain: AiDomain;
  summary: string;
  idempotency_key: string;
  evidence_refs: string[];
  approval_reason: string;
};

type InputValidationResult =
  | { ok: true; value: NormalizedSubmitForApprovalInput }
  | { ok: false; message: string };

const SUPPORTED_DOMAINS: readonly AiDomain[] = [
  "control",
  "procurement",
  "warehouse",
  "finance",
  "reports",
  "documents",
  "subcontracts",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOptionalText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

function normalizeApprovalTarget(value: unknown): SubmitForApprovalTarget | null {
  if (
    value === "request" ||
    value === "report" ||
    value === "act" ||
    value === "supplier_selection" ||
    value === "payment_status_change"
  ) {
    return value;
  }
  return null;
}

function normalizeDomain(value: unknown): AiDomain | null {
  return SUPPORTED_DOMAINS.find((domain) => domain === value) ?? null;
}

function normalizeEvidenceRefs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeOptionalText)
    .filter((ref) => ref.length > 0)
    .slice(0, SUBMIT_FOR_APPROVAL_MAX_EVIDENCE_REFS);
}

function normalizeInput(input: unknown): InputValidationResult {
  if (!isRecord(input)) {
    return { ok: false, message: "submit_for_approval input must be an object" };
  }

  const draftId = normalizeOptionalText(input.draft_id);
  const approvalTarget = normalizeApprovalTarget(input.approval_target);
  const screenId = normalizeOptionalText(input.screen_id);
  const domain = normalizeDomain(input.domain);
  const summary = normalizeOptionalText(input.summary);
  const idempotencyKey = normalizeOptionalText(input.idempotency_key);
  const evidenceRefs = normalizeEvidenceRefs(input.evidence_refs);
  const missingFields = [
    draftId.length > 0 ? null : "draft_id",
    approvalTarget ? null : "approval_target",
    screenId.length > 0 ? null : "screen_id",
    domain ? null : "domain",
    summary.length > 0 ? null : "summary",
    idempotencyKey.length >= 16 ? null : "idempotency_key",
    evidenceRefs.length > 0 ? null : "evidence_refs",
  ].filter((field): field is string => field !== null);

  if (missingFields.length > 0) {
    return {
      ok: false,
      message: `submit_for_approval missing or invalid fields: ${missingFields.join(", ")}`,
    };
  }
  if (!approvalTarget || !domain) {
    return {
      ok: false,
      message: "submit_for_approval missing policy target or domain",
    };
  }

  return {
    ok: true,
    value: {
      draft_id: draftId,
      approval_target: approvalTarget,
      screen_id: screenId,
      domain,
      summary,
      idempotency_key: idempotencyKey,
      evidence_refs: evidenceRefs,
      approval_reason: normalizeOptionalText(input.approval_reason),
    },
  };
}

function isAuthenticated(
  auth: SubmitForApprovalToolAuthContext | null,
): auth is SubmitForApprovalToolAuthContext {
  return auth !== null && auth.userId.trim().length > 0 && auth.role !== "unknown";
}

export async function runSubmitForApprovalToolGate(
  request: SubmitForApprovalToolRequest,
): Promise<SubmitForApprovalToolEnvelope> {
  if (!isAuthenticated(request.auth)) {
    return {
      ok: false,
      error: {
        code: "SUBMIT_FOR_APPROVAL_AUTH_REQUIRED",
        message: "submit_for_approval requires authenticated role context",
      },
    };
  }

  const plan = planAiToolUse({
    toolName: SUBMIT_FOR_APPROVAL_TOOL_NAME,
    role: request.auth.role,
  });
  if (!plan.allowed || plan.mode !== "approval_gate_plan") {
    return {
      ok: false,
      error: {
        code: "SUBMIT_FOR_APPROVAL_ROLE_NOT_ALLOWED",
        message: "submit_for_approval is not visible for this role",
      },
    };
  }

  const input = normalizeInput(request.input);
  if (!input.ok) {
    return {
      ok: false,
      error: {
        code: "SUBMIT_FOR_APPROVAL_INVALID_INPUT",
        message: input.message,
      },
    };
  }
  const rateDecision = decideAiToolRateLimit({
    toolName: SUBMIT_FOR_APPROVAL_TOOL_NAME,
    role: request.auth.role,
    payloadBytes: measureAiToolPayloadBytes(request.input),
    requestedLimit: 1,
    idempotencyKey: input.value.idempotency_key,
    evidenceRefs: input.value.evidence_refs,
  });
  if (!rateDecision.allowed) {
    return {
      ok: false,
      error: {
        code: "SUBMIT_FOR_APPROVAL_INVALID_INPUT",
        message: explainAiToolRateLimitBlock(rateDecision),
      },
    };
  }

  const actionType = actionTypeForApprovalTransportTarget(input.value.approval_target);
  const action = await submitForApprovalTransport({
    auth: request.auth,
    input: input.value,
    organizationId: request.organizationId,
    actionType,
    repository: request.repository,
  });

  if (action.status !== "pending") {
    return {
      ok: false,
      error: {
        code:
          action.blocker === "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND"
            ? "SUBMIT_FOR_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND"
            : "SUBMIT_FOR_APPROVAL_POLICY_BLOCKED",
        message: action.reason ?? "approval ledger rejected the request before execution",
      },
    };
  }

  return {
    ok: true,
    data: {
      status: SUBMIT_FOR_APPROVAL_STATUS,
      action_id: action.actionId ?? action.record?.actionId ?? "missing_action_id",
      action_status: "pending",
      approval_required: true,
      audit_event: SUBMIT_FOR_APPROVAL_AUDIT_EVENT,
      approval_target: input.value.approval_target,
      action_type: actionType as AiActionType,
      screen_id: action.record?.screenId ?? input.value.screen_id,
      domain: action.record?.domain ?? input.value.domain,
      evidence_refs: action.record?.evidenceRefs ?? input.value.evidence_refs,
      risk_level: SUBMIT_FOR_APPROVAL_RISK_LEVEL,
      idempotency_key_present: true,
      persisted: true,
      local_gate_only: false,
      mutation_count: 0,
      final_execution: 0,
      provider_called: false,
      db_accessed: true,
      direct_execution_enabled: false,
    },
  };
}
