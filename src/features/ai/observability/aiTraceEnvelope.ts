import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import type { AiScreenButtonActionKind, AiScreenMutationRisk } from "../screenAudit/aiScreenButtonRoleActionTypes";
import {
  listAiRolePermissionActionMatrixEntries,
  type AiRolePermissionActionMatrixEntry,
} from "../security/aiRolePermissionActionMatrix";
import type { AiTraceEventName } from "./aiTraceTypes";

export const AI_TRACE_ENVELOPE_POLICY_ID = "ai_trace_envelope_v1" as const;
export const AI_TRACE_ENVELOPE_REDACTION_POLICY_ID = "ai_trace_redaction_v1" as const;

export type AiTraceEnvelope = {
  policyId: typeof AI_TRACE_ENVELOPE_POLICY_ID;
  traceId: string;
  spanId: string;
  parentTraceId: string | null;
  screenId: string;
  actionId: string;
  actionIdHash: string;
  role: AiUserRole;
  roleScope: readonly AiUserRole[];
  domain: AiDomain;
  actionKind: AiScreenButtonActionKind;
  mutationRisk: AiScreenMutationRisk;
  eventName: AiTraceEventName;
  createdAt: string;
  evidenceRefs: readonly string[];
  budgetPolicyId: string;
  redactionPolicyId: typeof AI_TRACE_ENVELOPE_REDACTION_POLICY_ID;
  approvalRequired: boolean;
  forbidden: boolean;
  rawPromptExposed: false;
  rawProviderPayloadExposed: false;
  rawDbRowsExposed: false;
  credentialsExposed: false;
  providerPayloadStored: false;
  dbWriteInEnvelope: false;
  providerCalled: false;
};

export type AiTraceEnvelopeCoverageSummary = {
  policyId: typeof AI_TRACE_ENVELOPE_POLICY_ID;
  auditedActions: number;
  envelopes: readonly AiTraceEnvelope[];
  missingTraceIdActions: readonly string[];
  duplicateTraceIds: readonly string[];
  missingScreenActionPairs: readonly string[];
  coverageComplete: boolean;
  noRawPrompts: true;
  noRawProviderPayloads: true;
  noRawRows: true;
  noSecrets: true;
  noDbWrites: true;
  noProviderCalls: true;
};

const DEFAULT_CREATED_AT = "2026-05-15T00:00:00.000Z" as const;

function sanitizeTracePart(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9:._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 72);
}

export function stableAiTraceHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
}

export function getAiTraceEventNameForActionKind(actionKind: AiScreenButtonActionKind): AiTraceEventName {
  if (actionKind === "safe_read") return "ai.tool.transport.called";
  if (actionKind === "draft_only") return "ai.tool.plan.created";
  if (actionKind === "approval_required") return "ai.approval.submitted";
  return "ai.action.blocked";
}

export function buildAiTraceId(params: {
  screenId: string;
  actionId: string;
  role: AiUserRole;
  eventName: AiTraceEventName;
}): string {
  const seed = `${params.screenId}:${params.actionId}:${params.role}:${params.eventName}`;
  return [
    "ai_trace",
    sanitizeTracePart(params.screenId),
    sanitizeTracePart(params.actionId),
    sanitizeTracePart(params.role),
    stableAiTraceHash(seed),
  ].join(":");
}

function chooseTraceRole(entry: AiRolePermissionActionMatrixEntry, explicitRole?: AiUserRole): AiUserRole {
  if (explicitRole && entry.roleScope.includes(explicitRole)) return explicitRole;
  return entry.availableRoles[0] ?? entry.roleScope.find((role) => role !== "unknown") ?? "unknown";
}

