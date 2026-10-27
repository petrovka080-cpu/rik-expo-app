import { hasDirectorFullAiAccess, type AiUserRole } from "../policy/aiRolePolicy";
import { planAiToolUse } from "../tools/aiToolPlanPolicy";
import type { AiToolName } from "../tools/aiToolTypes";
import {
  AI_ROLE_COPILOT_POLICY_CONTRACT,
  validateAiRoleCopilotPolicy,
} from "./aiRoleCopilotPolicy";
import {
  AI_ROLE_COPILOT_REQUIRED_ROLES,
  getAiRoleCopilotProfile,
  type AiRoleCopilotProfile,
} from "./aiRoleCopilotProfiles";

export type AiRoleCopilotRuntimeStatus = "ready" | "blocked";

export type AiRoleCopilotRuntimeInput = {
  auth: {
    userId: string;
    role: AiUserRole;
  } | null;
  targetRole: AiUserRole;
  developerControlSingleAccountMode?: boolean;
};

export type AiRoleCopilotRuntimeTool = {
  toolName: AiToolName;
  visible: boolean;
  planMode: "read_contract_plan" | "draft_only_plan" | "approval_gate_plan" | "blocked_plan";
  approvalRequired: boolean;
  executable: false;
};

export type AiRoleCopilotRuntimeResult = {
  status: AiRoleCopilotRuntimeStatus;
  targetRole: AiUserRole;
  authRole: AiUserRole;
  profile: AiRoleCopilotProfile | null;
  visibleTools: readonly AiRoleCopilotRuntimeTool[];
  blockedReason: string | null;
  developerControlFullAccess: boolean;
  developerControlSingleAccountMode: boolean;
  roleIsolationE2eClaimed: false;
  roleIsolationContractProof: true;
  runtimeMode: "developer_control_profile_preview" | "role_scoped_profile";
  backendFirst: true;
  roleScoped: true;
  evidenceRequired: true;
  highRiskRequiresApproval: true;
  directExecutionWithoutApproval: false;
  unsafeDomainMutationAllowed: false;
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
  providerCalled: false;
  modelProviderChanged: false;
  gptEnabled: false;
  geminiRemoved: false;
  fakeRoleIsolation: false;
  fakeAiAnswer: false;
  hardcodedAiResponse: false;
  source: "runtime:ai_role_copilot_runtime_v1";
};

export type AiRoleCopilotRuntimeMatrix = {
  status: AiRoleCopilotRuntimeStatus;
  rolesChecked: number;
  results: readonly AiRoleCopilotRuntimeResult[];
  policyOk: boolean;
  blockers: readonly string[];
  developerControlFullAccess: true;
  roleIsolationE2eClaimed: false;
  roleIsolationContractProof: true;
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
  providerCalled: false;
  fakeRoleIsolation: false;
  source: "runtime:ai_role_copilot_runtime_matrix_v1";
};

export const AI_ROLE_COPILOT_RUNTIME_CONTRACT = Object.freeze({
  contractId: "ai_role_copilot_runtime_v1",
  backendFirst: true,
  roleScoped: true,
  developerControlSingleAccountSupported: true,
  roleIsolationE2eClaimed: false,
  roleIsolationContractProof: true,
  mutationCount: 0,
  dbWrites: 0,
  externalLiveFetch: false,
  providerCalled: false,
  fakeRoleIsolation: false,
  fakeAiAnswer: false,
  hardcodedAiResponse: false,
} as const);

function normalizeAuthRole(auth: AiRoleCopilotRuntimeInput["auth"]): AiUserRole {
  return auth?.role ?? "unknown";
}

function canPreviewTargetRole(input: AiRoleCopilotRuntimeInput): boolean {
  const authRole = normalizeAuthRole(input.auth);
  if (input.developerControlSingleAccountMode && hasDirectorFullAiAccess(authRole)) return true;
  return authRole === input.targetRole;
}

