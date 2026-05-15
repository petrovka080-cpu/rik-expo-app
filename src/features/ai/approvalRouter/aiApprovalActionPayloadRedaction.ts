import {
  findAiActionLedgerForbiddenPayloadKeys,
  redactAiActionLedgerPayload,
} from "../actionLedger/aiActionLedgerRedaction";
import type { AiScreenButtonActionEntry } from "../screenAudit/aiScreenButtonRoleActionTypes";
import type { AiApprovalActionPayloadSafety } from "./aiApprovalActionRouterTypes";

function normalizeList(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

export function buildAiApprovalActionRawPayload(entry: AiScreenButtonActionEntry): Record<string, unknown> {
  return {
    source: entry.source,
    screenId: entry.screenId,
    actionId: entry.actionId,
    actionKind: entry.actionKind,
    mutationRisk: entry.mutationRisk,
    label: entry.label,
    roleScope: normalizeList(entry.roleScope),
    primaryDomain: entry.primaryDomain,
    evidenceSources: normalizeList(entry.evidenceSources),
    existingBffRoutes: normalizeList(entry.existingBffRoutes),
    routeStatus: entry.routeStatus,
    recommendedNextWave: entry.recommendedNextWave,
  };
}

export function redactAiApprovalActionPayload(value: unknown): unknown {
  return redactAiActionLedgerPayload(value);
}

export function findAiApprovalActionForbiddenPayloadKeys(value: unknown): string[] {
  return findAiActionLedgerForbiddenPayloadKeys(value);
}

export function buildAiApprovalActionPayloadSafety(value: unknown): AiApprovalActionPayloadSafety {
  const forbiddenKeys = findAiApprovalActionForbiddenPayloadKeys(value);
  return {
    redacted: true,
    forbiddenKeys,
    rawPromptExposed: false,
    rawProviderPayloadExposed: false,
    rawDbRowsExposed: false,
    credentialsExposed: false,
  };
}

export function isAiApprovalActionPayloadSafe(value: unknown): boolean {
  return findAiApprovalActionForbiddenPayloadKeys(value).length === 0;
}
