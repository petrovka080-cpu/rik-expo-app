import type { AiUserRole } from "../policy/aiRolePolicy";
import { AI_TOOL_NAMES } from "../tools/aiToolRegistry";
import type { AiToolName } from "../tools/aiToolTypes";
import { getAiToolBudgetPolicy, type AiToolBudgetPolicy } from "./aiToolBudgetPolicy";
import { getAiToolRateLimitPolicy, type AiToolRateLimitPolicy } from "./aiToolRateLimitPolicy";

export type AiToolRateLimitDecisionReason =
  | "allowed"
  | "tool_not_registered"
  | "rate_policy_missing"
  | "budget_policy_missing"
  | "role_not_allowed"
  | "payload_too_large"
  | "result_limit_exceeded"
  | "retry_budget_exceeded"
  | "idempotency_key_required"
  | "evidence_required"
  | "window_budget_exceeded";

export type AiToolRateLimitDecisionInput = {
  toolName: string;
  role: AiUserRole;
  payloadBytes?: number | null;
  requestedLimit?: number | null;
  retryAttempt?: number | null;
  requestCountInWindow?: number | null;
  idempotencyKey?: string | null;
  evidenceRefs?: readonly string[] | null;
};

export type AiToolRateLimitDecision = {
  allowed: boolean;
  reason: AiToolRateLimitDecisionReason;
  toolName: string;
  role: AiUserRole;
  rateLimitScope: string | null;
  maxRequestsPerMinute: number | null;
  cooldownMs: number | null;
  maxPayloadBytes: number | null;
  payloadBytes: number | null;
  maxResultLimit: number | null;
  requestedLimit: number | null;
  maxRetriesPerRequest: number | null;
  retryAttempt: number | null;
  remainingInWindow: number | null;
  idempotencyRequired: boolean;
  auditRequired: boolean;
  evidenceRequired: boolean;
  boundedRequestRequired: boolean;
  enforcementEnabledByDefault: false;
  runtimeProviderRequiredForBlocking: true;
  realUserBlockingEnabled: false;
};

function isAiToolName(value: string): value is AiToolName {
  return AI_TOOL_NAMES.some((toolName) => toolName === value);
}

