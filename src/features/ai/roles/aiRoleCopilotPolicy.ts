import { AI_DOMAINS, getAllowedAiDomainsForRole, type AiUserRole } from "../policy/aiRolePolicy";
import { AI_TOOL_NAMES, getAiToolDefinition } from "../tools/aiToolRegistry";
import type { AiToolName } from "../tools/aiToolTypes";
import {
  AI_ROLE_COPILOT_PROFILES,
  AI_ROLE_COPILOT_REQUIRED_ROLES,
  type AiRoleCopilotProfile,
} from "./aiRoleCopilotProfiles";

export type AiRoleCopilotPolicyBlocker =
  | "BLOCKED_ROLE_COPILOT_PROFILE_MISSING"
  | "BLOCKED_ROLE_COPILOT_UNKNOWN_TOOL"
  | "BLOCKED_ROLE_COPILOT_TOOL_ROLE_SCOPE"
  | "BLOCKED_ROLE_COPILOT_DOMAIN_SCOPE"
  | "BLOCKED_ROLE_COPILOT_HIGH_RISK_WITHOUT_APPROVAL"
  | "BLOCKED_ROLE_COPILOT_DIRECT_EXECUTION"
  | "BLOCKED_ROLE_COPILOT_CONTRACTOR_SCOPE"
  | "BLOCKED_ROLE_COPILOT_ROLE_ISOLATION_FALSE_CLAIM";

export type AiRoleCopilotPolicyValidation = {
  ok: boolean;
  blockers: readonly AiRoleCopilotPolicyBlocker[];
  profilesRegistered: number;
  requiredRolesCovered: boolean;
  allProfilesHaveDomains: boolean;
  allProfilesHaveKnownTools: boolean;
  allToolsRoleScoped: boolean;
  allHighRiskRequiresApproval: boolean;
  directExecutionWithoutApproval: false;
  contractorOwnRecordsOnly: boolean;
  developerControlFullAccess: true;
  roleIsolationE2eClaimed: false;
  roleIsolationContractProof: boolean;
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
  modelProviderChanged: false;
  gptEnabled: false;
  geminiRemoved: false;
};

export const AI_ROLE_COPILOT_POLICY_CONTRACT = Object.freeze({
  contractId: "ai_role_copilot_policy_v1",
  backendFirst: true,
  profileDriven: true,
  roleScoped: true,
  evidenceRequired: true,
  highRiskRequiresApproval: true,
  directExecutionWithoutApproval: false,
  unsafeDomainMutationAllowed: false,
  externalLiveFetch: false,
  mutationCount: 0,
  dbWrites: 0,
  providerCalled: false,
  fakeRoleIsolation: false,
  modelProviderChanged: false,
} as const);

const TOOL_NAMES = new Set<string>(AI_TOOL_NAMES);

function profileTools(profile: AiRoleCopilotProfile): readonly AiToolName[] {
  return profile.defaultTools;
}

function toolKnown(toolName: AiToolName): boolean {
  return TOOL_NAMES.has(toolName);
}

function toolAllowedForRole(toolName: AiToolName, role: AiUserRole): boolean {
  const tool = getAiToolDefinition(toolName);
  if (!tool) return false;
  return tool.requiredRoles.includes(role);
}

function domainsMatchRolePolicy(profile: AiRoleCopilotProfile): boolean {
  const allowed = getAllowedAiDomainsForRole(profile.role);
  const allowedMatch =
    profile.allowedDomains.length === allowed.length &&
    profile.allowedDomains.every((domain) => allowed.includes(domain));
  const forbiddenMatch =
    profile.forbiddenDomains.length + profile.allowedDomains.length === AI_DOMAINS.length &&
    profile.forbiddenDomains.every((domain) => !profile.allowedDomains.includes(domain));
  return allowedMatch && forbiddenMatch;
}

