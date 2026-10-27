import { AI_TOOL_NAMES } from "../tools/aiToolRegistry";
import type { AiToolName } from "../tools/aiToolTypes";

export type AiToolBudgetPolicy = {
  toolName: AiToolName;
  maxPayloadBytes: number;
  maxResultLimit: number;
  defaultResultLimit: number;
  maxInputItems: number;
  maxEvidenceRefs: number;
  maxCursorBytes: number;
  maxRetriesPerRequest: number;
  unlimitedRetriesAllowed: false;
  boundedRequestRequired: true;
  idempotencyRecommended: boolean;
  idempotencyRequired: boolean;
};

const policy = (value: AiToolBudgetPolicy): AiToolBudgetPolicy => Object.freeze(value);

export const AI_TOOL_BUDGET_POLICIES: readonly AiToolBudgetPolicy[] = Object.freeze([
  policy({
    toolName: "search_catalog",
    maxPayloadBytes: 4_096,
    maxResultLimit: 20,
    defaultResultLimit: 10,
    maxInputItems: 1,
    maxEvidenceRefs: 20,
    maxCursorBytes: 256,
    maxRetriesPerRequest: 1,
    unlimitedRetriesAllowed: false,
    boundedRequestRequired: true,
    idempotencyRecommended: false,
    idempotencyRequired: false,
  }),
  policy({
    toolName: "compare_suppliers",
    maxPayloadBytes: 8_192,
    maxResultLimit: 10,
    defaultResultLimit: 5,
    maxInputItems: 20,
    maxEvidenceRefs: 10,
    maxCursorBytes: 0,
    maxRetriesPerRequest: 1,
    unlimitedRetriesAllowed: false,
    boundedRequestRequired: true,
    idempotencyRecommended: false,
    idempotencyRequired: false,
  }),
  policy({
    toolName: "get_warehouse_status",
    maxPayloadBytes: 4_096,
    maxResultLimit: 20,
    defaultResultLimit: 10,
    maxInputItems: 1,
    maxEvidenceRefs: 20,
    maxCursorBytes: 256,
    maxRetriesPerRequest: 1,
    unlimitedRetriesAllowed: false,
    boundedRequestRequired: true,
    idempotencyRecommended: false,
    idempotencyRequired: false,
  }),
  policy({
    toolName: "get_finance_summary",
    maxPayloadBytes: 4_096,
    maxResultLimit: 10,
    defaultResultLimit: 1,
    maxInputItems: 1,
    maxEvidenceRefs: 10,
    maxCursorBytes: 0,
    maxRetriesPerRequest: 1,
    unlimitedRetriesAllowed: false,
    boundedRequestRequired: true,
    idempotencyRecommended: false,
    idempotencyRequired: false,
  }),
  policy({
    toolName: "draft_request",
    maxPayloadBytes: 16_384,
    maxResultLimit: 1,
    defaultResultLimit: 1,
    maxInputItems: 50,
    maxEvidenceRefs: 60,
    maxCursorBytes: 0,
    maxRetriesPerRequest: 1,
    unlimitedRetriesAllowed: false,
    boundedRequestRequired: true,
    idempotencyRecommended: true,
    idempotencyRequired: false,
  }),
  policy({
    toolName: "draft_report",
    maxPayloadBytes: 12_288,
    maxResultLimit: 1,
    defaultResultLimit: 1,
    maxInputItems: 20,
    maxEvidenceRefs: 40,
    maxCursorBytes: 0,
    maxRetriesPerRequest: 1,
    unlimitedRetriesAllowed: false,
    boundedRequestRequired: true,
    idempotencyRecommended: true,
    idempotencyRequired: false,
  }),
  policy({
    toolName: "draft_act",
    maxPayloadBytes: 16_384,
    maxResultLimit: 1,
    defaultResultLimit: 1,
    maxInputItems: 50,
    maxEvidenceRefs: 80,
    maxCursorBytes: 0,
    maxRetriesPerRequest: 1,
    unlimitedRetriesAllowed: false,
    boundedRequestRequired: true,
    idempotencyRecommended: true,
    idempotencyRequired: false,
  }),
  policy({
    toolName: "submit_for_approval",
    maxPayloadBytes: 8_192,
    maxResultLimit: 1,
    defaultResultLimit: 1,
    maxInputItems: 1,
    maxEvidenceRefs: 20,
    maxCursorBytes: 0,
    maxRetriesPerRequest: 0,
    unlimitedRetriesAllowed: false,
    boundedRequestRequired: true,
    idempotencyRecommended: true,
    idempotencyRequired: true,
  }),
  policy({
    toolName: "get_action_status",
    maxPayloadBytes: 4_096,
    maxResultLimit: 1,
    defaultResultLimit: 1,
    maxInputItems: 1,
    maxEvidenceRefs: 20,
    maxCursorBytes: 0,
    maxRetriesPerRequest: 1,
    unlimitedRetriesAllowed: false,
    boundedRequestRequired: true,
    idempotencyRecommended: false,
    idempotencyRequired: false,
  }),
]);

export function listAiToolBudgetPolicies(): AiToolBudgetPolicy[] {
  return [...AI_TOOL_BUDGET_POLICIES];
}

export function getAiToolBudgetPolicy(toolName: AiToolName): AiToolBudgetPolicy | null {
  return AI_TOOL_BUDGET_POLICIES.find((entry) => entry.toolName === toolName) ?? null;
}

export function validateAiToolBudgetPolicy(policyToValidate: AiToolBudgetPolicy): boolean {
  return (
    Number.isInteger(policyToValidate.maxPayloadBytes) &&
    policyToValidate.maxPayloadBytes > 0 &&
    Number.isInteger(policyToValidate.maxResultLimit) &&
    policyToValidate.maxResultLimit > 0 &&
    Number.isInteger(policyToValidate.defaultResultLimit) &&
    policyToValidate.defaultResultLimit > 0 &&
    policyToValidate.defaultResultLimit <= policyToValidate.maxResultLimit &&
    Number.isInteger(policyToValidate.maxInputItems) &&
    policyToValidate.maxInputItems > 0 &&
    Number.isInteger(policyToValidate.maxEvidenceRefs) &&
    policyToValidate.maxEvidenceRefs > 0 &&
    Number.isInteger(policyToValidate.maxCursorBytes) &&
    policyToValidate.maxCursorBytes >= 0 &&
    Number.isInteger(policyToValidate.maxRetriesPerRequest) &&
    policyToValidate.maxRetriesPerRequest >= 0 &&
    policyToValidate.unlimitedRetriesAllowed === false &&
    policyToValidate.boundedRequestRequired === true &&
    (!policyToValidate.idempotencyRequired || policyToValidate.idempotencyRecommended)
  );
}

export function allAiToolsHaveBudgetPolicy(): boolean {
  return AI_TOOL_NAMES.every((toolName) => Boolean(getAiToolBudgetPolicy(toolName)));
}
