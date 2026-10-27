import type {
  ActionPlan,
  ConstructionDomainId,
  ConstructionKnowhowRoleId,
  ConstructionRecommendedActions,
  ConstructionSafetyBoundaryResult,
  EvidenceRef,
  ForbiddenAction,
} from "./constructionKnowhowTypes";
import { getConstructionDomainPlaybook } from "./constructionDomainPlaybooks";
import { getConstructionRoleProfile } from "./constructionRoleAdvisor";

function actionId(prefix: string, domainId: ConstructionDomainId, label: string): string {
  return `${prefix}:${domainId}:${label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
}

function buildPlans(params: {
  domainId: ConstructionDomainId;
  labels: readonly string[];
  actionType: ActionPlan["actionType"];
  requiresApproval: boolean;
  evidenceRefs: readonly EvidenceRef[];
}): ActionPlan[] {
  return params.labels.map((label) => ({
    actionId: actionId(params.actionType, params.domainId, label),
    label,
    actionType: params.actionType,
    domainId: params.domainId,
    requiresApproval: params.requiresApproval,
    evidenceRefs: params.evidenceRefs.map((ref) => ref.refId),
    mutates: false,
    mutationCount: 0,
    dbWrites: 0,
    executed: false,
  }));
}

function forbidden(params: {
  domainId: ConstructionDomainId;
  label: string;
  reason: string;
  blockedBy: ForbiddenAction["blockedBy"];
}): ForbiddenAction {
  return {
    actionId: actionId("forbidden", params.domainId, params.label),
    label: params.label,
    reason: params.reason,
    blockedBy: params.blockedBy,
    mutationCount: 0,
    dbWrites: 0,
  };
}

export function buildConstructionProfessionalSafetyBoundary(params: {
  roleId: ConstructionKnowhowRoleId;
  domainId: ConstructionDomainId;
  evidenceRefs: readonly EvidenceRef[];
  approvalRequired: boolean;
}): ConstructionSafetyBoundaryResult {
  const playbook = getConstructionDomainPlaybook(params.domainId);
  const profile = getConstructionRoleProfile(params.roleId);
  const roleCanUseDomain = Boolean(profile?.allowedDomains.includes(params.domainId));
  const safeReadUseCases = roleCanUseDomain && playbook ? playbook.safeReadUseCases : [];
  const draftUseCases = roleCanUseDomain && playbook ? playbook.draftUseCases : [];
  const approvalUseCases = roleCanUseDomain && playbook ? playbook.approvalRequiredUseCases : [];
  const forbiddenUseCases = playbook?.forbiddenUseCases ?? ["unknown construction domain action"];
  const recommendedActions: ConstructionRecommendedActions = {
    safeRead: buildPlans({
      domainId: params.domainId,
      labels: safeReadUseCases,
      actionType: "safe_read",
      requiresApproval: false,
      evidenceRefs: params.evidenceRefs,
    }),
    draftOnly: buildPlans({
      domainId: params.domainId,
      labels: draftUseCases,
      actionType: "draft_only",
      requiresApproval: false,
      evidenceRefs: params.evidenceRefs,
    }),
    approvalRequired: buildPlans({
      domainId: params.domainId,
      labels: approvalUseCases,
      actionType: "submit_for_approval",
      requiresApproval: true,
      evidenceRefs: params.evidenceRefs,
    }),
    forbidden: [
      ...forbiddenUseCases.map((label) =>
        forbidden({
          domainId: params.domainId,
          label,
          reason: "Construction Know-How Engine blocks direct mutation and unsafe execution.",
          blockedBy: "no_direct_mutation_policy",
        }),
      ),
      ...(roleCanUseDomain
        ? []
        : [
            forbidden({
              domainId: params.domainId,
              label: "role-domain access",
              reason: "Role is not allowed to use this construction domain.",
              blockedBy: "role_scope",
            }),
          ]),
      ...(params.approvalRequired
        ? [
            forbidden({
              domainId: params.domainId,
              label: "direct execution without approval",
              reason: "Risk or incomplete evidence requires approval ledger before execution.",
              blockedBy: "approval_boundary",
            }),
          ]
        : []),
    ],
  };

  return {
    highRiskRequiresApproval: true,
    directExecution: false,
    domainMutation: false,
    mobileExternalFetch: false,
    directSupabaseFromUi: false,
    mutationCount: 0,
    dbWrites: 0,
    recommendedActions,
  };
}
