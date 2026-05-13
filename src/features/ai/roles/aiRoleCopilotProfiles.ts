import {
  AI_DOMAINS,
  getAllowedAiDomainsForRole,
  hasDirectorFullAiAccess,
  type AiDomain,
  type AiUserRole,
} from "../policy/aiRolePolicy";
import type { AiToolName } from "../tools/aiToolTypes";

export type AiRoleCopilotDocumentAccessScope =
  | "full_domain_redacted"
  | "role_domain_redacted"
  | "own_records_only";

export type AiRoleCopilotProfessionalTone =
  | "executive_control"
  | "procurement_operator"
  | "field_foreman"
  | "finance_controller"
  | "warehouse_operator"
  | "contractor_self_service"
  | "office_coordinator";

export type AiRoleCopilotRiskBoundaries = {
  safeReadAllowed: true;
  draftPreviewAllowed: true;
  submitForApprovalAllowed: true;
  highRiskRequiresApproval: true;
  directExecutionWithoutApproval: false;
  unsafeDomainMutationAllowed: false;
  externalLiveFetchAllowed: false;
};

export type AiRoleCopilotApprovalBoundaries = {
  canSubmitForApproval: true;
  canApprove: boolean;
  canExecuteApprovedViaGateway: boolean;
  approvalLedgerRequiredForHighRisk: true;
  idempotencyRequiredForApproval: true;
  auditRequired: true;
};

export type AiRoleCopilotProfile = {
  role: Exclude<AiUserRole, "unknown">;
  displayName: string;
  allowedDomains: readonly AiDomain[];
  forbiddenDomains: readonly AiDomain[];
  defaultTools: readonly AiToolName[];
  professionalTone: AiRoleCopilotProfessionalTone;
  riskBoundaries: AiRoleCopilotRiskBoundaries;
  approvalBoundaries: AiRoleCopilotApprovalBoundaries;
  documentAccessScope: AiRoleCopilotDocumentAccessScope;
  developerControlFullAccess: boolean;
  roleIsolationE2eClaimed: false;
  source: "ai_role_copilot_profiles_v1";
};

const SAFE_RISK_BOUNDARIES: AiRoleCopilotRiskBoundaries = {
  safeReadAllowed: true,
  draftPreviewAllowed: true,
  submitForApprovalAllowed: true,
  highRiskRequiresApproval: true,
  directExecutionWithoutApproval: false,
  unsafeDomainMutationAllowed: false,
  externalLiveFetchAllowed: false,
};

function forbiddenDomainsFor(role: AiUserRole): AiDomain[] {
  const allowed = getAllowedAiDomainsForRole(role);
  return AI_DOMAINS.filter((domain) => !allowed.includes(domain));
}

function approvalBoundariesFor(role: AiUserRole): AiRoleCopilotApprovalBoundaries {
  const canControl = hasDirectorFullAiAccess(role);
  return {
    canSubmitForApproval: true,
    canApprove: canControl,
    canExecuteApprovedViaGateway: canControl,
    approvalLedgerRequiredForHighRisk: true,
    idempotencyRequiredForApproval: true,
    auditRequired: true,
  };
}

function profile(params: {
  role: Exclude<AiUserRole, "unknown">;
  displayName: string;
  defaultTools: readonly AiToolName[];
  professionalTone: AiRoleCopilotProfessionalTone;
  documentAccessScope: AiRoleCopilotDocumentAccessScope;
}): AiRoleCopilotProfile {
  return {
    role: params.role,
    displayName: params.displayName,
    allowedDomains: getAllowedAiDomainsForRole(params.role),
    forbiddenDomains: forbiddenDomainsFor(params.role),
    defaultTools: params.defaultTools,
    professionalTone: params.professionalTone,
    riskBoundaries: SAFE_RISK_BOUNDARIES,
    approvalBoundaries: approvalBoundariesFor(params.role),
    documentAccessScope: params.documentAccessScope,
    developerControlFullAccess: hasDirectorFullAiAccess(params.role),
    roleIsolationE2eClaimed: false,
    source: "ai_role_copilot_profiles_v1",
  };
}

