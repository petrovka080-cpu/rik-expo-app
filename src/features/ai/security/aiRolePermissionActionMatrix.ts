import type { AiCapability, AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import { AI_USER_ROLES, canUseAiCapability } from "../policy/aiRolePolicy";
import { getAiApprovalActionRoute, mapAiApprovalAuditDomainToLedgerDomain } from "../approvalRouter/aiApprovalActionRouter";
import { getAiBffRouteCoverageEntry } from "../bffCoverage/aiBffRouteCoverageRegistry";
import type { AiBffRouteCoverageClassification } from "../bffCoverage/aiBffRouteCoverageTypes";
import { listAiScreenButtonRoleActionEntries } from "../screenAudit/aiScreenButtonRoleActionRegistry";
import { evaluateAiScreenForbiddenActionPolicy } from "../screenAudit/aiScreenForbiddenActionPolicy";
import type {
  AiScreenAuditPrimaryDomain,
  AiScreenButtonActionEntry,
  AiScreenButtonActionKind,
  AiScreenMutationRisk,
} from "../screenAudit/aiScreenButtonRoleActionTypes";
import {
  buildAiBffAuthorizationContract,
  isAiBffAuthorizationContractSafe,
  type AiBffAuthorizationContract,
} from "./aiBffAuthorizationContract";

export const AI_ROLE_PERMISSION_ACTION_BOUNDARY_WAVE =
  "S_AI_SECURITY_01_ROLE_PERMISSION_ACTION_BOUNDARY_HARDENING" as const;

export type AiActionPermissionDecisionStatus =
  | "allowed"
  | "denied_not_in_role_scope"
  | "denied_by_capability_policy"
  | "denied_forbidden_action"
  | "denied_unknown_role";

export type AiActionPermissionDecision = {
  role: AiUserRole;
  status: AiActionPermissionDecisionStatus;
  canRead: boolean;
  canDraft: boolean;
  canSubmitForApproval: boolean;
  canExecuteApproved: false;
  requiredCapability: AiCapability | null;
  exactReason: string;
};

export type AiActionEvidenceBoundary = {
  requiredEvidence: readonly string[];
  evidenceRefs: readonly string[];
  missingEvidence: readonly string[];
  evidenceBacked: boolean;
};

export type AiActionApprovalBoundary = {
  required: boolean;
  routePresent: boolean;
  submitEndpoint: string | null;
  executeRequiresApprovedStatus: boolean;
  directExecuteAllowed: false;
};

export type AiActionForbiddenBoundary = {
  forbidden: boolean;
  reason: string | null;
  forbiddenForAllRoles: boolean;
  directExecutionAllowed: false;
};

export type AiRolePermissionActionMatrixEntry = {
  wave: typeof AI_ROLE_PERMISSION_ACTION_BOUNDARY_WAVE;
  screenId: string;
  actionId: string;
  label: string;
  auditPrimaryDomain: AiScreenAuditPrimaryDomain;
  domain: AiDomain;
  roleScope: readonly AiUserRole[];
  actionKind: AiScreenButtonActionKind;
  mutationRisk: AiScreenMutationRisk;
  requiredCapability: AiCapability | null;
  evidenceBoundary: AiActionEvidenceBoundary;
  approvalBoundary: AiActionApprovalBoundary;
  forbiddenBoundary: AiActionForbiddenBoundary;
  bffAuthorization: AiBffAuthorizationContract;
  bffCoverageClassification: AiBffRouteCoverageClassification | "missing";
  roleDecisions: readonly AiActionPermissionDecision[];
  availableRoles: readonly AiUserRole[];
  deniedRoles: readonly AiUserRole[];
  roleScopePresent: boolean;
  mutationRiskClassified: boolean;
  noDirectExecute: true;
  noServicePrivilege: true;
  noAuthAdmin: true;
  noRawRows: true;
  noRawProviderPayloads: true;
};

export type AiRolePermissionActionBoundaryFinalStatus =
  | "GREEN_AI_ROLE_PERMISSION_ACTION_BOUNDARY_READY"
  | "BLOCKED_AI_ROLE_SCOPE_MISSING"
  | "BLOCKED_AI_PERMISSION_BOUNDARY_INCOMPLETE"
  | "BLOCKED_AI_ROLE_ESCALATION_RISK"
  | "BLOCKED_AI_SERVICE_ROLE_GREEN_PATH_RISK";

export type AiRolePermissionActionBoundarySummary = {
  wave: typeof AI_ROLE_PERMISSION_ACTION_BOUNDARY_WAVE;
  finalStatus: AiRolePermissionActionBoundaryFinalStatus;
  exactReason: string | null;
  auditedActions: number;
  matrixActions: number;
  roleScopeMissingActions: readonly string[];
  mutationRiskMissingActions: readonly string[];
  evidenceMissingActions: readonly string[];
  approvalRouteMissingActions: readonly string[];
  forbiddenPolicyMissingActions: readonly string[];
  bffAuthorizationUnsafeActions: readonly string[];
  bffCoverageMissingActions: readonly string[];
  roleEscalationFindings: readonly string[];
  servicePrivilegeFindings: readonly string[];
  safeReadActions: number;
  draftOnlyActions: number;
  approvalRequiredActions: number;
  forbiddenActions: number;
  actionsWithRoleScope: number;
  actionsWithEvidencePolicy: number;
  actionsWithApprovalPolicy: number;
  actionsWithForbiddenPolicy: number;
  bffAuthorizationContracts: number;
  noSecrets: true;
  noRawRows: true;
  noRawPrompts: true;
  noRawProviderPayloads: true;
  noDbWrites: true;
  noProviderCalls: true;
  noUiChanges: true;
  noFakeGreen: true;
};

const ALL_PERMISSION_ROLES: readonly AiUserRole[] = AI_USER_ROLES;

function requiredCapabilityForActionKind(actionKind: AiScreenButtonActionKind): AiCapability | null {
  if (actionKind === "safe_read") return "read_context";
  if (actionKind === "draft_only") return "draft";
  if (actionKind === "approval_required") return "submit_for_approval";
  return null;
}

function roleCanUseRequiredCapability(params: {
  role: AiUserRole;
  domain: AiDomain;
  requiredCapability: AiCapability | null;
}): boolean {
  if (!params.requiredCapability) return false;
  return canUseAiCapability({
    role: params.role,
    domain: params.domain,
    capability: params.requiredCapability,
  });
}

function buildEvidenceBoundary(entry: AiScreenButtonActionEntry): AiActionEvidenceBoundary {
  const requiredEvidence = ["audit_action", "role_policy", "mutation_risk", "bff_authorization"] as const;
  const evidenceRefs = [
    `audit:${entry.screenId}:${entry.actionId}`,
    `role_scope:${entry.roleScope.join(",")}`,
    `mutation_risk:${entry.mutationRisk}`,
    ...entry.evidenceSources.map((source) => `evidence:${source}`),
  ];
  const missingEvidence = [
    ...(entry.evidenceSources.length === 0 ? ["domain_evidence"] : []),
    ...(entry.roleScope.length === 0 ? ["role_scope"] : []),
    ...(entry.mutationRisk.length === 0 ? ["mutation_risk"] : []),
  ];

  return Object.freeze({
    requiredEvidence,
    evidenceRefs: [...new Set(evidenceRefs)].sort(),
    missingEvidence,
    evidenceBacked: missingEvidence.length === 0,
  } satisfies AiActionEvidenceBoundary);
}

function buildApprovalBoundary(entry: AiScreenButtonActionEntry): AiActionApprovalBoundary {
  const route = getAiApprovalActionRoute(entry.actionId);
  if (entry.actionKind !== "approval_required") {
    return Object.freeze({
      required: false,
      routePresent: true,
      submitEndpoint: null,
      executeRequiresApprovedStatus: false,
      directExecuteAllowed: false,
    } satisfies AiActionApprovalBoundary);
  }

  return Object.freeze({
    required: true,
    routePresent: route !== null,
    submitEndpoint: route?.ledgerRoute.submitEndpoint ?? null,
    executeRequiresApprovedStatus: route?.executionPolicy.requiresApprovedStatus === true,
    directExecuteAllowed: false,
  } satisfies AiActionApprovalBoundary);
}

function buildForbiddenBoundary(entry: AiScreenButtonActionEntry): AiActionForbiddenBoundary {
  const forbiddenPolicy = evaluateAiScreenForbiddenActionPolicy(entry);
  return Object.freeze({
    forbidden: entry.actionKind === "forbidden",
    reason: entry.actionKind === "forbidden" ? forbiddenPolicy.reason : null,
    forbiddenForAllRoles: entry.actionKind === "forbidden",
    directExecutionAllowed: false,
  } satisfies AiActionForbiddenBoundary);
}

function buildRoleDecision(params: {
  role: AiUserRole;
  entry: AiScreenButtonActionEntry;
  domain: AiDomain;
  requiredCapability: AiCapability | null;
}): AiActionPermissionDecision {
  const inRoleScope = params.entry.roleScope.includes(params.role);
  if (params.role === "unknown") {
    return {
      role: params.role,
      status: "denied_unknown_role",
      canRead: false,
      canDraft: false,
      canSubmitForApproval: false,
      canExecuteApproved: false,
      requiredCapability: params.requiredCapability,
      exactReason: "Unknown role has no AI action permissions.",
    };
  }
  if (params.entry.actionKind === "forbidden") {
    return {
      role: params.role,
      status: "denied_forbidden_action",
      canRead: false,
      canDraft: false,
      canSubmitForApproval: false,
      canExecuteApproved: false,
      requiredCapability: null,
      exactReason: "Forbidden audited action is denied for every role.",
    };
  }
  if (!inRoleScope) {
    return {
      role: params.role,
      status: "denied_not_in_role_scope",
      canRead: false,
      canDraft: false,
      canSubmitForApproval: false,
      canExecuteApproved: false,
      requiredCapability: params.requiredCapability,
      exactReason: "Role is not in the audited roleScope for this action.",
    };
  }
  if (
    !roleCanUseRequiredCapability({
      role: params.role,
      domain: params.domain,
      requiredCapability: params.requiredCapability,
    })
  ) {
    return {
      role: params.role,
      status: "denied_by_capability_policy",
      canRead: false,
      canDraft: false,
      canSubmitForApproval: false,
      canExecuteApproved: false,
      requiredCapability: params.requiredCapability,
      exactReason: "Role is scoped by audit but denied by the central AI role policy for this domain/capability.",
    };
  }

  return {
    role: params.role,
    status: "allowed",
    canRead: params.entry.actionKind === "safe_read",
    canDraft: params.entry.actionKind === "draft_only",
    canSubmitForApproval: params.entry.actionKind === "approval_required",
    canExecuteApproved: false,
    requiredCapability: params.requiredCapability,
    exactReason: "Role is in audit scope and passes the central AI role policy.",
  };
}

function buildMatrixEntry(entry: AiScreenButtonActionEntry): AiRolePermissionActionMatrixEntry {
  const domain = mapAiApprovalAuditDomainToLedgerDomain(entry.primaryDomain);
  const requiredCapability = requiredCapabilityForActionKind(entry.actionKind);
  const roleDecisions = ALL_PERMISSION_ROLES.map((role) =>
    buildRoleDecision({ role, entry, domain, requiredCapability }),
  );
  const bffCoverageEntry = getAiBffRouteCoverageEntry(entry.actionId);
  const bffAuthorization = buildAiBffAuthorizationContract({ entry, domain });

  return Object.freeze({
    wave: AI_ROLE_PERMISSION_ACTION_BOUNDARY_WAVE,
    screenId: entry.screenId,
    actionId: entry.actionId,
    label: entry.label,
    auditPrimaryDomain: entry.primaryDomain,
    domain,
    roleScope: [...entry.roleScope],
    actionKind: entry.actionKind,
    mutationRisk: entry.mutationRisk,
    requiredCapability,
    evidenceBoundary: buildEvidenceBoundary(entry),
    approvalBoundary: buildApprovalBoundary(entry),
    forbiddenBoundary: buildForbiddenBoundary(entry),
    bffAuthorization,
    bffCoverageClassification: bffCoverageEntry?.classification ?? "missing",
    roleDecisions,
    availableRoles: roleDecisions
      .filter((decision) => decision.status === "allowed")
      .map((decision) => decision.role),
    deniedRoles: roleDecisions
      .filter((decision) => decision.status !== "allowed")
      .map((decision) => decision.role),
    roleScopePresent: entry.roleScope.length > 0 && !entry.roleScope.includes("unknown"),
    mutationRiskClassified: entry.mutationRisk.length > 0,
    noDirectExecute: true,
    noServicePrivilege: true,
    noAuthAdmin: true,
    noRawRows: true,
    noRawProviderPayloads: true,
  } satisfies AiRolePermissionActionMatrixEntry);
}

export const AI_ROLE_PERMISSION_ACTION_MATRIX: readonly AiRolePermissionActionMatrixEntry[] =
  Object.freeze(listAiScreenButtonRoleActionEntries().map(buildMatrixEntry));

export function listAiRolePermissionActionMatrixEntries(): AiRolePermissionActionMatrixEntry[] {
  return [...AI_ROLE_PERMISSION_ACTION_MATRIX];
}

export function getAiRolePermissionActionMatrixEntry(actionId: string): AiRolePermissionActionMatrixEntry | null {
  const normalized = String(actionId || "").trim();
  return AI_ROLE_PERMISSION_ACTION_MATRIX.find((entry) => entry.actionId === normalized) ?? null;
}

export function findAiRolePermissionBoundaryCompletenessIssues(
  entries: readonly AiRolePermissionActionMatrixEntry[] = listAiRolePermissionActionMatrixEntries(),
): Pick<
  AiRolePermissionActionBoundarySummary,
  | "roleScopeMissingActions"
  | "mutationRiskMissingActions"
  | "evidenceMissingActions"
  | "approvalRouteMissingActions"
  | "forbiddenPolicyMissingActions"
  | "bffAuthorizationUnsafeActions"
  | "bffCoverageMissingActions"
> {
  return {
    roleScopeMissingActions: entries
      .filter((entry) => !entry.roleScopePresent)
      .map((entry) => entry.actionId)
      .sort(),
    mutationRiskMissingActions: entries
      .filter((entry) => !entry.mutationRiskClassified)
      .map((entry) => entry.actionId)
      .sort(),
    evidenceMissingActions: entries
      .filter((entry) => !entry.evidenceBoundary.evidenceBacked)
      .map((entry) => entry.actionId)
      .sort(),
    approvalRouteMissingActions: entries
      .filter(
        (entry) =>
          entry.actionKind === "approval_required" &&
          (entry.approvalBoundary.required !== true ||
            entry.approvalBoundary.routePresent !== true ||
            entry.approvalBoundary.executeRequiresApprovedStatus !== true),
      )
      .map((entry) => entry.actionId)
      .sort(),
    forbiddenPolicyMissingActions: entries
      .filter(
        (entry) =>
          entry.actionKind === "forbidden" &&
          (!entry.forbiddenBoundary.forbidden ||
            !entry.forbiddenBoundary.reason ||
            entry.forbiddenBoundary.forbiddenForAllRoles !== true),
      )
      .map((entry) => entry.actionId)
      .sort(),
    bffAuthorizationUnsafeActions: entries
      .filter((entry) => !isAiBffAuthorizationContractSafe(entry.bffAuthorization))
      .map((entry) => entry.actionId)
      .sort(),
    bffCoverageMissingActions: entries
      .filter((entry) => entry.bffCoverageClassification === "missing")
      .map((entry) => entry.actionId)
      .sort(),
  };
}
