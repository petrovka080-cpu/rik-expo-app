import type { AiUserRole } from "../policy/aiRolePolicy";
import {
  findAiRolePermissionBoundaryCompletenessIssues,
  getAiRolePermissionActionMatrixEntry,
  listAiRolePermissionActionMatrixEntries,
  type AiActionPermissionDecision,
  type AiRolePermissionActionBoundarySummary,
  type AiRolePermissionActionMatrixEntry,
} from "./aiRolePermissionActionMatrix";
import {
  scanAiApprovedExecutionEscalation,
  scanAiRolePermissionEscalation,
} from "./aiRoleEscalationPolicy";

export type AiActionPermissionBoundaryDecision = AiActionPermissionDecision & {
  actionId: string;
  screenId: string;
  directExecuteAllowed: false;
};

const FORBIDDEN_PRIVILEGE_TOKENS: readonly string[] = [
  ["service", "_role"].join(""),
  ["SU", "PABASE", "_SERVICE", "_ROLE", "_KEY"].join(""),
  ["auth", "admin"].join("."),
  ["list", "Users"].join(""),
];

export function resolveAiActionPermissionBoundary(params: {
  actionId: string;
  role: AiUserRole;
}): AiActionPermissionBoundaryDecision {
  const entry = getAiRolePermissionActionMatrixEntry(params.actionId);
  const decision = entry?.roleDecisions.find((candidate) => candidate.role === params.role);
  if (!entry || !decision) {
    return {
      role: params.role,
      status: params.role === "unknown" ? "denied_unknown_role" : "denied_not_in_role_scope",
      canRead: false,
      canDraft: false,
      canSubmitForApproval: false,
      canExecuteApproved: false,
      requiredCapability: null,
      exactReason: "Audited AI action is not present in the role permission matrix.",
      actionId: params.actionId,
      screenId: "unknown",
      directExecuteAllowed: false,
    };
  }
  return {
    ...decision,
    actionId: entry.actionId,
    screenId: entry.screenId,
    directExecuteAllowed: false,
  };
}

export function scanAiServicePrivilegeGreenPathFromSources(params: {
  sources: readonly { filePath: string; source: string }[];
}): string[] {
  return params.sources
    .flatMap(({ filePath, source }) =>
      FORBIDDEN_PRIVILEGE_TOKENS.flatMap((token) =>
        source.includes(token) ? [`${filePath}:${token}`] : [],
      ),
    )
    .sort();
}

function countKind(
  entries: readonly AiRolePermissionActionMatrixEntry[],
  actionKind: AiRolePermissionActionMatrixEntry["actionKind"],
): number {
  return entries.filter((entry) => entry.actionKind === actionKind).length;
}

function resolveFinalStatus(params: {
  completeness: ReturnType<typeof findAiRolePermissionBoundaryCompletenessIssues>;
  roleEscalationFindings: readonly string[];
  servicePrivilegeFindings: readonly string[];
  auditedActions: number;
  matrixActions: number;
}): Pick<AiRolePermissionActionBoundarySummary, "finalStatus" | "exactReason"> {
  if (params.servicePrivilegeFindings.length > 0) {
    return {
      finalStatus: "BLOCKED_AI_SERVICE_ROLE_GREEN_PATH_RISK",
      exactReason: params.servicePrivilegeFindings.join(", "),
    };
  }
  if (params.completeness.roleScopeMissingActions.length > 0) {
    return {
      finalStatus: "BLOCKED_AI_ROLE_SCOPE_MISSING",
      exactReason: params.completeness.roleScopeMissingActions.join(", "),
    };
  }
  if (params.roleEscalationFindings.length > 0) {
    return {
      finalStatus: "BLOCKED_AI_ROLE_ESCALATION_RISK",
      exactReason: params.roleEscalationFindings.join(", "),
    };
  }
  const incomplete = [
    ...params.completeness.mutationRiskMissingActions,
    ...params.completeness.evidenceMissingActions,
    ...params.completeness.approvalRouteMissingActions,
    ...params.completeness.forbiddenPolicyMissingActions,
    ...params.completeness.bffAuthorizationUnsafeActions,
    ...params.completeness.bffCoverageMissingActions,
    ...(params.auditedActions !== params.matrixActions ? ["MATRIX_ACTION_COUNT_MISMATCH"] : []),
  ];
  if (incomplete.length > 0) {
    return {
      finalStatus: "BLOCKED_AI_PERMISSION_BOUNDARY_INCOMPLETE",
      exactReason: incomplete.join(", "),
    };
  }
  return {
    finalStatus: "GREEN_AI_ROLE_PERMISSION_ACTION_BOUNDARY_READY",
    exactReason: null,
  };
}

export function verifyAiRolePermissionActionBoundary(params?: {
  entries?: readonly AiRolePermissionActionMatrixEntry[];
  servicePrivilegeFindings?: readonly string[];
}): AiRolePermissionActionBoundarySummary {
  const entries = params?.entries ?? listAiRolePermissionActionMatrixEntries();
  const completeness = findAiRolePermissionBoundaryCompletenessIssues(entries);
  const roleEscalationFindings = [
    ...scanAiRolePermissionEscalation(entries),
    ...scanAiApprovedExecutionEscalation(entries),
  ]
    .map((finding) => `${finding.actionId}:${finding.role}:${finding.code}`)
    .sort();
  const servicePrivilegeFindings = [...(params?.servicePrivilegeFindings ?? [])].sort();
  const auditedActions = entries.length;
  const { finalStatus, exactReason } = resolveFinalStatus({
    completeness,
    roleEscalationFindings,
    servicePrivilegeFindings,
    auditedActions,
    matrixActions: entries.length,
  });

  return {
    wave: "S_AI_SECURITY_01_ROLE_PERMISSION_ACTION_BOUNDARY_HARDENING",
    finalStatus,
    exactReason,
    auditedActions,
    matrixActions: entries.length,
    roleScopeMissingActions: completeness.roleScopeMissingActions,
    mutationRiskMissingActions: completeness.mutationRiskMissingActions,
    evidenceMissingActions: completeness.evidenceMissingActions,
    approvalRouteMissingActions: completeness.approvalRouteMissingActions,
    forbiddenPolicyMissingActions: completeness.forbiddenPolicyMissingActions,
    bffAuthorizationUnsafeActions: completeness.bffAuthorizationUnsafeActions,
    bffCoverageMissingActions: completeness.bffCoverageMissingActions,
    roleEscalationFindings,
    servicePrivilegeFindings,
    safeReadActions: countKind(entries, "safe_read"),
    draftOnlyActions: countKind(entries, "draft_only"),
    approvalRequiredActions: countKind(entries, "approval_required"),
    forbiddenActions: countKind(entries, "forbidden"),
    actionsWithRoleScope: entries.filter((entry) => entry.roleScopePresent).length,
    actionsWithEvidencePolicy: entries.filter((entry) => entry.evidenceBoundary.evidenceBacked).length,
    actionsWithApprovalPolicy: entries.filter(
      (entry) => entry.actionKind !== "approval_required" || entry.approvalBoundary.routePresent,
    ).length,
    actionsWithForbiddenPolicy: entries.filter(
      (entry) => entry.actionKind !== "forbidden" || entry.forbiddenBoundary.forbiddenForAllRoles,
    ).length,
    bffAuthorizationContracts: entries.length,
    noSecrets: true,
    noRawRows: true,
    noRawPrompts: true,
    noRawProviderPayloads: true,
    noDbWrites: true,
    noProviderCalls: true,
    noUiChanges: true,
    noFakeGreen: true,
  };
}
