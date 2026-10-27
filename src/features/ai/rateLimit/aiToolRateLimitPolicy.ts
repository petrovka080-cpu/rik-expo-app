import type { AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import type { AiRiskLevel } from "../policy/aiRiskPolicy";
import { AI_TOOL_NAMES, getAiToolDefinition } from "../tools/aiToolRegistry";
import type { AiToolName } from "../tools/aiToolTypes";

export type AiToolRateLimitScope = `ai.tool.${AiToolName}`;

export type AiToolRateLimitPolicy = {
  toolName: AiToolName;
  rateLimitScope: AiToolRateLimitScope;
  routeScope: string;
  domain: AiDomain;
  riskLevel: AiRiskLevel;
  allowedRoles: readonly AiUserRole[];
  windowMs: 60_000;
  maxRequestsPerMinute: number;
  burst: number;
  cooldownMs: number;
  maxRetriesPerRequest: number;
  retryCooldownMs: number;
  actorScoped: true;
  organizationScoped: true;
  routeScoped: true;
  roleScoped: true;
  idempotencyRequired: boolean;
  auditRequired: boolean;
  evidenceRequired: boolean;
  defaultEnabled: false;
  enforcementEnabledByDefault: false;
  externalStoreRequiredForLiveEnforcement: true;
};

const MINUTE_MS = 60_000 as const;

function policy(value: Omit<AiToolRateLimitPolicy, "windowMs" | "actorScoped" | "organizationScoped" | "routeScoped" | "roleScoped" | "defaultEnabled" | "enforcementEnabledByDefault" | "externalStoreRequiredForLiveEnforcement">): AiToolRateLimitPolicy {
  return Object.freeze({
    ...value,
    windowMs: MINUTE_MS,
    actorScoped: true,
    organizationScoped: true,
    routeScoped: true,
    roleScoped: true,
    defaultEnabled: false,
    enforcementEnabledByDefault: false,
    externalStoreRequiredForLiveEnforcement: true,
  });
}

export const AI_TOOL_RATE_LIMIT_POLICIES: readonly AiToolRateLimitPolicy[] = Object.freeze([
  policy({
    toolName: "search_catalog",
    rateLimitScope: "ai.tool.search_catalog",
    routeScope: "marketplace.catalog.search",
    domain: "marketplace",
    riskLevel: "safe_read",
    allowedRoles: ["director", "control", "buyer"],
    maxRequestsPerMinute: 30,
    burst: 10,
    cooldownMs: 10_000,
    maxRetriesPerRequest: 1,
    retryCooldownMs: 2_000,
    idempotencyRequired: false,
    auditRequired: true,
    evidenceRequired: true,
  }),
  policy({
    toolName: "compare_suppliers",
    rateLimitScope: "ai.tool.compare_suppliers",
    routeScope: "ai.tool.compare_suppliers",
    domain: "marketplace",
    riskLevel: "safe_read",
    allowedRoles: ["director", "control", "buyer"],
    maxRequestsPerMinute: 20,
    burst: 5,
    cooldownMs: 15_000,
    maxRetriesPerRequest: 1,
    retryCooldownMs: 3_000,
    idempotencyRequired: false,
    auditRequired: true,
    evidenceRequired: true,
  }),
  policy({
    toolName: "get_warehouse_status",
    rateLimitScope: "ai.tool.get_warehouse_status",
    routeScope: "ai.tool.get_warehouse_status",
    domain: "warehouse",
    riskLevel: "safe_read",
    allowedRoles: ["director", "control", "foreman", "buyer", "warehouse"],
    maxRequestsPerMinute: 20,
    burst: 5,
    cooldownMs: 20_000,
    maxRetriesPerRequest: 1,
    retryCooldownMs: 3_000,
    idempotencyRequired: false,
    auditRequired: true,
    evidenceRequired: true,
  }),
  policy({
    toolName: "get_finance_summary",
    rateLimitScope: "ai.tool.get_finance_summary",
    routeScope: "ai.tool.get_finance_summary",
    domain: "finance",
    riskLevel: "safe_read",
    allowedRoles: ["director", "control", "accountant"],
    maxRequestsPerMinute: 15,
    burst: 3,
    cooldownMs: 30_000,
    maxRetriesPerRequest: 1,
    retryCooldownMs: 5_000,
    idempotencyRequired: false,
    auditRequired: true,
    evidenceRequired: true,
  }),
  policy({
    toolName: "draft_request",
    rateLimitScope: "ai.tool.draft_request",
    routeScope: "ai.tool.draft_request",
    domain: "procurement",
    riskLevel: "draft_only",
    allowedRoles: ["director", "control", "foreman", "buyer", "warehouse"],
    maxRequestsPerMinute: 12,
    burst: 3,
    cooldownMs: 30_000,
    maxRetriesPerRequest: 1,
    retryCooldownMs: 5_000,
    idempotencyRequired: false,
    auditRequired: true,
    evidenceRequired: true,
  }),
  policy({
    toolName: "draft_report",
    rateLimitScope: "ai.tool.draft_report",
    routeScope: "ai.tool.draft_report",
    domain: "reports",
    riskLevel: "draft_only",
    allowedRoles: ["director", "control", "foreman", "buyer", "accountant", "warehouse", "contractor", "office", "admin"],
    maxRequestsPerMinute: 10,
    burst: 2,
    cooldownMs: 30_000,
    maxRetriesPerRequest: 1,
    retryCooldownMs: 5_000,
    idempotencyRequired: false,
    auditRequired: true,
    evidenceRequired: true,
  }),
  policy({
    toolName: "draft_act",
    rateLimitScope: "ai.tool.draft_act",
    routeScope: "ai.tool.draft_act",
    domain: "subcontracts",
    riskLevel: "draft_only",
    allowedRoles: ["director", "control", "foreman", "contractor"],
    maxRequestsPerMinute: 10,
    burst: 2,
    cooldownMs: 30_000,
    maxRetriesPerRequest: 1,
    retryCooldownMs: 5_000,
    idempotencyRequired: false,
    auditRequired: true,
    evidenceRequired: true,
  }),
  policy({
    toolName: "submit_for_approval",
    rateLimitScope: "ai.tool.submit_for_approval",
    routeScope: "ai.tool.submit_for_approval",
    domain: "documents",
    riskLevel: "approval_required",
    allowedRoles: ["director", "control", "foreman", "buyer", "accountant", "warehouse", "contractor", "office", "admin"],
    maxRequestsPerMinute: 6,
    burst: 1,
    cooldownMs: 60_000,
    maxRetriesPerRequest: 0,
    retryCooldownMs: 10_000,
    idempotencyRequired: true,
    auditRequired: true,
    evidenceRequired: true,
  }),
  policy({
    toolName: "get_action_status",
    rateLimitScope: "ai.tool.get_action_status",
    routeScope: "ai.tool.get_action_status",
    domain: "documents",
    riskLevel: "safe_read",
    allowedRoles: ["director", "control", "foreman", "buyer", "accountant", "warehouse", "contractor", "office", "admin"],
    maxRequestsPerMinute: 30,
    burst: 10,
    cooldownMs: 10_000,
    maxRetriesPerRequest: 1,
    retryCooldownMs: 2_000,
    idempotencyRequired: false,
    auditRequired: true,
    evidenceRequired: true,
  }),
]);

export function listAiToolRateLimitPolicies(): AiToolRateLimitPolicy[] {
  return [...AI_TOOL_RATE_LIMIT_POLICIES];
}

export function getAiToolRateLimitPolicy(toolName: AiToolName): AiToolRateLimitPolicy | null {
  return AI_TOOL_RATE_LIMIT_POLICIES.find((entry) => entry.toolName === toolName) ?? null;
}

export function validateAiToolRateLimitPolicy(policyToValidate: AiToolRateLimitPolicy): boolean {
  const definition = getAiToolDefinition(policyToValidate.toolName);
  return (
    Boolean(definition) &&
    policyToValidate.rateLimitScope === `ai.tool.${policyToValidate.toolName}` &&
    policyToValidate.domain === definition?.domain &&
    policyToValidate.riskLevel === definition?.riskLevel &&
    policyToValidate.allowedRoles.length > 0 &&
    policyToValidate.allowedRoles.every((role) => definition?.requiredRoles.includes(role)) &&
    policyToValidate.windowMs === MINUTE_MS &&
    Number.isInteger(policyToValidate.maxRequestsPerMinute) &&
    policyToValidate.maxRequestsPerMinute > 0 &&
    Number.isInteger(policyToValidate.burst) &&
    policyToValidate.burst >= 0 &&
    policyToValidate.burst <= policyToValidate.maxRequestsPerMinute &&
    Number.isInteger(policyToValidate.cooldownMs) &&
    policyToValidate.cooldownMs > 0 &&
    Number.isInteger(policyToValidate.maxRetriesPerRequest) &&
    policyToValidate.maxRetriesPerRequest >= 0 &&
    policyToValidate.actorScoped === true &&
    policyToValidate.organizationScoped === true &&
    policyToValidate.routeScoped === true &&
    policyToValidate.roleScoped === true &&
    policyToValidate.auditRequired === true &&
    policyToValidate.evidenceRequired === true &&
    policyToValidate.defaultEnabled === false &&
    policyToValidate.enforcementEnabledByDefault === false &&
    policyToValidate.externalStoreRequiredForLiveEnforcement === true &&
    (policyToValidate.riskLevel !== "approval_required" || policyToValidate.idempotencyRequired === true)
  );
}

export function allAiToolsHaveRateLimitPolicy(): boolean {
  return AI_TOOL_NAMES.every((toolName) => Boolean(getAiToolRateLimitPolicy(toolName)));
}