function normalizePositiveInteger(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const normalized = Math.trunc(value);
  return normalized >= 0 ? normalized : null;
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function buildDecision(params: {
  input: AiToolRateLimitDecisionInput;
  policy: AiToolRateLimitPolicy | null;
  budget: AiToolBudgetPolicy | null;
  allowed: boolean;
  reason: AiToolRateLimitDecisionReason;
  payloadBytes: number | null;
  requestedLimit: number | null;
  retryAttempt: number | null;
  remainingInWindow: number | null;
}): AiToolRateLimitDecision {
  return {
    allowed: params.allowed,
    reason: params.reason,
    toolName: params.input.toolName,
    role: params.input.role,
    rateLimitScope: params.policy?.rateLimitScope ?? null,
    maxRequestsPerMinute: params.policy?.maxRequestsPerMinute ?? null,
    cooldownMs: params.policy?.cooldownMs ?? null,
    maxPayloadBytes: params.budget?.maxPayloadBytes ?? null,
    payloadBytes: params.payloadBytes,
    maxResultLimit: params.budget?.maxResultLimit ?? null,
    requestedLimit: params.requestedLimit,
    maxRetriesPerRequest: params.budget?.maxRetriesPerRequest ?? null,
    retryAttempt: params.retryAttempt,
    remainingInWindow: params.remainingInWindow,
    idempotencyRequired: params.policy?.idempotencyRequired ?? params.budget?.idempotencyRequired ?? false,
    auditRequired: params.policy?.auditRequired ?? false,
    evidenceRequired: params.policy?.evidenceRequired ?? false,
    boundedRequestRequired: params.budget?.boundedRequestRequired ?? false,
    enforcementEnabledByDefault: false,
    runtimeProviderRequiredForBlocking: true,
    realUserBlockingEnabled: false,
  };
}

export function measureAiToolPayloadBytes(payload: unknown): number {
  try {
    return JSON.stringify(payload ?? {}).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export function decideAiToolRateLimit(input: AiToolRateLimitDecisionInput): AiToolRateLimitDecision {
  const payloadBytes = normalizePositiveInteger(input.payloadBytes);
  const requestedLimit = normalizePositiveInteger(input.requestedLimit);
  const retryAttempt = normalizePositiveInteger(input.retryAttempt) ?? 0;
  const requestCountInWindow = normalizePositiveInteger(input.requestCountInWindow);

  if (!isAiToolName(input.toolName)) {
    return buildDecision({
      input,
      policy: null,
      budget: null,
      allowed: false,
      reason: "tool_not_registered",
      payloadBytes,
      requestedLimit,
      retryAttempt,
      remainingInWindow: null,
    });
  }

  const policy = getAiToolRateLimitPolicy(input.toolName);
  const budget = getAiToolBudgetPolicy(input.toolName);
  if (!policy) {
    return buildDecision({
      input,
      policy: null,
      budget,
      allowed: false,
      reason: "rate_policy_missing",
      payloadBytes,
      requestedLimit,
      retryAttempt,
      remainingInWindow: null,
    });
  }
  if (!budget) {
    return buildDecision({
      input,
      policy,
      budget: null,
      allowed: false,
      reason: "budget_policy_missing",
      payloadBytes,
      requestedLimit,
      retryAttempt,
      remainingInWindow: null,
    });
  }

  const remainingInWindow =
    requestCountInWindow === null
      ? null
      : Math.max(0, policy.maxRequestsPerMinute + policy.burst - requestCountInWindow);
  const evidenceRefs = input.evidenceRefs ?? [];
  const idempotencyRequired = policy.idempotencyRequired || budget.idempotencyRequired;

  if (!policy.allowedRoles.includes(input.role)) {
    return buildDecision({
      input,
      policy,
      budget,
      allowed: false,
      reason: "role_not_allowed",
      payloadBytes,
      requestedLimit,
      retryAttempt,
      remainingInWindow,
    });
  }
  if (payloadBytes !== null && payloadBytes > budget.maxPayloadBytes) {
    return buildDecision({
      input,
      policy,
      budget,
      allowed: false,
      reason: "payload_too_large",
      payloadBytes,
      requestedLimit,
      retryAttempt,
      remainingInWindow,
    });
  }
  if (requestedLimit !== null && requestedLimit > budget.maxResultLimit) {
    return buildDecision({
      input,
      policy,
      budget,
      allowed: false,
      reason: "result_limit_exceeded",
      payloadBytes,
      requestedLimit,
      retryAttempt,
      remainingInWindow,
    });
  }
  if (retryAttempt > budget.maxRetriesPerRequest) {
    return buildDecision({
      input,
      policy,
      budget,
      allowed: false,
      reason: "retry_budget_exceeded",
      payloadBytes,
      requestedLimit,
      retryAttempt,
      remainingInWindow,
    });
  }
  if (idempotencyRequired && !hasText(input.idempotencyKey)) {
    return buildDecision({
      input,
      policy,
      budget,
      allowed: false,
      reason: "idempotency_key_required",
      payloadBytes,
      requestedLimit,
      retryAttempt,
      remainingInWindow,
    });
  }
  if (policy.riskLevel === "approval_required" && evidenceRefs.length === 0) {
    return buildDecision({
      input,
      policy,
      budget,
      allowed: false,
      reason: "evidence_required",
      payloadBytes,
      requestedLimit,
      retryAttempt,
      remainingInWindow,
    });
  }
  if (requestCountInWindow !== null && requestCountInWindow > policy.maxRequestsPerMinute + policy.burst) {
    return buildDecision({
      input,
      policy,
      budget,
      allowed: false,
      reason: "window_budget_exceeded",
      payloadBytes,
      requestedLimit,
      retryAttempt,
      remainingInWindow,
    });
  }

  return buildDecision({
    input,
    policy,
    budget,
    allowed: true,
    reason: "allowed",
    payloadBytes,
    requestedLimit,
    retryAttempt,
    remainingInWindow,
  });
}

export function explainAiToolRateLimitBlock(decision: AiToolRateLimitDecision): string {
  if (decision.allowed) return "AI tool rate and budget policy allowed the request";
  return `AI tool rate and budget policy blocked ${decision.toolName}: ${decision.reason}`;
}
