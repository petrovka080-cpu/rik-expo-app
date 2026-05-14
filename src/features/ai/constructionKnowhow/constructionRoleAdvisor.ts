import type { AiUserRole } from "../policy/aiRolePolicy";
import {
  CONSTRUCTION_DOMAIN_IDS,
  type ConstructionDomainId,
  type ConstructionKnowhowRoleId,
  type ConstructionProfessionalTone,
  type ConstructionRoleBoundary,
  type ConstructionRoleProfile,
} from "./constructionKnowhowTypes";
import { listConstructionDomainPlaybooks } from "./constructionDomainPlaybooks";

const SAFE_BOUNDARY: ConstructionRoleBoundary = {
  safeReadAllowed: true,
  draftPreviewAllowed: true,
  submitForApprovalAllowed: true,
  highRiskRequiresApproval: true,
  directExecutionWithoutApproval: false,
  domainMutationAllowed: false,
  mobileExternalFetchAllowed: false,
  externalPreviewOnly: true,
  ownRecordsOnly: false,
  roleIsolationClaimed: false,
};

function domainsForRole(roleId: ConstructionKnowhowRoleId): ConstructionDomainId[] {
  return listConstructionDomainPlaybooks()
    .filter((pack) => pack.roleScopes.includes(roleId))
    .map((pack) => pack.domainId);
}

function forbiddenDomainsFor(roleId: ConstructionKnowhowRoleId): ConstructionDomainId[] {
  const allowed = domainsForRole(roleId);
  return CONSTRUCTION_DOMAIN_IDS.filter((domainId) => !allowed.includes(domainId));
}

function roleProfile(params: {
  roleId: ConstructionKnowhowRoleId;
  title: string;
  tone: ConstructionProfessionalTone;
  overviewScope: ConstructionRoleProfile["overviewScope"];
  canApprove: boolean;
  canExecuteApprovedViaLedger: boolean;
  ownRecordsOnly?: boolean;
}): ConstructionRoleProfile {
  return {
    roleId: params.roleId,
    title: params.title,
    professionalTone: params.tone,
    allowedDomains: domainsForRole(params.roleId),
    forbiddenDomains: forbiddenDomainsFor(params.roleId),
    overviewScope: params.overviewScope,
    canApprove: params.canApprove,
    canExecuteApprovedViaLedger: params.canExecuteApprovedViaLedger,
    evidenceRequired: true,
    approvalBoundary: {
      ...SAFE_BOUNDARY,
      ownRecordsOnly: params.ownRecordsOnly === true,
    },
  };
}

export const CONSTRUCTION_ROLE_PROFILES = [
  roleProfile({
    roleId: "director_control",
    title: "Director/control construction advisor",
    tone: "executive_control",
    overviewScope: "cross_domain_redacted",
    canApprove: true,
    canExecuteApprovedViaLedger: true,
  }),
  roleProfile({
    roleId: "buyer",
    title: "Procurement construction advisor",
    tone: "procurement_operator",
    overviewScope: "role_domain_redacted",
    canApprove: false,
    canExecuteApprovedViaLedger: false,
  }),
  roleProfile({
    roleId: "warehouse",
    title: "Warehouse material flow advisor",
    tone: "warehouse_operator",
    overviewScope: "role_domain_redacted",
    canApprove: false,
    canExecuteApprovedViaLedger: false,
  }),
  roleProfile({
    roleId: "accountant",
    title: "Finance and accounting advisor",
    tone: "finance_controller",
    overviewScope: "role_domain_redacted",
    canApprove: false,
    canExecuteApprovedViaLedger: false,
  }),
  roleProfile({
    roleId: "foreman",
    title: "Field execution advisor",
    tone: "field_foreman",
    overviewScope: "role_domain_redacted",
    canApprove: false,
    canExecuteApprovedViaLedger: false,
  }),
  roleProfile({
    roleId: "contractor",
    title: "Contractor own-records advisor",
    tone: "contractor_self_service",
    overviewScope: "own_records_only",
    canApprove: false,
    canExecuteApprovedViaLedger: false,
    ownRecordsOnly: true,
  }),
] as const satisfies readonly ConstructionRoleProfile[];

export function listConstructionRoleProfiles(): ConstructionRoleProfile[] {
  return [...CONSTRUCTION_ROLE_PROFILES];
}

export function getConstructionRoleProfile(
  roleId: ConstructionKnowhowRoleId,
): ConstructionRoleProfile | null {
  return CONSTRUCTION_ROLE_PROFILES.find((profile) => profile.roleId === roleId) ?? null;
}

export function toConstructionKnowhowRoleId(role: AiUserRole): ConstructionKnowhowRoleId {
  if (role === "director" || role === "control" || role === "admin") return "director_control";
  if (role === "buyer") return "buyer";
  if (role === "warehouse") return "warehouse";
  if (role === "accountant") return "accountant";
  if (role === "foreman") return "foreman";
  if (role === "contractor") return "contractor";
  return "contractor";
}

export function describeConstructionRoleBoundary(roleId: ConstructionKnowhowRoleId): string {
  const profile = getConstructionRoleProfile(roleId);
  if (!profile) return "Role is not registered for construction know-how.";

  if (profile.roleId === "director_control") {
    return "Cross-domain control is allowed, but execution still requires the approval ledger.";
  }

  if (profile.roleId === "contractor") {
    return "Only own records are visible; cross-company data and final approval are blocked.";
  }

  return "Role-domain preview and draft are allowed; final mutations require approval.";
}
