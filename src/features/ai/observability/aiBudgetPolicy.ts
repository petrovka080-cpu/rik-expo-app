import type { AiScreenButtonActionKind } from "../screenAudit/aiScreenButtonRoleActionTypes";
import {
  listAiRolePermissionActionMatrixEntries,
  type AiRolePermissionActionMatrixEntry,
} from "../security/aiRolePermissionActionMatrix";

export const AI_BUDGET_POLICY_ID = "ai_budget_policy_v1" as const;

export type AiBudgetRetryOutcome = "timeout" | "transient_transport_error";

export type AiBudgetRetryPolicy = {
  maxAttempts: 1 | 2;
  backoffMs: number;
  retryableOutcomes: readonly AiBudgetRetryOutcome[];
  jitter: false;
};

export type AiActionBudgetPolicy = {
  policyId: typeof AI_BUDGET_POLICY_ID;
  actionKind: AiScreenButtonActionKind;
  maxCards: number;
  maxEvidenceItems: number;
  maxProviderPayloadBytes: number;
  timeoutMs: number;
  retryPolicy: AiBudgetRetryPolicy;
  rawPromptLoggingAllowed: false;
  rawProviderPayloadStorageAllowed: false;
  rawDbRowsAllowed: false;
  dbWritesAllowed: false;
};

export type AiBudgetEnforcementDecision = {
  policyId: typeof AI_BUDGET_POLICY_ID;
  actionKind: AiScreenButtonActionKind;
  requestedCards: number;
  acceptedCards: number;
  requestedEvidenceItems: number;
  acceptedEvidenceItems: number;
  providerPayloadBytes: number;
  providerPayloadWithinBudget: boolean;
  withinBudget: boolean;
  violations: readonly string[];
  rawPromptLoggingAllowed: false;
  rawProviderPayloadStorageAllowed: false;
  rawDbRowsAllowed: false;
  dbWritesAllowed: false;
};

export type AiBudgetPolicyCoverageSummary = {
  policyId: typeof AI_BUDGET_POLICY_ID;
  auditedActions: number;
  coveredActions: number;
  missingBudgetActions: readonly string[];
  unsafeBudgetActions: readonly string[];
  policies: readonly AiActionBudgetPolicy[];
  coverageComplete: boolean;
  noRawPromptLogging: true;
  noRawProviderPayloadStorage: true;
  noRawRows: true;
  noDbWrites: true;
};

const NO_RETRY_POLICY = Object.freeze({
  maxAttempts: 1,
  backoffMs: 0,
  retryableOutcomes: [],
  jitter: false,
} satisfies AiBudgetRetryPolicy);

const SAFE_READ_RETRY_POLICY = Object.freeze({
  maxAttempts: 2,
  backoffMs: 250,
  retryableOutcomes: ["timeout", "transient_transport_error"],
  jitter: false,
} satisfies AiBudgetRetryPolicy);

const BUDGET_BY_ACTION_KIND: Readonly<Record<AiScreenButtonActionKind, AiActionBudgetPolicy>> = Object.freeze({
  safe_read: Object.freeze({
    policyId: AI_BUDGET_POLICY_ID,
    actionKind: "safe_read",
    maxCards: 6,
    maxEvidenceItems: 12,
    maxProviderPayloadBytes: 8192,
    timeoutMs: 6000,
    retryPolicy: SAFE_READ_RETRY_POLICY,
    rawPromptLoggingAllowed: false,
    rawProviderPayloadStorageAllowed: false,
    rawDbRowsAllowed: false,
    dbWritesAllowed: false,
  } satisfies AiActionBudgetPolicy),
  draft_only: Object.freeze({
    policyId: AI_BUDGET_POLICY_ID,
    actionKind: "draft_only",
    maxCards: 4,
    maxEvidenceItems: 10,
    maxProviderPayloadBytes: 4096,
    timeoutMs: 6000,
    retryPolicy: NO_RETRY_POLICY,
    rawPromptLoggingAllowed: false,
    rawProviderPayloadStorageAllowed: false,
    rawDbRowsAllowed: false,
    dbWritesAllowed: false,
  } satisfies AiActionBudgetPolicy),
  approval_required: Object.freeze({
    policyId: AI_BUDGET_POLICY_ID,
    actionKind: "approval_required",
    maxCards: 3,
    maxEvidenceItems: 12,
    maxProviderPayloadBytes: 2048,
    timeoutMs: 5000,
    retryPolicy: NO_RETRY_POLICY,
    rawPromptLoggingAllowed: false,
    rawProviderPayloadStorageAllowed: false,
    rawDbRowsAllowed: false,
    dbWritesAllowed: false,
  } satisfies AiActionBudgetPolicy),
  forbidden: Object.freeze({
    policyId: AI_BUDGET_POLICY_ID,
    actionKind: "forbidden",
    maxCards: 0,
    maxEvidenceItems: 4,
    maxProviderPayloadBytes: 0,
    timeoutMs: 0,
    retryPolicy: NO_RETRY_POLICY,
    rawPromptLoggingAllowed: false,
    rawProviderPayloadStorageAllowed: false,
    rawDbRowsAllowed: false,
    dbWritesAllowed: false,
  } satisfies AiActionBudgetPolicy),
  unknown_needs_audit: Object.freeze({
    policyId: AI_BUDGET_POLICY_ID,
    actionKind: "unknown_needs_audit",
    maxCards: 0,
    maxEvidenceItems: 0,
    maxProviderPayloadBytes: 0,
    timeoutMs: 0,
    retryPolicy: NO_RETRY_POLICY,
    rawPromptLoggingAllowed: false,
    rawProviderPayloadStorageAllowed: false,
    rawDbRowsAllowed: false,
    dbWritesAllowed: false,
  } satisfies AiActionBudgetPolicy),
});

