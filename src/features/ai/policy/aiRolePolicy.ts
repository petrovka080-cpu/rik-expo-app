export type AiUserRole =
  | "director"
  | "control"
  | "foreman"
  | "buyer"
  | "accountant"
  | "warehouse"
  | "contractor"
  | "office"
  | "admin"
  | "unknown";

export type AiDomain =
  | "control"
  | "procurement"
  | "marketplace"
  | "warehouse"
  | "finance"
  | "reports"
  | "documents"
  | "subcontracts"
  | "projects"
  | "map"
  | "chat"
  | "real_estate_future";

export type AiCapability =
  | "read_context"
  | "summarize"
  | "search"
  | "compare"
  | "explain"
  | "draft"
  | "submit_for_approval"
  | "approve_action"
  | "execute_approved_action";

export type CanUseAiCapabilityParams = {
  role: AiUserRole;
  domain: AiDomain;
  capability: AiCapability;
  viaApprovalGate?: boolean;
};

export const AI_DOMAINS: readonly AiDomain[] = [
  "control",
  "procurement",
  "marketplace",
  "warehouse",
  "finance",
  "reports",
  "documents",
  "subcontracts",
  "projects",
  "map",
  "chat",
  "real_estate_future",
];

export const AI_CAPABILITIES: readonly AiCapability[] = [
  "read_context",
  "summarize",
  "search",
  "compare",
  "explain",
  "draft",
  "submit_for_approval",
  "approve_action",
  "execute_approved_action",
];

export const AI_USER_ROLES: readonly AiUserRole[] = [
  "director",
  "control",
  "foreman",
  "buyer",
  "accountant",
  "warehouse",
  "contractor",
  "office",
  "admin",
  "unknown",
];

const DIRECTOR_CONTROL_ROLES: readonly AiUserRole[] = ["director", "control"];

const READ_CAPABILITIES: readonly AiCapability[] = [
  "read_context",
  "summarize",
  "search",
  "compare",
  "explain",
];

const DRAFT_CAPABILITIES: readonly AiCapability[] = [
  ...READ_CAPABILITIES,
  "draft",
  "submit_for_approval",
];

const CONTROL_CAPABILITIES: readonly AiCapability[] = [
  ...DRAFT_CAPABILITIES,
  "approve_action",
  "execute_approved_action",
];

const roleDomains: Record<AiUserRole, readonly AiDomain[]> = {
  director: AI_DOMAINS,
  control: AI_DOMAINS,
  foreman: ["projects", "reports", "documents", "subcontracts", "procurement", "chat"],
  buyer: ["procurement", "marketplace", "documents", "reports", "map", "chat"],
  accountant: ["finance", "documents", "reports", "chat"],
  warehouse: ["warehouse", "reports", "documents", "procurement", "chat"],
  contractor: ["subcontracts", "documents", "reports", "chat"],
  office: ["control", "documents", "reports", "chat"],
  admin: ["control", "documents", "reports", "chat"],
  unknown: [],
};

export function getAllowedAiDomainsForRole(role: AiUserRole): AiDomain[] {
  return [...(roleDomains[role] ?? [])];
}

export function getAllowedAiCapabilitiesForRole(
  role: AiUserRole,
  domain: AiDomain,
): AiCapability[] {
  if (!getAllowedAiDomainsForRole(role).includes(domain)) return [];

  if (DIRECTOR_CONTROL_ROLES.includes(role)) return [...CONTROL_CAPABILITIES];

  if (role === "unknown") return [];

  if (role === "office" || role === "admin") {
    return [...READ_CAPABILITIES, "draft", "submit_for_approval"];
  }

  if (role === "contractor") {
    return ["read_context", "summarize", "search", "explain", "draft", "submit_for_approval"];
  }

  return [...DRAFT_CAPABILITIES];
}

export function canUseAiCapability(params: CanUseAiCapabilityParams): boolean {
  if (params.capability === "execute_approved_action") {
    return (
      DIRECTOR_CONTROL_ROLES.includes(params.role) &&
      params.viaApprovalGate === true &&
      getAllowedAiDomainsForRole(params.role).includes(params.domain)
    );
  }

  return getAllowedAiCapabilitiesForRole(params.role, params.domain).includes(params.capability);
}

export function hasDirectorFullAiAccess(role: AiUserRole): boolean {
  return DIRECTOR_CONTROL_ROLES.includes(role);
}
