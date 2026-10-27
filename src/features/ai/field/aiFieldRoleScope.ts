import { hasDirectorFullAiAccess, type AiUserRole } from "../policy/aiRolePolicy";
import { getAiToolDefinition } from "../tools/aiToolRegistry";
import type { AiToolName } from "../tools/aiToolTypes";
import type {
  AiFieldContextSnapshot,
  AiFieldWorkIntent,
  AiFieldWorkScope,
} from "./aiFieldWorkCopilotTypes";

export const AI_FIELD_ROLE_SCOPE_CONTRACT = Object.freeze({
  contractId: "ai_field_role_scope_v1",
  roleScoped: true,
  contractorOwnScopeEnforced: true,
  developerControlFullAccess: true,
  roleIsolationE2eClaimed: false,
  directSupabaseFromUi: false,
  mutationCount: 0,
  dbWrites: 0,
  fakeRoleIsolationClaimed: false,
} as const);

export type AiFieldRoleScopeDecision = {
  allowed: boolean;
  roleScope: AiFieldWorkScope | null;
  contractorOwnScopeEnforced: boolean;
  exactReason: string | null;
};

export function canUseAiFieldCopilot(role: AiUserRole): boolean {
  return role === "director" ||
    role === "control" ||
    role === "foreman" ||
    role === "contractor";
}

export function canDraftAiForemanReport(role: AiUserRole): boolean {
  return role === "director" || role === "control" || role === "foreman";
}

export function canDraftAiContractorAct(role: AiUserRole): boolean {
  return role === "director" ||
    role === "control" ||
    role === "foreman" ||
    role === "contractor";
}

export function roleScopeForAiFieldRole(role: AiUserRole): AiFieldWorkScope | null {
  if (hasDirectorFullAiAccess(role)) return "director_control_full_access";
  if (role === "foreman") return "foreman_project_scope";
  if (role === "contractor") return "contractor_own_scope";
  return null;
}

export function resolveAiFieldRoleScope(params: {
  role: AiUserRole;
  context?: AiFieldContextSnapshot | null;
}): AiFieldRoleScopeDecision {
  if (!canUseAiFieldCopilot(params.role)) {
    return {
      allowed: false,
      roleScope: null,
      contractorOwnScopeEnforced: params.role === "contractor",
      exactReason: "AI field work copilot is not visible for this role.",
    };
  }

  const roleScope = roleScopeForAiFieldRole(params.role);
  if (!roleScope) {
    return {
      allowed: false,
      roleScope: null,
      contractorOwnScopeEnforced: params.role === "contractor",
      exactReason: "AI field work copilot role scope is not available.",
    };
  }

  const contextScope = params.context?.scope;
  if (params.role === "contractor" && contextScope && contextScope !== "contractor_own_scope") {
    return {
      allowed: false,
      roleScope,
      contractorOwnScopeEnforced: true,
      exactReason: "Contractor field context must stay inside contractor_own_scope.",
    };
  }

  if (params.role === "foreman" && contextScope === "director_control_full_access") {
    return {
      allowed: false,
      roleScope,
      contractorOwnScopeEnforced: false,
      exactReason: "Foreman field context cannot use director/control full-access scope.",
    };
  }

  return {
    allowed: true,
    roleScope,
    contractorOwnScopeEnforced: params.role === "contractor",
    exactReason: null,
  };
}

export function toolKnownForAiFieldCopilot(toolName: AiToolName): boolean {
  return getAiToolDefinition(toolName) !== null;
}

export function toolForAiFieldIntent(intent: AiFieldWorkIntent): AiToolName | null {
  if (intent === "draft_report") return "draft_report";
  if (intent === "draft_act") return "draft_act";
  if (intent === "submit_for_approval") return "submit_for_approval";
  if (intent === "read_context") return "get_action_status";
  return null;
}

export function availableAiFieldTools(role: AiUserRole): AiToolName[] {
  if (!canUseAiFieldCopilot(role)) return [];
  const tools: AiToolName[] = ["get_action_status"];
  if (canDraftAiForemanReport(role)) tools.push("draft_report");
  if (canDraftAiContractorAct(role)) tools.push("draft_act");
  tools.push("submit_for_approval");
  return tools.filter(toolKnownForAiFieldCopilot);
}

export function availableAiFieldIntents(role: AiUserRole): AiFieldWorkIntent[] {
  if (!canUseAiFieldCopilot(role)) return [];
  const intents: AiFieldWorkIntent[] = ["read_context"];
  if (canDraftAiForemanReport(role)) intents.push("draft_report");
  if (canDraftAiContractorAct(role)) intents.push("draft_act");
  intents.push("submit_for_approval");
  return intents;
}
