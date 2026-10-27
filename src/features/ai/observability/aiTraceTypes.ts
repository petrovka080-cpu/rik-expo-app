import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";

export const AI_TRACE_EVENT_NAMES = [
  "ai.tool.plan.created",
  "ai.tool.policy.checked",
  "ai.tool.rate_limit.checked",
  "ai.tool.transport.called",
  "ai.approval.submitted",
  "ai.approval.approved",
  "ai.approval.rejected",
  "ai.action.execute_requested",
  "ai.action.executed",
  "ai.action.blocked",
  "ai.external_intel.checked",
  "ai.command_center.loaded",
] as const;

export type AiTraceEventName = (typeof AI_TRACE_EVENT_NAMES)[number];

export type AiTraceAttributeValue =
  | string
  | number
  | boolean
  | null
  | readonly AiTraceAttributeValue[]
  | { readonly [key: string]: AiTraceAttributeValue };

export type AiTraceAttributes = Record<string, AiTraceAttributeValue>;

export type AiTraceOutcome = "allowed" | "blocked" | "executed" | "read_only";

export type AiTraceEventInput = {
  eventName: AiTraceEventName;
  traceId?: string;
  role?: AiUserRole;
  domain?: AiDomain;
  screenId?: string;
  toolName?: string;
  actionIdHash?: string;
  outcome?: AiTraceOutcome;
  blockedReason?: string;
  evidenceRefs?: readonly string[];
  attributes?: Record<string, unknown>;
  createdAt?: string;
};

export type AiTraceEvent = {
  traceId: string;
  eventName: AiTraceEventName;
  createdAt: string;
  role?: AiUserRole;
  domain?: AiDomain;
  screenId?: string;
  toolName?: string;
  actionIdHash?: string;
  outcome?: AiTraceOutcome;
  blockedReason?: string;
  evidenceRefs: readonly string[];
  attributes: AiTraceAttributes;
  redacted: true;
  rawPromptExposed: false;
  rawProviderPayloadExposed: false;
  rawDbRowsExposed: false;
  credentialsExposed: false;
  fullUserEmailExposed: false;
  authorizationHeaderExposed: false;
  tokenExposed: false;
};
