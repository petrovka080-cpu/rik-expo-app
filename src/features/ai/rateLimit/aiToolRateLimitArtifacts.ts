import { AI_TOOL_NAMES } from "../tools/aiToolRegistry";
import {
  getAiToolBudgetPolicy,
  listAiToolBudgetPolicies,
  validateAiToolBudgetPolicy,
} from "./aiToolBudgetPolicy";
import {
  getAiToolRateLimitPolicy,
  listAiToolRateLimitPolicies,
  validateAiToolRateLimitPolicy,
} from "./aiToolRateLimitPolicy";

export type AiToolRateLimitInventory = {
  final_status: "GREEN_AI_TOOL_RATE_LIMIT_BUDGET_READY" | "BLOCKED_TOOL_MISSING_RATE_SCOPE";
  registered_tools: number;
  rate_limit_policies: number;
  budget_policies: number;
  missing_rate_limit_policies: string[];
  missing_budget_policies: string[];
  invalid_rate_limit_policies: string[];
  invalid_budget_policies: string[];
  approval_tools_require_idempotency: true;
  unlimited_retries_allowed: false;
  enforcement_enabled_by_default: false;
  credentials_printed: false;
};

export type AiToolRateLimitMatrix = {
  final_status: "GREEN_AI_TOOL_RATE_LIMIT_BUDGET_READY" | "BLOCKED_TOOL_MISSING_RATE_SCOPE";
  all_tools_have_rate_scope: boolean;
  all_tools_have_budget_policy: boolean;
  all_tools_have_max_payload: boolean;
  all_tools_have_max_result_limit: boolean;
  all_tools_have_role_scope: boolean;
  approval_tools_have_idempotency: boolean;
  audit_required: boolean;
  evidence_required: boolean;
  unlimited_retries: false;
  production_env_mutation: false;
  secrets_printed: false;
};

export function buildAiToolRateLimitInventory(): AiToolRateLimitInventory {
  const ratePolicies = listAiToolRateLimitPolicies();
  const budgetPolicies = listAiToolBudgetPolicies();
  const missingRate = AI_TOOL_NAMES.filter((toolName) => !getAiToolRateLimitPolicy(toolName));
  const missingBudget = AI_TOOL_NAMES.filter((toolName) => !getAiToolBudgetPolicy(toolName));
  const invalidRate = ratePolicies
    .filter((entry) => !validateAiToolRateLimitPolicy(entry))
    .map((entry) => entry.toolName);
  const invalidBudget = budgetPolicies
    .filter((entry) => !validateAiToolBudgetPolicy(entry))
    .map((entry) => entry.toolName);
  const green =
    missingRate.length === 0 &&
    missingBudget.length === 0 &&
    invalidRate.length === 0 &&
    invalidBudget.length === 0;

  return {
    final_status: green ? "GREEN_AI_TOOL_RATE_LIMIT_BUDGET_READY" : "BLOCKED_TOOL_MISSING_RATE_SCOPE",
    registered_tools: AI_TOOL_NAMES.length,
    rate_limit_policies: ratePolicies.length,
    budget_policies: budgetPolicies.length,
    missing_rate_limit_policies: missingRate,
    missing_budget_policies: missingBudget,
    invalid_rate_limit_policies: invalidRate,
    invalid_budget_policies: invalidBudget,
    approval_tools_require_idempotency: true,
    unlimited_retries_allowed: false,
    enforcement_enabled_by_default: false,
    credentials_printed: false,
  };
}

export function buildAiToolRateLimitMatrix(): AiToolRateLimitMatrix {
  const ratePolicies = listAiToolRateLimitPolicies();
  const budgetPolicies = listAiToolBudgetPolicies();
  const allToolsHaveRateScope = AI_TOOL_NAMES.every((toolName) => {
    const policy = getAiToolRateLimitPolicy(toolName);
    return Boolean(policy?.rateLimitScope && policy.allowedRoles.length > 0);
  });
  const allToolsHaveBudgetPolicy = AI_TOOL_NAMES.every((toolName) => Boolean(getAiToolBudgetPolicy(toolName)));
  const allToolsHaveMaxPayload = budgetPolicies.every((entry) => entry.maxPayloadBytes > 0);
  const allToolsHaveMaxResultLimit = budgetPolicies.every((entry) => entry.maxResultLimit > 0);
  const allToolsHaveRoleScope = ratePolicies.every((entry) => entry.roleScoped && entry.allowedRoles.length > 0);
  const approvalToolsHaveIdempotency = ratePolicies
    .filter((entry) => entry.riskLevel === "approval_required")
    .every((entry) => entry.idempotencyRequired);
  const auditRequired = ratePolicies.every((entry) => entry.auditRequired);
  const evidenceRequired = ratePolicies.every((entry) => entry.evidenceRequired);
  const green =
    allToolsHaveRateScope &&
    allToolsHaveBudgetPolicy &&
    allToolsHaveMaxPayload &&
    allToolsHaveMaxResultLimit &&
    allToolsHaveRoleScope &&
    approvalToolsHaveIdempotency &&
    auditRequired &&
    evidenceRequired;

  return {
    final_status: green ? "GREEN_AI_TOOL_RATE_LIMIT_BUDGET_READY" : "BLOCKED_TOOL_MISSING_RATE_SCOPE",
    all_tools_have_rate_scope: allToolsHaveRateScope,
    all_tools_have_budget_policy: allToolsHaveBudgetPolicy,
    all_tools_have_max_payload: allToolsHaveMaxPayload,
    all_tools_have_max_result_limit: allToolsHaveMaxResultLimit,
    all_tools_have_role_scope: allToolsHaveRoleScope,
    approval_tools_have_idempotency: approvalToolsHaveIdempotency,
    audit_required: auditRequired,
    evidence_required: evidenceRequired,
    unlimited_retries: false,
    production_env_mutation: false,
    secrets_printed: false,
  };
}