const DIRECTOR_CONTROL_TOOLS: readonly AiToolName[] = [
  "search_catalog",
  "compare_suppliers",
  "get_warehouse_status",
  "get_finance_summary",
  "draft_request",
  "draft_report",
  "draft_act",
  "submit_for_approval",
  "get_action_status",
];

export const AI_ROLE_COPILOT_REQUIRED_ROLES = [
  "director",
  "control",
  "buyer",
  "foreman",
  "accountant",
  "warehouse",
  "contractor",
] as const satisfies readonly Exclude<AiUserRole, "unknown">[];

export const AI_ROLE_COPILOT_PROFILES: readonly AiRoleCopilotProfile[] = [
  profile({
    role: "director",
    displayName: "Director/control copilot",
    defaultTools: DIRECTOR_CONTROL_TOOLS,
    professionalTone: "executive_control",
    documentAccessScope: "full_domain_redacted",
  }),
  profile({
    role: "control",
    displayName: "Control copilot",
    defaultTools: DIRECTOR_CONTROL_TOOLS,
    professionalTone: "executive_control",
    documentAccessScope: "full_domain_redacted",
  }),
  profile({
    role: "buyer",
    displayName: "Buyer procurement copilot",
    defaultTools: [
      "search_catalog",
      "compare_suppliers",
      "get_warehouse_status",
      "draft_request",
      "draft_report",
      "submit_for_approval",
      "get_action_status",
    ],
    professionalTone: "procurement_operator",
    documentAccessScope: "role_domain_redacted",
  }),
  profile({
    role: "foreman",
    displayName: "Foreman field copilot",
    defaultTools: [
      "get_warehouse_status",
      "draft_request",
      "draft_report",
      "draft_act",
      "submit_for_approval",
      "get_action_status",
    ],
    professionalTone: "field_foreman",
    documentAccessScope: "role_domain_redacted",
  }),
  profile({
    role: "accountant",
    displayName: "Accountant finance copilot",
    defaultTools: [
      "get_finance_summary",
      "draft_report",
      "submit_for_approval",
      "get_action_status",
    ],
    professionalTone: "finance_controller",
    documentAccessScope: "role_domain_redacted",
  }),
  profile({
    role: "warehouse",
    displayName: "Warehouse operations copilot",
    defaultTools: [
      "get_warehouse_status",
      "draft_request",
      "draft_report",
      "submit_for_approval",
      "get_action_status",
    ],
    professionalTone: "warehouse_operator",
    documentAccessScope: "role_domain_redacted",
  }),
  profile({
    role: "contractor",
    displayName: "Contractor self-service copilot",
    defaultTools: [
      "draft_act",
      "draft_report",
      "submit_for_approval",
      "get_action_status",
    ],
    professionalTone: "contractor_self_service",
    documentAccessScope: "own_records_only",
  }),
  profile({
    role: "office",
    displayName: "Office coordination copilot",
    defaultTools: ["draft_report", "submit_for_approval", "get_action_status"],
    professionalTone: "office_coordinator",
    documentAccessScope: "role_domain_redacted",
  }),
  profile({
    role: "admin",
    displayName: "Admin coordination copilot",
    defaultTools: ["draft_report", "submit_for_approval", "get_action_status"],
    professionalTone: "office_coordinator",
    documentAccessScope: "role_domain_redacted",
  }),
] as const;

export function listAiRoleCopilotProfiles(): AiRoleCopilotProfile[] {
  return [...AI_ROLE_COPILOT_PROFILES];
}

export function getAiRoleCopilotProfile(role: AiUserRole): AiRoleCopilotProfile | null {
  if (role === "unknown") return null;
  return AI_ROLE_COPILOT_PROFILES.find((profile) => profile.role === role) ?? null;
}