export function buildAiTraceEnvelopeForActionEntry(
  entry: AiRolePermissionActionMatrixEntry,
  options: {
    role?: AiUserRole;
    eventName?: AiTraceEventName;
    parentTraceId?: string | null;
    createdAt?: string;
    budgetPolicyId?: string;
  } = {},
): AiTraceEnvelope {
  const role = chooseTraceRole(entry, options.role);
  const eventName = options.eventName ?? getAiTraceEventNameForActionKind(entry.actionKind);
  const actionIdHash = stableAiTraceHash(`${entry.screenId}:${entry.actionId}`);

  return Object.freeze({
    policyId: AI_TRACE_ENVELOPE_POLICY_ID,
    traceId: buildAiTraceId({
      screenId: entry.screenId,
      actionId: entry.actionId,
      role,
      eventName,
    }),
    spanId: `span:${actionIdHash}`,
    parentTraceId: options.parentTraceId ? sanitizeTracePart(options.parentTraceId) : null,
    screenId: entry.screenId,
    actionId: entry.actionId,
    actionIdHash,
    role,
    roleScope: [...entry.roleScope],
    domain: entry.domain,
    actionKind: entry.actionKind,
    mutationRisk: entry.mutationRisk,
    eventName,
    createdAt: options.createdAt ?? DEFAULT_CREATED_AT,
    evidenceRefs: [...entry.evidenceBoundary.evidenceRefs],
    budgetPolicyId: options.budgetPolicyId ?? "ai_budget_policy_v1",
    redactionPolicyId: AI_TRACE_ENVELOPE_REDACTION_POLICY_ID,
    approvalRequired: entry.approvalBoundary.required,
    forbidden: entry.forbiddenBoundary.forbidden,
    rawPromptExposed: false,
    rawProviderPayloadExposed: false,
    rawDbRowsExposed: false,
    credentialsExposed: false,
    providerPayloadStored: false,
    dbWriteInEnvelope: false,
    providerCalled: false,
  } satisfies AiTraceEnvelope);
}

export function listAiTraceEnvelopesForAuditedActions(
  entries: readonly AiRolePermissionActionMatrixEntry[] = listAiRolePermissionActionMatrixEntries(),
): AiTraceEnvelope[] {
  return entries.map((entry) => buildAiTraceEnvelopeForActionEntry(entry));
}

export function verifyAiTraceEnvelopeCoverage(
  entries: readonly AiRolePermissionActionMatrixEntry[] = listAiRolePermissionActionMatrixEntries(),
): AiTraceEnvelopeCoverageSummary {
  const envelopes = listAiTraceEnvelopesForAuditedActions(entries);
  const traceIds = new Map<string, number>();
  for (const envelope of envelopes) {
    traceIds.set(envelope.traceId, (traceIds.get(envelope.traceId) ?? 0) + 1);
  }
  const duplicateTraceIds = [...traceIds.entries()]
    .filter(([, count]) => count > 1)
    .map(([traceId]) => traceId)
    .sort();
  const envelopeKeys = new Set(envelopes.map((envelope) => `${envelope.screenId}:${envelope.actionId}`));
  const missingScreenActionPairs = entries
    .filter((entry) => !envelopeKeys.has(`${entry.screenId}:${entry.actionId}`))
    .map((entry) => `${entry.screenId}:${entry.actionId}`)
    .sort();
  const missingTraceIdActions = envelopes
    .filter((envelope) => envelope.traceId.length === 0 || envelope.spanId.length === 0)
    .map((envelope) => envelope.actionId)
    .sort();

  return Object.freeze({
    policyId: AI_TRACE_ENVELOPE_POLICY_ID,
    auditedActions: entries.length,
    envelopes,
    missingTraceIdActions,
    duplicateTraceIds,
    missingScreenActionPairs,
    coverageComplete:
      envelopes.length === entries.length &&
      missingTraceIdActions.length === 0 &&
      duplicateTraceIds.length === 0 &&
      missingScreenActionPairs.length === 0,
    noRawPrompts: true,
    noRawProviderPayloads: true,
    noRawRows: true,
    noSecrets: true,
    noDbWrites: true,
    noProviderCalls: true,
  } satisfies AiTraceEnvelopeCoverageSummary);
}
