import {
  canUseAiCapability,
  type AiCapability,
  type AiDomain,
  type AiUserRole,
} from "./aiRolePolicy";

export type AiContextPolicy = "none" | "redacted" | "role_scoped" | "director_full";
export type AiMutationPolicy = "none" | "draft_only" | "approval_required";

export type AiScreenCapabilityEntry = {
  screenId: string;
  domain: AiDomain;
  allowedRoles: readonly AiUserRole[];
  allowedCapabilities: readonly AiCapability[];
  contextPolicy: AiContextPolicy;
  mutationPolicy: AiMutationPolicy;
};

export type AiScreenAccessDecision = {
  allowed: boolean;
  screenId: string;
  role: AiUserRole;
  entry: AiScreenCapabilityEntry | null;
  reason: string;
};

const READ_DRAFT_APPROVAL: readonly AiCapability[] = [
  "read_context",
  "summarize",
  "search",
  "compare",
  "explain",
  "draft",
  "submit_for_approval",
];

const READ_ONLY: readonly AiCapability[] = [
  "read_context",
  "summarize",
  "search",
  "compare",
  "explain",
];

const CONTROL_ROLES: readonly AiUserRole[] = ["director", "control"];
const CONTROL_CAPABILITIES: readonly AiCapability[] = [
  ...READ_DRAFT_APPROVAL,
  "approve_action",
  "execute_approved_action",
];

export const AI_SCREEN_CAPABILITY_REGISTRY: readonly AiScreenCapabilityEntry[] = [
  {
    screenId: "director.dashboard",
    domain: "control",
    allowedRoles: CONTROL_ROLES,
    allowedCapabilities: CONTROL_CAPABILITIES,
    contextPolicy: "director_full",
    mutationPolicy: "approval_required",
  },
  {
    screenId: "buyer.main",
    domain: "procurement",
    allowedRoles: ["director", "control", "buyer"],
    allowedCapabilities: READ_DRAFT_APPROVAL,
    contextPolicy: "role_scoped",
    mutationPolicy: "approval_required",
  },
  {
    screenId: "market.home",
    domain: "marketplace",
    allowedRoles: ["director", "control", "buyer", "foreman"],
    allowedCapabilities: READ_ONLY,
    contextPolicy: "redacted",
    mutationPolicy: "none",
  },
  {
    screenId: "accountant.main",
    domain: "finance",
    allowedRoles: ["director", "control", "accountant"],
    allowedCapabilities: READ_DRAFT_APPROVAL,
    contextPolicy: "role_scoped",
    mutationPolicy: "approval_required",
  },
  {
    screenId: "foreman.main",
    domain: "projects",
    allowedRoles: ["director", "control", "foreman"],
    allowedCapabilities: READ_DRAFT_APPROVAL,
    contextPolicy: "role_scoped",
    mutationPolicy: "draft_only",
  },
  {
    screenId: "foreman.subcontract",
    domain: "subcontracts",
    allowedRoles: ["director", "control", "foreman"],
    allowedCapabilities: READ_DRAFT_APPROVAL,
    contextPolicy: "role_scoped",
    mutationPolicy: "approval_required",
  },
  {
    screenId: "contractor.main",
    domain: "subcontracts",
    allowedRoles: ["contractor"],
    allowedCapabilities: ["read_context", "summarize", "search", "explain", "draft", "submit_for_approval"],
    contextPolicy: "role_scoped",
    mutationPolicy: "approval_required",
  },
  {
    screenId: "office.hub",
    domain: "control",
    allowedRoles: ["director", "control", "office", "admin"],
    allowedCapabilities: READ_DRAFT_APPROVAL,
    contextPolicy: "role_scoped",
    mutationPolicy: "approval_required",
  },
  {
    screenId: "map.main",
    domain: "map",
    allowedRoles: ["director", "control", "buyer", "foreman"],
    allowedCapabilities: READ_ONLY,
    contextPolicy: "redacted",
    mutationPolicy: "none",
  },
  {
    screenId: "chat.main",
    domain: "chat",
    allowedRoles: ["director", "control", "foreman", "buyer", "accountant", "warehouse", "contractor", "office", "admin"],
    allowedCapabilities: ["read_context", "summarize", "explain", "draft", "submit_for_approval"],
    contextPolicy: "role_scoped",
    mutationPolicy: "approval_required",
  },
  {
    screenId: "reports.modal",
    domain: "reports",
    allowedRoles: ["director", "control", "foreman", "buyer", "accountant", "warehouse", "contractor"],
    allowedCapabilities: READ_ONLY,
    contextPolicy: "role_scoped",
    mutationPolicy: "none",
  },
  {
    screenId: "foreman.ai.quick_modal",
    domain: "procurement",
    allowedRoles: ["director", "control", "foreman"],
    allowedCapabilities: ["read_context", "summarize", "search", "explain", "draft", "submit_for_approval"],
    contextPolicy: "role_scoped",
    mutationPolicy: "approval_required",
  },
];

export function getAiScreenCapabilities(
  screenId: string,
  role: AiUserRole,
): AiScreenAccessDecision {
  const normalizedScreenId = String(screenId || "").trim();
  const entry =
    AI_SCREEN_CAPABILITY_REGISTRY.find((candidate) => candidate.screenId === normalizedScreenId) ?? null;

  if (!entry) {
    return {
      allowed: false,
      screenId: normalizedScreenId,
      role,
      entry: null,
      reason: `AI screen is not registered: ${normalizedScreenId || "unknown"}`,
    };
  }

  const roleAllowed = entry.allowedRoles.includes(role);
  const capabilityAllowed = entry.allowedCapabilities.some((capability) =>
    canUseAiCapability({ role, domain: entry.domain, capability, viaApprovalGate: true }),
  );

  return {
    allowed: roleAllowed && capabilityAllowed,
    screenId: normalizedScreenId,
    role,
    entry,
    reason:
      roleAllowed && capabilityAllowed
        ? "AI screen access allowed"
        : `AI role ${role} cannot access ${normalizedScreenId}`,
  };
}

export function assertAiScreenAccess(
  screenId: string,
  role: AiUserRole,
): AiScreenAccessDecision {
  return getAiScreenCapabilities(screenId, role);
}