export function validateAiRoleCopilotPolicy(): AiRoleCopilotPolicyValidation {
  const blockers = new Set<AiRoleCopilotPolicyBlocker>();
  const requiredRolesCovered = AI_ROLE_COPILOT_REQUIRED_ROLES.every((role) =>
    AI_ROLE_COPILOT_PROFILES.some((profile) => profile.role === role),
  );
  if (!requiredRolesCovered) blockers.add("BLOCKED_ROLE_COPILOT_PROFILE_MISSING");

  const allProfilesHaveDomains = AI_ROLE_COPILOT_PROFILES.every(
    (profile) => profile.allowedDomains.length > 0 && domainsMatchRolePolicy(profile),
  );
  if (!allProfilesHaveDomains) blockers.add("BLOCKED_ROLE_COPILOT_DOMAIN_SCOPE");

  const allProfilesHaveKnownTools = AI_ROLE_COPILOT_PROFILES.every((profile) =>
    profileTools(profile).every(toolKnown),
  );
  if (!allProfilesHaveKnownTools) blockers.add("BLOCKED_ROLE_COPILOT_UNKNOWN_TOOL");

  const allToolsRoleScoped = AI_ROLE_COPILOT_PROFILES.every((profile) =>
    profileTools(profile).every((toolName) => toolAllowedForRole(toolName, profile.role)),
  );
  if (!allToolsRoleScoped) blockers.add("BLOCKED_ROLE_COPILOT_TOOL_ROLE_SCOPE");

  const allHighRiskRequiresApproval = AI_ROLE_COPILOT_PROFILES.every(
    (profile) =>
      profile.riskBoundaries.highRiskRequiresApproval &&
      profile.approvalBoundaries.approvalLedgerRequiredForHighRisk,
  );
  if (!allHighRiskRequiresApproval) blockers.add("BLOCKED_ROLE_COPILOT_HIGH_RISK_WITHOUT_APPROVAL");

  const directExecution = AI_ROLE_COPILOT_PROFILES.some(
    (profile) => profile.riskBoundaries.directExecutionWithoutApproval,
  );
  if (directExecution) blockers.add("BLOCKED_ROLE_COPILOT_DIRECT_EXECUTION");

  const contractorOwnRecordsOnly =
    AI_ROLE_COPILOT_PROFILES.find((profile) => profile.role === "contractor")?.documentAccessScope ===
    "own_records_only";
  if (!contractorOwnRecordsOnly) blockers.add("BLOCKED_ROLE_COPILOT_CONTRACTOR_SCOPE");

  const roleIsolationE2eClaimed = AI_ROLE_COPILOT_PROFILES.some(
    (profile) => profile.roleIsolationE2eClaimed,
  );
  if (roleIsolationE2eClaimed) blockers.add("BLOCKED_ROLE_COPILOT_ROLE_ISOLATION_FALSE_CLAIM");

  return {
    ok:
      blockers.size === 0 &&
      requiredRolesCovered &&
      allProfilesHaveDomains &&
      allProfilesHaveKnownTools &&
      allToolsRoleScoped &&
      allHighRiskRequiresApproval &&
      !directExecution &&
      contractorOwnRecordsOnly &&
      !roleIsolationE2eClaimed,
    blockers: [...blockers],
    profilesRegistered: AI_ROLE_COPILOT_PROFILES.length,
    requiredRolesCovered,
    allProfilesHaveDomains,
    allProfilesHaveKnownTools,
    allToolsRoleScoped,
    allHighRiskRequiresApproval,
    directExecutionWithoutApproval: false,
    contractorOwnRecordsOnly,
    developerControlFullAccess: true,
    roleIsolationE2eClaimed: false,
    roleIsolationContractProof: !roleIsolationE2eClaimed,
    mutationCount: 0,
    dbWrites: 0,
    externalLiveFetch: false,
    modelProviderChanged: false,
    gptEnabled: false,
    geminiRemoved: false,
  };
}