export function resolveAiBudgetPolicyForActionKind(actionKind: AiScreenButtonActionKind): AiActionBudgetPolicy {
  return BUDGET_BY_ACTION_KIND[actionKind];
}

export function resolveAiBudgetPolicyForAction(
  entry: Pick<AiRolePermissionActionMatrixEntry, "actionKind">,
): AiActionBudgetPolicy {
  return resolveAiBudgetPolicyForActionKind(entry.actionKind);
}

export function enforceAiBudgetPolicy(params: {
  actionKind: AiScreenButtonActionKind;
  requestedCards?: number;
  requestedEvidenceItems?: number;
  providerPayloadBytes?: number;
}): AiBudgetEnforcementDecision {
  const policy = resolveAiBudgetPolicyForActionKind(params.actionKind);
  const requestedCards = Math.max(0, Math.trunc(params.requestedCards ?? 0));
  const requestedEvidenceItems = Math.max(0, Math.trunc(params.requestedEvidenceItems ?? 0));
  const providerPayloadBytes = Math.max(0, Math.trunc(params.providerPayloadBytes ?? 0));
  const providerPayloadWithinBudget = providerPayloadBytes <= policy.maxProviderPayloadBytes;
  const violations = [
    ...(requestedCards > policy.maxCards ? ["cards_exceed_budget"] : []),
    ...(requestedEvidenceItems > policy.maxEvidenceItems ? ["evidence_items_exceed_budget"] : []),
    ...(providerPayloadWithinBudget ? [] : ["provider_payload_exceeds_budget"]),
  ];

  return Object.freeze({
    policyId: AI_BUDGET_POLICY_ID,
    actionKind: params.actionKind,
    requestedCards,
    acceptedCards: Math.min(requestedCards, policy.maxCards),
    requestedEvidenceItems,
    acceptedEvidenceItems: Math.min(requestedEvidenceItems, policy.maxEvidenceItems),
    providerPayloadBytes,
    providerPayloadWithinBudget,
    withinBudget: violations.length === 0,
    violations,
    rawPromptLoggingAllowed: false,
    rawProviderPayloadStorageAllowed: false,
    rawDbRowsAllowed: false,
    dbWritesAllowed: false,
  } satisfies AiBudgetEnforcementDecision);
}

function isBudgetPolicySafe(policy: AiActionBudgetPolicy): boolean {
  return (
    policy.maxCards >= 0 &&
    policy.maxEvidenceItems >= 0 &&
    policy.maxProviderPayloadBytes >= 0 &&
    policy.timeoutMs >= 0 &&
    policy.timeoutMs <= 6000 &&
    policy.retryPolicy.maxAttempts <= 2 &&
    policy.rawPromptLoggingAllowed === false &&
    policy.rawProviderPayloadStorageAllowed === false &&
    policy.rawDbRowsAllowed === false &&
    policy.dbWritesAllowed === false
  );
}

export function verifyAiBudgetPolicyCoverage(
  entries: readonly AiRolePermissionActionMatrixEntry[] = listAiRolePermissionActionMatrixEntries(),
): AiBudgetPolicyCoverageSummary {
  const policies = entries.map((entry) => resolveAiBudgetPolicyForAction(entry));
  const missingBudgetActions = entries
    .filter((entry) => !resolveAiBudgetPolicyForAction(entry))
    .map((entry) => entry.actionId)
    .sort();
  const unsafeBudgetActions = entries
    .filter((entry) => !isBudgetPolicySafe(resolveAiBudgetPolicyForAction(entry)))
    .map((entry) => entry.actionId)
    .sort();

  return Object.freeze({
    policyId: AI_BUDGET_POLICY_ID,
    auditedActions: entries.length,
    coveredActions: entries.length - missingBudgetActions.length,
    missingBudgetActions,
    unsafeBudgetActions,
    policies,
    coverageComplete: missingBudgetActions.length === 0 && unsafeBudgetActions.length === 0,
    noRawPromptLogging: true,
    noRawProviderPayloadStorage: true,
    noRawRows: true,
    noDbWrites: true,
  } satisfies AiBudgetPolicyCoverageSummary);
}