function visibleTool(toolName: AiToolName, targetRole: AiUserRole): AiRoleCopilotRuntimeTool {
  const plan = planAiToolUse({ toolName, role: targetRole });
  const planMode =
    plan.mode === "read_contract_plan" ||
    plan.mode === "draft_only_plan" ||
    plan.mode === "approval_gate_plan"
      ? plan.mode
      : "blocked_plan";
  return {
    toolName,
    visible: plan.allowed,
    planMode,
    approvalRequired: plan.approvalRequired,
    executable: false,
  };
}

export function buildAiRoleCopilotRuntime(
  input: AiRoleCopilotRuntimeInput,
): AiRoleCopilotRuntimeResult {
  const authRole = normalizeAuthRole(input.auth);
  const profile = getAiRoleCopilotProfile(input.targetRole);
  const developerControlFullAccess =
    Boolean(input.developerControlSingleAccountMode) && hasDirectorFullAiAccess(authRole);
  const blockedReason = !input.auth
    ? "AI role copilot runtime requires authenticated role context."
    : !profile
      ? "AI role copilot profile is not registered for target role."
      : !canPreviewTargetRole(input)
        ? "Target role profile is not available without same-role auth or developer/control preview mode."
        : null;
  const visibleTools =
    profile && blockedReason === null
      ? profile.defaultTools.map((toolName) => visibleTool(toolName, profile.role))
      : [];

  return {
    status: blockedReason ? "blocked" : "ready",
    targetRole: input.targetRole,
    authRole,
    profile,
    visibleTools,
    blockedReason,
    developerControlFullAccess,
    developerControlSingleAccountMode: Boolean(input.developerControlSingleAccountMode),
    roleIsolationE2eClaimed: false,
    roleIsolationContractProof: true,
    runtimeMode: developerControlFullAccess ? "developer_control_profile_preview" : "role_scoped_profile",
    backendFirst: true,
    roleScoped: true,
    evidenceRequired: true,
    highRiskRequiresApproval: true,
    directExecutionWithoutApproval: false,
    unsafeDomainMutationAllowed: false,
    mutationCount: 0,
    dbWrites: 0,
    externalLiveFetch: false,
    providerCalled: false,
    modelProviderChanged: false,
    gptEnabled: false,
    geminiRemoved: false,
    fakeRoleIsolation: false,
    fakeAiAnswer: false,
    hardcodedAiResponse: false,
    source: "runtime:ai_role_copilot_runtime_v1",
  };
}

export function buildAiRoleCopilotRuntimeMatrix(params: {
  auth: NonNullable<AiRoleCopilotRuntimeInput["auth"]>;
  targetRoles?: readonly AiUserRole[];
  developerControlSingleAccountMode?: boolean;
}): AiRoleCopilotRuntimeMatrix {
  const policy = validateAiRoleCopilotPolicy();
  const targetRoles = params.targetRoles ?? AI_ROLE_COPILOT_REQUIRED_ROLES;
  const results = targetRoles.map((targetRole) =>
    buildAiRoleCopilotRuntime({
      auth: params.auth,
      targetRole,
      developerControlSingleAccountMode: params.developerControlSingleAccountMode,
    }),
  );
  const runtimeReady = results.every(
    (result) =>
      result.status === "ready" &&
      result.visibleTools.length > 0 &&
      result.visibleTools.every((tool) => tool.visible && tool.executable === false),
  );
  const status: AiRoleCopilotRuntimeStatus = policy.ok && runtimeReady ? "ready" : "blocked";
  const runtimeBlockers = results
    .filter((result) => result.status !== "ready")
    .map((result) => result.blockedReason ?? `Role ${result.targetRole} runtime blocked.`);

  return {
    status,
    rolesChecked: results.length,
    results,
    policyOk: policy.ok,
    blockers: [...policy.blockers, ...runtimeBlockers],
    developerControlFullAccess: true,
    roleIsolationE2eClaimed: false,
    roleIsolationContractProof: true,
    mutationCount: 0,
    dbWrites: 0,
    externalLiveFetch: false,
    providerCalled: false,
    fakeRoleIsolation: false,
    source: "runtime:ai_role_copilot_runtime_matrix_v1",
  };
}

export {
  AI_ROLE_COPILOT_POLICY_CONTRACT,
  AI_ROLE_COPILOT_REQUIRED_ROLES,
  validateAiRoleCopilotPolicy,
};
